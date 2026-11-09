import type { Pool } from 'pg';
import { HttpError } from '../../../shared/http-error.js';
import { indicatorColumns } from '../schemas/indicadores.schema.js';
import type { CreateIndicator, Indicator } from '../schemas/indicadores.schema.js';

export interface IndicatorsRepository {
  list(): Promise<Indicator[]>;
  find(id: string): Promise<Indicator | null>;
  create(data: CreateIndicator, actorId: string): Promise<Indicator>;
}
type Row = Record<string, unknown> & {
  id: string; consecutivo: string; agrupacion: string; familia: string;
  activo: boolean; creado_en: Date; actualizado_en: Date;
};
const entries = Object.entries(indicatorColumns) as [keyof typeof indicatorColumns, string][];
const select = `SELECT i.*, i.id::text AS id, i.consecutivo::text AS consecutivo,
  g.codigo || '. ' || g.nombre AS agrupacion, f.codigo || '. ' || f.nombre AS familia
  FROM indicadores i JOIN familias f ON f.id = i.familia_id
  JOIN agrupaciones_tematicas g ON g.id = f.agrupacion_id`;

function indicator(row: Row): Indicator {
  return {
    id: row.id, activo: row.activo,
    campos: { ...Object.fromEntries(entries.map(([key, column]) => [key, row[column]])),
      consecutivo: row.consecutivo, agrupacion: row.agrupacion, familia: row.familia } as Indicator['campos'],
    creadoEn: row.creado_en.toISOString(), actualizadoEn: row.actualizado_en.toISOString(),
  };
}
function databaseError(error: unknown): never {
  const pg = error as { code?: string; constraint?: string };
  if (pg.code === '23505' && pg.constraint === 'indicadores_codigo_unico') {
    throw new HttpError(409, 'INDICADOR_YA_REGISTRADO', 'Ya existe un indicador con esa clave.');
  }
  if (pg.code === '42P01') {
    throw new HttpError(503, 'INDICADORES_NO_CONFIGURADOS', 'Falta preparar las tablas de indicadores. Comprueba los SQL 001, 002 y 005 en la base del backend.');
  }
  throw error;
}

export function createIndicatorsRepository(pool: Pool): IndicatorsRepository {
  return {
    async list() {
      try {
        return (await pool.query<Row>(`${select} ORDER BY i.consecutivo DESC`)).rows.map(indicator);
      } catch (error) { return databaseError(error); }
    },
    async find(id) {
      try {
        const row = (await pool.query<Row>(`${select} WHERE i.id = $1`, [id])).rows[0];
        return row ? indicator(row) : null;
      } catch (error) { return databaseError(error); }
    },
    async create(data, actorId) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const family = (await client.query<{ id: string; codigo: string; agrupacion_codigo: string }>(`
          SELECT f.id::text, f.codigo, g.codigo AS agrupacion_codigo
          FROM familias f JOIN agrupaciones_tematicas g ON g.id = f.agrupacion_id
          WHERE g.codigo || '. ' || g.nombre = $1 AND f.codigo || '. ' || f.nombre = $2
            AND f.activo AND g.activo FOR SHARE OF f, g
        `, [data.agrupacion, data.familia])).rows[0];
        if (!family) throw new HttpError(422, 'FAMILIA_NO_DISPONIBLE', 'Selecciona una familia activa que pertenezca a la agrupación.');
        if (!data.clave.startsWith(`SIIP.${family.agrupacion_codigo}.${family.codigo}.`)) {
          throw new HttpError(422, 'CLAVE_NO_COINCIDE', 'La clave debe corresponder a la agrupación y familia seleccionadas.');
        }
        const params = [family.id, ...entries.map(([key]) => data[key])];
        const inserted = await client.query<{ id: string }>(`
          INSERT INTO indicadores (familia_id, ${entries.map(([, column]) => column).join(', ')})
          VALUES (${params.map((_, index) => '$' + (index + 1)).join(', ')}) RETURNING id::text
        `, params);
        const row = (await client.query<Row>(`${select} WHERE i.id = $1`, [inserted.rows[0].id])).rows[0]!;
        const result = indicator(row);
        await client.query(`INSERT INTO auditoria_configuracion (actor_id, entidad, registro_id, accion, despues)
          VALUES ($1, 'indicadores', $2, 'crear', $3::jsonb)`, [actorId, result.id, JSON.stringify(result)]);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        return databaseError(error);
      } finally { client.release(); }
    },
  };
}
