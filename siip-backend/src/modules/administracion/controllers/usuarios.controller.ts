
import type {
  FastifyReply,
  FastifyRequest
} from 'fastify';

import type {
  ChangeStatus,
  CreateDependency,
  CreateUser,
  UpdateDependency,
  UpdateUser
} from '../schemas/usuarios.schema.js';

import type {
  UsersService
} from '../services/usuarios.service.js';

interface IdParams {
  id: string;
}

export function createUsersController(
  service: UsersService
) {
  return {

    // LISTAR USUARIOS
    async listUsers() {
      return service.listUsers();
    },

    // LISTAR DEPENDENCIAS
    async listDependencies() {
      return service.listDependencies();
    },

    // CREAR USUARIO
    async createUser(
      request: FastifyRequest<{
        Body: CreateUser;
      }>,
      reply: FastifyReply
    ) {
      const user = await service.createUser(
        request.body,
        request.usuario!.id
      );

      return reply.code(201).send(user);
    },

    // CREAR DEPENDENCIA
    async createDependency(
      request: FastifyRequest<{
        Body: CreateDependency;
      }>,
      reply: FastifyReply
    ) {
      const dependency = await service.createDependency(
        request.body,
        request.usuario!.id
      );

      return reply.code(201).send(dependency);
    },

    // EDITAR USUARIO
    async updateUser(
      request: FastifyRequest<{
        Params: IdParams;
        Body: UpdateUser;
      }>,
      reply: FastifyReply
    ) {
      const user = await service.updateUser(
        request.params.id,
        request.body,
        request.usuario!.id
      );

      return reply.code(200).send(user);
    },

    // CAMBIAR ESTADO DE USUARIO
    async changeUserStatus(
      request: FastifyRequest<{
        Params: IdParams;
        Body: ChangeStatus;
      }>,
      reply: FastifyReply
    ) {
      const user = await service.changeUserStatus(
        request.params.id,
        request.body,
        request.usuario!.id
      );

      return reply.code(200).send(user);
    },

    // EDITAR DEPENDENCIA
    async updateDependency(
      request: FastifyRequest<{
        Params: IdParams;
        Body: UpdateDependency;
      }>,
      reply: FastifyReply
    ) {
      const dependency =
        await service.updateDependency(
          request.params.id,
          request.body,
          request.usuario!.id
        );

      return reply.code(200).send(dependency);
    },

    // CAMBIAR ESTADO DE DEPENDENCIA
    async changeDependencyStatus(
      request: FastifyRequest<{
        Params: IdParams;
        Body: ChangeStatus;
      }>,
      reply: FastifyReply
    ) {
      const dependency =
        await service.changeDependencyStatus(
          request.params.id,
          request.body,
          request.usuario!.id
        );

      return reply.code(200).send(dependency);
    }

  };
}
