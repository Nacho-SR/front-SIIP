
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

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export function createRecoveryService(
  repository: RecoveryRepository,
  mailer: RecoveryMailer
) {
  return {

    // ========================================
    // SOLICITAR CORREO DE RECUPERACIÓN
    // ========================================

    async request(correo: string): Promise<void> {
      if (!mailer.enabled) {
        throw new HttpError(
          503,
          'CORREO_NO_CONFIGURADO',
          'La recuperación de cuentas no está disponible temporalmente.'
        );
      }

      const token = randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);

      const user = await repository.issue(
        correo,
        tokenHash
      );

      // La respuesta externa no debe revelar
      // si una cuenta existe o está activa.
      if (!user) {
        return;
      }

      await mailer.send(
        user.nombre,
        user.correo,
        token
      );
    },

    // ========================================
    // COMPROBAR VIGENCIA DEL ENLACE
    // ========================================

    async validate(token: string): Promise<boolean> {
      if (!TOKEN_PATTERN.test(token)) {
        return false;
      }

      const tokenHash = hashToken(token);

      return repository.validate(tokenHash);
    },

    // ========================================
    // RESTABLECER CONTRASEÑA
    // ========================================

    async confirm(
      token: string,
      password: string
    ): Promise<void> {
      if (!TOKEN_PATTERN.test(token)) {
        throw new HttpError(
          400,
          'ENLACE_INVALIDO',
          'El enlace no es válido.'
        );
      }

      const tokenHash = hashToken(token);

      // El repositorio comprueba el estado
      // nuevamente y consume el token.
      await repository.consume(
        tokenHash,
        password
      );
    }
  };
}

export type RecoveryService =
  ReturnType<typeof createRecoveryService>;
