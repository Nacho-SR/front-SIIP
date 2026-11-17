import assert from 'node:assert/strict';
import { test } from 'node:test';
import session from '@fastify/session';
import { hash, argon2id } from 'argon2';
import { buildApp } from '../src/app.ts';
import { envSchema } from '../src/env.ts';
import { simularPorcentaje } from '../src/modules/indicadores/services/metodologia.service.ts';
import { guardarMetodologiaSchema } from '../src/modules/indicadores/schemas/metodologia.schema.ts';

const regla = { tipo: 'porcentaje_parte_total', numeradorId: '9007199254740993', denominadorId: '2', amarilloDesde: 75, verdeDesde: 90 };
const simulacion = (numerador, denominador, extra = {}) => ({ versionVariables: 1, regla, numerador, denominador, ...extra });
test('porcentaje: fronteras incluidas, conteos cero, precisión y sin confundir sin dato con incumplimiento', () => {
  for (const [n, d, color, valor] of [[0, 100, 'rojo', '0.0000'], [74, 100, 'rojo', '74.0000'], [75, 100, 'amarillo', '75.0000'],
    [89, 100, 'amarillo', '89.0000'], [90, 100, 'verde', '90.0000'], [100, 100, 'verde', '100.0000']]) {
    assert.deepEqual(simularPorcentaje(simulacion(n, d)), { valor, semaforo: color, motivo: null });
  }
  assert.deepEqual(simularPorcentaje(simulacion(0, 0)), { valor: null, semaforo: null, motivo: 'DENOMINADOR_CERO' });
  const below = simularPorcentaje(simulacion(8999999999999999, 9000000000000000, { regla: { ...regla, verdeDesde: 100 } }));
  assert.equal(below.valor, '100.0000'); assert.equal(below.semaforo, 'amarillo');
  for (const [n, d] of [[-1, 10], [2, 1], [1, 0], [0.1, 10], [1, Infinity], [Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 1]])
    assert.throws(() => simularPorcentaje(simulacion(n, d)));
});
test('la regla admite solo parte/total explícito, IDs distintos y umbrales ordenados en porcentaje', () => {
  const valid = { version: 0, versionVariables: 1, regla };
  assert.equal(guardarMetodologiaSchema.safeParse(valid).success, true);
  for (const changes of [{ tipo: 'eval' }, { formula: 'N/D' }, { numeradorId: '2' }, { amarilloDesde: 90 },
    { amarilloDesde: -1 }, { verdeDesde: 101 }, { verdeDesde: Infinity }]) {
    assert.equal(guardarMetodologiaSchema.safeParse({ ...valid, regla: { ...regla, ...changes } }).success, false);
  }
  assert.equal(guardarMetodologiaSchema.safeParse({ ...valid, vigenteDesde: '2026-11-01' }).success, false);
});

const origin = 'http://localhost:5173', password = 'Synthetic-test-password-2026!';
const password_hash = await hash(password, { type: argon2id });
const url = '/api/v1/administracion/indicadores/1/metodologia';
const cookie = response => { const value = response.headers['set-cookie']; return (Array.isArray(value) ? value[0] : value).split(';')[0]; };
async function fixture(t) {
  const account = { id: '1', nombre: 'Admin', correo: 'admin@example.test', password_hash, rol: 'administrador', activo: true, dependencia_id: null, dependencia_activa: null };
  const calls = [];
  const context = { versionVariables: 1, frecuencia: 'Mensual', unidadResultado: '%', sentido: 'Ascendente', acumulacion: 'No acumulable',
    variables: ['9007199254740993', '2'].map((id, i) => ({ id, codigo: i ? 'D' : 'N', descripcion: 'Reporte', unidadMedida: 'reportes', tipoDato: 'entero', dependenciaId: null, dependenciaNombre: null, dependenciaActiva: null })) };
  const result = { indicadorId: '1', version: 1, metodologias: [{ id: '9007199254740994', version: 1, regla, contexto: context, creadoEn: new Date().toISOString(), creadoPor: '1' }] };
  const app = await buildApp(envSchema.parse({ FRONTEND_ORIGIN: origin, SESSION_SECRET: 'synthetic-test-secret-with-more-than-32-characters' }), {
    repository: { async findByCorreo() { return account; }, async findById() { return account; } }, sessionStore: new session.MemoryStore(),
    metodologias: { async find(id) { calls.push(['get', id]); return result; },
      async save(id, data, actor) { calls.push(['put', id, data, actor]); return result; },
      async simulate(id, data) { calls.push(['simulate', id]); return simularPorcentaje(data); } },
  });
  app.log.level = 'silent'; t.after(() => app.close());
  const anonymous = await app.inject('/api/v1/auth/sesion');
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/sesion', payload: { correo: account.correo, password },
    headers: { origin, cookie: cookie(anonymous), 'x-csrf-token': anonymous.json().csrf_token } });
  assert.equal(login.statusCode, 200);
  return { app, calls, account, headers: { origin, cookie: cookie(login), 'x-csrf-token': login.json().csrf_token } };
}
test('metodología: cuatro perfiles, sesión, CSRF y Origin en guardado y simulación', async t => {
  const { app, account, calls, headers } = await fixture(t);
  assert.equal((await app.inject(url)).statusCode, 401);
  for (const rol of ['captura', 'revision', 'consulta']) {
    Object.assign(account, { rol, dependencia_id: rol === 'consulta' ? null : '7', dependencia_activa: rol === 'consulta' ? null : true });
    for (const method of ['GET', 'PUT', 'POST']) assert.equal((await app.inject({ method, url: url + (method === 'POST' ? '/simular' : ''), headers })).statusCode, 403);
  }
  Object.assign(account, { rol: 'administrador', dependencia_id: null, dependencia_activa: null });
  for (const invalid of [{ ...headers, origin: 'https://invalid.example.test' }, { ...headers, 'x-csrf-token': 'invalid' }]) {
    assert.equal((await app.inject({ method: 'PUT', url, headers: invalid, payload: { version: 0, versionVariables: 1, regla } })).statusCode, 403);
    assert.equal((await app.inject({ method: 'POST', url: url + '/simular', headers: invalid, payload: simulacion(90, 100) })).statusCode, 403);
  }
  assert.equal(calls.length, 0);
  const read = await app.inject({ url, headers });
  assert.equal(read.statusCode, 200); assert.equal(read.headers['cache-control'], 'no-store');
  assert.equal(read.json().metodologias[0].id, '9007199254740994');
  assert.equal((await app.inject({ method: 'PUT', url, headers, payload: { version: 0, versionVariables: 1, regla } })).statusCode, 200);
  assert.equal(calls.at(-1)[3], account.id);
  const preview = await app.inject({ method: 'POST', url: url + '/simular', headers, payload: simulacion(90, 100) });
  assert.equal(preview.statusCode, 200); assert.equal(preview.json().semaforo, 'verde');
  assert.equal((await app.inject({ method: 'POST', url: url + '/simular', headers, payload: simulacion(101, 100) })).statusCode, 422);
});
