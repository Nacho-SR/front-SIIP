
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { HttpError } from '../../shared/http-error.js';
import { requireRoles } from '../auth/guards/auth.guard.js';

import {
  idSchema,
  userSchema
} from '../auth/schemas/auth.schema.js';

import {
  createUsersController
} from './controllers/usuarios.controller.js';

import type {
  UsersRepository
} from './repositories/usuarios.repository.js';

import {
  createUsersService
} from './services/usuarios.service.js';

import {
  changeStatusSchema,
  createDependencySchema,
  createUserSchema,
  dependencySchema,
  managedUserSchema,
  updateDependencySchema,
  updateUserSchema
} from './schemas/usuarios.schema.js';

import type {
  ChangeStatus,
  CreateDependency,
  CreateUser,
  UpdateDependency,
  UpdateUser
} from './schemas/usuarios.schema.js';

interface IdParams {
  id: string;
}

const idParamsSchema = z.strictObject({
  id: idSchema
});

export async function usersRoutes(
  app: FastifyInstance,
  options: {
    repository?: UsersRepository;
  }
) {
  app.addHook('onRequest', app.requireSession);

  app.addHook(
    'onRequest',
    requireRoles('administrador')
  );

  // SIN BASE DE DATOS CONFIGURADA
  if (!options.repository) {
    const unavailable = async () => {
      throw new HttpError(
        503,
        'ADMINISTRACION_NO_CONFIGURADA',
        'Falta configurar PostgreSQL para administrar usuarios y dependencias.'
      );
    };

    app.route({
      method: ['GET', 'POST'],
      url: '/usuarios',
      handler: unavailable
    });

    app.route({
      method: ['GET', 'POST'],
      url: '/dependencias',
      handler: unavailable
    });

    app.route({
      method: ['PATCH'],
      url: '/usuarios/:id',
      handler: unavailable
    });

    app.route({
      method: ['PATCH'],
      url: '/usuarios/:id/estado',
      handler: unavailable
    });

    app.route({
      method: ['PATCH'],
      url: '/dependencias/:id',
      handler: unavailable
    });

    app.route({
      method: ['PATCH'],
      url: '/dependencias/:id/estado',
      handler: unavailable
    });

    return;
  }

  const controller = createUsersController(
    createUsersService(options.repository)
  );

  // LISTAR USUARIOS
  app.get('/usuarios', {
    schema: {
      response: {
        200: z.array(managedUserSchema)
      }
    }
  }, controller.listUsers);

  // LISTAR DEPENDENCIAS
  app.get('/dependencias', {
    schema: {
      response: {
        200: z.array(dependencySchema)
      }
    }
  }, controller.listDependencies);

  // CREAR USUARIO
  app.post<{
    Body: CreateUser;
  }>('/usuarios', {
    bodyLimit: 8192,
    schema: {
      body: createUserSchema,
      response: {
        201: userSchema
      }
    }
  }, controller.createUser);

  // CREAR DEPENDENCIA
  app.post<{
    Body: CreateDependency;
  }>('/dependencias', {
    schema: {
      body: createDependencySchema,
      response: {
        201: dependencySchema
      }
    }
  }, controller.createDependency);

  // EDITAR USUARIO
  app.patch<{
    Params: IdParams;
    Body: UpdateUser;
  }>('/usuarios/:id', {
    bodyLimit: 8192,
    schema: {
      params: idParamsSchema,
      body: updateUserSchema,
      response: {
        200: managedUserSchema
      }
    }
  }, controller.updateUser);

  // ACTIVAR / DESACTIVAR USUARIO
  app.patch<{
    Params: IdParams;
    Body: ChangeStatus;
  }>('/usuarios/:id/estado', {
    schema: {
      params: idParamsSchema,
      body: changeStatusSchema,
      response: {
        200: managedUserSchema
      }
    }
  }, controller.changeUserStatus);

  // EDITAR DEPENDENCIA
  app.patch<{
    Params: IdParams;
    Body: UpdateDependency;
  }>('/dependencias/:id', {
    bodyLimit: 8192,
    schema: {
      params: idParamsSchema,
      body: updateDependencySchema,
      response: {
        200: dependencySchema
      }
    }
  }, controller.updateDependency);

  // ACTIVAR / DESACTIVAR DEPENDENCIA
  app.patch<{
    Params: IdParams;
    Body: ChangeStatus;
  }>('/dependencias/:id/estado', {
    schema: {
      params: idParamsSchema,
      body: changeStatusSchema,
      response: {
        200: dependencySchema
      }
    }
  }, controller.changeDependencyStatus);
}
