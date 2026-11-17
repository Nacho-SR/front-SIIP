
import type { Pool } from 'pg';

import { HttpError } from '../../../shared/http-error.js';

import {
  indicatorColumns
} from '../schemas/indicadores.schema.js';

import type {
  CreateIndicator,
  Indicator,
  UpdateIndicator
} from '../schemas/indicadores.schema.js';

// ============================================
// INTERFAZ DEL REPOSITORIO
// ============================================

export interface IndicatorsRepository {
  list(): Promise<Indicator[]>;

  find(id: string): Promise<Indicator | null>;

  create(
    data: CreateIndicator,
    actorId: string
  ): Promise<Indicator>;

  update(
    id: string,
    data: UpdateIndicator,
    actorId: string
  ): Promise<Indicator>;

  changeStatus(
    id: string,
    activo: boolean,
    actorId: string
  ): Promise<Indicator>;
}

// ============================================
// TIPOS INTERNOS
// ============================================

type Row = Record<string, unknown> & {
  id: string;
  consecutivo: string;
  agrupacion: string;
  familia: string;
  familia_id: string;
  activo: boolean;
  creado_en: Date;
  actualizado_en: Date;
};

interface FamilyRow {
  id: string;
  codigo: string;
  agrupacion_codigo: string;
}

// ============================================
// COLUMNAS DE POSTGRESQL
// ============================================

const entries = Object.entries(
  indicatorColumns
) as [keyof typeof indicatorColumns, string][];

// ============================================
// CONSULTA BASE
// ============================================

const select = `
  SELECT
    i.*,
    i.id::text AS id,
    i.consecutivo::text AS consecutivo,

    g.codigo || '. ' || g.nombre AS agrupacion,
    f.codigo || '. ' || f.nombre AS familia

  FROM indicadores i

  JOIN familias f
    ON f.id = i.familia_id

  JOIN agrupaciones_tematicas g
    ON g.id = f.agrupacion_id
`;

// ============================================
// TRANSFORMAR RESULTADOS
// ============================================

function indicator(row: Row): Indicator {
  return {
    id: row.id,
    activo: row.activo,

    campos: {
      ...Object.fromEntries(
        entries.map(([key, column]) => [
          key,
          row[column]
        ])
      ),

      consecutivo: row.consecutivo,
      agrupacion: row.agrupacion,
      familia: row.familia
    } as Indicator['campos'],

    creadoEn: row.creado_en.toISOString(),
    actualizadoEn: row.actualizado_en.toISOString()
  };
}

// ============================================
// ERRORES DE BASE DE DATOS
// ============================================

function databaseError(error: unknown): never {
  const pg = error as {
    code?: string;
    constraint?: string;
  };

  if (
    pg.code === '23505' &&
    pg.constraint === 'indicadores_codigo_unico'
  ) {
    throw new HttpError(
      409,
      'INDICADOR_YA_REGISTRADO',
      'Ya existe un indicador con esa clave.'
    );
  }

  if (pg.code === '23503') {
    throw new HttpError(
      409,
      'RELACION_NO_VALIDA',
      'La familia o agrupación relacionada no está disponible.'
    );
  }

  if (pg.code === '42P01' || pg.code === '42703') {
    throw new HttpError(
      503,
      'INDICADORES_NO_CONFIGURADOS',
      'Faltan tablas de indicadores o activación en PostgreSQL. Comprueba SQL 005 a 008.'
    );
  }

  throw error;
}

// ============================================
// REPOSITORIO
// ============================================

export function createIndicatorsRepository(
  pool: Pool
): IndicatorsRepository {
  return {

    // ----------------------------------------
    // CONSULTAR TODOS LOS INDICADORES
    // ----------------------------------------

    async list() {
      try {
        const result = await pool.query<Row>(
          `
          ${select}
          ORDER BY i.consecutivo DESC
          `
        );

        return result.rows.map(indicator);

      } catch (error) {
        return databaseError(error);
      }
    },

    // ----------------------------------------
    // CONSULTAR INDICADOR POR ID
    // ----------------------------------------

    async find(id) {
      try {
        const result = await pool.query<Row>(
          `
          ${select}
          WHERE i.id = $1
          `,
          [id]
        );

        const row = result.rows[0];

        return row ? indicator(row) : null;

      } catch (error) {
        return databaseError(error);
      }
    },

    // ----------------------------------------
    // CREAR INDICADOR
    // ----------------------------------------

    async create(data, actorId) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Verificamos que la familia y
        // su agrupación estén activas.
        const familyResult =
          await client.query<FamilyRow>(
            `
            SELECT
              f.id::text,
              f.codigo,
              g.codigo AS agrupacion_codigo

            FROM familias f

            JOIN agrupaciones_tematicas g
              ON g.id = f.agrupacion_id

            WHERE
              g.codigo || '. ' || g.nombre = $1
              AND f.codigo || '. ' || f.nombre = $2
              AND f.activo
              AND g.activo

            FOR SHARE OF f, g
            `,
            [
              data.agrupacion,
              data.familia
            ]
          );

        const family = familyResult.rows[0];

        if (!family) {
          throw new HttpError(
            422,
            'FAMILIA_NO_DISPONIBLE',
            'Selecciona una familia activa que pertenezca a una agrupación activa.'
          );
        }

        // La clave debe corresponder a
        // la clasificación seleccionada.
        const prefix =
          `SIIP.${family.agrupacion_codigo}.${family.codigo}.`;

        if (!data.clave.startsWith(prefix)) {
          throw new HttpError(
            422,
            'CLAVE_NO_COINCIDE',
            'La clave debe corresponder a la agrupación y familia seleccionadas.'
          );
        }

        // Las columnas provienen de un
        // mapeo constante y controlado.
        const params = [
          family.id,
          ...entries.map(([key]) => data[key])
        ];

        const columns = entries
          .map(([, column]) => column)
          .join(', ');

        const placeholders = params
          .map((_, index) => `$${index + 1}`)
          .join(', ');

        const inserted = await client.query<{
          id: string;
        }>(
          `
          INSERT INTO indicadores (
            familia_id,
            ${columns}
          )
          VALUES (${placeholders})
          RETURNING id::text
          `,
          params
        );

        const id = inserted.rows[0].id;

        const result = await client.query<Row>(
          `
          ${select}
          WHERE i.id = $1
          `,
          [id]
        );

        const created = indicator(result.rows[0]);

        // Auditoría de creación.
        await client.query(
          `
          INSERT INTO auditoria_configuracion (
            actor_id,
            entidad,
            registro_id,
            accion,
            despues
          )
          VALUES (
            $1,
            'indicadores',
            $2,
            'crear',
            $3::jsonb
          )
          `,
          [
            actorId,
            created.id,
            JSON.stringify(created)
          ]
        );

        await client.query('COMMIT');

        return created;

      } catch (error) {
        await client.query('ROLLBACK');
        return databaseError(error);

      } finally {
        client.release();
      }
    },

    // ========================================
    // EDITAR INDICADOR
    // ========================================

    async update(id, data, actorId) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 1. Obtener el indicador anterior.
        const beforeResult =
          await client.query<Row>(
            `
            ${select}
            WHERE i.id = $1
            FOR UPDATE OF i
            `,
            [id]
          );

        const beforeRow = beforeResult.rows[0];

        if (!beforeRow) {
          throw new HttpError(
            404,
            'INDICADOR_NO_ENCONTRADO',
            'No existe el indicador seleccionado.'
          );
        }

        const before = indicator(beforeRow);

        // 2. Comprobar la familia y agrupación.
        const familyResult =
          await client.query<FamilyRow>(
            `
            SELECT
              f.id::text,
              f.codigo,
              g.codigo AS agrupacion_codigo

            FROM familias f

            JOIN agrupaciones_tematicas g
              ON g.id = f.agrupacion_id

            WHERE
              g.codigo || '. ' || g.nombre = $1
              AND f.codigo || '. ' || f.nombre = $2
              AND f.activo
              AND g.activo

            FOR SHARE OF f, g
            `,
            [
              data.agrupacion,
              data.familia
            ]
          );

        const family = familyResult.rows[0];

        if (!family) {
          throw new HttpError(
            422,
            'FAMILIA_NO_DISPONIBLE',
            'Selecciona una familia activa de una agrupación activa.'
          );
        }

        // 3. Comprobar que la clave
        // coincida con su clasificación.
        const prefix =
          `SIIP.${family.agrupacion_codigo}.${family.codigo}.`;

        if (!data.clave.startsWith(prefix)) {
          throw new HttpError(
            422,
            'CLAVE_NO_COINCIDE',
            'La clave no corresponde a la familia y agrupación seleccionadas.'
          );
        }

        // 4. Proteger campos importantes
        // mientras el indicador está activo.
        const modificaCamposCriticos =
          before.campos.clave !== data.clave ||
          before.campos.familia !== data.familia ||
          before.campos.agrupacion !== data.agrupacion ||
          before.campos.algoritmo !== data.algoritmo ||
          before.campos.semaforizacion !==
            data.semaforizacion ||
          ['frecuencia', 'unidad', 'sentido', 'condicionAcumulacion', 'variables'].some(key => before.campos[key as keyof typeof before.campos] !== data[key as keyof typeof data]);

        if (
          before.activo &&
          modificaCamposCriticos
        ) {
          throw new HttpError(
            409,
            'DESACTIVA_PRIMERO',
            'Desactiva el indicador antes de modificar su clave, clasificación o reglas metodológicas.'
          );
        }

        // 5. Actualizar la ficha.
        const values = [
          family.id,
          ...entries.map(([key]) => data[key]),
          id
        ];

        const assignments = entries
          .map(
            ([, column], index) =>
              `${column} = $${index + 2}`
          )
          .join(', ');

        await client.query(
          `
          UPDATE indicadores

          SET
            familia_id = $1,
            ${assignments},
            actualizado_en = now()

          WHERE id = $${values.length}
          `,
          values
        );

        // 6. Obtener información actualizada.
        const afterResult =
          await client.query<Row>(
            `
            ${select}
            WHERE i.id = $1
            `,
            [id]
          );

        const after = indicator(afterResult.rows[0]);

        // 7. Registrar auditoría.
        await client.query(
          `
          INSERT INTO auditoria_configuracion (
            actor_id,
            entidad,
            registro_id,
            accion,
            antes,
            despues
          )

          VALUES (
            $1,
            'indicadores',
            $2,
            'modificar',
            $3::jsonb,
            $4::jsonb
          )
          `,
          [
            actorId,
            id,
            JSON.stringify(before),
            JSON.stringify(after)
          ]
        );

        await client.query('COMMIT');

        return after;

      } catch (error) {
        await client.query('ROLLBACK');
        return databaseError(error);

      } finally {
        client.release();
      }
    },

    // ========================================
    // DESACTIVAR / REACTIVAR INDICADOR
    // ========================================

    async changeStatus(id, activo, actorId) {
      if (activo) throw new HttpError(409, 'ACTIVACION_REQUIERE_CONFIGURACION', 'Activa desde la configuración de metodología y periodo inicial.');
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // 1. Obtener y bloquear el indicador.
        const beforeResult =
          await client.query<Row>(
            `
            ${select}
            WHERE i.id = $1
            FOR UPDATE OF i
            `,
            [id]
          );

        const beforeRow = beforeResult.rows[0];

        if (!beforeRow) {
          throw new HttpError(
            404,
            'INDICADOR_NO_ENCONTRADO',
            'No existe el indicador seleccionado.'
          );
        }

        const before = indicator(beforeRow);

        // 2. Evitar operaciones repetidas.
        if (before.activo === activo) {
          throw new HttpError(
            409,
            'ESTADO_SIN_CAMBIOS',
            'El indicador ya tiene ese estado.'
          );
        }

        // 4. Modificar únicamente el estado.
        await client.query(
          `
          UPDATE indicadores

          SET
            activo = $1,
            actualizado_en = now()

          WHERE id = $2
          `,
          [
            activo,
            id
          ]
        );

        await client.query(`UPDATE activaciones_indicador SET desactivado_en = now(), desactivado_por = $2
          WHERE indicador_id = $1 AND desactivado_en IS NULL`, [id, actorId]);

        // 5. Obtener el estado actualizado.
        const afterResult =
          await client.query<Row>(
            `
            ${select}
            WHERE i.id = $1
            `,
            [id]
          );

        const after = indicator(afterResult.rows[0]);

        // 6. Registrar auditoría.
        await client.query(
          `
          INSERT INTO auditoria_configuracion (
            actor_id,
            entidad,
            registro_id,
            accion,
            antes,
            despues
          )

          VALUES (
            $1,
            'indicadores',
            $2,
            $3,
            $4::jsonb,
            $5::jsonb
          )
          `,
          [
            actorId,
            id,
            activo ? 'activar' : 'desactivar',
            JSON.stringify(before),
            JSON.stringify(after)
          ]
        );

        await client.query('COMMIT');

        return after;

      } catch (error) {
        await client.query('ROLLBACK');
        return databaseError(error);

      } finally {
        client.release();
      }
    }
  };
}
