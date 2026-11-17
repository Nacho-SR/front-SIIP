import { isDeepStrictEqual } from 'node:util';
import type { Pool, PoolClient } from 'pg';
import { HttpError } from '../../../shared/http-error.js';
import { leerContextoMetodologia, leerIndicadorMetodologia, leerMetodologias } from './metodologia.repository.js';
import { activarIndicadorSchema } from '../schemas/activacion.schema.js';
import type { Activacion, ActivarIndicador, PreparacionActivacion } from '../schemas/activacion.schema.js';
import { inicioPeriodoValido, minimoInicio, type Frecuencia } from '../services/periodos.service.js';

export interface ActivacionRepository {
  find(id: string): Promise<PreparacionActivacion>;
  activate(id: string, data: ActivarIndicador, actorId: string): Promise<PreparacionActivacion>;
}
async function preparacion(database: Pool | PoolClient, id: string, clock: () => Date, lock = false): Promise<PreparacionActivacion> {
  const row = await leerIndicadorMetodologia(database, id, lock);
  const current = (await leerMetodologias(database, id)).metodologias[0];
  const rows = (await database.query<Omit<Activacion, 'creadoEn' | 'desactivadoEn'> & { creadoEn: Date; desactivadoEn: Date | null }>(`SELECT a.id::text, a.metodologia_id::text AS "metodologiaId",
    m.version AS "versionMetodologia", to_char(a.primer_periodo, 'YYYY-MM-DD') AS "primerPeriodo", a.creado_en AS "creadoEn",
    a.creado_por::text AS "creadoPor", a.desactivado_en AS "desactivadoEn", a.desactivado_por::text AS "desactivadoPor"
    FROM activaciones_indicador a JOIN metodologias_indicador m ON m.id = a.metodologia_id
    WHERE a.indicador_id = $1 ORDER BY a.primer_periodo DESC, a.id DESC`, [id])).rows;
  const historial = rows.map(row => ({ ...row, creadoEn: row.creadoEn.toISOString(), desactivadoEn: row.desactivadoEn?.toISOString() ?? null }));
  const pendientes: string[] = [];
  if (row.activo) pendientes.push('El indicador ya está activo.');
  if (!current) pendientes.push('Guarda primero una metodología de cálculo y semáforo.');
  if (!row.activo && current) {
    try {
      const snapshot = await leerContextoMetodologia(database, id, row, current.contexto.versionVariables, current.regla);
      if (!isDeepStrictEqual(snapshot, current.contexto)) pendientes.push('La ficha o sus responsables cambiaron. Guarda nuevamente la metodología para actualizar su contexto.');
      if (snapshot.variables.some(v => !v.dependenciaId)) pendientes.push('Asigna una dependencia responsable a todas las variables.');
      const ids = [...new Set(snapshot.variables.map(v => v.dependenciaId).filter((value): value is string => value !== null))].sort();
      if (lock && ids.length) {
        const active = await database.query('SELECT id FROM dependencias WHERE id = ANY($1::bigint[]) AND activo ORDER BY id FOR SHARE', [ids]);
        if (active.rows.length !== ids.length) pendientes.push('Hay dependencias responsables inactivas.');
      }
    } catch (error) {
      if (error instanceof HttpError && [409, 422].includes(error.statusCode)) pendientes.push(error.message);
      else throw error;
    }
  }
  const classification = await database.query(`SELECT f.id FROM indicadores i JOIN familias f ON f.id = i.familia_id
    JOIN agrupaciones_tematicas g ON g.id = f.agrupacion_id WHERE i.id = $1 AND f.activo AND g.activo
    AND i.codigo LIKE 'SIIP.' || g.codigo || '.' || f.codigo || '.%'${lock ? ' FOR SHARE OF f, g' : ''}`, [id]);
  if (!classification.rows.length) pendientes.push('La familia y agrupación deben estar activas y corresponder a la clave del indicador.');
  if (!row.activo && historial.some(a => a.desactivadoEn === null)) pendientes.push('Existe una activación abierta incompatible con el estado del indicador. Requiere revisión técnica.');
  const frecuencia = row.periodicidad as Frecuencia;
  return { indicadorId: id, activo: row.activo, metodologiaId: current?.id ?? null, versionMetodologia: current?.version ?? 0,
    frecuencia, minimoInicio: minimoInicio(frecuencia, clock()),
    puedeActivar: pendientes.length === 0, pendientes, historial };
}
function databaseError(error: unknown): never {
  if (['42P01', '42703'].includes((error as { code?: string }).code ?? '')) throw new HttpError(503, 'ACTIVACION_NO_CONFIGURADA', 'Falta preparar las tablas de activación. Comprueba SQL 007 y 008 en la base del backend.');
  throw error;
}
export function createActivacionRepository(pool: Pool, clock = () => new Date()): ActivacionRepository {
  return {
    async find(id) {
      try { return await preparacion(pool, id, clock); }
      catch (error) { return databaseError(error); }
    },
    async activate(id, input, actorId) {
      const data = activarIndicadorSchema.parse(input);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const before = await preparacion(client, id, clock, true);
        if (!before.puedeActivar) throw new HttpError(409, 'ACTIVACION_INCOMPLETA', before.pendientes.join(' '));
        if (data.metodologiaId !== before.metodologiaId) throw new HttpError(409, 'METODOLOGIA_DESACTUALIZADA', 'Cambió la metodología preparada. Recarga antes de activar.');
        if (!inicioPeriodoValido(data.primerPeriodo, before.frecuencia) || data.primerPeriodo < before.minimoInicio) {
          throw new HttpError(422, 'PERIODO_INICIAL_INVALIDO', `Selecciona un inicio natural de ${before.frecuencia.toLowerCase()}, desde ${before.minimoInicio}.`);
        }
        await client.query(`INSERT INTO activaciones_indicador (indicador_id, metodologia_id, primer_periodo, creado_por)
          VALUES ($1,$2,$3::date,$4)`, [id, data.metodologiaId, data.primerPeriodo, actorId]);
        await client.query('UPDATE indicadores SET activo = true, actualizado_en = now() WHERE id = $1', [id]);
        const after = await preparacion(client, id, clock);
        await client.query(`INSERT INTO auditoria_configuracion (actor_id, entidad, registro_id, accion, antes, despues)
          VALUES ($1,'indicadores',$2,'activar',$3::jsonb,$4::jsonb)`, [actorId, id, JSON.stringify(before), JSON.stringify(after)]);
        await client.query('COMMIT'); return after;
      } catch (error) { await client.query('ROLLBACK'); return databaseError(error); }
      finally { client.release(); }
    },
  };
}
