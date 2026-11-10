
import Fastify from 'fastify';
import type { FastifyError } from 'fastify';

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import {
  serializerCompiler,
  validatorCompiler
} from 'fastify-type-provider-zod';

import { z } from 'zod';

import type { Env } from './env.js';

import {
  registerAuth
} from './modules/auth/auth.routes.js';

import type {
  AuthDependencies
} from './modules/auth/auth.routes.js';

import { HttpError } from './shared/http-error.js';

// ============================================
// USUARIOS Y DEPENDENCIAS
// ============================================

import {
  usersRoutes
} from './modules/administracion/usuarios.routes.js';

import type {
  UsersRepository
} from './modules/administracion/repositories/usuarios.repository.js';

// ============================================
// INDICADORES
// ============================================

import {
  indicatorsRoutes
} from './modules/indicadores/indicadores.routes.js';

import type {
  IndicatorsRepository
} from './modules/indicadores/repositories/indicadores.repository.js';

// ============================================
// AGRUPACIONES TEMÁTICAS Y FAMILIAS
// ============================================

import {
  classificationsRoutes
} from './modules/indicadores/clasificaciones.routes.js';

import type {
  ClassificationsRepository
} from './modules/indicadores/repositories/clasificaciones.repository.js';

// ============================================
// DEPENDENCIAS DE LA APLICACIÓN
// ============================================

type AppDependencies = AuthDependencies & {
  users?: UsersRepository;
  indicators?: IndicatorsRepository;
  classifications?: ClassificationsRepository;
};

// ============================================
// CONSTRUIR APLICACIÓN FASTIFY
// ============================================

export async function buildApp(
  env: Env,
  auth?: AppDependencies
) {
  const app = Fastify({
    logger: {
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'res.headers["set-cookie"]'
      ]
    }
  });

  // ==========================================
  // VALIDACIONES ZOD
  // ==========================================

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // ==========================================
  // SEGURIDAD
  // ==========================================

  await app.register(helmet);

  await app.register(cors, {
    origin: [env.FRONTEND_ORIGIN],
    credentials: true,
    methods: [
      'GET',
      'POST',
      'PATCH',
      'DELETE'
    ],
    allowedHeaders: [
      'Content-Type',
      'X-CSRF-Token'
    ]
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  // ==========================================
  // MANEJO GLOBAL DE ERRORES
  // ==========================================

  app.setErrorHandler<FastifyError>(
    (error, request, reply) => {
      const validation = !!error.validation;

      const status = validation
        ? 422
        : (error.statusCode ?? 500);

      const codigo = error instanceof HttpError
        ? error.codigo
        : validation
          ? 'DATOS_INVALIDOS'
          : status === 403
            ? 'CSRF_INVALIDO'
            : status === 429
              ? 'DEMASIADAS_SOLICITUDES'
              : status < 500
                ? 'SOLICITUD_INVALIDA'
                : 'ERROR_INTERNO';

      if (status >= 500) {
        request.log.error(
          { codigo: error.code },
          'No se pudo completar la solicitud.'
        );
      }

      return reply
        .code(status)
        .type('application/problem+json')
        .header('Cache-Control', 'no-store')
        .send({
          type: 'about:blank',
          title: codigo,
          status,
          codigo,

          detail: error instanceof HttpError
            ? error.message
            : validation
              ? 'Revisa los datos enviados.'
              : 'No se pudo completar la solicitud.',

          instance: request.url.split('?')[0],

          errores: error.validation?.map(
            issue => ({
              campo: issue.instancePath || '/',
              codigo: 'DATO_INVALIDO',
              detalle: issue.message ?? 'Valor no válido.'
            })
          ) ?? [],

          pendientes:
            codigo === 'AUTENTICACION_NO_CONFIGURADA'
              ? ['AUTENTICACION']
              : []
        });
    }
  );

  // ==========================================
  // RUTAS API V1
  // ==========================================

  await app.register(
    async api => {

      // ----------------------------------------
      // AUTENTICACIÓN
      // ----------------------------------------

      await registerAuth(api, {
        env,
        dependencies: auth
      });

      // ----------------------------------------
      // USUARIOS Y DEPENDENCIAS
      // ----------------------------------------

      await api.register(usersRoutes, {
        prefix: '/administracion',
        repository: auth?.users
      });

      // ----------------------------------------
      // INDICADORES
      // ----------------------------------------

      await api.register(indicatorsRoutes, {
        prefix: '/administracion',
        repository: auth?.indicators
      });

      // ----------------------------------------
      // AGRUPACIONES TEMÁTICAS Y FAMILIAS
      // ----------------------------------------

      await api.register(classificationsRoutes, {
        prefix: '/administracion',
        repository: auth?.classifications
      });

    },
    {
      prefix: '/api/v1'
    }
  );

  // ==========================================
  // ESTADO DEL SERVIDOR
  // ==========================================

  app.get(
    '/api/v1/salud',
    {
      schema: {
        response: {
          200: z.object({
            estado: z.literal('ok')
          })
        }
      }
    },
    async (_request, reply) => {
      return reply
        .header('Cache-Control', 'no-store')
        .send({
          estado: 'ok'
        });
    }
  );

  return app;
}
