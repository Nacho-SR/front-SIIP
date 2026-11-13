
import type { FastifyInstance } from 'fastify';

import cookie from '@fastify/cookie';
import session from '@fastify/session';
import type { SessionStore } from '@fastify/session';
import csrf from '@fastify/csrf-protection';

import type { Env } from '../../env.js';
import { HttpError } from '../../shared/http-error.js';

// ============================================
// AUTENTICACIÓN EXISTENTE
// ============================================

import type {
  AuthRepository
} from './repositories/auth.repository.js';

import {
  createAuthService
} from './services/auth.service.js';

import {
  credentialsSchema,
  sessionSchema
} from './schemas/auth.schema.js';

import type {
  Credentials
} from './schemas/auth.schema.js';

import {
  createAuthController,
  SESSION_COOKIE,
  SESSION_PATH,
  SESSION_TTL_MS
} from './controllers/auth.controller.js';

// ============================================
// RECUPERACIÓN DE CONTRASEÑA
// ============================================

import type {
  RecoveryRepository
} from './repositories/recovery.repository.js';

import type {
  RecoveryMailer
} from './services/recovery.mail.js';

import {
  createRecoveryService
} from './services/recovery.service.js';

import {
  recoveryRequestSchema,
  recoveryConfirmSchema
} from './schemas/recovery.schema.js';

import type {
  RecoveryRequest,
  RecoveryConfirm
} from './schemas/recovery.schema.js';

// ============================================
// DEPENDENCIAS
// ============================================

export interface AuthDependencies {
  repository: AuthRepository;
  sessionStore: SessionStore;

  recovery?: RecoveryRepository;
  recoveryMailer?: RecoveryMailer;
}

// ============================================
// REGISTRAR AUTENTICACIÓN
// ============================================

export async function registerAuth(
  app: FastifyInstance,
  options: {
    env: Env;
    dependencies?: AuthDependencies;
  }
) {
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
  });

  // ==========================================
  // SIN POSTGRESQL
  // ==========================================

  if (!options.dependencies) {
    const unavailable = async () => {
      throw new HttpError(
        503,
        'AUTENTICACION_NO_CONFIGURADA',
        'Falta configurar PostgreSQL para autenticación.'
      );
    };

    app.decorate('requireSession', unavailable);

    app.route({
      method: ['GET', 'POST', 'DELETE'],
      url: '/auth/sesion',
      handler: unavailable
    });

    app.post(
      '/auth/recuperacion',
      unavailable
    );

    app.post(
      '/auth/restablecer',
      unavailable
    );

    return;
  }

  const { env, dependencies } = options;

  const service = await createAuthService(
    dependencies.repository,
    env.SESSION_SECRET
  );

  const controller = createAuthController(service);

  // ==========================================
  // COOKIES Y SESIONES
  // ==========================================

  await app.register(cookie);

  await app.register(session, {
    secret: env.SESSION_SECRET,
    cookieName: SESSION_COOKIE,
    store: dependencies.sessionStore,
    saveUninitialized: false,
    rolling: false,

    cookie: {
      path: SESSION_PATH,
      httpOnly: true,
      sameSite: 'lax',
      secure:
        env.NODE_ENV === 'production' ||
        env.FRONTEND_ORIGIN.startsWith('https:'),
      maxAge: SESSION_TTL_MS
    }
  });

  // ==========================================
  // PROTECCIÓN CSRF
  // ==========================================

  await app.register(csrf, {
    sessionPlugin: '@fastify/session',

    getToken: request => {
      const token = request.headers['x-csrf-token'];

      return typeof token === 'string'
        ? token
        : '';
    }
  });

  app.decorateRequest('usuario', null);

  app.decorate(
    'requireSession',
    controller.requireSession
  );

  // ==========================================
  // SEGURIDAD DE SOLICITUDES
  // ==========================================

  app.addHook(
    'onRequest',
    (request, reply, done) => {
      if (
        ['GET', 'HEAD', 'OPTIONS'].includes(
          request.method
        )
      ) {
        done();
        return;
      }

      if (
        request.headers.origin !==
        env.FRONTEND_ORIGIN
      ) {
        done(
          new HttpError(
            403,
            'ORIGEN_NO_PERMITIDO',
            'Origen no autorizado.'
          )
        );

        return;
      }

      app.csrfProtection(request, reply, done);
    }
  );

  // ==========================================
  // CONSULTAR SESIÓN
  // ==========================================

  app.get(
    '/auth/sesion',
    {
      schema: {
        response: {
          200: sessionSchema
        }
      }
    },
    controller.bootstrap
  );

  // ==========================================
  // INICIAR SESIÓN
  // ==========================================

  app.post<{
    Body: Credentials;
  }>(
    '/auth/sesion',
    {
      bodyLimit: 8192,

      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute'
        }
      },

      schema: {
        body: credentialsSchema,
        response: {
          200: sessionSchema
        }
      }
    },
    controller.login
  );

  // ==========================================
  // RECUPERACIÓN DE CONTRASEÑA
  // ==========================================

  if (
    dependencies.recovery &&
    dependencies.recoveryMailer
  ) {
    const recovery = createRecoveryService(
      dependencies.recovery,
      dependencies.recoveryMailer
    );

    // ----------------------------------------
    // SOLICITAR CORREO DE RECUPERACIÓN
    // ----------------------------------------

    app.post<{
      Body: RecoveryRequest;
    }>(
      '/auth/recuperacion',
      {
        bodyLimit: 8192,

        config: {
          rateLimit: {
            max: 3,
            timeWindow: '10 minutes'
          }
        },

        schema: {
          body: recoveryRequestSchema
        }
      },
      async (request, reply) => {
        try {
          await recovery.request(
            request.body.correo
          );
        
  } catch (error) {
  if (
    error instanceof HttpError &&
    error.codigo === 'CORREO_NO_CONFIGURADO'
  ) {
    throw error;
  }

  if (error instanceof Error) {
    request.log.error(
      {
        codigo: 'RECUPERACION_FALLIDA',
        tipo: error.name,
        mensaje: error.message
      },
      'Error durante la recuperación de contraseña.'
    );
  } else {
    request.log.error(
      {
        codigo: 'RECUPERACION_FALLIDA'
      },
      'Error desconocido durante la recuperación.'
    );
  }
}
        // Misma respuesta, exista o no
        // una cuenta con ese correo.
        return reply.code(202).send({
          mensaje:
            'Si la cuenta está habilitada, recibirás un enlace de recuperación.'
        });
      }
    );

    // ----------------------------------------
    // ESTABLECER NUEVA CONTRASEÑA
    // ----------------------------------------

    app.post<{
      Body: RecoveryConfirm;
    }>(
      '/auth/restablecer',
      {
        bodyLimit: 8192,

        config: {
          rateLimit: {
            max: 5,
            timeWindow: '10 minutes'
          }
        },

        schema: {
          body: recoveryConfirmSchema
        }
      },
      async (request, reply) => {
        await recovery.confirm(
          request.body.token,
          request.body.password
        );

        return reply.code(200).send({
          mensaje:
            'Contraseña actualizada correctamente. Inicia sesión nuevamente.'
        });
      }
    );
  } else {
    // Los endpoints siguen existiendo
    // aunque falte configurar el servicio.
    const recoveryUnavailable = async () => {
      throw new HttpError(
        503,
        'RECUPERACION_NO_CONFIGURADA',
        'La recuperación de contraseña no está disponible temporalmente.'
      );
    };

    app.post(
      '/auth/recuperacion',
      recoveryUnavailable
    );

    app.post(
      '/auth/restablecer',
      recoveryUnavailable
    );
  }

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  app.delete(
    '/auth/sesion',
    {
      onRequest: controller.requireSession
    },
    controller.logout
  );
}
