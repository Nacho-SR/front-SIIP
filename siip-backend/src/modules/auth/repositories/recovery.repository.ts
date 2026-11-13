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

interface RecoveryTokenRow {
  id: string;
  usuario_id: string;
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
// ERROR DE ENLACE NO VÁLIDO
// ============================================

function invalidLink(): HttpError {
  return new HttpError(
    400,
    'ENLACE_INVALIDO',
    'El enlace de recuperación es inválido, caducó o ya fue utilizado.'
  );
}

// ============================================
// REPOSITORIO DE RECUPERACIÓN
// ============================================

export function createRecoveryRepository(pool: Pool) {
  return {

    // ========================================
    // CREAR SOLICITUD DE RECUPERACIÓN
    // ========================================

    async issue(
      correo: string,
      tokenHash: string
    ): Promise<RecoveryRecipient | null> {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Verificar que la cuenta esté activa.
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

        // No revelar cuentas inexistentes.
        if (!user) {
          await client.query('COMMIT');
          return null;
        }

        // Limitar solicitudes consecutivas.
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

        // Invalidar enlaces anteriores
        // cuando se genera uno nuevo.
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

        // Registrar token con vigencia
        // de 20 minutos.
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
    // CONSUMIR ENLACE Y CAMBIAR CONTRASEÑA
    // ========================================

    async consume(
      tokenHash: string,
      password: string
    ): Promise<void> {

      // Calcular Argon2id antes de iniciar
      // la transacción para no mantener
      // bloqueos durante el cálculo.
      const passwordHash = await hash(password, {
        type: argon2id
      });

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // ------------------------------------
        // 1. LOCALIZAR CUENTA DEL TOKEN
        // ------------------------------------

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

        // ------------------------------------
        // 2. BLOQUEAR Y VALIDAR USUARIO
        // ------------------------------------

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

        // ------------------------------------
        // 3. CONSUMIR EL TOKEN ATÓMICAMENTE
        // ------------------------------------

        // Esta consulta solo modifica tokens
        // que NO hayan sido utilizados y cuya
        // fecha de expiración siga vigente.
        //
        // Si dos solicitudes intentan consumir
        // el mismo token, solo una podrá
        // actualizarlo satisfactoriamente.

        const consumed =
          await client.query<RecoveryTokenRow>(
            `
            UPDATE recuperaciones_password
            SET utilizado_en = now()
            WHERE
              token_hash = $1
              AND usuario_id = $2
              AND utilizado_en IS NULL
              AND expira_en > now()
            RETURNING
              id::text,
              usuario_id::text
            `,
            [tokenHash, userId]
          );

        if (consumed.rowCount !== 1) {
          throw invalidLink();
        }

        // ------------------------------------
        // 4. ACTUALIZAR CONTRASEÑA
        // ------------------------------------

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

        // ------------------------------------
        // 5. INVALIDAR OTROS ENLACES
        // ------------------------------------

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

        // ------------------------------------
        // 6. REVOCAR SESIONES ANTERIORES
        // ------------------------------------

        await client.query(
          `
          DELETE FROM sesiones
          WHERE datos->>'userId' = $1
          `,
          [userId]
        );

        // ------------------------------------
        // 7. CONFIRMAR TODA LA OPERACIÓN
        // ------------------------------------

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
