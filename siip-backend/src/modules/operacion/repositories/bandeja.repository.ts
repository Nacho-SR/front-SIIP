import type { Pool } from 'pg';
import { HttpError } from '../../../shared/http-error.js';
import type { BandejaCaptura, IndicadorAsignado, VariableAsignada } from '../schemas/bandeja.schema.js';
import { fechaMexico, periodoNatural, ZONA_HORARIA } from '../../indicadores/services/periodos.service.js';

export interface BandejaRepository {
  find(dependenciaId: string): Promise<BandejaCaptura>;
}
type AssignedRow = Omit<IndicadorAsignado, 'id' | 'variables' | 'periodoActual'> & Omit<VariableAsignada, 'id'> & {
  indicadorId: string; variableId: string;
};

export function createBandejaRepository(pool: Pool, clock = () => new Date()): BandejaRepository {
  return {
    async find(dependenciaId) {
      try {
        const fechaServidor = fechaMexico(clock());
        const dependency = await pool.query<BandejaCaptura['dependencia']>(
          'SELECT id::text, clave, nombre FROM dependencias WHERE id = $1 AND activo', [dependenciaId],
        );
        const dependencia = dependency.rows[0];
        if (!dependencia) throw new HttpError(403, 'DEPENDENCIA_NO_DISPONIBLE', 'Tu dependencia no está disponible. Contacta a Administración.');
        // La dependencia proviene de la sesión; el filtro también limita las variables de indicadores compartidos.
        const result = await pool.query<AssignedRow>(`
          SELECT i.id::text AS "indicadorId", i.codigo AS clave, i.nombre,
            g.codigo || '. ' || g.nombre AS agrupacion, f.codigo || '. ' || f.nombre AS familia,
            i.periodicidad AS frecuencia, i.activo,
            to_char(a.primer_periodo, 'YYYY-MM-DD') AS "primerPeriodo",
            v.id::text AS "variableId", v.codigo, v.descripcion,
            v.unidad_medida AS "unidadMedida", v.tipo_dato AS "tipoDato"
          FROM variables_indicador v
          JOIN dependencias d ON d.id = v.dependencia_id AND d.activo
          JOIN indicadores i ON i.id = v.indicador_id
          JOIN familias f ON f.id = i.familia_id
          JOIN agrupaciones_tematicas g ON g.id = f.agrupacion_id
          LEFT JOIN activaciones_indicador a
            ON a.indicador_id = i.id AND a.desactivado_en IS NULL AND i.activo
          WHERE v.dependencia_id = $1
          ORDER BY i.codigo, i.id, v.id
        `, [dependenciaId]);
        const indicadores = new Map<string, IndicadorAsignado>();
        for (const row of result.rows) {
          let indicador = indicadores.get(row.indicadorId);
          if (!indicador) {
            indicador = { id: row.indicadorId, clave: row.clave, nombre: row.nombre,
              agrupacion: row.agrupacion, familia: row.familia, frecuencia: row.frecuencia,
              activo: row.activo, primerPeriodo: row.primerPeriodo,
              periodoActual: periodoNatural(fechaServidor, row.frecuencia), variables: [] };
            indicadores.set(indicador.id, indicador);
          }
          indicador.variables.push({ id: row.variableId, codigo: row.codigo, descripcion: row.descripcion,
            unidadMedida: row.unidadMedida, tipoDato: row.tipoDato });
        }
        return { dependencia, fechaServidor, zonaHoraria: ZONA_HORARIA, indicadores: [...indicadores.values()] };
      } catch (error) {
        if (['42P01', '42703'].includes((error as { code?: string }).code ?? '')) {
          throw new HttpError(503, 'BANDEJA_NO_CONFIGURADA', 'La consulta de asignaciones todavía no está disponible. Contacta a Administración.');
        }
        throw error;
      }
    },
  };
}
