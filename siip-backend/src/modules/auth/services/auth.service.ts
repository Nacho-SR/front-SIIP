import { createHmac, randomBytes } from 'node:crypto';
import { argon2id, hash, verify } from 'argon2';
import { HttpError } from '../../../shared/http-error.js';
import { userSchema } from '../schemas/auth.schema.js';
import type { Account, AuthRepository } from '../repositories/auth.repository.js';

function usable(account: Account | null): account is Account {
  return account !== null && account.activo
    && (account.dependencia_id === null || account.dependencia_activa === true)
    && (account.rol !== 'captura' || account.dependencia_id !== null);
}

export async function createAuthService(repository: AuthRepository, sessionSecret: string) {
  const dummyHash = await hash(randomBytes(32), { type: argon2id });
  const fingerprint = (account: Account) => createHmac('sha256', sessionSecret)
    .update(account.password_hash).digest('hex');

  return {
    async login(correo: string, password: string) {
      const account = await repository.findByCorreo(correo);
      // Verificar también cuentas inexistentes reduce diferencias de tiempo al enumerarlas.
      const valid = await verify(account?.password_hash ?? dummyHash, password).catch(() => false);
      if (!valid || !usable(account)) {
        throw new HttpError(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.');
      }
      return { usuario: userSchema.parse(account), fingerprint: fingerprint(account) };
    },
    async currentUser(id: string, credentialFingerprint: string) {
      const account = await repository.findById(id);
      if (!usable(account) || fingerprint(account) !== credentialFingerprint) return null;
      return userSchema.parse(account);
    },
  };
}

export type AuthService = Awaited<ReturnType<typeof createAuthService>>;
