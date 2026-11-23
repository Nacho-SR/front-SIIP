import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../../shared/http-error.js';
import { requireRoles } from '../auth/guards/auth.guard.js';
import { bandejaCapturaSchema } from './schemas/bandeja.schema.js';
import type { BandejaRepository } from './repositories/bandeja.repository.js';

export async function bandejaRoutes(app: FastifyInstance, options: { repository?: BandejaRepository }) {
  app.addHook('onRequest', app.requireSession);
  app.addHook('onRequest', requireRoles('captura'));
  app.get('/indicadores', {
    schema: { querystring: z.strictObject({}), response: { 200: bandejaCapturaSchema } },
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const dependenciaId = request.usuario!.dependencia_id;
    if (!dependenciaId) throw new HttpError(403, 'DEPENDENCIA_REQUERIDA', 'Tu cuenta necesita una dependencia activa. Contacta a Administración.');
    if (!options.repository) throw new HttpError(503, 'BANDEJA_NO_CONFIGURADA', 'La consulta de asignaciones todavía no está disponible. Contacta a Administración.');
    return options.repository.find(dependenciaId);
  });
}
