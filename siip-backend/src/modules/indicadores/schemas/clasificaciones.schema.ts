
import { z } from 'zod';
import { idSchema } from '../../auth/schemas/auth.schema.js';

export const agrupacionSchema = z.object({
  id: idSchema,
  codigo: z.string(),
  nombre: z.string(),
  activo: z.boolean()
});

export const familiaSchema = z.object({
  id: idSchema,
  agrupacion_id: idSchema,
  agrupacion_nombre: z.string(),
  codigo: z.string(),
  nombre: z.string(),
  activo: z.boolean()
});

export const editAgrupacionSchema = z.strictObject({
  codigo: z.string().trim().regex(/^\d{2}$/),
  nombre: z.string().trim().min(1).max(500)
});

export const editFamiliaSchema = z.strictObject({
  codigo: z.string().trim().regex(/^F\d{2}$/),
  nombre: z.string().trim().min(1).max(500),
  agrupacion_id: idSchema
});

export const estadoSchema = z.strictObject({
  activo: z.boolean()
});

export type Agrupacion = z.infer<typeof agrupacionSchema>;
export type Familia = z.infer<typeof familiaSchema>;
export type EditAgrupacion = z.infer<typeof editAgrupacionSchema>;
export type EditFamilia = z.infer<typeof editFamiliaSchema>;
export type Estado = z.infer<typeof estadoSchema>;
