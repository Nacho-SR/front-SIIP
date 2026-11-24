import { z } from 'zod';
import { idSchema } from '../../auth/schemas/auth.schema.js';

// Proyección documental: no incluye entradas operativas, asignaciones ni auditoría.
export const fichaConsultaSchema = z.object({
  clave: z.string(), nombre: z.string(), definicion: z.string(), objetivo: z.string(),
  nivelObjetivo: z.string(), tipologia: z.string(), ambito: z.string(), dimension: z.string(),
  agrupacion: z.string(), familia: z.string(), unidad: z.string(),
  desagregacion: z.string(), frecuencia: z.string(), fuente: z.string(),
  sentido: z.string(), algoritmo: z.string(), condicionAcumulacion: z.string(),
  lineaBase: z.string(), periodoLineaBase: z.string(), meta: z.string(),
  periodoCumplimiento: z.string(), semaforizacion: z.string(),
});

export const indicadorConsultaSchema = fichaConsultaSchema.extend({ id: idSchema, activo: z.boolean() });
export const catalogoConsultaSchema = z.object({ indicadores: z.array(indicadorConsultaSchema) });
export type IndicadorConsulta = z.infer<typeof indicadorConsultaSchema>;
