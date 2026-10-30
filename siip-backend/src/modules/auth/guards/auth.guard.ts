import type { FastifyRequest } from 'fastify';
import { HttpError } from '../../../shared/http-error.js';
import type { User } from '../schemas/auth.schema.js';

export function requireRoles(...roles: User['rol'][]) {
  return async (request: FastifyRequest) => {
    if (!request.usuario) throw new HttpError(401, 'NO_AUTENTICADO', 'Debes iniciar sesión.');
    if (!roles.includes(request.usuario.rol)) {
      throw new HttpError(403, 'NO_PERMITIDO', 'No tienes permiso para esta acción.');
    }
  };
}
