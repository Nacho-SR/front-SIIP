import { z } from 'zod';
import { idSchema } from '../../auth/schemas/auth.schema.js';
import { variableSchema } from './variables.schema.js';

export const reglaPorcentajeSchema = z.strictObject({
  tipo: z.literal('porcentaje_parte_total'),
  numeradorId: idSchema,
  denominadorId: idSchema,
  amarilloDesde: z.number().min(0).max(100),
  verdeDesde: z.number().min(0).max(100),
}).superRefine((data, ctx) => {
  if (data.numeradorId === data.denominadorId) ctx.addIssue({ code: 'custom', path: ['denominadorId'], message: 'Selecciona dos variables distintas.' });
  if (data.amarilloDesde >= data.verdeDesde) ctx.addIssue({ code: 'custom', path: ['verdeDesde'], message: 'El umbral verde debe ser mayor que el amarillo.' });
});
const versionSchema = z.number().int().min(0).max(2147483646);
export const guardarMetodologiaSchema = z.strictObject({
  version: versionSchema, versionVariables: versionSchema, regla: reglaPorcentajeSchema,
});
export const simulacionMetodologiaSchema = z.strictObject({
  versionVariables: versionSchema, regla: reglaPorcentajeSchema,
  numerador: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  denominador: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
}).refine(data => data.numerador <= data.denominador, { path: ['numerador'], message: 'La parte no puede superar al total.' });
export const contextoMetodologiaSchema = z.object({
  versionVariables: versionSchema,
  frecuencia: z.enum(['Mensual', 'Trimestral', 'Semestral', 'Anual']),
  unidadResultado: z.literal('%'), sentido: z.literal('Ascendente'), acumulacion: z.literal('No acumulable'),
  variables: z.array(variableSchema).length(2),
});
export const metodologiaSchema = z.object({
  id: idSchema, version: z.number().int().positive(), regla: reglaPorcentajeSchema,
  contexto: contextoMetodologiaSchema, creadoPor: idSchema, creadoEn: z.string(),
});
export const metodologiasConfigSchema = z.object({
  indicadorId: idSchema, version: versionSchema, metodologias: z.array(metodologiaSchema),
});
export const resultadoSimulacionSchema = z.object({
  valor: z.string().nullable(), semaforo: z.enum(['verde', 'amarillo', 'rojo']).nullable(),
  motivo: z.literal('DENOMINADOR_CERO').nullable(),
});
export type ReglaPorcentaje = z.infer<typeof reglaPorcentajeSchema>;
export type GuardarMetodologia = z.infer<typeof guardarMetodologiaSchema>;
export type SimulacionMetodologia = z.infer<typeof simulacionMetodologiaSchema>;
export type ContextoMetodologia = z.infer<typeof contextoMetodologiaSchema>;
export type Metodologia = z.infer<typeof metodologiaSchema>;
export type MetodologiasConfig = z.infer<typeof metodologiasConfigSchema>;
