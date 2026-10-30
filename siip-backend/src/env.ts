import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().trim().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  FRONTEND_ORIGIN: z.url({ protocol: /^https?$/ }).refine(
    (value) => URL.canParse(value) && new URL(value).origin === value,
    'Usa un origen HTTP(S) sin ruta, credenciales ni barra final.',
  ),
  DATABASE_URL: z.union([z.literal(''), z.url({ protocol: /^postgres(ql)?$/ })]).default(''),
  SESSION_SECRET: z.string().default(''),
}).superRefine((env, context) => {
  if (env.DATABASE_URL && env.SESSION_SECRET.length < 32) {
    context.addIssue({ code: 'custom', path: ['SESSION_SECRET'], message: 'Se requieren al menos 32 caracteres.' });
  }
  if (env.DATABASE_URL && URL.canParse(env.DATABASE_URL)) {
    const url = new URL(env.DATABASE_URL);
    if (['ssl', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat'].some((key) => url.searchParams.has(key))) {
      context.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'Configura TLS en el backend, sin opciones SSL adicionales en la URL.' });
    }
  }
  if (env.NODE_ENV === 'production') {
    if (!env.DATABASE_URL) {
      context.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'PostgreSQL es obligatorio en producción.' });
    }
    if (!env.FRONTEND_ORIGIN.startsWith('https:')) {
      context.addIssue({ code: 'custom', path: ['FRONTEND_ORIGIN'], message: 'Producción requiere HTTPS.' });
    }
  }
});

export type Env = z.infer<typeof envSchema>;
