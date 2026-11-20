
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { HttpError } from '../../shared/http-error.js';
import { requireRoles } from '../auth/guards/auth.guard.js';
import { idSchema } from '../auth/schemas/auth.schema.js';

import {
  agrupacionSchema,
  familiaSchema,
  editAgrupacionSchema,
  editFamiliaSchema,
  estadoSchema
} from './schemas/clasificaciones.schema.js';

import type {
  EditAgrupacion,
  EditFamilia,
  Estado
} from './schemas/clasificaciones.schema.js';

import type {
  ClassificationsRepository
} from './repositories/clasificaciones.repository.js';

// ============================================
// PARÁMETROS
// ============================================

interface IdParams {
  id: string;
}

const idParamsSchema = z.strictObject({
  id: idSchema
});

// ============================================
// RUTAS DE CLASIFICACIONES
// ============================================

export async function classificationsRoutes(
  app: FastifyInstance,
  options: {
    repository?: ClassificationsRepository;
  }
) {
  // Todas las operaciones requieren sesión.
  app.addHook('onRequest', app.requireSession);

  // Solo los administradores pueden acceder.
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
        'CATALOGO_NO_CONFIGURADO',
        'Falta configurar PostgreSQL para administrar agrupaciones y familias.'
      );
    };

    for (const url of [
      '/agrupaciones',
      '/familias'
    ]) {
      app.get(url, unavailable);

      // Creación.
      app.post(url, unavailable);

      // Edición.
      app.patch(
        `${url}/:id`,
        unavailable
      );

      // Activar o desactivar.
      app.patch(
        `${url}/:id/estado`,
        unavailable
      );
    }

    return;
  }

  const repository = options.repository;

  // ==========================================
  // AGRUPACIONES TEMÁTICAS
  // ==========================================

  // ------------------------------------------
  // CONSULTAR AGRUPACIONES
  // GET /administracion/agrupaciones
  // ------------------------------------------

  app.get(
    '/agrupaciones',
    {
      schema: {
        response: {
          200: z.array(agrupacionSchema)
        }
      }
    },
    async () => {
      return repository.listAgrupaciones();
    }
  );

  // ------------------------------------------
  // CREAR AGRUPACIÓN
  // POST /administracion/agrupaciones
  // ------------------------------------------

  app.post<{
    Body: EditAgrupacion;
  }>(
    '/agrupaciones',
    {
      bodyLimit: 4096,
      schema: {
        body: editAgrupacionSchema,
        response: {
          201: agrupacionSchema
        }
      }
    },
    async (request, reply) => {
      const creada =
        await repository.createAgrupacion(
          editAgrupacionSchema.parse(
            request.body
          ),
          request.usuario!.id
        );

      return reply.code(201).send(creada);
    }
  );

  // ------------------------------------------
  // EDITAR AGRUPACIÓN
  // PATCH /administracion/agrupaciones/:id
  // ------------------------------------------

  app.patch<{
    Params: IdParams;
    Body: EditAgrupacion;
  }>(
    '/agrupaciones/:id',
    {
      schema: {
        params: idParamsSchema,
        body: editAgrupacionSchema,
        response: {
          200: agrupacionSchema
        }
      }
    },
    async request => {
      return repository.editAgrupacion(
        request.params.id,
        editAgrupacionSchema.parse(
          request.body
        ),
        request.usuario!.id
      );
    }
  );

  // ------------------------------------------
  // ACTIVAR / DESACTIVAR AGRUPACIÓN
  // PATCH /administracion/agrupaciones/:id/estado
  // ------------------------------------------

  app.patch<{
    Params: IdParams;
    Body: Estado;
  }>(
    '/agrupaciones/:id/estado',
    {
      schema: {
        params: idParamsSchema,
        body: estadoSchema,
        response: {
          200: agrupacionSchema
        }
      }
    },
    async request => {
      return repository.estadoAgrupacion(
        request.params.id,
        estadoSchema.parse(request.body),
        request.usuario!.id
      );
    }
  );

  // ==========================================
  // FAMILIAS
  // ==========================================

  // ------------------------------------------
  // CONSULTAR FAMILIAS
  // GET /administracion/familias
  // ------------------------------------------

  app.get(
    '/familias',
    {
      schema: {
        response: {
          200: z.array(familiaSchema)
        }
      }
    },
    async () => {
      return repository.listFamilias();
    }
  );

  // ------------------------------------------
  // CREAR FAMILIA
  // POST /administracion/familias
  // ------------------------------------------

  app.post<{
    Body: EditFamilia;
  }>(
    '/familias',
    {
      bodyLimit: 4096,
      schema: {
        body: editFamiliaSchema,
        response: {
          201: familiaSchema
        }
      }
    },
    async (request, reply) => {
      const creada =
        await repository.createFamilia(
          editFamiliaSchema.parse(
            request.body
          ),
          request.usuario!.id
        );

      return reply.code(201).send(creada);
    }
  );

  // ------------------------------------------
  // EDITAR FAMILIA
  // PATCH /administracion/familias/:id
  // ------------------------------------------

  app.patch<{
    Params: IdParams;
    Body: EditFamilia;
  }>(
    '/familias/:id',
    {
      schema: {
        params: idParamsSchema,
        body: editFamiliaSchema,
        response: {
          200: familiaSchema
        }
      }
    },
    async request => {
      return repository.editFamilia(
        request.params.id,
        editFamiliaSchema.parse(
          request.body
        ),
        request.usuario!.id
      );
    }
  );

  // ------------------------------------------
  // ACTIVAR / DESACTIVAR FAMILIA
  // PATCH /administracion/familias/:id/estado
  // ------------------------------------------

  app.patch<{
    Params: IdParams;
    Body: Estado;
  }>(
    '/familias/:id/estado',
    {
      schema: {
        params: idParamsSchema,
        body: estadoSchema,
        response: {
          200: familiaSchema
        }
      }
    },
    async request => {
      return repository.estadoFamilia(
        request.params.id,
        estadoSchema.parse(request.body),
        request.usuario!.id
      );
    }
  );
}
