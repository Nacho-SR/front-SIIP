import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { argon2id, hash } from 'argon2';

import { HttpError } from '../../../shared/http-error.js';

// ============================================
// TIPOS
// ============================================

interface RecoveryUser {
  id: string;
  nombre: string;
  correo: string;
}

interface RecoveryAccount {
  id: string;
}

export interface RecoveryRecipient {
  nombre: string;
  correo: string;
}

// ============================================
// HASH DEL TOKEN
// ============================================

export function hashToken(token: string): string {
  return createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

// ============================================
// REPOSITORIO DE RECUPERACIÓN
// ============================================

export function createRecoveryRepository(pool: Pool) {
  return {

    // ----------------------------------------
    // GENERAR SOLICITUD DE RECUPERACIÓN
    // ----------------------------------------

    async issue(
      correo: string,
      tokenHash: string
    ): Promise<RecoveryRecipient | null> {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Verificar que la cuenta exista y
        // esté habilitada para iniciar sesión.
        //
        // Bloquear el usuario también evita
        // emitir múltiples tokens simultáneos.

        const result = await client.query<RecoveryUser>(
          `
          SELECT
            u.id::text,
            u.nombre,
            u.correo
          FROM usuarios u
          LEFT JOIN dependencias d
            ON d.id = u.dependencia_id
          WHERE
            lower(btrim(u.correo)) = $1
            AND u.activo = true
            AND (
              u.dependencia_id IS NULL
              OR d.activo = true
            )
            AND (
              u.rol IN ('administrador', 'consulta')
              OR u.dependencia_id IS NOT NULL
            )
          FOR UPDATE OF u
          `,
          [correo]
        );

        const user = result.rows[0];

        // No revelar si la cuenta existe.
        if (!user) {
          await client.query('COMMIT');
          return null;
        }

        // Evitar múltiples solicitudes
        // consecutivas para el mismo usuario.

        const recent = await client.query(
          `
          SELECT 1
          FROM recuperaciones_password
          WHERE
            usuario_id = $1
            AND creado_en >
              now() - interval '60 seconds'
          LIMIT 1
          `,
          [user.id]
        );

        if (recent.rowCount) {
          await client.query('COMMIT');
          return null;
        }

        // Invalidar enlaces anteriores.
        await client.query(
          `
          UPDATE recuperaciones_password
          SET utilizado_en = now()
          WHERE
            usuario_id = $1
            AND utilizado_en IS NULL
          `,
          [user.id]
        );

        // Registrar el nuevo enlace.
        //
        // Solo almacenamos SHA-256 del token.
        // Vigencia: 20 minutos.

        await client.query(
          `
          INSERT INTO recuperaciones_password (
            usuario_id,
            token_hash,
            expira_en
          )
          VALUES (
            $1,
            $2,
            now() + interval '20 minutes'
          )
          `,
          [user.id, tokenHash]
        );

        await client.query('COMMIT');

        return {
          nombre: user.nombre,
          correo: user.correo
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    // ----------------------------------------
    // CONSUMIR TOKEN Y CAMBIAR CONTRASEÑA
    // ----------------------------------------

    async consume(
      tokenHash: string,
      password: string
    ): Promise<void> {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Localizar la cuenta asociada
        // con el hash del token.

        const lookup = await client.query<{
          usuario_id: string;
        }>(
          `
          SELECT usuario_id::text
          FROM recuperaciones_password
          WHERE token_hash = $1
          `,
          [tokenHash]
        );

        const userId = lookup.rows[0]?.usuario_id;

        if (!userId) {
          throw new HttpError(
            400,
            'ENLACE_INVALIDO',
            'El enlace es inválido, ya fue utilizado o caducó.'
          );
        }

        // Bloquear el usuario y verificar
        // que todavía esté habilitado.

        const user = await client.query<RecoveryAccount>(
          `
          SELECT u.id::text
          FROM usuarios u
          LEFT JOIN dependencias d
            ON d.id = u.dependencia_id
          WHERE
            u.id = $1
            AND u.activo = true
            AND (
              u.dependencia_id IS NULL
              OR d.activo = true
            )
            AND (
              u.rol IN ('administrador', 'consulta')
              OR u.dependencia_id IS NOT NULL
            )
          FOR UPDATE OF u
          `,
          [userId]
        );

        if (!user.rowCount) {
          throw new HttpError(
            400,
            'ENLACE_INVALIDO',
            'El enlace ya no es válido.'
          );
        }

        // Comprobar que el token:
        // - Exista.
        // - No haya sido utilizado.
        // - No haya caducado.

        const recovery = await client.query(
          `
          SELECT id
          FROM recuperaciones_password
          WHERE
            token_hash = $1
            AND usuario_id = $2
            AND utilizado_en IS NULL
            AND expira_en > now()
          FOR UPDATE
          `,
          [tokenHash, userId]
        );

        if (!recovery.rowCount) {
          throw new HttpError(
            400,
            'ENLACE_INVALIDO',
            'El enlace es inválido, ya fue utilizado o caducó.'
          );
        }

        // Cifrado unidireccional de la
        // nueva contraseña mediante Argon2id.

        const passwordHash = await hash(
          password,
          { type: argon2id }
        );

        // Actualizar contraseña.

        await client.query(
          `
          UPDATE usuarios
          SET password_hash = $2
          WHERE id = $1
          `,
          [userId, passwordHash]
        );

        // Invalidar todos los enlaces de
        // recuperación pendientes del usuario.

        await client.query(
          `
          UPDATE recuperaciones_password
          SET utilizado_en = now()
          WHERE
            usuario_id = $1
            AND utilizado_en IS NULL
          `,
          [userId]
        );

        // Invalidar todas las sesiones
        // existentes de esa cuenta.

        await client.query(
          `
          DELETE FROM sesiones
          WHERE datos->>'userId' = $1
          `,
          [userId]
        );

        await client.query('COMMIT');

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

// ============================================
// TIPO DEL REPOSITORIO
// ============================================

export type RecoveryRepository =
  ReturnType<typeof createRecoveryRepository>;
