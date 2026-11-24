import type { Pool } from 'pg';
import { HttpError } from '../../../shared/http-error.js';
import { indicatorColumns } from '../../indicadores/schemas/indicadores.schema.js';
import { fichaConsultaSchema, type IndicadorConsulta } from '../schemas/consulta.schema.js';

export interface ConsultaRepository {
  list(dependenciaId: string | null): Promise<IndicadorConsulta[]>;
}

const campos = Object.keys(fichaConsultaSchema.shape) as (keyof typeof fichaConsultaSchema.shape)[];
// Las expresiones y alias proceden exclusivamente de constantes del backend.
const columns = campos.map(key => {
  const column = key === 'agrupacion' ? "g.codigo || '. ' || g.nombre"
    : key === 'familia' ? "f.codigo || '. ' || f.nombre" : `i.${indicatorColumns[key]}`;
  return `COALESCE(${column}, '') AS "${key}"`;
}).join(', ');

export function createConsultaRepository(pool: Pool): ConsultaRepository {
  return {
    async list(dependenciaId) {
      try {
        const result = await pool.query<IndicadorConsulta>(`
          SELECT i.id::text AS id, i.activo, ${columns}
          FROM indicadores i
          JOIN familias f ON f.id = i.familia_id
          JOIN agrupaciones_tematicas g ON g.id = f.agrupacion_id
          WHERE ($1::bigint IS NULL OR EXISTS (
            SELECT 1 FROM variables_indicador v
            JOIN dependencias d ON d.id = v.dependencia_id AND d.activo
            WHERE v.indicador_id = i.id AND v.dependencia_id = $1
          ))
          ORDER BY g.codigo, f.codigo, i.codigo, i.id
        `, [dependenciaId]);
        return result.rows;
      } catch (error) {
        if (['42P01', '42703'].includes((error as { code?: string }).code ?? '')) {
          throw new HttpError(503, 'CONSULTA_NO_CONFIGURADA', 'El catálogo de consulta todavía no está disponible. Contacta a Administración.');
        }
        throw error;
      }
    },
  };
}
