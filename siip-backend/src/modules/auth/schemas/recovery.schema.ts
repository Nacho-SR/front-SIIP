import { z } from 'zod';

// ============================================
// SOLICITUD DE RECUPERACIÓN
// ============================================

export const recoveryRequestSchema = z.strictObject({
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .max(255)
    .pipe(z.email())
});

// ============================================
// RESTABLECER CONTRASEÑA
// ============================================

export const recoveryConfirmSchema = z.strictObject({
  token: z
    .string()
    .regex(/^[a-f0-9]{64}$/i),

  password: z
    .string()
    .min(12, 'La contraseña debe tener al menos 12 caracteres.')
    .max(128, 'La contraseña no puede superar los 128 caracteres.')
});

// ============================================
// TIPOS TYPESCRIPT
// ============================================

export type RecoveryRequest =
  z.infer<typeof recoveryRequestSchema>;

export type RecoveryConfirm =
  z.infer<typeof recoveryConfirmSchema>;
