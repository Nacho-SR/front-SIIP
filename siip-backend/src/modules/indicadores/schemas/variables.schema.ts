import { z } from 'zod';
import { idSchema } from '../../auth/schemas/auth.schema.js';

export const variableInputSchema = z.strictObject({
  id: idSchema.optional(),
  codigo: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{0,39}$/),
  descripcion: z.string().trim().min(1).max(2000),
  unidadMedida: z.string().trim().min(1).max(200),
  tipoDato: z.enum(['entero', 'decimal']),
  dependenciaId: idSchema.nullable(),
});
export const saveVariablesSchema = z.strictObject({
  version: z.number().int().min(0).max(2147483646),
  variables: z.array(variableInputSchema).min(1).max(50),
}).superRefine((data, context) => {
  const codes = new Set<string>(), ids = new Set<string>();
  data.variables.forEach((variable, index) => {
    if (codes.has(variable.codigo) || (variable.id && ids.has(variable.id))) {
      context.addIssue({ code: 'custom', path: ['variables', index], message: 'No repitas códigos ni identificadores de variable.' });
    }
    codes.add(variable.codigo);
    if (variable.id) ids.add(variable.id);
  });
});
export const variableSchema = variableInputSchema.extend({
  id: idSchema, dependenciaNombre: z.string().nullable(), dependenciaActiva: z.boolean().nullable(),
});
export const variablesConfigSchema = z.object({
  indicadorId: idSchema, version: z.number().int().nonnegative(), variables: z.array(variableSchema),
});
export type Variable = z.infer<typeof variableSchema>;
export type SaveVariables = z.infer<typeof saveVariablesSchema>;
export type VariablesConfig = z.infer<typeof variablesConfigSchema>;
