import Fastify from 'fastify';
import type { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Env } from './env.js';
import { registerAuth } from './modules/auth/auth.routes.js';
import type { AuthDependencies } from './modules/auth/auth.routes.js';
import { HttpError } from './shared/http-error.js';

export async function buildApp(env: Env, auth?: AuthDependencies) {
  const app = Fastify({
    logger: {
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'res.headers["set-cookie"]'],
    },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet);
  await app.register(cors, {
    origin: [env.FRONTEND_ORIGIN],
    credentials: true,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const validation = !!error.validation;
    const status = validation ? 422 : (error.statusCode ?? 500);
    const codigo = error instanceof HttpError ? error.codigo
      : validation ? 'DATOS_INVALIDOS'
      : status === 403 ? 'CSRF_INVALIDO'
      : status === 429 ? 'DEMASIADAS_SOLICITUDES'
      : status < 500 ? 'SOLICITUD_INVALIDA' : 'ERROR_INTERNO';
    if (status >= 500) request.log.error({ codigo: error.code }, 'No se pudo completar la solicitud.');
    return reply.code(status).type('application/problem+json').header('Cache-Control', 'no-store').send({
      type: 'about:blank', title: codigo, status, codigo,
      detail: error instanceof HttpError ? error.message
        : validation ? 'Revisa los datos enviados.' : 'No se pudo completar la solicitud.',
      instance: request.url.split('?')[0],
      errores: error.validation?.map((issue) => ({
        campo: issue.instancePath || '/', codigo: 'DATO_INVALIDO',
        detalle: issue.message ?? 'Valor no válido.',
      })) ?? [],
      pendientes: codigo === 'AUTENTICACION_NO_CONFIGURADA' ? ['AUTENTICACION'] : [],
    });
  });

  await app.register(async (api) => {
    await registerAuth(api, { env, dependencies: auth });
    // Registrar aquí los demás módulos para compartir sesión y api.requireSession.
  }, { prefix: '/api/v1' });

  app.get('/api/v1/salud', {
    schema: { response: { 200: z.object({ estado: z.literal('ok') }) } },
  }, async (_request, reply) => {
    return reply.header('Cache-Control', 'no-store').send({ estado: 'ok' });
  });

  return app;
}
