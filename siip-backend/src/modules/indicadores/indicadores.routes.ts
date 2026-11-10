
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { HttpError } from '../../shared/http-error.js';

import {
  requireRoles
} from '../auth/guards/auth.guard.js';

import {
  idSchema
} from '../auth/schemas/auth.schema.js';

import {
  createIndicatorsController
} from './controllers/indicadores.controller.js';

import {
  createIndicatorsService
} from './services/indicadores.service.js';

import {
  createIndicatorSchema,
  updateIndicatorSchema,
  indicatorSchema
} from './schemas/indicadores.schema.js';

import type {
  CreateIndicator,
  UpdateIndicator
} from './schemas/indicadores.schema.js';

import type {
  IndicatorsRepository
} from './repositories/indicadores.repository.js';

// ============================================
// TIPOS Y VALIDACIONES
// ============================================

interface IdParams {
  id: string;
}

interface ChangeStatusBody {
  activo: boolean;
}

const idParamsSchema = z.strictObject({
  id: idSchema
});

const changeStatusSchema = z.strictObject({
  activo: z.boolean()
});

// ============================================
// RUTAS DE INDICADORES
// ============================================

export async function indicatorsRoutes(
  app: FastifyInstance,
  options: {
    repository?: IndicatorsRepository;
  }
) {

  // ==========================================
  // AUTENTICACIÓN Y AUTORIZACIÓN
  // ==========================================

  app.addHook(
    'onRequest',
    app.requireSession
  );

  app.addHook(
    'onRequest',
    requireRoles('administrador')
  );

  // ==========================================
  // SIN POSTGRESQL CONFIGURADO
  // ==========================================

  if (!options.repository) {
    const unavailable = async () => {
      throw new HttpError(
        503,
        'INDICADORES_NO_CONFIGURADOS',
        'Falta configurar PostgreSQL para administrar indicadores.'
      );
    };

    // Consultar y crear indicadores
    app.route({
      method: ['GET', 'POST'],
      url: '/indicadores',
      handler: unavailable
    });

    // Consultar indicador específico
    app.get(
      '/indicadores/:id',
      {
        schema: {
          params: idParamsSchema
        }
      },
      unavailable
    );

    // Editar indicador
    app.patch(
      '/indicadores/:id',
      unavailable
    );

    // Activar y desactivar indicador
    app.patch(
      '/indicadores/:id/estado',
      unavailable
    );

    return;
  }

  // ==========================================
  // CONTROLADOR
  // ==========================================

  const controller = createIndicatorsController(
    createIndicatorsService(options.repository)
  );

  // ==========================================
  // GET /administracion/indicadores
  // ==========================================

  app.get(
    '/indicadores',
    {
      schema: {
        response: {
          200: z.array(indicatorSchema)
        }
      }
    },
    controller.list
  );

  // ==========================================
  // GET /administracion/indicadores/:id
  // ==========================================

  app.get<{
    Params: IdParams;
  }>(
    '/indicadores/:id',
    {
      schema: {
        params: idParamsSchema,
        response: {
          200: indicatorSchema
        }
      }
    },
    controller.find
  );

  // ==========================================
  // POST /administracion/indicadores
  // ==========================================

  app.post<{
    Body: CreateIndicator;
  }>(
    '/indicadores',
    {
      bodyLimit: 262144,

      schema: {
        body: createIndicatorSchema,
        response: {
          201: indicatorSchema
        }
      }
    },
    controller.create
  );

  // ==========================================
  // PATCH /administracion/indicadores/:id
  // ==========================================

  app.patch<{
    Params: IdParams;
    Body: UpdateIndicator;
  }>(
    '/indicadores/:id',
    {
      bodyLimit: 262144,

      schema: {
        params: idParamsSchema,
        body: updateIndicatorSchema,
        response: {
          200: indicatorSchema
        }
      }
    },
    controller.update
  );

  // ==========================================
  // PATCH /administracion/indicadores/:id/estado
  // ==========================================

  app.patch<{
    Params: IdParams;
    Body: ChangeStatusBody;
  }>(
    '/indicadores/:id/estado',
    {
      schema: {
        params: idParamsSchema,
        body: changeStatusSchema,
        response: {
          200: indicatorSchema
        }
      }
    },
    controller.changeStatus
  );

}
