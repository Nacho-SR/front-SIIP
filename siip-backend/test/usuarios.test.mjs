import assert from 'node:assert/strict';
import { test } from 'node:test';
import session from '@fastify/session';
import { hash, verify, argon2id } from 'argon2';
import { buildApp } from '../src/app.ts';
import { envSchema } from '../src/env.ts';
import { HttpError } from '../src/shared/http-error.ts';
import { createUsersService } from '../src/modules/administracion/services/usuarios.service.ts';

const origin = 'http://localhost:5173';
const password = 'Synthetic-test-password-2026!';
const passwordHash = await hash(password, { type: argon2id });
const sessionUrl = '/api/v1/auth/sesion';
const usersUrl = '/api/v1/administracion/usuarios';
const depsUrl = '/api/v1/administracion/dependencias';

async function fixture(t) {
  const accounts = new Map([['1', {
    id: '1', nombre: 'Admin sintético', correo: 'admin@example.test', password_hash: passwordHash,
    rol: 'administrador', dependencia_id: null, activo: true, dependencia_activa: null,
  }]]);
  const dependencies = new Map();
  const events = [];
  const publicUser = ({ password_hash, activo, dependencia_activa, ...user }) => user;
  const users = {
    async listDependencies() { return [...dependencies.values()].filter((item) => item.activo); },
    async createUser(account, actorId) {
      if ([...accounts.values()].some((user) => user.correo === account.correo)) {
        throw new HttpError(409, 'CORREO_YA_REGISTRADO', 'Correo duplicado.');
      }
      if (!dependencies.get(account.dependencia_id)?.activo) {
        throw new HttpError(422, 'DEPENDENCIA_NO_DISPONIBLE', 'Dependencia no disponible.');
      }
      if (account.rol === 'captura') {
        if ([...accounts.values()].some((user) => user.rol === 'captura' && user.dependencia_id === account.dependencia_id)) {
          throw new HttpError(409, 'CAPTURISTA_YA_ASIGNADO', 'Captura ya asignada.');
        }
      }
      const user = { ...account, id: String(accounts.size + 1), activo: true, dependencia_activa: account.dependencia_id ? true : null };
      accounts.set(user.id, user);
      events.push({ actorId, entity: 'usuarios', data: publicUser(user) });
      return publicUser(user);
    },
    async createInitialAdmin() { throw new HttpError(409, 'ADMIN_YA_EXISTE', 'Ya existe un administrador.'); },
    async createDependency(data, actorId) {
      const dependency = { ...data, id: String(dependencies.size + 1), activo: true };
      dependencies.set(dependency.id, dependency);
      events.push({ actorId, entity: 'dependencias', data: dependency });
      return dependency;
    },
  };
  const currentAccount = (user) => user ? {
    ...user, dependencia_activa: dependencies.get(user.dependencia_id)?.activo ?? null,
  } : null;
  const repository = {
    async findByCorreo(correo) { return currentAccount([...accounts.values()].find((user) => user.correo === correo)); },
    async findById(id) { return currentAccount(accounts.get(id)); },
  };
  const app = await buildApp(envSchema.parse({ FRONTEND_ORIGIN: origin, SESSION_SECRET: 'synthetic-secret-for-tests-with-more-than-32-characters' }), {
    repository, users, sessionStore: new session.MemoryStore(),
  });
  app.log.level = 'silent';
  t.after(() => app.close());
  return { app, accounts, dependencies, events, users };
}

function cookieOf(response) {
  const cookie = response.headers['set-cookie'];
  return (Array.isArray(cookie) ? cookie[0] : cookie).split(';')[0];
}

async function login(app, correo = 'admin@example.test') {
  const initial = await app.inject(sessionUrl);
  const response = await app.inject({
    method: 'POST', url: sessionUrl,
    headers: { origin, cookie: cookieOf(initial), 'x-csrf-token': initial.json().csrf_token },
    payload: { correo, password },
  });
  assert.equal(response.statusCode, 200, response.body);
  return { origin, cookie: cookieOf(response), 'x-csrf-token': response.json().csrf_token };
}

test('admin crea dependencia, Captura y Revisión, y ambas cuentas completan auth', async (t) => {
  const { app, accounts, events } = await fixture(t);
  const headers = await login(app);
  const dependency = await app.inject({ method: 'POST', url: depsUrl, headers, payload: { clave: ' demo ', nombre: 'Dependencia sintética' } });
  assert.equal(dependency.statusCode, 201, dependency.body);
  assert.equal(dependency.json().clave, 'DEMO');
  const capture = await app.inject({ method: 'POST', url: usersUrl, headers, payload: {
    nombre: 'Captura Demo', correo: ' CAPTURA@EXAMPLE.TEST ', password, rol: 'captura', dependencia_id: dependency.json().id,
  } });
  assert.equal(capture.statusCode, 201, capture.body);
  assert.equal(capture.json().correo, 'captura@example.test');
  assert.equal(await verify(accounts.get(capture.json().id).password_hash, password), true);
  assert.equal(capture.body.includes('password'), false);

  const review = await app.inject({ method: 'POST', url: usersUrl, headers, payload: {
    nombre: 'Revisión Demo', correo: 'revision@example.test', password, rol: 'revision', dependencia_id: dependency.json().id,
  } });
  assert.equal(review.statusCode, 201, review.body);
  assert.equal(review.json().dependencia_id, dependency.json().id);
  assert.deepEqual(events.map((event) => event.actorId), ['1', '1', '1']);
  assert.equal(JSON.stringify(events).includes(password), false);
  assert.equal(JSON.stringify(events).includes('$argon2'), false);

  assert.equal((await app.inject({ method: 'DELETE', url: sessionUrl, headers })).statusCode, 204);
  for (const rol of ['captura', 'revision']) {
    const userHeaders = await login(app, `${rol}@example.test`);
    const current = await app.inject({ url: sessionUrl, headers: { cookie: userHeaders.cookie } });
    assert.equal(current.json().usuario.rol, rol);
    assert.equal(current.json().usuario.dependencia_id, dependency.json().id);
    assert.equal((await app.inject({ url: depsUrl, headers: { cookie: userHeaders.cookie } })).statusCode, 403);
    assert.equal((await app.inject({ method: 'POST', url: depsUrl, headers: userHeaders, payload: { clave: 'PROHIBIDA', nombre: 'No autorizada' } })).statusCode, 403);
    assert.equal((await app.inject({ method: 'POST', url: usersUrl, headers: userHeaders, payload: {
      nombre: 'No autorizada', correo: 'forbidden@example.test', password, rol: 'revision',
    } })).statusCode, 403);
    assert.equal((await app.inject({ method: 'DELETE', url: sessionUrl, headers: userHeaders })).statusCode, 204);
  }
});

test('las altas exigen sesión administrativa, Origin y CSRF', async (t) => {
  const { app, accounts } = await fixture(t);
  const initial = await app.inject(sessionUrl);
  const anonymous = { origin, cookie: cookieOf(initial), 'x-csrf-token': initial.json().csrf_token };
  const payload = { nombre: 'Revisión Demo', correo: 'revision@example.test', password, rol: 'revision' };
  assert.equal((await app.inject({ method: 'POST', url: usersUrl, headers: anonymous, payload })).statusCode, 401);
  const admin = await login(app);
  for (const headers of [
    { ...admin, 'x-csrf-token': 'invalid' }, { ...admin, origin: 'https://other.example.test' },
  ]) {
    assert.equal((await app.inject({ method: 'POST', url: usersUrl, headers, payload })).statusCode, 403);
  }
  assert.equal(accounts.size, 1);
});

test('rechaza escalamiento a admin, contraseñas débiles, campos extra y dependencias inválidas', async (t) => {
  const { app, accounts } = await fixture(t);
  const headers = await login(app);
  const valid = { nombre: 'Demo', correo: 'demo@example.test', password, rol: 'revision' };
  for (const payload of [
    { ...valid, rol: 'administrador' }, { ...valid, activo: false },
    { ...valid, creado_por: '99' }, { ...valid, password: 'short' },
    { ...valid, correo: 'invalid' }, { ...valid, nombre: ' ' },
    { ...valid, rol: 'captura' }, { ...valid, dependencia_id: null },
    { ...valid, rol: 'captura', dependencia_id: '9223372036854775808' },
    { ...valid, rol: 'captura', dependencia_id: 7 },
    { ...valid, dependencia_id: '9223372036854775808' },
    { ...valid, dependencia_id: 7 },
    valid,
  ]) {
    const response = await app.inject({ method: 'POST', url: usersUrl, headers, payload });
    assert.equal(response.statusCode, 422, response.body);
  }
  for (const rol of ['captura', 'revision']) {
    const missing = await app.inject({ method: 'POST', url: usersUrl, headers, payload: { ...valid, rol, dependencia_id: '99' } });
    assert.equal(missing.statusCode, 422);
    assert.equal(missing.json().codigo, 'DEPENDENCIA_NO_DISPONIBLE');
  }
  assert.equal(accounts.size, 1);
});

test('correos duplicados y segundo capturista no reemplazan una cuenta existente', async (t) => {
  const { app, accounts } = await fixture(t);
  const headers = await login(app);
  const dependency = await app.inject({ method: 'POST', url: depsUrl, headers, payload: { clave: 'DEMO', nombre: 'Demo' } });
  const payload = { nombre: 'Captura Demo', correo: 'captura@example.test', password, rol: 'captura', dependencia_id: dependency.json().id };
  assert.equal((await app.inject({ method: 'POST', url: usersUrl, headers, payload })).statusCode, 201);
  const before = accounts.get('2').password_hash;
  const duplicate = await app.inject({ method: 'POST', url: usersUrl, headers, payload: { ...payload, correo: ' CAPTURA@EXAMPLE.TEST ' } });
  assert.equal(duplicate.statusCode, 409);
  const secondCapture = await app.inject({ method: 'POST', url: usersUrl, headers, payload: { ...payload, correo: 'other@example.test' } });
  assert.equal(secondCapture.statusCode, 409);
  assert.equal(accounts.size, 2);
  assert.equal(accounts.get('2').password_hash, before);
});

test('bootstrap fuerza rol administrador y no recibe una contraseña en el repositorio', async () => {
  let received;
  const service = createUsersService({
    async createInitialAdmin(account) { received = account; return { id: '1', ...account, password_hash: undefined }; },
  });
  await service.createInitialAdmin({ nombre: ' Admin ', correo: ' ADMIN@EXAMPLE.TEST ', password });
  assert.equal(received.rol, 'administrador');
  assert.equal(received.dependencia_id, null);
  assert.equal(received.correo, 'admin@example.test');
  assert.equal(received.nombre, 'Admin');
  assert.equal(received.password, undefined);
  assert.match(received.password_hash, /^\$argon2id\$/);
  assert.equal(await verify(received.password_hash, password), true);
  await assert.rejects(service.createInitialAdmin({ nombre: 'Demo', correo: 'demo@example.test', password, rol: 'revision' }));
});

test('solo administrador consulta dependencias activas y el catálogo incluye las recién creadas', async (t) => {
  const { app, dependencies } = await fixture(t);
  assert.equal((await app.inject(depsUrl)).statusCode, 401);
  const headers = await login(app);
  assert.deepEqual((await app.inject({ url: depsUrl, headers })).json(), []);
  const created = await app.inject({ method: 'POST', url: depsUrl, headers,
    payload: { clave: 'NUEVA', nombre: 'Dependencia nueva' } });
  dependencies.set('99', { id: '99', clave: 'INACTIVA', nombre: 'Inactiva', activo: false });
  const response = await app.inject({ url: depsUrl, headers });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), [created.json()]);
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('Revisión exige dependencia activa y su desactivación invalida la sesión', async (t) => {
  const { app, dependencies } = await fixture(t);
  const headers = await login(app);
  const created = await app.inject({ method: 'POST', url: depsUrl, headers,
    payload: { clave: 'REV', nombre: 'Dependencia de Revisión' } });
  const dependencia_id = created.json().id;
  const payload = { nombre: 'Revisión', correo: 'revision@example.test', password, rol: 'revision', dependencia_id };
  dependencies.get(dependencia_id).activo = false;
  assert.equal((await app.inject({ method: 'POST', url: usersUrl, headers, payload })).statusCode, 422);
  dependencies.get(dependencia_id).activo = true;
  assert.equal((await app.inject({ method: 'POST', url: usersUrl, headers, payload })).statusCode, 201);
  const reviewHeaders = await login(app, payload.correo);
  dependencies.get(dependencia_id).activo = false;
  const current = await app.inject({ url: sessionUrl, headers: { cookie: reviewHeaders.cookie } });
  assert.equal(current.json().usuario, null);
});
