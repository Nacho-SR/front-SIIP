import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../../shared/http-error.js';
import { requireRoles } from '../auth/guards/auth.guard.js';
import { idSchema } from '../auth/schemas/auth.schema.js';
import { activarIndicadorSchema, preparacionActivacionSchema } from './schemas/activacion.schema.js';
import type { ActivarIndicador } from './schemas/activacion.schema.js';
import type { ActivacionRepository } from './repositories/activacion.repository.js';

export async function activacionRoutes(app: FastifyInstance, options: { repository?: ActivacionRepository }) {
  app.addHook('onRequest', app.requireSession);
  app.addHook('onRequest', requireRoles('administrador'));
  const path = '/indicadores/:id/activacion';
  if (!options.repository) {
    app.route({ method: ['GET', 'POST'], url: path, handler: async () => { throw new HttpError(503, 'ACTIVACION_NO_CONFIGURADA', 'Falta configurar PostgreSQL para activaciones.'); } });
    return;
  }
  const repository = options.repository;
  const params = z.object({ id: idSchema });
  app.get<{ Params: { id: string } }>(path, { schema: { params, response: { 200: preparacionActivacionSchema } } }, request => repository.find(request.params.id));
  app.post<{ Params: { id: string }; Body: ActivarIndicador }>(path, { bodyLimit: 4096,
    schema: { params, body: activarIndicadorSchema, response: { 200: preparacionActivacionSchema } },
  }, request => repository.activate(request.params.id, activarIndicadorSchema.parse(request.body), request.usuario!.id));
}
