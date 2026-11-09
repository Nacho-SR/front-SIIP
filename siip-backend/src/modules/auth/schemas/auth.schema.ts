import { z } from 'zod';
import type { FastifyRequest } from 'fastify';

export const idSchema = z.string().max(19).regex(/^[1-9]\d*$/).refine(
  (value) => /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n,
  'Identificador fuera del rango bigint de PostgreSQL.',
);

export const userSchema = z.object({
  id: idSchema,
  nombre: z.string(),
  correo: z.email(),
  rol: z.enum(['captura', 'revision', 'administrador', 'consulta']),
  dependencia_id: idSchema.nullable(),
});

export const credentialsSchema = z.strictObject({
  correo: z.string().trim().toLowerCase().max(255).pipe(z.email()),
  password: z.string().min(1).max(1024),
});

export const sessionSchema = z.object({
  usuario: userSchema.nullable(),
  csrf_token: z.string().min(16),
});

export type User = z.infer<typeof userSchema>;
export type Credentials = z.infer<typeof credentialsSchema>;

declare module 'fastify' {
  interface Session {
    userId?: string;
    credentialFingerprint?: string;
    absoluteExpiresAt?: number;
  }
  interface FastifyRequest {
    usuario: User | null;
  }
  interface FastifyInstance {
    requireSession(request: FastifyRequest): Promise<void>;
  }
}
