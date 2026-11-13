
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { argon2id, hash } from 'argon2';

import { HttpError } from '../../../shared/http-error.js';

interface RecoveryUser {
  id: string;
  nombre: string;
  correo: string;
}

interface RecoveryRecipient {
  nombre: string;
  correo: string;
}

export function hashToken(token: string): string {
  return createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

function invalidLink(): HttpError {
  return new HttpError(
    400,
    'ENLACE_INVALIDO',
    'El enlace de recuperación ya fue utilizado, caducó o no es válido.'
  );
}

export function createRecoveryRepository(pool: Pool) {
  return {

    // ========================================
    // SOLICITAR RECUPERACIÓN
    // ========================================

    async issue(
      correo: string,
      tokenHash: string
    ): Promise<RecoveryRecipient | null> {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const result = await client.query<RecoveryUser>(
          `
          SELECT
            u.id::text AS id,
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

        if (!user) {
          await client.query('COMMIT');
          return null;
        }

        // Evitar solicitudes consecutivas
        // durante los últimos 60 segundos.
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

        // Crear enlace válido durante 20 minutos.
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

    // ========================================
    // VALIDAR ESTADO DEL ENLACE
    // ========================================

    async validate(tokenHash: string): Promise<boolean> {
      const result = await pool.query(
        `
        SELECT 1
        FROM recuperaciones_password r
        JOIN usuarios u
          ON u.id = r.usuario_id
        LEFT JOIN dependencias d
          ON d.id = u.dependencia_id
        WHERE
          r.token_hash = $1
          AND r.utilizado_en IS NULL
          AND r.expira_en > now()
          AND u.activo = true
          AND (
            u.dependencia_id IS NULL
            OR d.activo = true
          )
          AND (
            u.rol IN ('administrador', 'consulta')
            OR u.dependencia_id IS NOT NULL
          )
        LIMIT 1
        `,
        [tokenHash]
      );

      return result.rowCount === 1;
    },

    // ========================================
    // CONSUMIR TOKEN Y CAMBIAR CONTRASEÑA
    // ========================================

    async consume(
      tokenHash: string,
      password: string
    ): Promise<void> {
      // Calcular el hash antes de mantener
      // bloqueos de escritura en PostgreSQL.
      const passwordHash = await hash(password, {
        type: argon2id
      });

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Buscar el usuario asociado al token.
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
          throw invalidLink();
        }

        // Bloquear la cuenta antes de modificar
        // el token, usando el mismo orden de
        // bloqueo que issue().
        const user = await client.query(
          `
          SELECT u.id
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

        if (user.rowCount !== 1) {
          throw invalidLink();
        }

        // Consumir el token de forma atómica.
        // Solo puede consumirse una vez.
        const consumed = await client.query(
          `
          UPDATE recuperaciones_password
          SET utilizado_en = now()
          WHERE
            token_hash = $1
            AND usuario_id = $2
            AND utilizado_en IS NULL
            AND expira_en > now()
          RETURNING id
          `,
          [tokenHash, userId]
        );

        if (consumed.rowCount !== 1) {
          throw invalidLink();
        }

        // Actualizar la contraseña.
        const updated = await client.query(
          `
          UPDATE usuarios
          SET password_hash = $2
          WHERE id = $1
          `,
          [userId, passwordHash]
        );

        if (updated.rowCount !== 1) {
          throw invalidLink();
        }

        // Invalidar cualquier otro enlace
        // pendiente de la misma cuenta.
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

        // Revocar sesiones anteriores.
        // Esta consulta conserva la estructura
        // de sesiones utilizada en tu proyecto.
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

export type RecoveryRepository =
  ReturnType<typeof createRecoveryRepository>;
