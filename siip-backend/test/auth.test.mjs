import assert from 'node:assert/strict';
import { test } from 'node:test';
import { argon2id, hash } from 'argon2';
import session from '@fastify/session';
import { buildApp } from '../src/app.ts';
import { envSchema } from '../src/env.ts';
import { requireRoles } from '../src/modules/auth/guards/auth.guard.ts';
import { PostgresSessionStore } from '../src/modules/auth/repositories/session.repository.ts';

const origin = 'http://localhost:5173';
const secret = 'synthetic-test-secret-with-at-least-32-characters';
const password = 'Synthetic-test-password-2026!';
const passwordHash = await hash(password, { type: argon2id });
const url = '/api/v1/auth/sesion';

async function fixture(t, sessionStore) {
  const account = {
    id: '9007199254740993', nombre: 'Cuenta sintética', correo: 'captura@example.test',
    rol: 'captura', dependencia_id: '7', activo: true, dependencia_activa: true,
    password_hash: passwordHash,
  };
  const repository = {
    async findByCorreo(correo) { return correo === account.correo ? account : null; },
    async findById(id) { return id === account.id ? account : null; },
  };
  // Exclusivamente pruebas: la aplicación real solo construye PostgresSessionStore.
  const store = sessionStore ?? new session.MemoryStore();
  const env = envSchema.parse({ FRONTEND_ORIGIN: origin, SESSION_SECRET: secret });
  const app = await buildApp(env, { repository, sessionStore: store });
  app.log.level = 'silent';
  t.after(() => app.close());
  return { app, account, repository, store };
}

function cookieOf(response) {
  const header = response.headers['set-cookie'];
  return (Array.isArray(header) ? header[0] : header).split(';')[0];
}

async function bootstrap(app, cookie) {
  const response = await app.inject({ url, headers: cookie ? { cookie } : {} });
  assert.equal(response.statusCode, 200);
  return { response, cookie: response.headers['set-cookie'] ? cookieOf(response) : cookie, ...response.json() };
}

function headers(state) {
  return { origin, cookie: state.cookie, 'x-csrf-token': state.csrf_token };
}

async function login(app, correo = 'captura@example.test') {
  const anonymous = await bootstrap(app);
  const response = await app.inject({
    method: 'POST', url, headers: headers(anonymous), payload: { correo, password },
  });
  assert.equal(response.statusCode, 200, response.body);
  return { cookie: cookieOf(response), ...response.json(), anonymous };
}

test('sin PostgreSQL auth responde 503 y salud continúa disponible', async (t) => {
  const app = await buildApp(envSchema.parse({ FRONTEND_ORIGIN: origin }));
  app.log.level = 'silent';
  t.after(() => app.close());
  for (const method of ['GET', 'POST', 'DELETE']) {
    const response = await app.inject({ method, url });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().codigo, 'AUTENTICACION_NO_CONFIGURADA');
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.headers['set-cookie'], undefined);
  }
  assert.equal((await app.inject('/api/v1/salud')).statusCode, 200);
});

test('bootstrap anónimo y login con Argon2id exponen solo el usuario público', async (t) => {
  const { app, account, store } = await fixture(t);
  const initial = await bootstrap(app);
  assert.equal(initial.usuario, null);
  const cookieHeader = initial.response.headers['set-cookie'];
  assert.match(String(cookieHeader), /HttpOnly/);
  assert.match(String(cookieHeader), /SameSite=Lax/);
  assert.match(String(cookieHeader), /Path=\/api\/v1/);

  const authenticated = await login(app, ' CAPTURA@EXAMPLE.TEST ');
  assert.deepEqual(authenticated.usuario, {
    id: account.id, nombre: account.nombre, correo: account.correo,
    rol: 'captura', dependencia_id: '7',
  });
  assert.notEqual(authenticated.cookie, authenticated.anonymous.cookie);
  assert.notEqual(authenticated.csrf_token, authenticated.anonymous.csrf_token);
  assert.equal((await bootstrap(app, authenticated.cookie)).usuario.id, account.id);
  const stored = JSON.stringify([...store.store.values()]);
  assert.equal(stored.includes(password), false);
  assert.equal(stored.includes(passwordHash), false);
});

test('login exige origen permitido y CSRF vinculado a la sesión', async (t) => {
  const { app } = await fixture(t);
  const anonymous = await bootstrap(app);
  for (const requestHeaders of [
    { origin },
    { ...headers(anonymous), origin: 'https://other.example.test' },
    { cookie: anonymous.cookie, 'x-csrf-token': anonymous.csrf_token },
    { ...headers(anonymous), 'x-csrf-token': 'invalid-token' },
  ]) {
    const response = await app.inject({
      method: 'POST', url, headers: requestHeaders,
      payload: { correo: 'captura@example.test', password },
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.headers['cache-control'], 'no-store');
  }
});

test('rechaza datos inválidos y campos que intentan imponer identidad o rol', async (t) => {
  const { app } = await fixture(t);
  const anonymous = await bootstrap(app);
  for (const payload of [
    { correo: 'bad-email', password },
    { correo: 'captura@example.test', password: '' },
    { correo: 'captura@example.test', password, rol: 'administrador' },
    { correo: 'captura@example.test', password, dependencia_id: '99' },
  ]) {
    const response = await app.inject({ method: 'POST', url, headers: headers(anonymous), payload });
    assert.equal(response.statusCode, 422);
    assert.equal(response.json().codigo, 'DATOS_INVALIDOS');
  }
});

test('cuenta inexistente, contraseña incorrecta e inactividad producen el mismo error', async (t) => {
  const { app, account } = await fixture(t);
  const anonymous = await bootstrap(app);
  const attempt = (correo, suppliedPassword) => app.inject({
    method: 'POST', url, headers: headers(anonymous), payload: { correo, password: suppliedPassword },
  });
  const wrong = await attempt(account.correo, 'incorrect');
  const absent = await attempt('unknown@example.test', password);
  account.activo = false;
  const inactive = await attempt(account.correo, password);
  account.activo = true;
  account.dependencia_activa = false;
  const dependency = await attempt(account.correo, password);
  for (const response of [wrong, absent, inactive, dependency]) {
    assert.equal(response.statusCode, 401);
    assert.deepEqual(response.json(), wrong.json());
  }
});

test('rota sesión/CSRF al autenticar y no admite la cookie anterior', async (t) => {
  const { app } = await fixture(t);
  const authenticated = await login(app);
  const staleCsrf = await app.inject({
    method: 'DELETE', url,
    headers: { ...headers(authenticated), 'x-csrf-token': authenticated.anonymous.csrf_token },
  });
  assert.equal(staleCsrf.statusCode, 403);
  assert.equal((await bootstrap(app, authenticated.anonymous.cookie)).usuario, null);
  assert.ok((await bootstrap(app, authenticated.cookie)).usuario);
});

test('logout revoca la sesión en servidor y expira la cookie', async (t) => {
  const { app, store } = await fixture(t);
  const authenticated = await login(app);
  const response = await app.inject({ method: 'DELETE', url, headers: headers(authenticated) });
  assert.equal(response.statusCode, 204);
  assert.match(String(response.headers['set-cookie']), /Expires=Thu, 01 Jan 1970/);
  assert.equal(store.store.size, 0);
  assert.equal((await bootstrap(app, authenticated.cookie)).usuario, null);
  const anonymous = await bootstrap(app);
  assert.equal((await app.inject({ method: 'DELETE', url, headers: headers(anonymous) })).statusCode, 401);
});

test('consulta la cuenta vigente y conserva tres roles exclusivos', async (t) => {
  const { app, account } = await fixture(t);
  const authenticated = await login(app);
  for (const rol of ['captura', 'revision', 'administrador']) {
    account.rol = rol;
    assert.equal((await bootstrap(app, authenticated.cookie)).usuario.rol, rol);
  }
  account.activo = false;
  assert.equal((await bootstrap(app, authenticated.cookie)).usuario, null);
});

test('cambiar contraseña invalida sesiones anteriores', async (t) => {
  const { app, account } = await fixture(t);
  const authenticated = await login(app);
  account.password_hash = await hash('Another-synthetic-password!', { type: argon2id });
  assert.equal((await bootstrap(app, authenticated.cookie)).usuario, null);
});

test('desactivar una dependencia invalida también una sesión existente', async (t) => {
  const { app, account } = await fixture(t);
  const authenticated = await login(app);
  account.dependencia_activa = false;
  assert.equal((await bootstrap(app, authenticated.cookie)).usuario, null);
});

test('Administrador no hereda permisos de Captura o Revisión', async () => {
  const capture = requireRoles('captura');
  const review = requireRoles('revision');
  await capture({ usuario: { rol: 'captura' } });
  await review({ usuario: { rol: 'revision' } });
  await assert.rejects(capture({ usuario: { rol: 'administrador' } }), { statusCode: 403 });
  await assert.rejects(review({ usuario: { rol: 'administrador' } }), { statusCode: 403 });
  await assert.rejects(capture({ usuario: null }), { statusCode: 401 });
});

test('la expiración absoluta no se extiende al consultar sesión', async (t) => {
  const { app, store } = await fixture(t);
  const authenticated = await login(app);
  const saved = [...store.store.values()][0];
  const expiration = saved.absoluteExpiresAt;
  await bootstrap(app, authenticated.cookie);
  assert.equal([...store.store.values()][0].absoluteExpiresAt, expiration);
  saved.absoluteExpiresAt = Date.now() - 1;
  assert.equal((await bootstrap(app, authenticated.cookie)).usuario, null);
});

test('limita a cinco intentos de login por IP y minuto', async (t) => {
  const { app } = await fixture(t);
  const anonymous = await bootstrap(app);
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await app.inject({
      method: 'POST', url, headers: headers(anonymous),
      payload: { correo: 'unknown@example.test', password },
    });
    assert.equal(response.statusCode, 401);
  }
  const limited = await app.inject({
    method: 'POST', url, headers: headers(anonymous), payload: { correo: 'unknown@example.test', password },
  });
  assert.equal(limited.statusCode, 429);
  assert.ok(limited.headers['retry-after']);
});

test('los errores internos no exponen credenciales ni detalles de PostgreSQL', async (t) => {
  const { app, repository } = await fixture(t);
  const anonymous = await bootstrap(app);
  repository.findByCorreo = async () => { throw new Error('postgres://private-user:private-password@private-host/db'); };
  const response = await app.inject({
    method: 'POST', url, headers: headers(anonymous), payload: { correo: 'captura@example.test', password },
  });
  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /private-user|private-password|private-host|postgres:/);
});

test('salud con cookie no depende del almacén de sesiones', async (t) => {
  const { app, store } = await fixture(t);
  const authenticated = await login(app);
  store.get = (_id, callback) => callback(new Error('session database unavailable'));
  const health = await app.inject({ url: '/api/v1/salud', headers: { cookie: authenticated.cookie } });
  assert.equal(health.statusCode, 200);
  assert.equal(health.headers['set-cookie'], undefined);
});

test('el adaptador conserva la serialización y generación requeridas por Fastify', async (t) => {
  // Doble del ejecutor SQL: comprueba el contrato del plugin, no la sintaxis PostgreSQL.
  const rows = new Map();
  const pool = {
    async query(sql, params) {
      const [id, generation, data, expires, expected] = params;
      if (sql.includes('INSERT INTO sesiones')) {
        if (rows.has(id)) return { rowCount: 0 };
        rows.set(id, { generation, data: JSON.parse(data), expires });
        return { rowCount: 1 };
      }
      if (sql.includes('UPDATE sesiones')) {
        const previous = rows.get(id);
        if (!previous || previous.generation !== expected || previous.expires <= new Date()) {
          return { rowCount: 0 };
        }
        rows.set(id, { generation, data: JSON.parse(data), expires });
        return { rowCount: 1 };
      }
      if (sql.includes('SELECT datos')) {
        const row = rows.get(id);
        return { rows: row && row.expires > new Date() ? [{ datos: structuredClone(row.data) }] : [] };
      }
      if (sql.includes('DELETE FROM sesiones')) {
        rows.delete(id);
        return { rowCount: 1 };
      }
      throw new Error('Consulta no prevista en el doble de prueba.');
    },
  };
  const { app } = await fixture(t, new PostgresSessionStore(pool));
  const authenticated = await login(app);
  assert.equal((await bootstrap(app, authenticated.cookie)).usuario.id, authenticated.usuario.id);
  assert.equal((await bootstrap(app, authenticated.anonymous.cookie)).usuario, null);
  assert.ok((await bootstrap(app, authenticated.cookie)).usuario);
  assert.equal((await app.inject({ method: 'DELETE', url, headers: headers(authenticated) })).statusCode, 204);
  assert.equal((await bootstrap(app, authenticated.cookie)).usuario, null);
});
