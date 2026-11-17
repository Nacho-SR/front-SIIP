import assert from 'node:assert/strict';
import { test } from 'node:test';
import session from '@fastify/session';
import { hash, argon2id } from 'argon2';
import { buildApp } from '../src/app.ts';
import { envSchema } from '../src/env.ts';
import { fechaMexico, siguientePeriodo, inicioPeriodoValido, minimoInicio } from '../src/modules/indicadores/services/periodos.service.ts';
import { createIndicatorsRepository } from '../src/modules/indicadores/repositories/indicadores.repository.ts';
import { activarIndicadorSchema } from '../src/modules/indicadores/schemas/activacion.schema.ts';

test('calendario servidor: siguiente periodo completo, zona México y reactivación sin retroactividad', () => {
  assert.equal(fechaMexico(new Date('2026-12-01T05:59:59Z')), '2026-11-30');
  assert.equal(fechaMexico(new Date('2026-12-01T06:00:00Z')), '2026-12-01');
  for (const [fecha, frecuencia, esperado] of [
    ['2026-11-17', 'Mensual', '2026-12-01'], ['2026-12-01', 'Mensual', '2027-01-01'],
    ['2026-12-31', 'Mensual', '2027-01-01'], ['2028-02-29', 'Mensual', '2028-03-01'],
    ['2026-11-17', 'Trimestral', '2027-01-01'], ['2026-04-01', 'Trimestral', '2026-07-01'],
    ['2026-06-30', 'Semestral', '2026-07-01'], ['2026-11-17', 'Anual', '2027-01-01'],
  ]) assert.equal(siguientePeriodo(fecha, frecuencia), esperado);
  assert.equal(inicioPeriodoValido('2027-02-01', 'Trimestral'), false);
  assert.equal(inicioPeriodoValido('2027-04-01', 'Trimestral'), true);
  assert.equal(inicioPeriodoValido('2027-04-01', 'Semestral'), false);
  assert.equal(inicioPeriodoValido('2027-01-01', 'Anual'), true);
  assert.equal(inicioPeriodoValido('2027-12-15', 'Mensual'), false);
  assert.equal(minimoInicio('Mensual', new Date('2026-11-17T18:00:00Z')), '2026-12-01');
  assert.equal(minimoInicio('Mensual', new Date('2026-12-17T18:00:00Z')), '2027-01-01');
  assert.equal(activarIndicadorSchema.safeParse({ metodologiaId: '1', primerPeriodo: '2026-13-01' }).success, false);
});
test('la ruta antigua y el repositorio no permiten activar con un booleano', async () => {
  let connected = false;
  const repo = createIndicatorsRepository({ connect() { connected = true; throw Error('No conectar'); } });
  await assert.rejects(repo.changeStatus('1', true, '1'), { codigo: 'ACTIVACION_REQUIERE_CONFIGURACION' });
  assert.equal(connected, false);
});

const origin = 'http://localhost:5173', password = 'Synthetic-test-password-2026!';
const password_hash = await hash(password, { type: argon2id });
const url = '/api/v1/administracion/indicadores/1/activacion';
const data = { indicadorId: '1', activo: false, metodologiaId: '9007199254740993', versionMetodologia: 1, frecuencia: 'Mensual', minimoInicio: '2026-12-01', puedeActivar: true, pendientes: [], historial: [] };
const cookie = r => { const c = r.headers['set-cookie']; return (Array.isArray(c) ? c[0] : c).split(';')[0]; };
test('activación: sesión, cuatro perfiles, Origin, CSRF, IDs largos y contrato estricto', async t => {
  const account = { id: '1', nombre: 'Admin', correo: 'admin@example.test', password_hash, rol: 'administrador', activo: true, dependencia_id: null, dependencia_activa: null };
  const calls = [];
  const app = await buildApp(envSchema.parse({ FRONTEND_ORIGIN: origin, SESSION_SECRET: 'synthetic-test-secret-with-more-than-32-characters' }), {
    repository: { async findByCorreo() { return account; }, async findById() { return account; } }, sessionStore: new session.MemoryStore(),
    activaciones: { async find(id) { calls.push(['get', id]); return data; }, async activate(id, input, actor) { calls.push(['activate', id, input, actor]); return { ...data, activo: true, puedeActivar: false }; } },
  });
  app.log.level = 'silent'; t.after(() => app.close());
  assert.equal((await app.inject(url)).statusCode, 401);
  const initial = await app.inject('/api/v1/auth/sesion');
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/sesion', payload: { correo: account.correo, password }, headers: { origin, cookie: cookie(initial), 'x-csrf-token': initial.json().csrf_token } });
  assert.equal(login.statusCode, 200);
  const headers = { origin, cookie: cookie(login), 'x-csrf-token': login.json().csrf_token };
  const payload = { metodologiaId: data.metodologiaId, primerPeriodo: data.minimoInicio };
  for (const rol of ['captura', 'revision', 'consulta']) {
    Object.assign(account, { rol, dependencia_id: rol === 'consulta' ? null : '7', dependencia_activa: rol === 'consulta' ? null : true });
    for (const method of ['GET', 'POST']) assert.equal((await app.inject({ method, url, headers, ...(method === 'POST' ? { payload } : {}) })).statusCode, 403);
  }
  Object.assign(account, { rol: 'administrador', dependencia_id: null, dependencia_activa: null });
  for (const invalid of [{ ...headers, origin: 'https://other.example.test' }, { ...headers, 'x-csrf-token': 'invalid' }])
    assert.equal((await app.inject({ method: 'POST', url, headers: invalid, payload })).statusCode, 403);
  assert.equal(calls.length, 0);
  const read = await app.inject({ url, headers }); assert.equal(read.statusCode, 200);
  assert.equal(read.headers['cache-control'], 'no-store'); assert.equal(read.json().metodologiaId, data.metodologiaId);
  for (const changes of [{ activo: true }, { primerPeriodo: '2026-11-17' }, { metodologiaId: 1 }])
    assert.equal((await app.inject({ method: 'POST', url, headers, payload: { ...payload, ...changes } })).statusCode, 422);
  const saved = await app.inject({ method: 'POST', url, headers, payload });
  assert.equal(saved.statusCode, 200); assert.equal(saved.json().activo, true); assert.equal(calls.at(-1)[3], '1');
});
