import assert from 'node:assert/strict';
import { test } from 'node:test';
import session from '@fastify/session';
import { hash, argon2id } from 'argon2';
import { buildApp } from '../src/app.ts';
import { envSchema } from '../src/env.ts';
import { saveVariablesSchema } from '../src/modules/indicadores/schemas/variables.schema.ts';

const origin = 'http://localhost:5173';
const password = 'Synthetic-test-password-2026!';
const password_hash = await hash(password, { type: argon2id });
const url = '/api/v1/administracion/indicadores/1/variables';
const variable = { codigo: 'N', descripcion: 'Reportes reparados', unidadMedida: 'reportes', tipoDato: 'entero', dependenciaId: null };
const cookie = response => { const value = response.headers['set-cookie']; return (Array.isArray(value) ? value[0] : value).split(';')[0]; };
async function fixture(t) {
  const account = { id: '1', nombre: 'Admin', correo: 'admin@example.test', password_hash, rol: 'administrador',
    activo: true, dependencia_id: null, dependencia_activa: null };
  const calls = [];
  const data = { indicadorId: '1', version: 0, variables: [] };
  const app = await buildApp(envSchema.parse({ FRONTEND_ORIGIN: origin, SESSION_SECRET: 'synthetic-test-secret-with-more-than-32-characters' }), {
    repository: { async findByCorreo() { return account; }, async findById() { return account; } },
    sessionStore: new session.MemoryStore(), variables: {
      async find(id) { calls.push(['get', id]); return data; },
      async save(id, input, actor) {
        calls.push(['put', id, input, actor]);
        return { indicadorId: id, version: 1, variables: input.variables.map(v => ({ ...v, id: '9007199254740993', dependenciaNombre: null, dependenciaActiva: null })) };
      },
    },
  });
  app.log.level = 'silent'; t.after(() => app.close());
  const initial = await app.inject('/api/v1/auth/sesion');
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/sesion', payload: { correo: account.correo, password },
    headers: { origin, cookie: cookie(initial), 'x-csrf-token': initial.json().csrf_token } });
  assert.equal(login.statusCode, 200, login.body);
  return { app, calls, account, headers: { origin, cookie: cookie(login), 'x-csrf-token': login.json().csrf_token } };
}
test('GET y PUT solo permiten Administrador; PUT exige Origin y CSRF', async t => {
  const { app, account, calls, headers } = await fixture(t);
  assert.equal((await app.inject(url)).statusCode, 401);
  for (const invalid of [{ ...headers, origin: 'https://other.example.test' }, { ...headers, 'x-csrf-token': 'invalid' }]) {
    assert.equal((await app.inject({ method: 'PUT', url, headers: invalid, payload: { version: 0, variables: [variable] } })).statusCode, 403);
  }
  for (const rol of ['captura', 'revision', 'consulta']) {
    Object.assign(account, { rol, dependencia_id: rol === 'consulta' ? null : '7', dependencia_activa: rol === 'consulta' ? null : true });
    for (const method of ['GET', 'PUT']) {
      const response = await app.inject({ method, url, headers, ...(method === 'PUT' ? { payload: { version: 0, variables: [variable] } } : {}) });
      assert.equal(response.statusCode, 403);
    }
  }
  assert.equal(calls.length, 0);
});
test('la configuración conserva IDs largos, normaliza códigos y entrega versión nueva sin activar', async t => {
  const { app, headers, calls } = await fixture(t);
  const read = await app.inject({ url, headers });
  assert.equal(read.statusCode, 200);
  assert.equal(read.headers['cache-control'], 'no-store');
  const saved = await app.inject({ method: 'PUT', url, headers, payload: { version: 0, variables: [{ ...variable, codigo: ' n ' }] } });
  assert.equal(saved.statusCode, 200, saved.body);
  assert.equal(saved.json().variables[0].id, '9007199254740993');
  assert.equal(saved.json().version, 1);
  assert.equal(calls.at(-1)[2].variables[0].codigo, 'N');
  assert.equal(calls.at(-1)[3], '1');
  assert.equal(saved.json().activo, undefined);
});
test('validación rechaza duplicados, parámetros extra y asignaciones múltiples', () => {
  for (const data of [
    { version: 0, variables: [variable, { ...variable, codigo: 'n' }] },
    { version: 0, variables: [{ ...variable, id: '1' }, { ...variable, id: '1', codigo: 'D' }] },
    { version: 0, variables: [{ ...variable, dependenciaId: ['1', '2'] }] },
    { version: 0, variables: [{ ...variable, tipoDato: 'fija' }] },
    { version: 0, variables: [{ ...variable, descripcion: '' }] },
    { version: 0, variables: [{ ...variable, dependenciaId: '9223372036854775808' }] },
    { version: -1, variables: [variable] }, { version: 0, variables: [] },
    { version: 0, variables: [variable], activo: true },
  ]) assert.equal(saveVariablesSchema.safeParse(data).success, false);
});
