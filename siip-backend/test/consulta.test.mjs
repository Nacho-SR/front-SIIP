import assert from 'node:assert/strict';
import { test } from 'node:test';
import session from '@fastify/session';
import { hash } from 'argon2';
import { buildApp } from '../src/app.ts';
import { envSchema } from '../src/env.ts';
import { fichaConsultaSchema } from '../src/modules/consulta/schemas/consulta.schema.ts';
import { createConsultaRepository } from '../src/modules/consulta/repositories/consulta.repository.ts';

const url = '/api/v1/consulta/indicadores';
const origin = 'http://localhost:5173', password = 'Synthetic-consulta-password-2026!';
const password_hash = await hash(password);
const ficha = { ...Object.fromEntries(Object.keys(fichaConsultaSchema.shape).map(key => [key, ''])),
  id: '9007199254740993', activo: false, clave: 'SIIP.05.F35.004', nombre: 'Ficha documental',
  algoritmo: 'N / D * 100', meta: '0', lineaBase: '0', fuente: '' };
const cookie = response => {
  const header = response.headers['set-cookie'];
  return (Array.isArray(header) ? header[0] : header).split(';')[0];
};
async function fixture(t, repository = { async list() { return [ficha]; } }) {
  const account = { id: '1', nombre: 'Consulta sintética', correo: 'consulta@example.test', password_hash,
    rol: 'consulta', activo: true, dependencia_id: null, dependencia_activa: null };
  const app = await buildApp(envSchema.parse({ FRONTEND_ORIGIN: origin, SESSION_SECRET: 'synthetic-consulta-secret-with-more-than-32-characters' }), {
    repository: { async findByCorreo() { return account; }, async findById() { return account; } },
    sessionStore: new session.MemoryStore(), consulta: repository ?? undefined,
  });
  app.log.level = 'silent'; t.after(() => app.close());
  const initial = await app.inject('/api/v1/auth/sesion');
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/sesion', payload: { correo: account.correo, password },
    headers: { origin, cookie: cookie(initial), 'x-csrf-token': initial.json().csrf_token } });
  assert.equal(login.statusCode, 200, login.body);
  return { app, account, headers: { cookie: cookie(login) } };
}

test('Consulta exige sesión, conserva bigints y consulta global para tres perfiles; Captura usa su dependencia vigente', async t => {
  const calls = [];
  const { app, account, headers } = await fixture(t, { async list(id) { calls.push(id); return [ficha]; } });
  assert.equal((await app.inject(url)).statusCode, 401);
  for (const rol of ['consulta', 'revision', 'administrador', 'captura']) {
    account.rol = rol; account.dependencia_id = ['revision', 'captura'].includes(rol) ? '7' : null;
    account.dependencia_activa = account.dependencia_id ? true : null;
    const response = await app.inject({ url, headers });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.deepEqual(response.json(), { indicadores: [ficha] });
  }
  assert.deepEqual(calls, [null, null, null, '7']);
  account.dependencia_id = '8';
  await app.inject({ url, headers: { ...headers, 'x-dependencia-id': '99', 'x-rol': 'administrador' } });
  assert.equal(calls.at(-1), '8');
  account.dependencia_activa = false;
  assert.equal((await app.inject({ url, headers })).statusCode, 401);
  assert.equal(calls.length, 5);
});

test('rechaza filtros de identidad y métodos de escritura; no concede API administrativa ni metadatos internos', async t => {
  let calls = 0;
  const { app, headers } = await fixture(t, { async list() {
    calls++;
    return [{ ...ficha, variables: [{ valor: 'PRIVADO' }], asignaciones: 'PRIVADO', metodologia: 'PRIVADO',
      creadoEn: 'PRIVADO', storage_key: 'PRIVADO', observaciones: 'PRIVADO' }];
  } });
  for (const query of ['?dependenciaId=8', '?rol=administrador', '?id=1', '?campo=nombre', '?semaforo=gris']) {
    assert.equal((await app.inject({ url: url + query, headers })).statusCode, 422);
  }
  assert.equal(calls, 0);
  const response = await app.inject({ url, headers });
  assert.equal(response.statusCode, 200, response.body);
  assert.deepEqual(response.json(), { indicadores: [ficha] });
  assert.doesNotMatch(response.body, /PRIVADO|asignaciones|storage_key|creadoEn/);
  assert.equal((await app.inject({ url: '/api/v1/administracion/indicadores', headers })).statusCode, 403);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.equal(app.hasRoute({ method, url }), false);
});

test('distingue vacío, falta de configuración y fallo sin exponer detalles de PostgreSQL', async t => {
  const empty = await fixture(t, { async list() { return []; } });
  assert.deepEqual((await empty.app.inject({ url, headers: empty.headers })).json(), { indicadores: [] });
  const missing = await fixture(t, null);
  const unavailable = await missing.app.inject({ url, headers: missing.headers });
  assert.equal(unavailable.statusCode, 503);
  assert.equal(unavailable.json().codigo, 'CONSULTA_NO_CONFIGURADA');
  const failure = await fixture(t, { async list() { throw new Error('postgres://PRIVADO'); } });
  const response = await failure.app.inject({ url, headers: failure.headers });
  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /postgres|PRIVADO/);
});

test('repositorio selecciona columnas documentales explícitas, filtra sin duplicar y parametriza el alcance', async () => {
  const calls = [];
  const repository = createConsultaRepository({ async query(sql, params) { calls.push({ sql, params }); return { rows: [ficha] }; } });
  assert.deepEqual(await repository.list(null), [ficha]);
  await repository.list('7');
  const attack = "7'); DROP TABLE usuarios; --";
  await repository.list(attack);
  assert.deepEqual(calls.map(c => c.params), [[null], ['7'], [attack]]);
  for (const { sql } of calls) {
    assert.match(sql, /\$1::bigint IS NULL OR EXISTS/);
    assert.match(sql, /v.indicador_id = i.id AND v.dependencia_id = \$1/);
    assert.match(sql, /JOIN dependencias d ON d.id = v.dependencia_id AND d.activo/);
    assert.match(sql, /COALESCE\(i.medio_verificacion, ''\) AS "fuente"/);
    assert.doesNotMatch(sql, /i\.\*|variables_texto|metodologia|INSERT|UPDATE|DELETE/);
    assert.equal(sql.includes(attack), false);
  }
});

test('repositorio no fabrica resultados ni confunde esquema faltante con catálogo vacío', async () => {
  assert.deepEqual(await createConsultaRepository({ async query() { return { rows: [] }; } }).list('7'), []);
  for (const code of ['42P01', '42703']) {
    const repository = createConsultaRepository({ async query() { throw Object.assign(new Error('PRIVADO'), { code }); } });
    await assert.rejects(repository.list(null), { statusCode: 503, codigo: 'CONSULTA_NO_CONFIGURADA' });
  }
  const original = new Error('conexión');
  await assert.rejects(createConsultaRepository({ async query() { throw original; } }).list(null), e => e === original);
});
