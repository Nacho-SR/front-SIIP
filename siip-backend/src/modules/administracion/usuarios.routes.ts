import type { FastifyInstance } from 'fastify';
import { HttpError } from '../../shared/http-error.js';
import { requireRoles } from '../auth/guards/auth.guard.js';
import { userSchema } from '../auth/schemas/auth.schema.js';
import { createUsersController } from './controllers/usuarios.controller.js';
import type { UsersRepository } from './repositories/usuarios.repository.js';
import { createUsersService } from './services/usuarios.service.js';
import { createDependencySchema, createUserSchema, dependencySchema } from './schemas/usuarios.schema.js';
import type { CreateDependency, CreateUser } from './schemas/usuarios.schema.js';

export async function usersRoutes(app: FastifyInstance, options: { repository?: UsersRepository }) {
  app.addHook('onRequest', app.requireSession);
  app.addHook('onRequest', requireRoles('administrador'));
  if (!options.repository) {
    app.route({
      method: 'POST', url: '/usuarios',
      handler: async () => { throw new HttpError(503, 'ADMINISTRACION_NO_CONFIGURADA', 'Falta configurar PostgreSQL para las altas.'); },
    });
    app.route({
      method: 'POST', url: '/dependencias',
      handler: async () => { throw new HttpError(503, 'ADMINISTRACION_NO_CONFIGURADA', 'Falta configurar PostgreSQL para las altas.'); },
    });
    return;
  }
  const controller = createUsersController(createUsersService(options.repository));
  app.post<{ Body: CreateUser }>('/usuarios', {
    bodyLimit: 8192,
    schema: { body: createUserSchema, response: { 201: userSchema } },
  }, controller.createUser);
  app.post<{ Body: CreateDependency }>('/dependencias', {
    schema: { body: createDependencySchema, response: { 201: dependencySchema } },
  }, controller.createDependency);
}
