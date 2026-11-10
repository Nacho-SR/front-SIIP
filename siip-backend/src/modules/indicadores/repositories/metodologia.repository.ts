import { isDeepStrictEqual } from 'node:util';
import type { Pool, PoolClient } from 'pg';
import { HttpError } from '../../../shared/http-error.js';
import { contextoMetodologiaSchema, guardarMetodologiaSchema } from '../schemas/metodologia.schema.js';
import type { ContextoMetodologia, GuardarMetodologia, Metodologia, MetodologiasConfig, ReglaPorcentaje, SimulacionMetodologia } from '../schemas/metodologia.schema.js';
import { simularPorcentaje } from '../services/metodologia.service.js';
import type { Variable } from '../schemas/variables.schema.js';

export interface MetodologiaRepository {
  find(id: string): Promise<MetodologiasConfig>;
  save(id: string, data: GuardarMetodologia, actorId: string): Promise<MetodologiasConfig>;
  simulate(id: string, data: SimulacionMetodologia): Promise<ReturnType<typeof simularPorcentaje>>;
}
type Database = Pool | PoolClient;
type Indicator = { activo: boolean; version_variables: number; periodicidad: string; unidad_medida: string; sentido: string; acumulacion_texto: string };
async function indicator(database: Database, id: string, lock = false) {
  const row = (await database.query<Indicator>(`SELECT activo, version_variables, periodicidad, unidad_medida, sentido, acumulacion_texto
    FROM indicadores WHERE id = $1${lock ? ' FOR UPDATE' : ''}`, [id])).rows[0];
  if (!row) throw new HttpError(404, 'INDICADOR_NO_ENCONTRADO', 'No se encontró el indicador.');
  return row;
}
async function configuration(database: Database, id: string): Promise<MetodologiasConfig> {
  const rows = (await database.query<Omit<Metodologia, 'creadoEn'> & { creadoEn: Date }>(`
    SELECT id::text, version, jsonb_build_object('tipo', tipo, 'numeradorId', numerador_id::text,
      'denominadorId', denominador_id::text, 'amarilloDesde', amarillo_desde::float8, 'verdeDesde', verde_desde::float8) AS regla,
      contexto, creado_por::text AS "creadoPor", creado_en AS "creadoEn"
    FROM metodologias_indicador WHERE indicador_id = $1 ORDER BY version DESC`, [id])).rows;
  return { indicadorId: id, version: rows[0]?.version ?? 0,
    metodologias: rows.map(row => ({ ...row, creadoEn: row.creadoEn.toISOString() })) };
}
async function context(database: Database, id: string, row: Indicator, version: number, regla: ReglaPorcentaje): Promise<ContextoMetodologia> {
  if (row.activo) throw new HttpError(409, 'INDICADOR_ACTIVO', 'La metodología de un indicador activo requiere un flujo de cambio específico.');
  if (version !== row.version_variables) throw new HttpError(409, 'VARIABLES_DESACTUALIZADAS', 'Cambiaron las variables o sus responsables. Recarga antes de continuar.');
  const variables = (await database.query<Variable>(`SELECT v.id::text, v.codigo, v.descripcion, v.unidad_medida AS "unidadMedida",
    v.tipo_dato AS "tipoDato", v.dependencia_id::text AS "dependenciaId", d.nombre AS "dependenciaNombre", d.activo AS "dependenciaActiva"
    FROM variables_indicador v LEFT JOIN dependencias d ON d.id = v.dependencia_id WHERE v.indicador_id = $1 ORDER BY v.id`, [id])).rows;
  const supported = variables.length === 2 && variables.every(v => v.tipoDato === 'entero')
    && variables.some(v => v.id === regla.numeradorId) && variables.some(v => v.id === regla.denominadorId)
    && variables[0]!.unidadMedida.trim().toLowerCase() === variables[1]!.unidadMedida.trim().toLowerCase()
    && row.unidad_medida === '%' && row.sentido === 'Ascendente' && row.acumulacion_texto === 'No acumulable';
  if (!supported) throw new HttpError(422, 'METODOLOGIA_NO_COMPATIBLE', 'Esta etapa admite porcentajes ascendentes no acumulables, con dos conteos de la misma unidad. Selecciona sus variables como parte y total.');
  if (variables.some(v => v.dependenciaId && !v.dependenciaActiva)) throw new HttpError(422, 'DEPENDENCIA_NO_DISPONIBLE', 'Hay responsables inactivos. Revisa las asignaciones.');
  return contextoMetodologiaSchema.parse({ versionVariables: version, frecuencia: row.periodicidad, unidadResultado: row.unidad_medida,
    sentido: row.sentido, acumulacion: row.acumulacion_texto, variables });
}
function databaseError(error: unknown): never {
  if (['42P01', '42703'].includes((error as { code?: string }).code ?? '')) {
    throw new HttpError(503, 'METODOLOGIA_NO_CONFIGURADA', 'Falta preparar la configuración de metodologías. Comprueba SQL 007 en la base del backend.');
  }
  throw error;
}
export function createMetodologiaRepository(pool: Pool): MetodologiaRepository {
  return {
    async find(id) {
      try { await indicator(pool, id); return await configuration(pool, id); }
      catch (error) { return databaseError(error); }
    },
    async simulate(id, data) {
      try { await context(pool, id, await indicator(pool, id), data.versionVariables, data.regla); return simularPorcentaje(data); }
      catch (error) { return databaseError(error); }
    },
    async save(id, input, actorId) {
      const data = guardarMetodologiaSchema.parse(input);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const row = await indicator(client, id, true);
        const before = await configuration(client, id);
        if (before.version !== data.version) throw new HttpError(409, 'METODOLOGIA_DESACTUALIZADA', 'Otra persona guardó una metodología. Recarga antes de guardar.');
        const snapshot = await context(client, id, row, data.versionVariables, data.regla);
        const ids = [...new Set(snapshot.variables.map(v => v.dependenciaId).filter((value): value is string => value !== null))].sort();
        if (ids.length) {
          const active = await client.query('SELECT id FROM dependencias WHERE id = ANY($1::bigint[]) AND activo ORDER BY id FOR SHARE', [ids]);
          if (active.rows.length !== ids.length) throw new HttpError(422, 'DEPENDENCIA_NO_DISPONIBLE', 'Hay responsables inactivos. Revisa las asignaciones.');
        }
        const latest = before.metodologias[0];
        if (latest && isDeepStrictEqual(latest.regla, data.regla) && isDeepStrictEqual(latest.contexto, snapshot)) {
          await client.query('COMMIT'); return before;
        }
        const regla = data.regla;
        await client.query(`INSERT INTO metodologias_indicador (indicador_id, version, tipo, numerador_id, denominador_id,
          amarillo_desde, verde_desde, contexto, creado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,
        [id, before.version + 1, regla.tipo, regla.numeradorId, regla.denominadorId, regla.amarilloDesde, regla.verdeDesde, JSON.stringify(snapshot), actorId]);
        const result = await configuration(client, id);
        const saved = result.metodologias[0]!;
        await client.query(`INSERT INTO auditoria_configuracion (actor_id, entidad, registro_id, accion, antes, despues)
          VALUES ($1, 'metodologias_indicador', $2, 'crear', NULL, $3::jsonb)`, [actorId, saved.id, JSON.stringify({ indicadorId: id, ...saved })]);
        await client.query('COMMIT'); return result;
      } catch (error) { await client.query('ROLLBACK'); return databaseError(error); }
      finally { client.release(); }
    },
  };
}
