
import { HttpError } from '../../../shared/http-error.js';

import { clavesBase } from '../data/catalogo-base.js';

import {
  createIndicatorSchema,
  updateIndicatorSchema
} from '../schemas/indicadores.schema.js';

import type {
  IndicatorsRepository
} from '../repositories/indicadores.repository.js';

export function createIndicatorsService(
  repository: IndicatorsRepository
) {
  return {

    // ==========================================
    // CONSULTAR INDICADORES
    // ==========================================

    list: () => repository.list(),

    // ==========================================
    // CONSULTAR INDICADOR POR ID
    // ==========================================

    async find(id: string) {
      const item = await repository.find(id);

      if (!item) {
        throw new HttpError(
          404,
          'INDICADOR_NO_ENCONTRADO',
          'No se encontró la ficha del indicador.'
        );
      }

      return item;
    },

    // ==========================================
    // CREAR INDICADOR
    // ==========================================

    async create(
      data: unknown,
      actorId: string
    ) {
      const fields = createIndicatorSchema.parse(data);

      // Proteger el catálogo base de 63 indicadores.
      if (clavesBase.includes(fields.clave)) {
        throw new HttpError(
          409,
          'INDICADOR_YA_REGISTRADO',
          'La clave ya existe en el catálogo base de 63 indicadores.'
        );
      }

      return repository.create(fields, actorId);
    },

    // ==========================================
    // EDITAR INDICADOR
    // ==========================================

    async update(
      id: string,
      data: unknown,
      actorId: string
    ) {
      const fields = updateIndicatorSchema.parse(data);

      // Impedir que una ficha administrada en
      // PostgreSQL utilice claves reservadas
      // para el catálogo original.
      if (clavesBase.includes(fields.clave)) {
        throw new HttpError(
          409,
          'INDICADOR_YA_REGISTRADO',
          'La clave pertenece al catálogo base de 63 indicadores.'
        );
      }

      return repository.update(
        id,
        fields,
        actorId
      );
    },

    // ==========================================
    // DESACTIVAR / REACTIVAR INDICADOR
    // ==========================================

    async changeStatus(
      id: string,
      data: unknown,
      actorId: string
    ) {
      const { activo } = statusSchema.parse(data);

      return repository.changeStatus(
        id,
        activo,
        actorId
      );
    }

  };
}

// ============================================
// VALIDACIÓN DE ESTADO
// ============================================

import { z } from 'zod';

const statusSchema = z.strictObject({
  activo: z.boolean()
});

export type IndicatorsService =
  ReturnType<typeof createIndicatorsService>;
