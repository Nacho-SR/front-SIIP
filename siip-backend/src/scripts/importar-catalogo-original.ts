
import { config } from 'dotenv';
import ExcelJS from 'exceljs';
import { resolve } from 'node:path';
import type { PoolClient } from 'pg';

import { createPool } from '../database/pool.js';
import { clavesBase } from '../modules/indicadores/data/catalogo-base.js';

// ============================================
// CONFIGURACIÓN
// ============================================

config({ quiet: true });

const aplicar = process.argv.includes('--aplicar');

const actorId = process.argv
  .find(arg => arg.startsWith('--actor='))
  ?.slice('--actor='.length);

const rutaExcel = resolve(
  process.cwd(),
  '../Documentacion/Anexo 3_4 SIIP Sist(2).xlsx'
);

const TOTAL_ESPERADO = 63;

// ============================================
// MAPEO REAL: EXCEL -> POSTGRESQL
// ============================================

// Los índices de Excel comienzan en 1.
// Las columnas 11 y 12 representan
// agrupación y familia, respectivamente.
// La columna 1 es el consecutivo original,
// que no corresponde al consecutivo interno
// autogenerado por PostgreSQL.

const CAMPOS = [
  { columna: 'ipsm_origen', excel: 2 },
  { columna: 'codigo', excel: 3 },
  { columna: 'nombre', excel: 4 },
  { columna: 'definicion', excel: 5 },
  { columna: 'nivel_objetivo', excel: 6 },
  { columna: 'tipo_indicador', excel: 7 },
  { columna: 'ambito_desempeno', excel: 8 },
  { columna: 'dimension_desempeno', excel: 9 },
  { columna: 'transversalidad', excel: 10 },

  { columna: 'funcion_indicador', excel: 13 },
  { columna: 'procedencia', excel: 14 },
  { columna: 'ids_origen', excel: 15 },
  { columna: 'justificacion', excel: 16 },
  { columna: 'objetivo', excel: 17 },
  { columna: 'formula_texto', excel: 18 },
  { columna: 'variables_texto', excel: 19 },
  { columna: 'unidad_medida', excel: 20 },
  { columna: 'acumulacion_texto', excel: 21 },
  { columna: 'sentido', excel: 22 },
  { columna: 'desagregacion_origen', excel: 23 },
  { columna: 'periodicidad', excel: 24 },
  { columna: 'linea_base_texto', excel: 25 },
  { columna: 'periodo_linea_base', excel: 26 },
  { columna: 'medio_verificacion', excel: 27 },
  { columna: 'unidad_responsable_texto', excel: 28 },
  { columna: 'criterio_interpretacion', excel: 29 },
  { columna: 'meta_texto', excel: 30 },
  { columna: 'periodo_cumplimiento', excel: 31 },
  { columna: 'regla_semaforo_texto', excel: 32 },
  { columna: 'observaciones_limitaciones', excel: 33 },
  { columna: 'territorial_origen', excel: 34 }
] as const;

const OBLIGATORIOS = new Set<string>([
  'codigo',
  'nombre',
  'definicion',
  'nivel_objetivo',
  'tipo_indicador',
  'ambito_desempeno',
  'dimension_desempeno',
  'objetivo',
  'formula_texto',
  'variables_texto',
  'unidad_medida',
  'sentido',
  'desagregacion_origen',
  'periodicidad',
  'medio_verificacion',
  'unidad_responsable_texto',
  'criterio_interpretacion',
  'regla_semaforo_texto'
]);

const FRECUENCIAS = [
  'Mensual',
  'Trimestral',
  'Semestral',
  'Anual'
] as const;

// ============================================
// TIPOS
// ============================================

type Campo = typeof CAMPOS[number]['columna'];

type Ficha = {
  fila: number;
  codigo: string;
  agrupacionCodigo: string;
  familiaCodigo: string;
  agrupacionNombre: string;
  familiaNombre: string;
  valores: Record<Campo, string>;
};

// ============================================
// LEER CELDAS
// ============================================

function texto(celda: ExcelJS.Cell): string {
  const valor = celda.value;

  if (valor === null || valor === undefined) {
    return '';
  }

  if (
    typeof valor === 'string' ||
    typeof valor === 'number' ||
    typeof valor === 'boolean'
  ) {
    return String(valor).trim();
  }

  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }

  if (typeof valor === 'object') {
    if ('richText' in valor) {
      return valor.richText
        .map(fragmento => fragmento.text)
        .join('')
        .trim();
    }

    if ('result' in valor) {
      return String(valor.result ?? '').trim();
    }

    if ('text' in valor) {
      return String(valor.text).trim();
    }
  }

  return celda.text.trim();
}

// ============================================
// DESCOMPONER CLASIFICACIÓN
// ============================================

function clasificacion(valor: string): {
  codigo: string;
  nombre: string;
} {
  const match = valor.match(
    /^([A-Z]?\d{2})\.\s*(.+)$/i
  );

  if (!match) {
    return {
      codigo: '',
      nombre: ''
    };
  }

  return {
    codigo: match[1].toUpperCase(),
    nombre: match[2].trim()
  };
}

// ============================================
// LEER Y VALIDAR EXCEL
// ============================================

async function leerCatalogo(): Promise<Ficha[]> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(rutaExcel);

  const hoja = libro.getWorksheet('IPSM');

  if (!hoja) {
    throw new Error(
      'No se encontró la hoja IPSM.'
    );
  }

  const fichas: Ficha[] = [];
  const errores: string[] = [];
  const claves = new Set<string>();

  for (
    let numero = 2;
    numero <= hoja.rowCount;
    numero++
  ) {
    const fila = hoja.getRow(numero);
    const codigo = texto(fila.getCell(3));

    if (!codigo && !texto(fila.getCell(4))) {
      continue;
    }

    const valores = {} as Record<Campo, string>;

    for (const campo of CAMPOS) {
      valores[campo.columna] = texto(
        fila.getCell(campo.excel)
      );
    }

    // Normalizar únicamente mayúsculas
    // y minúsculas de la periodicidad.
    const frecuencia = FRECUENCIAS.find(
      opcion =>
        opcion.toLowerCase() ===
        valores.periodicidad.toLowerCase()
    );

    if (!frecuencia) {
      errores.push(
        `Fila ${numero}: periodicidad inválida ` +
        `"${valores.periodicidad}".`
      );
    } else {
      valores.periodicidad = frecuencia;
    }

    // Validar campos obligatorios.
    for (const campo of CAMPOS) {
      if (
        OBLIGATORIOS.has(campo.columna) &&
        !valores[campo.columna]
      ) {
        errores.push(
          `Fila ${numero} (${codigo}): ` +
          `falta ${campo.columna} ` +
          `(columna Excel ${campo.excel}).`
        );
      }
    }

    if (
      !/^SIIP\.\d{2}\.F\d{2}\.\d{3}$/.test(codigo)
    ) {
      errores.push(
        `Fila ${numero}: clave inválida "${codigo}".`
      );
    }

    if (claves.has(codigo)) {
      errores.push(
        `Fila ${numero}: clave duplicada ${codigo}.`
      );
    }

    claves.add(codigo);

    const agrupacion = clasificacion(
      texto(fila.getCell(11))
    );

    const familia = clasificacion(
      texto(fila.getCell(12))
    );

    const partes = codigo.split('.');

    if (
      agrupacion.codigo !== partes[1] ||
      familia.codigo !== partes[2]
    ) {
      errores.push(
        `Fila ${numero}: la clasificación ` +
        `no corresponde a ${codigo}.`
      );
    }

    fichas.push({
      fila: numero,
      codigo,
      agrupacionCodigo: agrupacion.codigo,
      familiaCodigo: familia.codigo,
      agrupacionNombre: agrupacion.nombre,
      familiaNombre: familia.nombre,
      valores
    });
  }

  // Comprobar exactamente las claves
  // del catálogo original reconocido
  // por el propio backend.
  const esperadas = new Set(clavesBase);

  for (const clave of esperadas) {
    if (!claves.has(clave)) {
      errores.push(
        `Falta la clave original: ${clave}.`
      );
    }
  }

  for (const clave of claves) {
    if (!esperadas.has(clave)) {
      errores.push(
        `Clave no reconocida en el catálogo base: ${clave}.`
      );
    }
  }

  if (fichas.length !== TOTAL_ESPERADO) {
    errores.push(
      `Se encontraron ${fichas.length} fichas; ` +
      `se esperaban ${TOTAL_ESPERADO}.`
    );
  }

  console.log(
    `Indicadores encontrados: ${fichas.length}`
  );

  console.log(
    `Claves únicas: ${claves.size}`
  );

  if (errores.length) {
    console.error('\nVALIDACIÓN NO APROBADA');

    for (const error of errores) {
      console.error(`- ${error}`);
    }

    throw new Error(
      'La validación falló. ' +
      'PostgreSQL no fue modificado.'
    );
  }

  console.log(
    'Validación documental aprobada.'
  );

  return fichas;
}

// ============================================
// PREPARAR RELACIONES EN POSTGRESQL
// ============================================

async function obtenerFamiliaId(
  client: PoolClient,
  ficha: Ficha
): Promise<string> {
  const resultado = await client.query<{
    id: string;
    agrupacion_nombre: string;
    familia_nombre: string;
  }>(
    `
    SELECT
      f.id::text AS id,
      a.nombre AS agrupacion_nombre,
      f.nombre AS familia_nombre
    FROM familias f
    JOIN agrupaciones_tematicas a
      ON a.id = f.agrupacion_id
    WHERE
      a.codigo = $1
      AND f.codigo = $2
      AND a.activo = true
      AND f.activo = true
    `,
    [
      ficha.agrupacionCodigo,
      ficha.familiaCodigo
    ]
  );

  if (resultado.rowCount !== 1) {
    throw new Error(
      `No existe la clasificación activa ` +
      `de ${ficha.codigo}.`
    );
  }

  const familia = resultado.rows[0];

  // Evitar asociar accidentalmente una ficha
  // con una clasificación que tenga otro nombre.
  if (
    familia.agrupacion_nombre !==
      ficha.agrupacionNombre ||
    familia.familia_nombre !==
      ficha.familiaNombre
  ) {
    throw new Error(
      `Los nombres de agrupación o familia ` +
      `no coinciden para ${ficha.codigo}.`
    );
  }

  return familia.id;
}

// ============================================
// IMPORTAR EN UNA SOLA TRANSACCIÓN
// ============================================

async function importar(fichas: Ficha[]): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Este importador no se ejecuta en producción.'
    );
  }

  if (!actorId || !/^\d+$/.test(actorId)) {
    throw new Error(
      'Es obligatorio indicar --actor=ID.'
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'Falta DATABASE_URL.'
    );
  }

  const url = new URL(process.env.DATABASE_URL);

  if (
    !['localhost', '127.0.0.1', '[::1]']
      .includes(url.hostname)
  ) {
    throw new Error(
      'La importación está limitada a PostgreSQL local.'
    );
  }

  const pool = createPool(
    process.env.DATABASE_URL
  );

  const client = await pool.connect();

  let insertados = 0;
  let conservados = 0;

  try {
    await client.query('BEGIN');

    // Evitar dos importaciones concurrentes
    // del catálogo desde este script.
    await client.query(
      `SELECT pg_advisory_xact_lock(72463, 63)`
    );

    const actor = await client.query(
      `
      SELECT 1
      FROM usuarios
      WHERE
        id = $1
        AND rol = 'administrador'
        AND activo = true
      `,
      [actorId]
    );

    if (actor.rowCount !== 1) {
      throw new Error(
        'El actor debe ser un administrador activo.'
      );
    }

    for (const ficha of fichas) {
      const familiaId = await obtenerFamiliaId(
        client,
        ficha
      );

      const existente = await client.query<{
        id: string;
        familia_id: string;
        activo: boolean;
      }>(
        `
        SELECT
          id::text AS id,
          familia_id::text,
          activo
        FROM indicadores
        WHERE upper(btrim(codigo)) = $1
        FOR UPDATE
        `,
        [ficha.codigo]
      );

      if (existente.rowCount) {
        const registro = existente.rows[0];

        // No sobrescribir registros existentes,
        // especialmente los que pudieran tener
        // metodología o activaciones.
        if (registro.familia_id !== familiaId) {
          throw new Error(
            `Conflicto de familia: ${ficha.codigo}.`
          );
        }

        conservados++;

        console.log(
          `Conservado: ${ficha.codigo}`
        );

        continue;
      }

      const nombres = [
        'familia_id',
        ...CAMPOS.map(campo => campo.columna),
        'activo'
      ];

      const parametros: unknown[] = [
        familiaId,
        ...CAMPOS.map(
          campo => ficha.valores[campo.columna]
        ),
        false
      ];

      const posiciones = parametros.map(
        (_, index) => `$${index + 1}`
      );

      const resultado = await client.query<{
        id: string;
      }>(
        `
        INSERT INTO indicadores (
          ${nombres.join(', ')}
        )
        VALUES (
          ${posiciones.join(', ')}
        )
        RETURNING id::text AS id
        `,
        parametros
      );

      const nuevoId = resultado.rows[0]?.id;

      if (!nuevoId) {
        throw new Error(
          `No se insertó ${ficha.codigo}.`
        );
      }

      // Registro histórico sin inventar
      // metodologías ni responsables.
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
          nuevoId,
          JSON.stringify({
            id: nuevoId,
            familiaId,
            campos: ficha.valores,
            activo: false,
            origen: {
              archivo:
                'Anexo 3_4 SIIP Sist(2).xlsx',
              hoja: 'IPSM',
              fila: ficha.fila
            }
          })
        ]
      );

      insertados++;

      console.log(
        `Insertado: ${ficha.codigo}`
      );
    }

    await client.query('COMMIT');

    console.log('\nIMPORTACIÓN COMPLETADA');
    console.log(`Insertados: ${insertados}`);
    console.log(`Conservados: ${conservados}`);
    console.log(`Procesados: ${fichas.length}`);

  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'Transacción revertida: ' +
      'no se aplicaron cambios parciales.'
    );

    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// ============================================
// EJECUCIÓN
// ============================================

async function main(): Promise<void> {
  console.log('\nSIIP SALAMANCA');
  console.log('Catálogo original de indicadores');
  console.log(
    `Modo: ${aplicar ? 'IMPORTACIÓN' : 'VALIDACIÓN'}`
  );
  console.log('');

  const fichas = await leerCatalogo();

  if (!aplicar) {
    console.log(
      '\nModo seguro: no se escribió en PostgreSQL.'
    );

    return;
  }

  await importar(fichas);
}

main().catch((error: unknown) => {
  console.error(
    '\nERROR: ' +
    (
      error instanceof Error
        ? error.message
        : 'Error desconocido'
    )
  );

  process.exitCode = 1;
});
