import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../../shared/http-error.js';
import { requireRoles } from '../auth/guards/auth.guard.js';
import { idSchema } from '../auth/schemas/auth.schema.js';
import { guardarMetodologiaSchema, metodologiasConfigSchema, simulacionMetodologiaSchema, resultadoSimulacionSchema } from './schemas/metodologia.schema.js';
import type { GuardarMetodologia, SimulacionMetodologia } from './schemas/metodologia.schema.js';
import type { MetodologiaRepository } from './repositories/metodologia.repository.js';

export async function metodologiaRoutes(app: FastifyInstance, options: { repository?: MetodologiaRepository }) {
  app.addHook('onRequest', app.requireSession);
  app.addHook('onRequest', requireRoles('administrador'));
  const path = '/indicadores/:id/metodologia';
  const params = z.object({ id: idSchema });
  if (!options.repository) {
    const unavailable = async () => { throw new HttpError(503, 'METODOLOGIA_NO_CONFIGURADA', 'Falta configurar PostgreSQL para metodologías.'); };
    app.route({ method: ['GET', 'PUT'], url: path, handler: unavailable });
    app.post(path + '/simular', unavailable);
    return;
  }
  const repository = options.repository;
  app.get<{ Params: { id: string } }>(path, { schema: { params, response: { 200: metodologiasConfigSchema } } }, request => repository.find(request.params.id));
  app.put<{ Params: { id: string }; Body: GuardarMetodologia }>(path, {
    bodyLimit: 8192, schema: { params, body: guardarMetodologiaSchema, response: { 200: metodologiasConfigSchema } },
  }, request => repository.save(request.params.id, guardarMetodologiaSchema.parse(request.body), request.usuario!.id));
  app.post<{ Params: { id: string }; Body: SimulacionMetodologia }>(path + '/simular', {
    bodyLimit: 8192, schema: { params, body: simulacionMetodologiaSchema, response: { 200: resultadoSimulacionSchema } },
  }, request => repository.simulate(request.params.id, simulacionMetodologiaSchema.parse(request.body)));
}
