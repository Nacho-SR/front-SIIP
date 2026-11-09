import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../../shared/http-error.js';
import { requireRoles } from '../auth/guards/auth.guard.js';
import { idSchema } from '../auth/schemas/auth.schema.js';
import { createIndicatorsController } from './controllers/indicadores.controller.js';
import { createIndicatorsService } from './services/indicadores.service.js';
import { createIndicatorSchema, indicatorSchema } from './schemas/indicadores.schema.js';
import type { IndicatorsRepository } from './repositories/indicadores.repository.js';

export async function indicatorsRoutes(app: FastifyInstance, options: { repository?: IndicatorsRepository }) {
  app.addHook('onRequest', app.requireSession);
  app.addHook('onRequest', requireRoles('administrador'));
  if (!options.repository) {
    const unavailable = async () => { throw new HttpError(503, 'INDICADORES_NO_CONFIGURADOS', 'Falta configurar PostgreSQL para indicadores.'); };
    app.route({ method: ['GET', 'POST'], url: '/indicadores', handler: unavailable });
    app.get('/indicadores/:id', { schema: { params: z.object({ id: idSchema }) } }, unavailable);
    return;
  }
  const controller = createIndicatorsController(createIndicatorsService(options.repository));
  app.get('/indicadores', { schema: { response: { 200: z.array(indicatorSchema) } } }, controller.list);
  app.get('/indicadores/:id', {
    schema: { params: z.object({ id: idSchema }), response: { 200: indicatorSchema } },
  }, controller.find);
  app.post('/indicadores', {
    bodyLimit: 262144, schema: { body: createIndicatorSchema, response: { 201: indicatorSchema } },
  }, controller.create);
}
