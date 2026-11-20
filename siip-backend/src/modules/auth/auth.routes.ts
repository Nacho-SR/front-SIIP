
import type { FastifyInstance } from 'fastify';

import cookie from '@fastify/cookie';
import session from '@fastify/session';
import type { SessionStore } from '@fastify/session';
import csrf from '@fastify/csrf-protection';

import { z } from 'zod';

import type { Env } from '../../env.js';
import { HttpError } from '../../shared/http-error.js';

import type {
  AuthRepository
} from './repositories/auth.repository.js';

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
// DEPENDENCIAS
// ============================================

export interface AuthDependencies {
  repository: AuthRepository;
  sessionStore: SessionStore;
  recovery?: RecoveryRepository;
  recoveryMailer?: RecoveryMailer;
}

// ============================================
// VALIDAR TOKEN
// ============================================

const validateRecoverySchema = z.strictObject({
  token: z.string().regex(/^[a-f0-9]{64}$/i)
});

type ValidateRecovery = z.infer<
  typeof validateRecoverySchema
>;

// ============================================
// RUTAS DE AUTENTICACIÓN
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
    app.log.warn(
      {
        authDependencies: false,
        recoveryRepository: false,
        recoveryMailer: false
      },
      'Autenticación no configurada: no se recibieron dependencias.'
    );

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

    app.post('/auth/recuperacion', unavailable);
    app.post('/auth/validar-recuperacion', unavailable);
    app.post('/auth/restablecer', unavailable);

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
  // DIAGNÓSTICO DE RECUPERACIÓN
  // ==========================================

  // Informa si el módulo recibió las dos
  // dependencias necesarias.
  //
  // No registra correos, tokens, contraseñas
  // ni credenciales SMTP.

  app.log.info(
    {
      authDependencies: true,
      recoveryRepository: Boolean(
        dependencies.recovery
      ),
      recoveryMailer: Boolean(
        dependencies.recoveryMailer
      )
    },
    'Diagnóstico de inicialización del módulo de recuperación.'
  );

  // ==========================================
  // RECUPERACIÓN DE CONTRASEÑA
  // ==========================================

  if (
    dependencies.recovery &&
    dependencies.recoveryMailer
  ) {
    app.log.info(
      {
        recoveryEnabled: true
      },
      'El módulo de recuperación está habilitado.'
    );

    const recovery = createRecoveryService(
      dependencies.recovery,
      dependencies.recoveryMailer
    );

    // ----------------------------------------
    // SOLICITAR CORREO
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
            // Diagnóstico de configuración.
            // Se conserva el error original.
            request.log.error(
              {
                codigo: error.codigo,
                etapa: 'configuracion_correo'
              },
              'El servicio de correo no está configurado.'
            );

            throw error;
          }

          // Se conserva la respuesta genérica
          // para no revelar si el correo existe.
          //
          // Durante el diagnóstico, registrar
          // únicamente códigos técnicos seguros.

          const diagnostic =
            error instanceof Error
              ? error as Error & {
                  code?: string;
                  responseCode?: number;
                  command?: string;
                }
              : null;

          request.log.error(
            {
              codigo: 'RECUPERACION_FALLIDA',
              tipo: diagnostic?.name ?? 'Desconocido',
              codigoTecnico:
                diagnostic?.code ?? 'SIN_CODIGO',
              codigoSMTP:
                diagnostic?.responseCode ?? null,
              comandoSMTP:
                diagnostic?.command ?? null
            },
            'No se pudo procesar la recuperación.'
          );
        }

        return reply.code(202).send({
          mensaje:
            'Si la cuenta está habilitada, recibirás un enlace de recuperación.'
        });
      }
    );

    // ----------------------------------------
    // VALIDAR ENLACE ANTES DE MOSTRAR FORMULARIO
    // ----------------------------------------

    app.post<{
      Body: ValidateRecovery;
    }>(
      '/auth/validar-recuperacion',
      {
        bodyLimit: 4096,

        config: {
          rateLimit: {
            max: 20,
            timeWindow: '10 minutes'
          }
        },

        schema: {
          body: validateRecoverySchema,
          response: {
            200: z.object({
              valido: z.boolean()
            })
          }
        }
      },
      async (request, reply) => {
        const valido = await recovery.validate(
          request.body.token
        );

        return reply.code(200).send({
          valido
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
    // ========================================
    // RECUPERACIÓN NO CONFIGURADA
    // ========================================

    app.log.warn(
      {
        recoveryEnabled: false,
        recoveryRepository: Boolean(
          dependencies.recovery
        ),
        recoveryMailer: Boolean(
          dependencies.recoveryMailer
        )
      },
      'Recuperación deshabilitada porque faltan dependencias.'
    );

    const unavailable = async () => {
      throw new HttpError(
        503,
        'RECUPERACION_NO_CONFIGURADA',
        'La recuperación de contraseña no está disponible temporalmente.'
      );
    };

    app.post('/auth/recuperacion', unavailable);
    app.post('/auth/validar-recuperacion', unavailable);
    app.post('/auth/restablecer', unavailable);
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
