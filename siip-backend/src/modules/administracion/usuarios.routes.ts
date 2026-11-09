import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../../shared/http-error.js';
import { requireRoles } from '../auth/guards/auth.guard.js';
import { userSchema } from '../auth/schemas/auth.schema.js';
import { createUsersController } from './controllers/usuarios.controller.js';
import type { UsersRepository } from './repositories/usuarios.repository.js';
import { createUsersService } from './services/usuarios.service.js';
import { createDependencySchema, createUserSchema, dependencySchema, managedUserSchema } from './schemas/usuarios.schema.js';
import type { CreateDependency, CreateUser } from './schemas/usuarios.schema.js';

export async function usersRoutes(app: FastifyInstance, options: { repository?: UsersRepository }) {
  app.addHook('onRequest', app.requireSession);
  app.addHook('onRequest', requireRoles('administrador'));
  if (!options.repository) {
    app.route({
      method: ['GET', 'POST'], url: '/usuarios',
      handler: async () => { throw new HttpError(503, 'ADMINISTRACION_NO_CONFIGURADA', 'Falta configurar PostgreSQL para administrar usuarios.'); },
    });
    app.route({
      method: ['GET', 'POST'], url: '/dependencias',
      handler: async () => { throw new HttpError(503, 'ADMINISTRACION_NO_CONFIGURADA', 'Falta configurar PostgreSQL para las altas.'); },
    });
    return;
  }
  const controller = createUsersController(createUsersService(options.repository));
  app.get('/usuarios', {
    schema: { response: { 200: z.array(managedUserSchema) } },
  }, controller.listUsers);
  app.get('/dependencias', {
    schema: { response: { 200: z.array(dependencySchema) } },
  }, controller.listDependencies);
  app.post<{ Body: CreateUser }>('/usuarios', {
    bodyLimit: 8192,
    schema: { body: createUserSchema, response: { 201: userSchema } },
  }, controller.createUser);
  app.post<{ Body: CreateDependency }>('/dependencias', {
    schema: { body: createDependencySchema, response: { 201: dependencySchema } },
  }, controller.createDependency);
}
