import type { Session } from 'fastify';
import type { FastifySessionObject, SessionStore } from '@fastify/session';
import type { Pool } from 'pg';

function missingSession() {
  return Object.assign(new Error('La sesión ya no existe o fue modificada.'), { code: 'ENOENT' });
}

function values(id: string, session: Session) {
  return [
    id,
    (session as FastifySessionObject).sessionId,
    JSON.stringify(session),
    new Date(session.absoluteExpiresAt ?? session.cookie.expires!.valueOf()),
  ];
}

// shortcut: se rechazan filas expiradas sin borrarlas; programar su limpieza antes del despliegue.
export class PostgresSessionStore implements SessionStore {
  constructor(private readonly pool: Pool) {}

  set(id: string, session: Session, callback: Parameters<SessionStore['set']>[2]) {
    void this.pool.query(`
      INSERT INTO sesiones (id, generacion, datos, expira_en)
      VALUES ($1, $2, $3::jsonb, $4)
      ON CONFLICT (id) DO NOTHING
    `, values(id, session)).then(
      (result) => callback(result.rowCount === 1 ? undefined : missingSession()), callback,
    );
  }

  get(id: string, callback: Parameters<SessionStore['get']>[1]) {
    void this.pool.query<{ datos: Session }>(
      'SELECT datos FROM sesiones WHERE id = $1 AND expira_en > now()', [id],
    ).then((result) => callback(null, result.rows[0]?.datos ?? null), callback);
  }

  compareAndSet(
    id: string, expectedGeneration: string, session: Session,
    callback: Parameters<SessionStore['compareAndSet']>[3],
  ) {
    void this.pool.query(`
      UPDATE sesiones SET generacion = $2, datos = $3::jsonb, expira_en = $4
      WHERE id = $1 AND generacion = $5 AND expira_en > now()
    `, [...values(id, session), expectedGeneration]).then(
      (result) => callback(result.rowCount === 1 ? undefined : missingSession()), callback,
    );
  }

  destroy(id: string, callback: Parameters<SessionStore['destroy']>[1]) {
    void this.pool.query('DELETE FROM sesiones WHERE id = $1', [id]).then(() => callback(), callback);
  }
}
