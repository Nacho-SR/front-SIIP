import type { FastifyReply, FastifyRequest } from 'fastify';
import { HttpError } from '../../../shared/http-error.js';
import type { Credentials } from '../schemas/auth.schema.js';
import type { AuthService } from '../services/auth.service.js';

export const SESSION_TTL_MS = 30 * 60 * 1000;
export const SESSION_COOKIE = 'siip_session';
export const SESSION_PATH = '/api/v1';

export function createAuthController(service: AuthService) {
  async function currentUser(request: FastifyRequest) {
    const { userId, credentialFingerprint, absoluteExpiresAt } = request.session;
    if (!userId || !credentialFingerprint || !absoluteExpiresAt || absoluteExpiresAt <= Date.now()) {
      return null;
    }
    return service.currentUser(userId, credentialFingerprint);
  }

  return {
    async bootstrap(request: FastifyRequest, reply: FastifyReply) {
      const usuario = await currentUser(request);
      if (request.session.userId && !usuario) await request.session.regenerate();
      request.session.absoluteExpiresAt ??= Date.now() + SESSION_TTL_MS;
      return { usuario, csrf_token: reply.generateCsrf() };
    },
    async login(request: FastifyRequest<{ Body: Credentials }>, reply: FastifyReply) {
      const { usuario, fingerprint } = await service.login(request.body.correo, request.body.password);
      await request.session.regenerate();
      request.session.userId = usuario.id;
      request.session.credentialFingerprint = fingerprint;
      request.session.absoluteExpiresAt = Date.now() + SESSION_TTL_MS;
      const csrf_token = reply.generateCsrf();
      await request.session.save();
      return { usuario, csrf_token };
    },
    async requireSession(request: FastifyRequest) {
      request.usuario = await currentUser(request);
      if (!request.usuario) throw new HttpError(401, 'NO_AUTENTICADO', 'Debes iniciar sesión.');
    },
    async logout(request: FastifyRequest, reply: FastifyReply) {
      await request.session.destroy();
      return reply.clearCookie(SESSION_COOKIE, { path: SESSION_PATH }).code(204).send();
    },
  };
}
