
import type { Pool, PoolClient } from 'pg';

import { HttpError } from '../../../shared/http-error.js';

import type { User } from '../../auth/schemas/auth.schema.js';

import type {
  CreateDependency,
  Dependency,
  ManagedUser,
  UpdateUser,
  UpdateDependency,
  ChangeStatus
} from '../schemas/usuarios.schema.js';

type NewAccount = Omit<User, 'id'> & {
  password_hash: string;
};

type AuditEntity = 'usuarios' | 'dependencias';
type AuditAction =
  | 'crear'
  | 'modificar'
  | 'activar'
  | 'desactivar';

type AuditRecord = {
  id: string;
  [key: string]: unknown;
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

  updateDependency(
    id: string,
    data: UpdateDependency,
    actorId: string
  ): Promise<Dependency>;

  changeDependencyStatus(
    id: string,
    data: ChangeStatus,
    actorId: string
  ): Promise<Dependency>;
}

// --------------------------------------------------
// ERRORES DE POSTGRESQL
// --------------------------------------------------

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

// --------------------------------------------------
// AUDITORÍA
// --------------------------------------------------

async function audit(
  client: PoolClient,
  actorId: string,
  entidad: AuditEntity,
  accion: AuditAction,
  despues: AuditRecord,
  antes: AuditRecord | null = null
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
      $1, $2, $3, $4, $5::jsonb, $6::jsonb
    )
    `,
    [
      actorId,
      entidad,
      despues.id,
      accion,
      antes ? JSON.stringify(antes) : null,
      JSON.stringify(despues)
    ]
  );
}

// --------------------------------------------------
// REPOSITORIO
// --------------------------------------------------

export function createUsersRepository(
  pool: Pool
): UsersRepository {

  // Obtener un usuario y bloquearlo si corresponde.
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

  // Obtener dependencia con bloqueo opcional.
  async function readDependency(
    client: PoolClient,
    id: string,
    lock = false
  ): Promise<Dependency | null> {
    const result = await client.query<Dependency>(
      `
      SELECT
        id::text,
        clave,
        nombre,
        activo
      FROM dependencias
      WHERE id = $1
      ${lock ? 'FOR UPDATE' : ''}
      `,
      [id]
    );

    return result.rows[0] ?? null;
  }

  // Verificar que la dependencia exista y esté activa.
  // FOR SHARE evita cambios de estado concurrentes
  // mientras se asigna una cuenta.
  async function assertActiveDependency(
    client: PoolClient,
    id: string | null
  ): Promise<void> {
    if (id === null) return;

    const result = await client.query(
      `
      SELECT id
      FROM dependencias
      WHERE id = $1
        AND activo
      FOR SHARE
      `,
      [id]
    );

    if (!result.rowCount) {
      throw new HttpError(
        422,
        'DEPENDENCIA_NO_DISPONIBLE',
        'La dependencia no existe o está inactiva.'
      );
    }
  }

  // Crear usuario, incluyendo bootstrap administrativo.
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
        'crear',
        { ...user }
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

  return {

    // ----------------------------------------------
    // LISTAR USUARIOS
    // ----------------------------------------------

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

    // ----------------------------------------------
    // LISTAR TODAS LAS DEPENDENCIAS
    // ----------------------------------------------

    async listDependencies() {
      const result = await pool.query<Dependency>(
        `
        SELECT
          id::text,
          clave,
          nombre,
          activo
        FROM dependencias
        ORDER BY nombre, id
        `
      );

      return result.rows;
    },

    createUser: (account, actorId) =>
      insertUser(account, actorId),

    createInitialAdmin: account =>
      insertUser(account),

    // ----------------------------------------------
    // CREAR DEPENDENCIA
    // ----------------------------------------------

    async createDependency(data, actorId) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const result = await client.query<Dependency>(
          `
          INSERT INTO dependencias (clave, nombre)
          VALUES ($1, $2)
          RETURNING
            id::text,
            clave,
            nombre,
            activo
          `,
          [data.clave, data.nombre]
        );

        const dependency = result.rows[0];

        await audit(
          client,
          actorId,
          'dependencias',
          'crear',
          { ...dependency }
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

    // ----------------------------------------------
    // EDITAR USUARIO
    // ----------------------------------------------

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

        if (before.rol === 'administrador') {
          throw new HttpError(
            403,
            'ADMIN_PROTEGIDO',
            'No se permite modificar cuentas administradoras.'
          );
        }

        // Para cuentas activas comprobamos que la
        // dependencia nueva esté disponible.
        // Una cuenta inactiva puede editarse sin
        // reactivarse automáticamente.
        if (before.activo) {
          await assertActiveDependency(
            client,
            data.dependencia_id
          );
        }

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

        if (before.correo !== data.correo) {
          // Los enlaces enviados al correo anterior ya no deben autorizar la cuenta.
          await client.query(
            `
            UPDATE recuperaciones_password
            SET utilizado_en = now()
            WHERE usuario_id = $1
              AND utilizado_en IS NULL
            `,
            [id]
          );
        }

        const after = await readManagedUser(client, id);

        if (!after) {
          throw new HttpError(
            404,
            'USUARIO_NO_ENCONTRADO',
            'No se pudo consultar el usuario actualizado.'
          );
        }

        await audit(
          client,
          actorId,
          'usuarios',
          'modificar',
          { ...after },
          { ...before }
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

    // ----------------------------------------------
    // ACTIVAR / DESACTIVAR USUARIO
    // ----------------------------------------------

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

        if (before.rol === 'administrador') {
          throw new HttpError(
            403,
            'ADMIN_PROTEGIDO',
            'No se permite cambiar el estado de cuentas administradoras.'
          );
        }

        if (id === actorId && !data.activo) {
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
            'El usuario ya tiene ese estado.'
          );
        }

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
          [data.activo, id]
        );

        const after = await readManagedUser(client, id);

        if (!after) {
          throw new HttpError(
            404,
            'USUARIO_NO_ENCONTRADO',
            'No se pudo consultar el usuario actualizado.'
          );
        }

        await audit(
          client,
          actorId,
          'usuarios',
          data.activo ? 'activar' : 'desactivar',
          { ...after },
          { ...before }
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

    // ----------------------------------------------
    // EDITAR DEPENDENCIA
    // ----------------------------------------------

    async updateDependency(id, data, actorId) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const before = await readDependency(
          client,
          id,
          true
        );

        if (!before) {
          throw new HttpError(
            404,
            'DEPENDENCIA_NO_ENCONTRADA',
            'La dependencia no existe.'
          );
        }

        const result = await client.query<Dependency>(
          `
          UPDATE dependencias
          SET
            clave = $1,
            nombre = $2
          WHERE id = $3
          RETURNING
            id::text,
            clave,
            nombre,
            activo
          `,
          [data.clave, data.nombre, id]
        );

        const after = result.rows[0];

        await audit(
          client,
          actorId,
          'dependencias',
          'modificar',
          { ...after },
          { ...before }
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

    // ----------------------------------------------
    // ACTIVAR / DESACTIVAR DEPENDENCIA
    // ----------------------------------------------

    async changeDependencyStatus(id, data, actorId) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const before = await readDependency(
          client,
          id,
          true
        );

        if (!before) {
          throw new HttpError(
            404,
            'DEPENDENCIA_NO_ENCONTRADA',
            'La dependencia no existe.'
          );
        }

        if (before.activo === data.activo) {
          throw new HttpError(
            409,
            'ESTADO_SIN_CAMBIOS',
            'La dependencia ya tiene ese estado.'
          );
        }

        // Impedir desactivación si existen
        // usuarios operativos activos asignados.
        if (!data.activo) {
          const assigned = await client.query(
            `
            SELECT 1
            FROM usuarios
            WHERE dependencia_id = $1
              AND activo
              AND rol IN ('captura', 'revision')
            LIMIT 1
            `,
            [id]
          );

          if (assigned.rowCount) {
            throw new HttpError(
              409,
              'DEPENDENCIA_CON_USUARIOS_ACTIVOS',
              'La dependencia tiene usuarios operativos activos. Desactívalos o reasígnalos primero.'
            );
          }
        }

        const result = await client.query<Dependency>(
          `
          UPDATE dependencias
          SET activo = $1
          WHERE id = $2
          RETURNING
            id::text,
            clave,
            nombre,
            activo
          `,
          [data.activo, id]
        );

        const after = result.rows[0];

        await audit(
          client,
          actorId,
          'dependencias',
          data.activo ? 'activar' : 'desactivar',
          { ...after },
          { ...before }
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
