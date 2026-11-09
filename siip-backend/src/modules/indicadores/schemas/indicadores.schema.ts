import { z } from 'zod';
import { idSchema } from '../../auth/schemas/auth.schema.js';
import { opcionesFicha } from '../data/catalogo-base.js';

const texto = z.string().trim().max(20000);
const requerido = texto.min(1);
const opcional = texto.default('');
const opcion = (values: readonly string[]) => z.string().refine(value => values.includes(value), 'Selecciona una opción del catálogo.');

export const createIndicatorSchema = z.strictObject({
  ipsm: z.string().trim().max(8).default(''),
  clave: z.string().trim().toUpperCase().regex(/^SIIP\.\d{2}\.F\d{2}\.\d{3}$/),
  nombre: z.string().trim().min(1).max(500),
  definicion: requerido, nivelObjetivo: opcion(opcionesFicha.nivelObjetivo),
  tipologia: opcion(opcionesFicha.tipologia), ambito: opcion(opcionesFicha.ambito),
  dimension: opcion(opcionesFicha.dimension), transversalidad: opcional,
  agrupacion: z.string().trim().min(1).max(300), familia: z.string().trim().min(1).max(300),
  funcionIndicador: opcional, procedencia: opcional, idsOrigen: opcional,
  justificacion: opcional, objetivo: requerido, algoritmo: requerido, variables: requerido,
  unidad: z.string().trim().min(1).max(200),
  condicionAcumulacion: z.enum(['', 'Acumulable', 'No acumulable']).default(''),
  sentido: opcion(opcionesFicha.sentido), desagregacion: opcion(opcionesFicha.desagregacion),
  frecuencia: z.enum(['Mensual', 'Trimestral', 'Semestral', 'Anual']),
  lineaBase: opcional, periodoLineaBase: opcional, fuente: requerido,
  unidadResponsable: requerido, criterioInterpretacion: requerido, meta: opcional,
  periodoCumplimiento: opcional, semaforizacion: requerido, observaciones: opcional,
  territorial: z.enum(['', 'S', 'N']).default(''),
});

export const indicatorSchema = z.object({
  id: idSchema,
  campos: createIndicatorSchema.extend({ consecutivo: idSchema }),
  activo: z.boolean(), creadoEn: z.iso.datetime(), actualizadoEn: z.iso.datetime(),
});
export type CreateIndicator = z.infer<typeof createIndicatorSchema>;
export type Indicator = z.infer<typeof indicatorSchema>;

// Nombres SQL constantes; ningún identificador SQL proviene de la petición.
export const indicatorColumns = {
  ipsm: 'ipsm_origen', clave: 'codigo', nombre: 'nombre', definicion: 'definicion',
  nivelObjetivo: 'nivel_objetivo', tipologia: 'tipo_indicador', ambito: 'ambito_desempeno',
  dimension: 'dimension_desempeno', transversalidad: 'transversalidad',
  funcionIndicador: 'funcion_indicador', procedencia: 'procedencia', idsOrigen: 'ids_origen',
  justificacion: 'justificacion', objetivo: 'objetivo', algoritmo: 'formula_texto',
  variables: 'variables_texto', unidad: 'unidad_medida', condicionAcumulacion: 'acumulacion_texto',
  sentido: 'sentido', desagregacion: 'desagregacion_origen', frecuencia: 'periodicidad',
  lineaBase: 'linea_base_texto', periodoLineaBase: 'periodo_linea_base', fuente: 'medio_verificacion',
  unidadResponsable: 'unidad_responsable_texto', criterioInterpretacion: 'criterio_interpretacion',
  meta: 'meta_texto', periodoCumplimiento: 'periodo_cumplimiento', semaforizacion: 'regla_semaforo_texto',
  observaciones: 'observaciones_limitaciones', territorial: 'territorial_origen',
} as const satisfies Partial<Record<keyof CreateIndicator, string>>;
