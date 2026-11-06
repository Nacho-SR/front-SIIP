import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateDependency, CreateUser } from '../schemas/usuarios.schema.js';
import type { UsersService } from '../services/usuarios.service.js';

export function createUsersController(service: UsersService) {
  return {
    async listDependencies() {
      return service.listDependencies();
    },
    async createUser(request: FastifyRequest<{ Body: CreateUser }>, reply: FastifyReply) {
      const user = await service.createUser(request.body, request.usuario!.id);
      return reply.code(201).send(user);
    },
    async createDependency(request: FastifyRequest<{ Body: CreateDependency }>, reply: FastifyReply) {
      const dependency = await service.createDependency(request.body, request.usuario!.id);
      return reply.code(201).send(dependency);
    },
  };
}
