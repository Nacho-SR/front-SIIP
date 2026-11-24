import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../../shared/http-error.js';
import { requireRoles } from '../auth/guards/auth.guard.js';
import { catalogoConsultaSchema } from './schemas/consulta.schema.js';
import type { ConsultaRepository } from './repositories/consulta.repository.js';

export async function consultaRoutes(app: FastifyInstance, options: { repository?: ConsultaRepository }) {
  app.addHook('onRequest', app.requireSession);
  app.addHook('onRequest', requireRoles('captura', 'revision', 'administrador', 'consulta'));
  app.get('/indicadores', {
    schema: { querystring: z.strictObject({}), response: { 200: catalogoConsultaSchema } },
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const usuario = request.usuario!;
    if (usuario.rol === 'captura' && !usuario.dependencia_id) {
      throw new HttpError(403, 'DEPENDENCIA_REQUERIDA', 'Tu cuenta necesita una dependencia activa. Contacta a Administración.');
    }
    if (!options.repository) {
      throw new HttpError(503, 'CONSULTA_NO_CONFIGURADA', 'El catálogo de consulta todavía no está disponible. Contacta a Administración.');
    }
    return { indicadores: await options.repository.list(usuario.rol === 'captura' ? usuario.dependencia_id : null) };
  });
}
