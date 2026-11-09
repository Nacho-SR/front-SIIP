import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateIndicator } from '../schemas/indicadores.schema.js';
import type { IndicatorsService } from '../services/indicadores.service.js';

export function createIndicatorsController(service: IndicatorsService) {
  return {
    list: () => service.list(),
    find: (request: FastifyRequest<{ Params: { id: string } }>) => service.find(request.params.id),
    async create(request: FastifyRequest<{ Body: CreateIndicator }>, reply: FastifyReply) {
      return reply.code(201).send(await service.create(request.body, request.usuario!.id));
    },
  };
}
