
import { z } from 'zod';

import {
  credentialsSchema,
  idSchema,
  userSchema
} from '../../auth/schemas/auth.schema.js';

const accountFields = {
  nombre: z.string().trim().min(1).max(200),
  correo: credentialsSchema.shape.correo,
  password: z.string().min(15).max(1024)
};

// Administrador inicial
export const initialAdminSchema =
  z.strictObject(accountFields);

// Usuario de administración
export const managedUserSchema = userSchema.extend({
  activo: z.boolean(),
  dependencia_nombre: z.string().nullable()
});

// Crear usuario
export const createUserSchema =
  z.discriminatedUnion('rol', [
    z.strictObject({
      ...accountFields,
      rol: z.enum(['captura', 'revision']),
      dependencia_id: idSchema
    }),
    z.strictObject({
      ...accountFields,
      rol: z.literal('consulta'),
      dependencia_id: z.null().default(null)
    })
  ]);

// Editar usuario
export const updateUserSchema =
  z.discriminatedUnion('rol', [
    z.strictObject({
      nombre: accountFields.nombre,
      correo: accountFields.correo,
      rol: z.enum(['captura', 'revision']),
      dependencia_id: idSchema
    }),
    z.strictObject({
      nombre: accountFields.nombre,
      correo: accountFields.correo,
      rol: z.literal('consulta'),
      dependencia_id: z.null()
    })
  ]);

// Cambiar estado
export const changeStatusSchema = z.strictObject({
  activo: z.boolean()
});

// Dependencia
export const dependencySchema = z.object({
  id: idSchema,
  clave: z.string(),
  nombre: z.string(),
  activo: z.boolean()
});

export const createDependencySchema = z.strictObject({
  clave: z.string().trim().min(1).max(40).toUpperCase(),
  nombre: z.string().trim().min(1).max(200)
});

// Editar dependencia: mismos campos que crear
export const updateDependencySchema = z.strictObject({
  clave: z.string().trim().min(1).max(40).toUpperCase(),
  nombre: z.string().trim().min(1).max(200)
});

// Tipos
export type CreateUser =
  z.infer<typeof createUserSchema>;

export type UpdateUser =
  z.infer<typeof updateUserSchema>;

export type ChangeStatus =
  z.infer<typeof changeStatusSchema>;

export type InitialAdmin =
  z.infer<typeof initialAdminSchema>;

export type CreateDependency =
  z.infer<typeof createDependencySchema>;

export type UpdateDependency =
  z.infer<typeof updateDependencySchema>;

export type Dependency =
  z.infer<typeof dependencySchema>;

export type ManagedUser =
  z.infer<typeof managedUserSchema>;
