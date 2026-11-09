import { HttpError } from '../../../shared/http-error.js';
import { clavesBase } from '../data/catalogo-base.js';
import { createIndicatorSchema } from '../schemas/indicadores.schema.js';
import type { IndicatorsRepository } from '../repositories/indicadores.repository.js';

export function createIndicatorsService(repository: IndicatorsRepository) {
  return {
    list: () => repository.list(),
    async find(id: string) {
      const item = await repository.find(id);
      if (!item) throw new HttpError(404, 'INDICADOR_NO_ENCONTRADO', 'No se encontró la ficha del indicador.');
      return item;
    },
    async create(data: unknown, actorId: string) {
      const fields = createIndicatorSchema.parse(data);
      if (clavesBase.includes(fields.clave)) {
        throw new HttpError(409, 'INDICADOR_YA_REGISTRADO', 'La clave ya existe en el catálogo base de 63 indicadores.');
      }
      return repository.create(fields, actorId);
    },
  };
}
export type IndicatorsService = ReturnType<typeof createIndicatorsService>;
