import { z } from 'zod';
import { idSchema } from '../../auth/schemas/auth.schema.js';
import { variableSchema } from '../../indicadores/schemas/variables.schema.js';
import { ZONA_HORARIA } from '../../indicadores/services/periodos.service.js';

export const variableAsignadaSchema = variableSchema.pick({
  id: true, codigo: true, descripcion: true, unidadMedida: true, tipoDato: true,
}).strip();
export const indicadorAsignadoSchema = z.object({
  id: idSchema, clave: z.string(), nombre: z.string(), agrupacion: z.string(), familia: z.string(),
  frecuencia: z.enum(['Mensual', 'Trimestral', 'Semestral', 'Anual']),
  activo: z.boolean(), primerPeriodo: z.iso.date().nullable(),
  periodoActual: z.object({ inicio: z.iso.date(), fin: z.iso.date() }),
  variables: z.array(variableAsignadaSchema).min(1),
});
export const bandejaCapturaSchema = z.object({
  dependencia: z.object({ id: idSchema, clave: z.string(), nombre: z.string() }),
  fechaServidor: z.iso.date(), zonaHoraria: z.literal(ZONA_HORARIA),
  indicadores: z.array(indicadorAsignadoSchema),
});
export type VariableAsignada = z.infer<typeof variableAsignadaSchema>;
export type IndicadorAsignado = z.infer<typeof indicadorAsignadoSchema>;
export type BandejaCaptura = z.infer<typeof bandejaCapturaSchema>;
