
import { z } from 'zod';

// ============================================
// VARIABLES DE ENTORNO
// ============================================

export const envSchema = z.object({
  // ------------------------------------------
  // SERVIDOR
  // ------------------------------------------

  NODE_ENV: z.enum([
    'development',
    'test',
    'production'
  ]).default('development'),

  HOST: z
    .string()
    .trim()
    .min(1)
    .default('127.0.0.1'),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3000),

  // ------------------------------------------
  // FRONTEND
  // ------------------------------------------

  FRONTEND_ORIGIN: z
    .url({
      protocol: /^https?$/
    })
    .refine(
      value =>
        URL.canParse(value) &&
        new URL(value).origin === value,
      'Usa un origen HTTP(S) sin ruta, credenciales ni barra final.'
    ),

  // ------------------------------------------
  // POSTGRESQL
  // ------------------------------------------

  DATABASE_URL: z.union([
    z.literal(''),

    z.url({
      protocol: /^postgres(ql)?$/,
      error:
        'Usa postgresql://USUARIO:CONTRASENA@HOST:PUERTO/NOMBRE_BD; no una dirección HTTP.'
    })
  ]).default(''),

  // ------------------------------------------
  // SESIONES
  // ------------------------------------------

  SESSION_SECRET: z
    .string()
    .default(''),

  // ==========================================
  // CORREO PROFESIONAL DEL IMPLAN
  // ==========================================

  SMTP_HOST: z
    .string()
    .trim()
    .default(''),

  SMTP_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(587),

  SMTP_USER: z
    .string()
    .trim()
    .default(''),

  SMTP_PASS: z
    .string()
    .default(''),

  MAIL_FROM: z
    .string()
    .trim()
    .default(''),

  // ------------------------------------------
  // IMAGEN INSTITUCIONAL
  // ------------------------------------------

  MAIL_SIGNATURE_IMAGE_PATH: z
    .string()
    .trim()
    .default('')

}).superRefine((env, context) => {
  // ==========================================
  // SEGURIDAD DE SESIONES
  // ==========================================

  if (
    env.DATABASE_URL &&
    env.SESSION_SECRET.length < 32
  ) {
    context.addIssue({
      code: 'custom',
      path: ['SESSION_SECRET'],
      message:
        'Se requieren al menos 32 caracteres.'
    });
  }

  // ==========================================
  // SEGURIDAD DE POSTGRESQL
  // ==========================================

  if (
    env.DATABASE_URL &&
    URL.canParse(env.DATABASE_URL)
  ) {
    const url = new URL(
      env.DATABASE_URL
    );

    const unsafeParameters = [
      'ssl',
      'sslcert',
      'sslkey',
      'sslrootcert',
      'uselibpqcompat'
    ];

    if (
      unsafeParameters.some(
        key => url.searchParams.has(key)
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message:
          'Configura TLS en el backend, sin opciones SSL adicionales en la URL.'
      });
    }
  }

  // ==========================================
  // PRODUCCIÓN
  // ==========================================

  if (env.NODE_ENV === 'production') {
    if (!env.DATABASE_URL) {
      context.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message:
          'PostgreSQL es obligatorio en producción.'
      });
    }

    if (
      !env.FRONTEND_ORIGIN.startsWith('https:')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['FRONTEND_ORIGIN'],
        message:
          'Producción requiere HTTPS.'
      });
    }
  }

  // ==========================================
  // CONFIGURACIÓN SMTP
  // ==========================================

  const smtpValues = [
    env.SMTP_HOST,
    env.SMTP_USER,
    env.SMTP_PASS,
    env.MAIL_FROM
  ];

  const smtpStarted = smtpValues.some(Boolean);
  const smtpComplete = smtpValues.every(Boolean);

  if (smtpStarted && !smtpComplete) {
    context.addIssue({
      code: 'custom',
      path: ['SMTP_HOST'],
      message:
        'Completa SMTP_HOST, SMTP_USER, SMTP_PASS y MAIL_FROM para activar el correo.'
    });
  }

  if (
    smtpComplete &&
    env.NODE_ENV === 'production' &&
    !env.MAIL_FROM.includes('@')
  ) {
    context.addIssue({
      code: 'custom',
      path: ['MAIL_FROM'],
      message:
        'MAIL_FROM debe contener una dirección de correo.'
    });
  }
});

// ============================================
// TIPO TYPESCRIPT
// ============================================

export type Env = z.infer<typeof envSchema>;
