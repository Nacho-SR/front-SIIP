
import { randomBytes } from 'node:crypto';

import { HttpError } from '../../../shared/http-error.js';

import {
  hashToken
} from '../repositories/recovery.repository.js';

import type {
  RecoveryRepository
} from '../repositories/recovery.repository.js';

import type {
  RecoveryMailer
} from './recovery.mail.js';

// ============================================
// SERVICIO DE RECUPERACIÓN
// ============================================

export function createRecoveryService(
  repository: RecoveryRepository,
  mailer: RecoveryMailer
) {
  return {

    // ========================================
    // SOLICITAR RECUPERACIÓN
    // ========================================

    async request(correo: string): Promise<void> {

      // Comprobar configuración del correo.
      if (!mailer.enabled) {
        throw new HttpError(
          503,
          'CORREO_NO_CONFIGURADO',
          'La recuperación de cuentas no está disponible temporalmente.'
        );
      }

      // Generar un token criptográficamente
      // aleatorio de 32 bytes.
      //
      // Su representación hexadecimal
      // tendrá 64 caracteres.

      const token = randomBytes(32)
        .toString('hex');

      // Solo almacenar el hash del token.
      const tokenHash = hashToken(token);

      // Buscar cuenta y registrar solicitud.
      const user = await repository.issue(
        correo,
        tokenHash
      );

      // Si la cuenta no existe, está inactiva
      // o tiene una solicitud muy reciente,
      // se termina sin revelar información.
      if (!user) {
        return;
      }

      // Enviar correo con el token original.
      // El token nunca se guarda en texto plano.

      await mailer.send(
        user.nombre,
        user.correo,
        token
      );
    },

    // ========================================
    // CONFIRMAR NUEVA CONTRASEÑA
    // ========================================

    async confirm(
      token: string,
      password: string
    ): Promise<void> {

      // Convertir el token recibido en su hash.
      const tokenHash = hashToken(token);

      // Validar vigencia, uso único
      // y actualizar la contraseña.

      await repository.consume(
        tokenHash,
        password
      );
    }
  };
}

// ============================================
// TIPO DEL SERVICIO
// ============================================

export type RecoveryService =
  ReturnType<typeof createRecoveryService>;
