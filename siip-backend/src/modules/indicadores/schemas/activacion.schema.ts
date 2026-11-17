import { z } from 'zod';
import { idSchema } from '../../auth/schemas/auth.schema.js';

export const activarIndicadorSchema = z.strictObject({
  metodologiaId: idSchema,
  primerPeriodo: z.string().regex(/^(?:19|[2-9]\d)\d{2}-(?:0[1-9]|1[0-2])-01$/),
});
export const activacionSchema = z.object({
  id: idSchema, metodologiaId: idSchema, versionMetodologia: z.number().int().positive(),
  primerPeriodo: z.string(), creadoEn: z.string(), creadoPor: idSchema,
  desactivadoEn: z.string().nullable(), desactivadoPor: idSchema.nullable(),
});
export const preparacionActivacionSchema = z.object({
  indicadorId: idSchema, activo: z.boolean(), metodologiaId: idSchema.nullable(),
  versionMetodologia: z.number().int().nonnegative(), frecuencia: z.enum(['Mensual', 'Trimestral', 'Semestral', 'Anual']),
  minimoInicio: z.string(), puedeActivar: z.boolean(), pendientes: z.array(z.string()), historial: z.array(activacionSchema),
});
export type ActivarIndicador = z.infer<typeof activarIndicadorSchema>;
export type Activacion = z.infer<typeof activacionSchema>;
export type PreparacionActivacion = z.infer<typeof preparacionActivacionSchema>;
