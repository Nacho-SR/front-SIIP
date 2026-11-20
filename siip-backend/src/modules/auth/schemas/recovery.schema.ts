import { z } from 'zod';
import { newPasswordSchema } from './auth.schema.js';

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

  password: newPasswordSchema
});

// ============================================
// TIPOS TYPESCRIPT
// ============================================

export type RecoveryRequest =
  z.infer<typeof recoveryRequestSchema>;

export type RecoveryConfirm =
  z.infer<typeof recoveryConfirmSchema>;
