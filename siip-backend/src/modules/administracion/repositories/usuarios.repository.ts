import type { Pool, PoolClient } from 'pg';
import { HttpError } from '../../../shared/http-error.js';
import type { User } from '../../auth/schemas/auth.schema.js';
import type { CreateDependency, Dependency, ManagedUser } from '../schemas/usuarios.schema.js';

type NewAccount = Omit<User, 'id'> & { password_hash: string };

export interface UsersRepository {
  listUsers(): Promise<ManagedUser[]>;
  listDependencies(): Promise<Dependency[]>;
  createUser(account: NewAccount, actorId: string): Promise<User>;
  createInitialAdmin(account: NewAccount): Promise<User>;
  createDependency(data: CreateDependency, actorId: string): Promise<Dependency>;
}

function conflict(error: unknown): never {
  const pg = error as { code?: string; constraint?: string };
  if (pg.code === '23505') {
    if (pg.constraint === 'usuarios_correo_unico') {
      throw new HttpError(409, 'CORREO_YA_REGISTRADO', 'Ya existe una cuenta con ese correo.');
    }
    if (pg.constraint === 'usuarios_captura_activa_por_dependencia') {
      throw new HttpError(409, 'CAPTURISTA_YA_ASIGNADO', 'La dependencia ya tiene un usuario de Captura activo.');
    }
    if (pg.constraint === 'dependencias_clave_key') {
      throw new HttpError(409, 'DEPENDENCIA_YA_REGISTRADA', 'Ya existe una dependencia con esa clave.');
    }
  }
  throw error;
}

async function audit(client: PoolClient, actor: string, entity: string, record: { id: string }) {
  await client.query(`
    INSERT INTO auditoria_configuracion (actor_id, entidad, registro_id, accion, despues)
    VALUES ($1, $2, $3, 'crear', $4::jsonb)
  `, [actor, entity, record.id, JSON.stringify(record)]);
}

export function createUsersRepository(pool: Pool): UsersRepository {
  async function insertUser(account: NewAccount, actorId?: string): Promise<User> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (!actorId) {
        // Serializa bootstrap simultáneos; las altas HTTP no pueden crear administradores.
        await client.query("SELECT pg_advisory_xact_lock(hashtext('siip:bootstrap-admin'))");
        const existing = await client.query("SELECT 1 FROM usuarios WHERE rol = 'administrador' LIMIT 1");
        if (existing.rowCount) {
          throw new HttpError(409, 'ADMIN_YA_EXISTE', 'Ya existe un administrador; no se modificó ninguna cuenta.');
        }
      }
      if (account.dependencia_id !== null) {
        const dependency = await client.query(
          'SELECT id FROM dependencias WHERE id = $1 AND activo FOR SHARE', [account.dependencia_id],
        );
        if (!dependency.rowCount) {
          throw new HttpError(422, 'DEPENDENCIA_NO_DISPONIBLE', 'La dependencia no existe o está inactiva.');
        }
      }
      const result = await client.query<User>(`
        INSERT INTO usuarios (nombre, correo, password_hash, rol, dependencia_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id::text, nombre, correo, rol, dependencia_id::text
      `, [account.nombre, account.correo, account.password_hash, account.rol, account.dependencia_id]);
      const user = result.rows[0];
      await audit(client, actorId ?? user.id, 'usuarios', user);
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
    async listUsers() {
      const result = await pool.query<ManagedUser>(`
        SELECT u.id::text, u.nombre, u.correo, u.rol, u.dependencia_id::text,
               u.activo, d.nombre AS dependencia_nombre
        FROM usuarios u LEFT JOIN dependencias d ON d.id = u.dependencia_id
        ORDER BY u.nombre, u.id
      `);
      return result.rows;
    },
    async listDependencies() {
      const result = await pool.query<Dependency>(`
        SELECT id::text, clave, nombre, activo FROM dependencias
        WHERE activo ORDER BY nombre, id
      `);
      return result.rows;
    },
    createUser: (account, actorId) => insertUser(account, actorId),
    createInitialAdmin: (account) => insertUser(account),
    async createDependency(data, actorId) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await client.query<Dependency>(`
          INSERT INTO dependencias (clave, nombre) VALUES ($1, $2)
          RETURNING id::text, clave, nombre, activo
        `, [data.clave, data.nombre]);
        const dependency = result.rows[0];
        await audit(client, actorId, 'dependencias', dependency);
        await client.query('COMMIT');
        return dependency;
      } catch (error) {
        await client.query('ROLLBACK');
        return conflict(error);
      } finally {
        client.release();
      }
    },
  };
}
