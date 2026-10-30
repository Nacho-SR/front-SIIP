import type { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import type { SessionStore } from '@fastify/session';
import csrf from '@fastify/csrf-protection';
import type { Env } from '../../env.js';
import { HttpError } from '../../shared/http-error.js';
import type { AuthRepository } from './repositories/auth.repository.js';
import { createAuthService } from './services/auth.service.js';
import { credentialsSchema, sessionSchema } from './schemas/auth.schema.js';
import type { Credentials } from './schemas/auth.schema.js';
import {
  createAuthController, SESSION_COOKIE, SESSION_PATH, SESSION_TTL_MS,
} from './controllers/auth.controller.js';

export interface AuthDependencies {
  repository: AuthRepository;
  sessionStore: SessionStore;
}

export async function registerAuth(app: FastifyInstance, options: {
  env: Env; dependencies?: AuthDependencies;
}) {
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
  });

  if (!options.dependencies) {
    app.decorate('requireSession', async () => {
      throw new HttpError(503, 'AUTENTICACION_NO_CONFIGURADA', 'Falta configurar PostgreSQL para autenticación.');
    });
    app.route({
      method: ['GET', 'POST', 'DELETE'], url: '/auth/sesion',
      handler: async () => {
        throw new HttpError(503, 'AUTENTICACION_NO_CONFIGURADA', 'Falta configurar PostgreSQL para autenticación.');
      },
    });
    return;
  }

  const { env, dependencies } = options;
  const service = await createAuthService(dependencies.repository, env.SESSION_SECRET);
  const controller = createAuthController(service);

  await app.register(cookie);
  await app.register(session, {
    secret: env.SESSION_SECRET,
    cookieName: SESSION_COOKIE,
    store: dependencies.sessionStore,
    saveUninitialized: false,
    rolling: false,
    cookie: {
      path: SESSION_PATH, httpOnly: true, sameSite: 'lax',
      secure: env.NODE_ENV === 'production' || env.FRONTEND_ORIGIN.startsWith('https:'),
      maxAge: SESSION_TTL_MS,
    },
  });
  await app.register(csrf, {
    sessionPlugin: '@fastify/session',
    getToken: (request) => {
      const token = request.headers['x-csrf-token'];
      return typeof token === 'string' ? token : '';
    },
  });
  app.decorateRequest('usuario', null);
  app.decorate('requireSession', controller.requireSession);

  app.addHook('onRequest', (request, reply, done) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      done();
      return;
    }
    if (request.headers.origin !== env.FRONTEND_ORIGIN) {
      done(new HttpError(403, 'ORIGEN_NO_PERMITIDO', 'Origen no autorizado.'));
      return;
    }
    app.csrfProtection(request, reply, done);
  });

  app.get('/auth/sesion', { schema: { response: { 200: sessionSchema } } }, controller.bootstrap);
  app.post<{ Body: Credentials }>('/auth/sesion', {
    bodyLimit: 8192,
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: { body: credentialsSchema, response: { 200: sessionSchema } },
  }, controller.login);
  app.delete('/auth/sesion', {
    onRequest: controller.requireSession,
  }, controller.logout);
}
