import type { Pool } from 'pg';
import type { User } from '../schemas/auth.schema.js';

export type Account = User & {
  password_hash: string;
  activo: boolean;
  dependencia_activa: boolean | null;
};

export interface AuthRepository {
  findByCorreo(correo: string): Promise<Account | null>;
  findById(id: string): Promise<Account | null>;
}

const accountQuery = `
  SELECT u.id::text, u.nombre, u.correo, u.rol,
         u.dependencia_id::text, u.password_hash, u.activo,
         d.activo AS dependencia_activa
  FROM usuarios u
  LEFT JOIN dependencias d ON d.id = u.dependencia_id
`;

export function createAuthRepository(pool: Pool): AuthRepository {
  return {
    async findByCorreo(correo) {
      const result = await pool.query<Account>(
        `${accountQuery} WHERE lower(btrim(u.correo)) = $1`, [correo],
      );
      return result.rows[0] ?? null;
    },
    async findById(id) {
      const result = await pool.query<Account>(`${accountQuery} WHERE u.id = $1`, [id]);
      return result.rows[0] ?? null;
    },
  };
}
