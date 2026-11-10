
import type {
  FastifyReply,
  FastifyRequest
} from 'fastify';

import type {
  CreateIndicator,
  UpdateIndicator
} from '../schemas/indicadores.schema.js';

import type {
  IndicatorsService
} from '../services/indicadores.service.js';

interface IdParams {
  id: string;
}

interface ChangeStatusBody {
  activo: boolean;
}

export function createIndicatorsController(
  service: IndicatorsService
) {
  return {

    // ==========================================
    // LISTAR INDICADORES
    // GET /administracion/indicadores
    // ==========================================

    async list() {
      return service.list();
    },

    // ==========================================
    // CONSULTAR INDICADOR
    // GET /administracion/indicadores/:id
    // ==========================================

    async find(
      request: FastifyRequest<{
        Params: IdParams;
      }>
    ) {
      return service.find(request.params.id);
    },

    // ==========================================
    // CREAR INDICADOR
    // POST /administracion/indicadores
    // ==========================================

    async create(
      request: FastifyRequest<{
        Body: CreateIndicator;
      }>,
      reply: FastifyReply
    ) {
      const indicator = await service.create(
        request.body,
        request.usuario!.id
      );

      return reply.code(201).send(indicator);
    },

    // ==========================================
    // EDITAR INDICADOR
    // PATCH /administracion/indicadores/:id
    // ==========================================

    async update(
      request: FastifyRequest<{
        Params: IdParams;
        Body: UpdateIndicator;
      }>,
      reply: FastifyReply
    ) {
      const indicator = await service.update(
        request.params.id,
        request.body,
        request.usuario!.id
      );

      return reply.code(200).send(indicator);
    },

    // ==========================================
    // ACTIVAR / DESACTIVAR INDICADOR
    // PATCH /administracion/indicadores/:id/estado
    // ==========================================

    async changeStatus(
      request: FastifyRequest<{
        Params: IdParams;
        Body: ChangeStatusBody;
      }>,
      reply: FastifyReply
    ) {
      const indicator = await service.changeStatus(
        request.params.id,
        request.body,
        request.usuario!.id
      );

      return reply.code(200).send(indicator);
    }

  };
}
