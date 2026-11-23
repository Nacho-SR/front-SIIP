import assert from 'node:assert/strict';
import { test } from 'node:test';
import session from '@fastify/session';
import { hash } from 'argon2';
import { buildApp } from '../src/app.ts';
import { envSchema } from '../src/env.ts';
import { createBandejaRepository } from '../src/modules/operacion/repositories/bandeja.repository.ts';

const origin = 'http://localhost:5173';
const password = 'Synthetic-bandeja-password-2026!';
const password_hash = await hash(password);
const url = '/api/v1/captura/indicadores';
const dependencia = { id: '9007199254740993', clave: 'DGSM', nombre: 'Servicios Municipales' };
const variable = { id: '9007199254740995', codigo: 'N', descripcion: 'Luminarias reparadas', unidadMedida: 'luminarias', tipoDato: 'entero' };
const indicador = { id: '9007199254740994', clave: 'SIIP.05.F35.004', nombre: 'Luminarias',
  agrupacion: '05. Servicios públicos', familia: 'F35. Alumbrado', frecuencia: 'Mensual',
  activo: true, primerPeriodo: '2026-12-01', periodoActual: { inicio: '2026-11-01', fin: '2026-11-30' }, variables: [variable] };
const calendario = { fechaServidor: '2026-11-23', zonaHoraria: 'America/Mexico_City' };
const data = { dependencia, ...calendario, indicadores: [indicador] };
const clock = () => new Date('2026-11-23T12:00:00Z');
const cookie = response => {
  const value = response.headers['set-cookie'];
  return (Array.isArray(value) ? value[0] : value).split(';')[0];
};
async function fixture(t, repository) {
  const account = { id: '1', nombre: 'Captura', correo: 'captura@example.test', password_hash, rol: 'captura',
    activo: true, dependencia_id: dependencia.id, dependencia_activa: true };
  const calls = [];
  const app = await buildApp(envSchema.parse({ FRONTEND_ORIGIN: origin, SESSION_SECRET: 'synthetic-bandeja-secret-with-more-than-32-characters' }), {
    repository: { async findByCorreo() { return account; }, async findById() { return account; } },
    sessionStore: new session.MemoryStore(),
    bandeja: repository === null ? undefined : repository ?? { async find(id) { calls.push(id); return data; } },
  });
  app.log.level = 'silent'; t.after(() => app.close());
  const initial = await app.inject('/api/v1/auth/sesion');
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/sesion', payload: { correo: account.correo, password },
    headers: { origin, cookie: cookie(initial), 'x-csrf-token': initial.json().csrf_token } });
  assert.equal(login.statusCode, 200, login.body);
  return { app, account, calls, headers: { cookie: cookie(login) } };
}

test('la bandeja exige sesión y exclusivamente Captura; no hereda privilegios de otros roles', async t => {
  const { app, account, calls, headers } = await fixture(t);
  assert.equal((await app.inject(url)).statusCode, 401);
  for (const rol of ['revision', 'administrador', 'consulta']) {
    account.rol = rol;
    assert.equal((await app.inject({ url, headers })).statusCode, 403);
  }
  assert.deepEqual(calls, []);
});
test('la dependencia es la de la sesión vigente; rechaza sustituciones y conserva IDs bigint', async t => {
  const { app, account, calls, headers } = await fixture(t);
  const response = await app.inject({ url, headers });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.deepEqual(response.json(), data);
  assert.deepEqual(calls, [dependencia.id]);
  for (const query of ['?dependenciaId=2', '?dependencia_id=2', '?id=2', '?fechaServidor=2027-01-01', '?zonaHoraria=UTC']) {
    assert.equal((await app.inject({ url: url + query, headers })).statusCode, 422);
  }
  assert.equal(calls.length, 1);
  account.dependencia_id = '22';
  await app.inject({ url, headers });
  assert.equal(calls.at(-1), '22');
  account.dependencia_activa = false;
  assert.equal((await app.inject({ url, headers })).statusCode, 401);
  assert.equal(calls.length, 2);
});
test('contrato de solo lectura sin metadatos privados; ausencia de configuración es 503', async t => {
  const { app, headers } = await fixture(t, { async find() {
    return { ...data, auditoria: 'PRIVADO', indicadores: [{ ...indicador, metodologia: 'PRIVADO', variables: [{ ...variable, dependenciaId: '55', fuente: 'PRIVADO' }] }] };
  } });
  const response = await app.inject({ url, headers });
  assert.equal(response.statusCode, 200, response.body);
  assert.doesNotMatch(response.body, /PRIVADO|dependenciaId/);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.equal(app.hasRoute({ method, url }), false);
  }
  const missing = await fixture(t, null);
  const failure = await missing.app.inject({ url, headers: missing.headers });
  assert.equal(failure.statusCode, 503);
  assert.equal(failure.json().codigo, 'BANDEJA_NO_CONFIGURADA');
});
test('un fallo de BD entrega un error genérico sin filtrar detalles internos', async t => {
  const { app, headers } = await fixture(t, { async find() { throw new Error('postgres://PRIVADO'); } });
  const response = await app.inject({ url, headers });
  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body, /postgres|PRIVADO/);
});

test('repositorio filtra por dependencia también las variables y agrupa sin mezclar indicadores', async () => {
  const calls = [];
  const row = { ...indicador, ...variable, indicadorId: indicador.id, variableId: variable.id };
  const pool = { async query(sql, params) {
    calls.push({ sql, params });
    return { rows: calls.length === 1 ? [dependencia] : [row,
      { ...row, codigo: 'D', variableId: '9007199254740996' },
      { ...row, indicadorId: '8', clave: 'SIIP.05.F35.005', activo: false, primerPeriodo: null }] };
  } };
  const result = await createBandejaRepository(pool, clock).find(dependencia.id);
  assert.deepEqual(calls.map(call => call.params), [[dependencia.id], [dependencia.id]]);
  assert.match(calls[0].sql, /WHERE id = \$1 AND activo/);
  assert.match(calls[1].sql, /WHERE v.dependencia_id = \$1/);
  assert.match(calls[1].sql, /JOIN dependencias d ON d.id = v.dependencia_id AND d.activo/);
  assert.match(calls[1].sql, /a.desactivado_en IS NULL AND i.activo/);
  assert.doesNotMatch(calls.map(call => call.sql).join(' '), /INSERT|UPDATE|DELETE/);
  assert.equal(result.indicadores.length, 2);
  assert.deepEqual(result.indicadores[0].variables.map(v => v.codigo), ['N', 'D']);
  assert.equal(result.indicadores[1].primerPeriodo, null);
  assert.equal(result.fechaServidor, calendario.fechaServidor);
  assert.equal(result.zonaHoraria, calendario.zonaHoraria);
  assert.deepEqual(result.indicadores[0].periodoActual, indicador.periodoActual);
  assert.deepEqual(result.indicadores[0].variables[0], variable);
});
test('repositorio distingue bandeja vacía, dependencia no disponible y esquema incompleto', async () => {
  let count = 0;
  const empty = createBandejaRepository({ async query() { return { rows: ++count === 1 ? [dependencia] : [] }; } }, clock);
  assert.deepEqual(await empty.find(dependencia.id), { dependencia, ...calendario, indicadores: [] });
  const unavailable = createBandejaRepository({ async query() { return { rows: [] }; } });
  await assert.rejects(unavailable.find('1'), { statusCode: 403, codigo: 'DEPENDENCIA_NO_DISPONIBLE' });
  for (const code of ['42P01', '42703']) {
    const repository = createBandejaRepository({ async query() { throw Object.assign(new Error('privado'), { code }); } });
    await assert.rejects(repository.find('1'), { statusCode: 503, codigo: 'BANDEJA_NO_CONFIGURADA' });
  }
  const original = new Error('conexión');
  await assert.rejects(createBandejaRepository({ async query() { throw original; } }).find('1'), error => error === original);
});

test('la bandeja toma una sola fecha local del servidor para todas las frecuencias, sin habilitar capturas', async () => {
  const row = { ...indicador, ...variable, indicadorId: indicador.id, variableId: variable.id };
  const esperados = {
    Mensual: { inicio: '2026-12-01', fin: '2026-12-31' },
    Trimestral: { inicio: '2026-10-01', fin: '2026-12-31' },
    Semestral: { inicio: '2026-07-01', fin: '2026-12-31' },
    Anual: { inicio: '2026-01-01', fin: '2026-12-31' },
  };
  let reads = 0;
  const repository = createBandejaRepository({ async query(sql) {
    return { rows: sql.includes('FROM dependencias WHERE') ? [dependencia] : Object.keys(esperados).map((frecuencia, index) => ({
      ...row, indicadorId: String(index + 1), frecuencia, activo: index !== 1,
      primerPeriodo: index === 1 ? null : '2027-01-01',
    })) };
  } }, () => { reads++; return new Date('2027-01-01T05:59:59.999Z'); });
  const result = await repository.find(dependencia.id);
  assert.equal(reads, 1);
  assert.equal(result.fechaServidor, '2026-12-31');
  for (const item of result.indicadores) {
    assert.deepEqual(item.periodoActual, esperados[item.frecuencia]);
    assert.equal(item.puedeCapturar, undefined);
    assert.equal(item.semaforo, undefined);
  }
});
