
import { argon2id, hash } from 'argon2';

import type { UsersRepository } from '../repositories/usuarios.repository.js';

import {
  changeStatusSchema,
  createDependencySchema,
  createUserSchema,
  initialAdminSchema,
  updateUserSchema
} from '../schemas/usuarios.schema.js';

export function createUsersService(
  repository: UsersRepository
) {
  return {

    // Consultar usuarios
    listUsers: () => repository.listUsers(),

    // Consultar dependencias
    listDependencies: () => repository.listDependencies(),

    // Registrar usuario
    async createUser(
      data: unknown,
      actorId: string
    ) {
      const { password, ...account } =
        createUserSchema.parse(data);

      const password_hash = await hash(password, {
        type: argon2id
      });

      return repository.createUser(
        { ...account, password_hash },
        actorId
      );
    },

    // Crear administrador inicial
    async createInitialAdmin(data: unknown) {
      const { password, ...account } =
        initialAdminSchema.parse(data);

      const password_hash = await hash(password, {
        type: argon2id
      });

      return repository.createInitialAdmin({
        ...account,
        password_hash,
        rol: 'administrador',
        dependencia_id: null
      });
    },

    // Registrar dependencia
    async createDependency(
      data: unknown,
      actorId: string
    ) {
      return repository.createDependency(
        createDependencySchema.parse(data),
        actorId
      );
    },

    // --------------------------------------
    // EDITAR USUARIO
    // --------------------------------------

    async updateUser(
      id: string,
      data: unknown,
      actorId: string
    ) {
      const validData = updateUserSchema.parse(data);

      return repository.updateUser(
        id,
        validData,
        actorId
      );
    },

    // --------------------------------------
    // ACTIVAR / DESACTIVAR USUARIO
    // --------------------------------------

    async changeUserStatus(
      id: string,
      data: unknown,
      actorId: string
    ) {
      const validData = changeStatusSchema.parse(data);

      return repository.changeUserStatus(
        id,
        validData,
        actorId
      );
    }

  };
}

export type UsersService =
  ReturnType<typeof createUsersService>;
