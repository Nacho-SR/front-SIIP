
import type { Pool, PoolClient } from 'pg';
import { HttpError } from '../../../shared/http-error.js';

import type {
  Agrupacion,
  Familia,
  EditAgrupacion,
  EditFamilia,
  Estado
} from '../schemas/clasificaciones.schema.js';

type Entity = 'agrupaciones_tematicas' | 'familias';

type Action =
  | 'modificar'
  | 'activar'
  | 'desactivar';

// --------------------------------------------
// AUDITORÍA
// --------------------------------------------

async function audit(
  client: PoolClient,
  actor: string,
  entity: Entity,
  id: string,
  action: Action,
  before: object,
  after: object
) {
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
      $1, $2, $3, $4,
      $5::jsonb, $6::jsonb
    )
    `,
    [
      actor,
      entity,
      id,
      action,
      JSON.stringify(before),
      JSON.stringify(after)
    ]
  );
}

// --------------------------------------------
// ERRORES
// --------------------------------------------

function dbError(error: unknown): never {
  const e = error as { code?: string };

  if (e.code === '23505') {
    throw new HttpError(
      409,
      'CLAVE_DUPLICADA',
      'Ya existe un registro con esa clave.'
    );
  }

  if (e.code === '23503') {
    throw new HttpError(
      409,
      'RELACION_NO_VALIDA',
      'La agrupación o familia referida no existe.'
    );
  }

  if (e.code === '42P01') {
    throw new HttpError(
      503,
      'CATALOGO_NO_CONFIGURADO',
      'Faltan tablas de clasificación en PostgreSQL.'
    );
  }

  throw error;
}

// --------------------------------------------
// CONSULTAS BASE
// --------------------------------------------

const qG = `
  SELECT
    id::text,
    codigo,
    nombre,
    activo
  FROM agrupaciones_tematicas
`;

const qF = `
  SELECT
    f.id::text,
    f.agrupacion_id::text,
    g.codigo || '. ' || g.nombre AS agrupacion_nombre,
    f.codigo,
    f.nombre,
    f.activo
  FROM familias f
  JOIN agrupaciones_tematicas g
    ON g.id = f.agrupacion_id
`;

// --------------------------------------------
// REPOSITORIO
// --------------------------------------------

export function createClassificationsRepository(
  pool: Pool
) {
  return {


    // ========================================
    // CREAR AGRUPACIÓN TEMÁTICA
    // ========================================

    async createAgrupacion(
      data: EditAgrupacion,
      actor: string
    ): Promise<Agrupacion> {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const result = await client.query<Agrupacion>(
          `
          INSERT INTO agrupaciones_tematicas (
            codigo,
            nombre,
            activo
          )
          VALUES ($1, $2, true)
          RETURNING
            id::text,
            codigo,
            nombre,
            activo
          `,
          [data.codigo, data.nombre]
        );

        const creado = result.rows[0]!;

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
            'agrupaciones_tematicas',
            $2,
            'crear',
            $3::jsonb
          )
          `,
          [
            actor,
            creado.id,
            JSON.stringify(creado)
          ]
        );

        await client.query('COMMIT');

        return creado;

      } catch (error) {
        await client.query('ROLLBACK');
        return dbError(error);
      } finally {
        client.release();
      }
    },

    // ========================================
    // CREAR FAMILIA
    // ========================================

    async createFamilia(
      data: EditFamilia,
      actor: string
    ): Promise<Familia> {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Una familia nueva solo puede
        // pertenecer a una agrupación activa.
        const parent = await client.query(
          `
          SELECT id
          FROM agrupaciones_tematicas
          WHERE id = $1
            AND activo = true
          FOR SHARE
          `,
          [data.agrupacion_id]
        );

        if (parent.rowCount !== 1) {
          throw new HttpError(
            422,
            'AGRUPACION_NO_DISPONIBLE',
            'Selecciona una agrupación temática activa.'
          );
        }

        const insertado = await client.query<{
          id: string;
        }>(
          `
          INSERT INTO familias (
            agrupacion_id,
            codigo,
            nombre,
            activo
          )
          VALUES ($1, $2, $3, true)
          RETURNING id::text
          `,
          [
            data.agrupacion_id,
            data.codigo,
            data.nombre
          ]
        );

        const nuevoId = insertado.rows[0]!.id;

        const creado = (
          await client.query<Familia>(
            `${qF} WHERE f.id = $1`,
            [nuevoId]
          )
        ).rows[0]!;

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
            'familias',
            $2,
            'crear',
            $3::jsonb
          )
          `,
          [
            actor,
            nuevoId,
            JSON.stringify(creado)
          ]
        );

        await client.query('COMMIT');

        return creado;

      } catch (error) {
        await client.query('ROLLBACK');
        return dbError(error);
      } finally {
        client.release();
      }
    },
    
    // LISTAR AGRUPACIONES
    async listAgrupaciones() {
      try {
        const result = await pool.query<Agrupacion>(
          `${qG} ORDER BY codigo`
        );

        return result.rows;
      } catch (error) {
        return dbError(error);
      }
    },

    // LISTAR FAMILIAS
    async listFamilias() {
      try {
        const result = await pool.query<Familia>(
          `${qF} ORDER BY f.codigo`
        );

        return result.rows;
      } catch (error) {
        return dbError(error);
      }
    },

    // ----------------------------------------
    // EDITAR AGRUPACIÓN TEMÁTICA
    // ----------------------------------------

    async editAgrupacion(
      id: string,
      data: EditAgrupacion,
      actor: string
    ): Promise<Agrupacion> {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const before = (
          await client.query<Agrupacion>(
            `${qG} WHERE id = $1 FOR UPDATE`,
            [id]
          )
        ).rows[0];

        if (!before) {
          throw new HttpError(
            404,
            'AGRUPACION_NO_ENCONTRADA',
            'No existe la agrupación temática.'
          );
        }

        if (before.codigo !== data.codigo) {
          const related = await client.query(
            `
            SELECT 1
            FROM familias
            WHERE agrupacion_id = $1
            LIMIT 1
            `,
            [id]
          );

          if (related.rowCount) {
            throw new HttpError(
              409,
              'CODIGO_EN_USO',
              'No se puede cambiar el código de una agrupación con familias vinculadas.'
            );
          }
        }

        const after = (
          await client.query<Agrupacion>(
            `
            UPDATE agrupaciones_tematicas
            SET codigo = $1,
                nombre = $2
            WHERE id = $3
            RETURNING
              id::text,
              codigo,
              nombre,
              activo
            `,
            [
              data.codigo,
              data.nombre,
              id
            ]
          )
        ).rows[0]!;

        await audit(
          client,
          actor,
          'agrupaciones_tematicas',
          id,
          'modificar',
          before,
          after
        );

        await client.query('COMMIT');

        return after;

      } catch (error) {
        await client.query('ROLLBACK');
        return dbError(error);
      } finally {
        client.release();
      }
    },

    // ----------------------------------------
    // ACTIVAR / DESACTIVAR AGRUPACIÓN
    // ----------------------------------------

    async estadoAgrupacion(
      id: string,
      data: Estado,
      actor: string
    ): Promise<Agrupacion> {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const before = (
          await client.query<Agrupacion>(
            `${qG} WHERE id = $1 FOR UPDATE`,
            [id]
          )
        ).rows[0];

        if (!before) {
          throw new HttpError(
            404,
            'AGRUPACION_NO_ENCONTRADA',
            'No existe la agrupación temática.'
          );
        }

        if (before.activo === data.activo) {
          throw new HttpError(
            409,
            'ESTADO_SIN_CAMBIOS',
            'La agrupación ya tiene ese estado.'
          );
        }

        const after = (
          await client.query<Agrupacion>(
            `
            UPDATE agrupaciones_tematicas
            SET activo = $1
            WHERE id = $2
            RETURNING
              id::text,
              codigo,
              nombre,
              activo
            `,
            [
              data.activo,
              id
            ]
          )
        ).rows[0]!;

        await audit(
          client,
          actor,
          'agrupaciones_tematicas',
          id,
          data.activo ? 'activar' : 'desactivar',
          before,
          after
        );

        await client.query('COMMIT');

        return after;

      } catch (error) {
        await client.query('ROLLBACK');
        return dbError(error);
      } finally {
        client.release();
      }
    },

    // ----------------------------------------
    // EDITAR FAMILIA
    // ----------------------------------------

    async editFamilia(
      id: string,
      data: EditFamilia,
      actor: string
    ): Promise<Familia> {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const before = (
          await client.query<Familia>(
            `${qF} WHERE f.id = $1 FOR UPDATE OF f`,
            [id]
          )
        ).rows[0];

        if (!before) {
          throw new HttpError(
            404,
            'FAMILIA_NO_ENCONTRADA',
            'No existe la familia.'
          );
        }

        const parent = (
          await client.query<Agrupacion>(
            `${qG} WHERE id = $1 FOR SHARE`,
            [data.agrupacion_id]
          )
        ).rows[0];

        if (!parent) {
          throw new HttpError(
            422,
            'AGRUPACION_NO_DISPONIBLE',
            'La agrupación indicada no existe.'
          );
        }

        if (before.activo && !parent.activo) {
          throw new HttpError(
            422,
            'AGRUPACION_INACTIVA',
            'Una familia activa debe pertenecer a una agrupación activa.'
          );
        }

        if (
          before.codigo !== data.codigo ||
          before.agrupacion_id !== data.agrupacion_id
        ) {
          const related = await client.query(
            `
            SELECT 1
            FROM indicadores
            WHERE familia_id = $1
            LIMIT 1
            `,
            [id]
          );

          if (related.rowCount) {
            throw new HttpError(
              409,
              'FAMILIA_CON_INDICADORES',
              'No se puede cambiar clave o agrupación de una familia que ya tiene indicadores vinculados.'
            );
          }
        }

        await client.query(
          `
          UPDATE familias
          SET codigo = $1,
              nombre = $2,
              agrupacion_id = $3
          WHERE id = $4
          `,
          [
            data.codigo,
            data.nombre,
            data.agrupacion_id,
            id
          ]
        );

        const after = (
          await client.query<Familia>(
            `${qF} WHERE f.id = $1`,
            [id]
          )
        ).rows[0]!;

        await audit(
          client,
          actor,
          'familias',
          id,
          'modificar',
          before,
          after
        );

        await client.query('COMMIT');

        return after;

      } catch (error) {
        await client.query('ROLLBACK');
        return dbError(error);
      } finally {
        client.release();
      }
    },

    // ----------------------------------------
    // ACTIVAR / DESACTIVAR FAMILIA
    // ----------------------------------------

    async estadoFamilia(
      id: string,
      data: Estado,
      actor: string
    ): Promise<Familia> {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const before = (
          await client.query<Familia>(
            `${qF} WHERE f.id = $1 FOR UPDATE OF f`,
            [id]
          )
        ).rows[0];

        if (!before) {
          throw new HttpError(
            404,
            'FAMILIA_NO_ENCONTRADA',
            'No existe la familia.'
          );
        }

        if (before.activo === data.activo) {
          throw new HttpError(
            409,
            'ESTADO_SIN_CAMBIOS',
            'La familia ya tiene ese estado.'
          );
        }

        if (data.activo) {
          const parent = await client.query(
            `
            SELECT id
            FROM agrupaciones_tematicas
            WHERE id = $1
              AND activo
            FOR SHARE
            `,
            [before.agrupacion_id]
          );

          if (!parent.rowCount) {
            throw new HttpError(
              422,
              'AGRUPACION_INACTIVA',
              'Activa primero la agrupación temática.'
            );
          }
        }

        await client.query(
          `
          UPDATE familias
          SET activo = $1
          WHERE id = $2
          `,
          [
            data.activo,
            id
          ]
        );

        const after = (
          await client.query<Familia>(
            `${qF} WHERE f.id = $1`,
            [id]
          )
        ).rows[0]!;

        await audit(
          client,
          actor,
          'familias',
          id,
          data.activo ? 'activar' : 'desactivar',
          before,
          after
        );

        await client.query('COMMIT');

        return after;

      } catch (error) {
        await client.query('ROLLBACK');
        return dbError(error);
      } finally {
        client.release();
      }
    }
  };
}

export type ClassificationsRepository =
  ReturnType<typeof createClassificationsRepository>;
