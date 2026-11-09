import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import session from '@fastify/session';
import { hash, argon2id } from 'argon2';
import { buildApp } from '../src/app.ts';
import { envSchema } from '../src/env.ts';
import { HttpError } from '../src/shared/http-error.ts';
import { clavesBase } from '../src/modules/indicadores/data/catalogo-base.ts';

const { fichas } = JSON.parse(await readFile(new URL('./fixtures/indicadores-prueba.json', import.meta.url), 'utf8'));
const password = 'Synthetic-test-password-2026!';
const password_hash = await hash(password, { type: argon2id });
const origin = 'http://localhost:5173';
const url = '/api/v1/administracion/indicadores';
const authUrl = '/api/v1/auth/sesion';
const cookie = response => {
  const value = response.headers['set-cookie'];
  return (Array.isArray(value) ? value[0] : value).split(';')[0];
};

async function fixture(t, configured = true) {
  const account = { id: '1', nombre: 'Admin', correo: 'admin@example.test', password_hash,
    rol: 'administrador', activo: true, dependencia_id: null, dependencia_activa: null };
  const items = [];
  const actors = [];
  const indicators = {
    async list() { return items; },
    async find(id) { return items.find(i => i.id === id) ?? null; },
    async create(campos, actor) {
      if (items.some(i => i.campos.clave === campos.clave)) throw new HttpError(409, 'INDICADOR_YA_REGISTRADO', 'Clave duplicada.');
      const item = { id: String(9007199254740993n + BigInt(items.length)), campos: { ...campos, consecutivo: String(items.length + 130) },
        activo: false, creadoEn: '2026-11-09T12:00:00.000Z', actualizadoEn: '2026-11-09T12:00:00.000Z' };
      items.push(item); actors.push(actor); return item;
    },
  };
  const app = await buildApp(envSchema.parse({ FRONTEND_ORIGIN: origin, SESSION_SECRET: 'synthetic-test-secret-with-more-than-32-characters' }), {
    repository: { async findByCorreo() { return account; }, async findById() { return account; } },
    sessionStore: new session.MemoryStore(), ...(configured ? { indicators } : {}),
  });
  app.log.level = 'silent'; t.after(() => app.close());
  const bootstrap = await app.inject(authUrl);
  const login = await app.inject({ method: 'POST', url: authUrl,
    headers: { origin, cookie: cookie(bootstrap), 'x-csrf-token': bootstrap.json().csrf_token },
    payload: { correo: account.correo, password } });
  assert.equal(login.statusCode, 200, login.body);
  return { app, account, items, actors, headers: { origin, cookie: cookie(login), 'x-csrf-token': login.json().csrf_token } };
}

test('las seis fichas 130–135 se crean inactivas y se consultan sin perder texto o precisión de ID', async t => {
  const { app, headers, actors } = await fixture(t);
  for (const ficha of fichas) {
    const created = await app.inject({ method: 'POST', url, headers, payload: ficha.campos });
    assert.equal(created.statusCode, 201, created.body);
    const item = created.json();
    assert.equal(item.activo, false);
    assert.equal(item.campos.consecutivo, ficha.consecutivoOrigen);
    assert.deepEqual(item.campos, { ...ficha.campos, consecutivo: ficha.consecutivoOrigen });
    assert.equal((await app.inject({ url: url + '/' + item.id, headers })).statusCode, 200);
    assert.equal(created.headers['cache-control'], 'no-store');
  }
  const listed = await app.inject({ url, headers });
  assert.equal(listed.statusCode, 200);
  assert.equal(listed.json().length, 6);
  assert.equal(listed.json()[0].id, '9007199254740993');
  assert.deepEqual(actors, Array(6).fill('1'));
});

test('alta y consulta de fichas exigen Administrador y la escritura exige Origin/CSRF', async t => {
  const { app, headers, account, items } = await fixture(t);
  assert.equal((await app.inject(url)).statusCode, 401);
  for (const invalid of [{ ...headers, 'x-csrf-token': 'invalid' }, { ...headers, origin: 'https://other.example.test' }]) {
    assert.equal((await app.inject({ method: 'POST', url, headers: invalid, payload: fichas[0].campos })).statusCode, 403);
  }
  for (const rol of ['captura', 'revision', 'consulta']) {
    Object.assign(account, { rol, dependencia_id: rol === 'consulta' ? null : '7', dependencia_activa: rol === 'consulta' ? null : true });
    for (const route of [url, url + '/1']) assert.equal((await app.inject({ url: route, headers })).statusCode, 403);
    assert.equal((await app.inject({ method: 'POST', url, headers, payload: fichas[0].campos })).statusCode, 403);
  }
  assert.equal(items.length, 0);
});

test('validación y duplicados no sobrescriben fichas ni permiten activar desde la petición', async t => {
  const { app, headers, items } = await fixture(t);
  const data = fichas[0].campos;
  for (const change of [{ activo: true }, { id: '1' }, { consecutivo: '130' }, { nombre: ' ' },
    { frecuencia: 'Bimestral' }, { clave: 'INVALIDA' }, { familia: '' }, { variables: '' },
    { tipologia: 'No existe' }, { meta: 0.9 }]) {
    assert.equal((await app.inject({ method: 'POST', url, headers, payload: { ...data, ...change } })).statusCode, 422);
  }
  assert.equal((await app.inject({ method: 'POST', url, headers, payload: { ...data, clave: clavesBase[0].toLowerCase() } })).statusCode, 409);
  assert.equal((await app.inject({ method: 'POST', url, headers, payload: data })).statusCode, 201);
  assert.equal((await app.inject({ method: 'POST', url, headers, payload: data })).statusCode, 409);
  assert.equal(items.length, 1);
  assert.equal((await app.inject({ url: url + '/9223372036854775808', headers })).statusCode, 422);
  assert.equal((await app.inject({ url: url + '/999', headers })).statusCode, 404);
});

test('sin repositorio devuelve 503 autenticado, sin simular guardado', async t => {
  const { app, headers } = await fixture(t, false);
  for (const method of ['GET', 'POST']) assert.equal((await app.inject({ method, url, headers,
    ...(method === 'POST' ? { payload: fichas[0].campos } : {}) })).statusCode, 503);
});
