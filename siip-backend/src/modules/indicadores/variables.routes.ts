import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../../shared/http-error.js';
import { requireRoles } from '../auth/guards/auth.guard.js';
import { idSchema } from '../auth/schemas/auth.schema.js';
import { saveVariablesSchema, variablesConfigSchema } from './schemas/variables.schema.js';
import type { SaveVariables } from './schemas/variables.schema.js';
import type { VariablesRepository } from './repositories/variables.repository.js';

export async function variablesRoutes(app: FastifyInstance, options: { repository?: VariablesRepository }) {
  app.addHook('onRequest', app.requireSession);
  app.addHook('onRequest', requireRoles('administrador'));
  const path = '/indicadores/:id/variables';
  const params = z.object({ id: idSchema });
  if (!options.repository) {
    app.route({ method: ['GET', 'PUT'], url: path, handler: async () => {
      throw new HttpError(503, 'VARIABLES_NO_CONFIGURADAS', 'Falta configurar PostgreSQL para variables y asignaciones.');
    } });
    return;
  }
  const repository = options.repository;
  app.get<{ Params: { id: string } }>(path, {
    schema: { params, response: { 200: variablesConfigSchema } },
  }, request => repository.find(request.params.id));
  app.put<{ Params: { id: string }; Body: SaveVariables }>(path, {
    bodyLimit: 131072, schema: { params, body: saveVariablesSchema, response: { 200: variablesConfigSchema } },
  }, request => repository.save(request.params.id, saveVariablesSchema.parse(request.body), request.usuario!.id));
}
