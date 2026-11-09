import { z } from 'zod';
import { credentialsSchema, idSchema } from '../../auth/schemas/auth.schema.js';

const accountFields = {
  nombre: z.string().trim().min(1).max(200),
  correo: credentialsSchema.shape.correo,
  password: z.string().min(15).max(1024),
};

export const initialAdminSchema = z.strictObject(accountFields);
export const createUserSchema = z.discriminatedUnion('rol', [
  z.strictObject({ ...accountFields, rol: z.enum(['captura', 'revision']), dependencia_id: idSchema }),
  z.strictObject({ ...accountFields, rol: z.literal('consulta'), dependencia_id: z.null().default(null) }),
]);

export const dependencySchema = z.object({
  id: idSchema, clave: z.string(), nombre: z.string(), activo: z.boolean(),
});
export const createDependencySchema = z.strictObject({
  clave: z.string().trim().min(1).max(40).toUpperCase(),
  nombre: z.string().trim().min(1).max(200),
});

export type CreateUser = z.infer<typeof createUserSchema>;
export type InitialAdmin = z.infer<typeof initialAdminSchema>;
export type CreateDependency = z.infer<typeof createDependencySchema>;
export type Dependency = z.infer<typeof dependencySchema>;
