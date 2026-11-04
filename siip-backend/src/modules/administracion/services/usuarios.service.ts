import { argon2id, hash } from 'argon2';
import type { UsersRepository } from '../repositories/usuarios.repository.js';
import {
  createDependencySchema, createUserSchema, initialAdminSchema,
} from '../schemas/usuarios.schema.js';

export function createUsersService(repository: UsersRepository) {
  return {
    async createUser(data: unknown, actorId: string) {
      const { password, ...account } = createUserSchema.parse(data);
      const password_hash = await hash(password, { type: argon2id });
      return repository.createUser({ ...account, password_hash }, actorId);
    },
    async createInitialAdmin(data: unknown) {
      const { password, ...account } = initialAdminSchema.parse(data);
      const password_hash = await hash(password, { type: argon2id });
      return repository.createInitialAdmin({ ...account, password_hash, rol: 'administrador', dependencia_id: null });
    },
    async createDependency(data: unknown, actorId: string) {
      return repository.createDependency(createDependencySchema.parse(data), actorId);
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
