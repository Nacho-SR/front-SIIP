
import { argon2id, hash } from 'argon2';

import type {
  UsersRepository
} from '../repositories/usuarios.repository.js';

import {
  changeStatusSchema,
  createDependencySchema,
  createUserSchema,
  initialAdminSchema,
  updateDependencySchema,
  updateUserSchema
} from '../schemas/usuarios.schema.js';

export function createUsersService(
  repository: UsersRepository
) {
  return {

    // CONSULTAS
    listUsers: () => repository.listUsers(),

    listDependencies: () => repository.listDependencies(),

    // CREAR USUARIO
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

    // ADMINISTRADOR INICIAL
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

    // CREAR DEPENDENCIA
    async createDependency(
      data: unknown,
      actorId: string
    ) {
      return repository.createDependency(
        createDependencySchema.parse(data),
        actorId
      );
    },

    // EDITAR USUARIO
    async updateUser(
      id: string,
      data: unknown,
      actorId: string
    ) {
      return repository.updateUser(
        id,
        updateUserSchema.parse(data),
        actorId
      );
    },

    // CAMBIAR ESTADO DE USUARIO
    async changeUserStatus(
      id: string,
      data: unknown,
      actorId: string
    ) {
      return repository.changeUserStatus(
        id,
        changeStatusSchema.parse(data),
        actorId
      );
    },

    // EDITAR DEPENDENCIA
    async updateDependency(
      id: string,
      data: unknown,
      actorId: string
    ) {
      return repository.updateDependency(
        id,
        updateDependencySchema.parse(data),
        actorId
      );
    },

    // CAMBIAR ESTADO DE DEPENDENCIA
    async changeDependencyStatus(
      id: string,
      data: unknown,
      actorId: string
    ) {
      return repository.changeDependencyStatus(
        id,
        changeStatusSchema.parse(data),
        actorId
      );
    }

  };
}

export type UsersService =
  ReturnType<typeof createUsersService>;
