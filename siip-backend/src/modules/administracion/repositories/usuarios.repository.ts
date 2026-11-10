
import type { Pool, PoolClient } from 'pg';

import { HttpError } from '../../../shared/http-error.js';

import type { User } from '../../auth/schemas/auth.schema.js';

import type {
  CreateDependency,
  Dependency,
  ManagedUser,
  UpdateUser,
  ChangeStatus
} from '../schemas/usuarios.schema.js';

type NewAccount = Omit<User, 'id'> & {
  password_hash: string;
};

export interface UsersRepository {
  listUsers(): Promise<ManagedUser[]>;
  listDependencies(): Promise<Dependency[]>;

  createUser(
    account: NewAccount,
    actorId: string
  ): Promise<User>;

  createInitialAdmin(
    account: NewAccount
  ): Promise<User>;

  createDependency(
    data: CreateDependency,
    actorId: string
  ): Promise<Dependency>;

  updateUser(
    id: string,
    data: UpdateUser,
    actorId: string
  ): Promise<ManagedUser>;

  changeUserStatus(
    id: string,
    data: ChangeStatus,
    actorId: string
  ): Promise<ManagedUser>;
}

// --------------------------------------------
// ERRORES DE INTEGRIDAD
// --------------------------------------------

function conflict(error: unknown): never {
  const pg = error as {
    code?: string;
    constraint?: string;
  };

  if (pg.code === '23505') {
    if (pg.constraint === 'usuarios_correo_unico') {
      throw new HttpError(
        409,
        'CORREO_YA_REGISTRADO',
        'Ya existe una cuenta con ese correo.'
      );
    }

    if (
      pg.constraint ===
      'usuarios_captura_activa_por_dependencia'
    ) {
      throw new HttpError(
        409,
        'CAPTURISTA_YA_ASIGNADO',
        'La dependencia ya tiene un usuario de Captura activo.'
      );
    }

    if (pg.constraint === 'dependencias_clave_key') {
      throw new HttpError(
        409,
        'DEPENDENCIA_YA_REGISTRADA',
        'Ya existe una dependencia con esa clave.'
      );
    }
  }

  throw error;
}

// --------------------------------------------
// AUDITORÍA DE CREACIÓN
// --------------------------------------------

async function audit(
  client: PoolClient,
  actor: string,
  entity: string,
  record: { id: string }
): Promise<void> {
  await client.query(
    `
    INSERT INTO auditoria_configuracion (
      actor_id,
      entidad,
      registro_id,
      accion,
      despues
    )
    VALUES (
      $1, $2, $3, 'crear', $4::jsonb
    )
    `,
    [
      actor,
      entity,
      record.id,
      JSON.stringify(record)
    ]
  );
}

// --------------------------------------------
// AUDITORÍA DE MODIFICACIONES
// --------------------------------------------

type ChangeAction =
  | 'modificar'
  | 'activar'
  | 'desactivar';

async function auditChange(
  client: PoolClient,
  actorId: string,
  entity: 'usuarios' | 'dependencias',
  recordId: string,
  action: ChangeAction,
  before: ManagedUser | Dependency,
  after: ManagedUser | Dependency
): Promise<void> {
  await client.query(
    `
    INSERT INTO auditoria_configuracion (
      actor_id,
      entidad,
      registro_id,
      accion,
      antes,
      despues
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5::jsonb,
      $6::jsonb
    )
    `,
    [
      actorId,
      entity,
      recordId,
      action,
      JSON.stringify(before),
      JSON.stringify(after)
    ]
  );
}

// --------------------------------------------
// REPOSITORIO
// --------------------------------------------

export function createUsersRepository(
  pool: Pool
): UsersRepository {

  // ------------------------------------------
  // OBTENER USUARIO ADMINISTRABLE
  // ------------------------------------------

  async function readManagedUser(
    client: PoolClient,
    id: string,
    lock = false
  ): Promise<ManagedUser | null> {
    const result = await client.query<ManagedUser>(
      `
      SELECT
        u.id::text,
        u.nombre,
        u.correo,
        u.rol,
        u.dependencia_id::text,
        u.activo,
        d.nombre AS dependencia_nombre
      FROM usuarios u
      LEFT JOIN dependencias d
        ON d.id = u.dependencia_id
      WHERE u.id = $1
      ${lock ? 'FOR UPDATE OF u' : ''}
      `,
      [id]
    );

    return result.rows[0] ?? null;
  }

  // ------------------------------------------
  // VALIDAR DEPENDENCIA ACTIVA
  // ------------------------------------------

  async function assertActiveDependency(
    client: PoolClient,
    dependencyId: string | null
  ): Promise<void> {
    if (dependencyId === null) return;

    const result = await client.query(
      `
      SELECT id
      FROM dependencias
      WHERE id = $1
        AND activo
      FOR SHARE
      `,
      [dependencyId]
    );

    if (!result.rowCount) {
      throw new HttpError(
        422,
        'DEPENDENCIA_NO_DISPONIBLE',
        'La dependencia no existe o está inactiva.'
      );
    }
  }

  // ------------------------------------------
  // CREAR USUARIO
  // ------------------------------------------

  async function insertUser(
    account: NewAccount,
    actorId?: string
  ): Promise<User> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (!actorId) {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext('siip:bootstrap-admin'))"
        );

        const existing = await client.query(
          `
          SELECT 1
          FROM usuarios
          WHERE rol = 'administrador'
          LIMIT 1
          `
        );

        if (existing.rowCount) {
          throw new HttpError(
            409,
            'ADMIN_YA_EXISTE',
            'Ya existe un administrador; no se modificó ninguna cuenta.'
          );
        }
      }

      await assertActiveDependency(
        client,
        account.dependencia_id
      );

      const result = await client.query<User>(
        `
        INSERT INTO usuarios (
          nombre,
          correo,
          password_hash,
          rol,
          dependencia_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id::text,
          nombre,
          correo,
          rol,
          dependencia_id::text
        `,
        [
          account.nombre,
          account.correo,
          account.password_hash,
          account.rol,
          account.dependencia_id
        ]
      );

      const user = result.rows[0];

      await audit(
        client,
        actorId ?? user.id,
        'usuarios',
        user
      );

      await client.query('COMMIT');

      return user;

    } catch (error) {
      await client.query('ROLLBACK');
      return conflict(error);

    } finally {
      client.release();
    }
  }

  // ------------------------------------------
  // MÉTODOS PÚBLICOS
  // ------------------------------------------

  return {

    // Consultar usuarios, incluyendo inactivos
    async listUsers() {
      const result = await pool.query<ManagedUser>(
        `
        SELECT
          u.id::text,
          u.nombre,
          u.correo,
          u.rol,
          u.dependencia_id::text,
          u.activo,
          d.nombre AS dependencia_nombre
        FROM usuarios u
        LEFT JOIN dependencias d
          ON d.id = u.dependencia_id
        ORDER BY u.nombre, u.id
        `
      );

      return result.rows;
    },

    // Consultar dependencias activas
    listDependencies: async () => {
      const result = await pool.query<Dependency>(
        `
        SELECT
          id::text,
          clave,
          nombre,
          activo
        FROM dependencias
        WHERE activo
        ORDER BY nombre, id
        `
      );

      return result.rows;
    },

    // Crear usuario
    createUser: (account, actorId) =>
      insertUser(account, actorId),

    // Crear primer administrador
    createInitialAdmin: account =>
      insertUser(account),

    // Crear dependencia
    async createDependency(data, actorId) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const result = await client.query<Dependency>(
          `
          INSERT INTO dependencias (
            clave,
            nombre
          )
          VALUES ($1, $2)
          RETURNING
            id::text,
            clave,
            nombre,
            activo
          `,
          [
            data.clave,
            data.nombre
          ]
        );

        const dependency = result.rows[0];

        await audit(
          client,
          actorId,
          'dependencias',
          dependency
        );

        await client.query('COMMIT');

        return dependency;

      } catch (error) {
        await client.query('ROLLBACK');
        return conflict(error);

      } finally {
        client.release();
      }
    },

    // ----------------------------------------
    // EDITAR USUARIO
    // ----------------------------------------

    async updateUser(id, data, actorId) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const before = await readManagedUser(
          client,
          id,
          true
        );

        if (!before) {
          throw new HttpError(
            404,
            'USUARIO_NO_ENCONTRADO',
            'El usuario no existe.'
          );
        }

        // Las cuentas administradoras no se
        // modifican desde el CRUD ordinario.
        if (before.rol === 'administrador') {
          throw new HttpError(
            403,
            'ADMIN_PROTEGIDO',
            'No se permite modificar cuentas administradoras desde este módulo.'
          );
        }

        await assertActiveDependency(
          client,
          data.dependencia_id
        );

        await client.query(
          `
          UPDATE usuarios
          SET
            nombre = $1,
            correo = $2,
            rol = $3,
            dependencia_id = $4
          WHERE id = $5
          `,
          [
            data.nombre,
            data.correo,
            data.rol,
            data.dependencia_id,
            id
          ]
        );

        const after = await readManagedUser(
          client,
          id
        );

        if (!after) {
          throw new HttpError(
            404,
            'USUARIO_NO_ENCONTRADO',
            'No se pudo consultar el usuario actualizado.'
          );
        }

        await auditChange(
          client,
          actorId,
          'usuarios',
          id,
          'modificar',
          before,
          after
        );

        await client.query('COMMIT');

        return after;

      } catch (error) {
        await client.query('ROLLBACK');
        return conflict(error);

      } finally {
        client.release();
      }
    },

    // ----------------------------------------
    // DESACTIVAR / REACTIVAR USUARIO
    // ----------------------------------------

    async changeUserStatus(id, data, actorId) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const before = await readManagedUser(
          client,
          id,
          true
        );

        if (!before) {
          throw new HttpError(
            404,
            'USUARIO_NO_ENCONTRADO',
            'El usuario no existe.'
          );
        }

        // Protegemos las cuentas de
        // administración.
        if (before.rol === 'administrador') {
          throw new HttpError(
            403,
            'ADMIN_PROTEGIDO',
            'No se permite cambiar el estado de una cuenta administradora.'
          );
        }

        // Protección adicional contra
        // desactivación de la propia cuenta.
        if (
          id === actorId &&
          data.activo === false
        ) {
          throw new HttpError(
            403,
            'AUTO_DESACTIVACION_NO_PERMITIDA',
            'No puedes desactivar tu propia cuenta.'
          );
        }

        if (before.activo === data.activo) {
          throw new HttpError(
            409,
            'ESTADO_SIN_CAMBIOS',
            data.activo
              ? 'El usuario ya está activo.'
              : 'El usuario ya está inactivo.'
          );
        }

        // Una cuenta que requiere dependencia
        // solo podrá reactivarse si esta existe
        // y continúa activa.
        if (data.activo) {
          await assertActiveDependency(
            client,
            before.dependencia_id
          );
        }

        await client.query(
          `
          UPDATE usuarios
          SET activo = $1
          WHERE id = $2
          `,
          [
            data.activo,
            id
          ]
        );

        const after = await readManagedUser(
          client,
          id
        );

        if (!after) {
          throw new HttpError(
            404,
            'USUARIO_NO_ENCONTRADO',
            'No se pudo consultar el usuario actualizado.'
          );
        }

        await auditChange(
          client,
          actorId,
          'usuarios',
          id,
          data.activo ? 'activar' : 'desactivar',
          before,
          after
        );

        await client.query('COMMIT');

        return after;

      } catch (error) {
        await client.query('ROLLBACK');
        return conflict(error);

      } finally {
        client.release();
      }
    }

  };
}
