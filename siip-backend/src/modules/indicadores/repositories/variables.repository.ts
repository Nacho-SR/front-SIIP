import type { Pool, PoolClient } from 'pg';
import { HttpError } from '../../../shared/http-error.js';
import type { SaveVariables, Variable, VariablesConfig } from '../schemas/variables.schema.js';

export interface VariablesRepository {
  find(indicatorId: string): Promise<VariablesConfig>;
  save(indicatorId: string, data: SaveVariables, actorId: string): Promise<VariablesConfig>;
}
type Context = { id: string; activo: boolean; version_variables: number };
async function readVariables(database: Pool | PoolClient, id: string): Promise<Variable[]> {
  return (await database.query<Variable>(`
    SELECT v.id::text, v.codigo, v.descripcion, v.unidad_medida AS "unidadMedida",
      v.tipo_dato AS "tipoDato", v.dependencia_id::text AS "dependenciaId",
      d.nombre AS "dependenciaNombre", d.activo AS "dependenciaActiva"
    FROM variables_indicador v LEFT JOIN dependencias d ON d.id = v.dependencia_id
    WHERE v.indicador_id = $1 ORDER BY v.id
  `, [id])).rows;
}
function databaseError(error: unknown): never {
  const pg = error as { code?: string; constraint?: string };
  if (pg.code === '42P01' || pg.code === '42703') {
    throw new HttpError(503, 'VARIABLES_NO_CONFIGURADAS', 'Falta preparar las tablas de variables. Comprueba SQL 006 en la base del backend.');
  }
  if (pg.code === '23505') throw new HttpError(409, 'VARIABLE_DUPLICADA', 'El indicador ya tiene una variable con ese código.');
  throw error;
}
export function createVariablesRepository(pool: Pool): VariablesRepository {
  return {
    async find(id) {
      try {
        const context = (await pool.query<Context>('SELECT id::text, activo, version_variables FROM indicadores WHERE id = $1', [id])).rows[0];
        if (!context) throw new HttpError(404, 'INDICADOR_NO_ENCONTRADO', 'No se encontró el indicador.');
        return { indicadorId: id, version: context.version_variables, variables: await readVariables(pool, id) };
      } catch (error) { return databaseError(error); }
    },
    async save(id, data, actorId) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const context = (await client.query<Context>(
          'SELECT id::text, activo, version_variables FROM indicadores WHERE id = $1 FOR UPDATE', [id],
        )).rows[0];
        if (!context) throw new HttpError(404, 'INDICADOR_NO_ENCONTRADO', 'No se encontró el indicador.');
        if (context.activo) throw new HttpError(409, 'INDICADOR_ACTIVO', 'La configuración de un indicador activo requiere un flujo de cambio de metodología.');
        if (context.version_variables !== data.version) {
          throw new HttpError(409, 'CONFIGURACION_DESACTUALIZADA', 'Otra persona modificó las variables. Recarga la configuración antes de guardar.');
        }
        const previous = await readVariables(client, id);
        if (previous.some(variable => !data.variables.some(item => item.id === variable.id))) {
          throw new HttpError(422, 'VARIABLE_OMITIDA', 'Incluye todas las variables registradas. Esta operación no elimina variables.');
        }
        const dependencyIds = [...new Set(data.variables.map(variable => variable.dependenciaId).filter((value): value is string => value !== null))].sort();
        if (dependencyIds.length) {
          const active = await client.query<{ id: string }>(
            'SELECT id::text FROM dependencias WHERE id = ANY($1::bigint[]) AND activo ORDER BY id FOR SHARE', [dependencyIds],
          );
          if (active.rows.length !== dependencyIds.length) {
            throw new HttpError(422, 'DEPENDENCIA_NO_DISPONIBLE', 'Selecciona dependencias activas o deja la variable sin asignar.');
          }
        }
        let changed = false;
        for (const item of data.variables) {
          const before = item.id ? previous.find(variable => variable.id === item.id) : undefined;
          if (item.id && !before) throw new HttpError(422, 'VARIABLE_AJENA', 'Una variable no pertenece al indicador seleccionado.');
          if (before && ['codigo', 'descripcion', 'unidadMedida', 'tipoDato'].some(key => before[key as keyof Variable] !== item[key as keyof typeof item])) {
            throw new HttpError(422, 'DEFINICION_NO_EDITABLE', 'Las variables registradas conservan su definición. Puedes cambiar su dependencia.');
          }
          if (before && before.dependenciaId === item.dependenciaId) continue;
          let variableId = item.id;
          if (before) {
            await client.query('UPDATE variables_indicador SET dependencia_id = $1 WHERE id = $2 AND indicador_id = $3', [item.dependenciaId, item.id, id]);
          } else {
            variableId = (await client.query<{ id: string }>(`
              INSERT INTO variables_indicador (indicador_id, codigo, descripcion, unidad_medida, tipo_dato, dependencia_id)
              VALUES ($1, $2, $3, $4, $5, $6) RETURNING id::text
            `, [id, item.codigo, item.descripcion, item.unidadMedida, item.tipoDato, item.dependenciaId])).rows[0]!.id;
          }
          const after = { ...item, id: variableId };
          await client.query(`INSERT INTO auditoria_configuracion (actor_id, entidad, registro_id, accion, antes, despues)
            VALUES ($1, 'variables_indicador', $2, $3, $4::jsonb, $5::jsonb)`,
          [actorId, variableId, before ? 'modificar' : 'crear', before ? JSON.stringify(before) : null, JSON.stringify(after)]);
          changed = true;
        }
        if (changed) await client.query('UPDATE indicadores SET version_variables = version_variables + 1 WHERE id = $1', [id]);
        const result = { indicadorId: id, version: data.version + (changed ? 1 : 0), variables: await readVariables(client, id) };
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        return databaseError(error);
      } finally { client.release(); }
    },
  };
}
