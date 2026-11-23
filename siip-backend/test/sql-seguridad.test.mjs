import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import session from '@fastify/session';
import { hash } from 'argon2';
import { buildApp } from '../src/app.ts';
import { envSchema } from '../src/env.ts';
import { createAuthRepository } from '../src/modules/auth/repositories/auth.repository.ts';
import { createRecoveryRepository } from '../src/modules/auth/repositories/recovery.repository.ts';
import { PostgresSessionStore } from '../src/modules/auth/repositories/session.repository.ts';
import { createUsersRepository } from '../src/modules/administracion/repositories/usuarios.repository.ts';
import { createIndicatorsRepository } from '../src/modules/indicadores/repositories/indicadores.repository.ts';
import { createIndicatorSchema, indicatorColumns } from '../src/modules/indicadores/schemas/indicadores.schema.ts';

const attack = "SQL_PROBE_'; DROP TABLE usuarios; --";
function database(answer = () => ({ rows: [], rowCount: 0 })) {
  const calls = [];
  const client = { async query(sql, params) { calls.push({ sql, params }); return answer(sql, params); }, release() {} };
  return { calls, pool: { query: client.query, async connect() { return client; } } };
}
function assertBound(calls, value = attack) {
  assert.ok(calls.length);
  for (const call of calls) assert.equal(call.sql.includes(value), false, 'El valor externo no debe formar parte del SQL.');
  assert.ok(calls.some(call => call.params?.some(param => typeof param === 'string' && param.includes(value))),
    'El valor debe viajar separado en los parámetros.');
}

test('auth y recuperación parametrizan correo, ID y token incluso si contienen sintaxis SQL', async () => {
  const f = database();
  const auth = createAuthRepository(f.pool);
  await auth.findByCorreo(attack); await auth.findById(attack);
  const recovery = createRecoveryRepository(f.pool);
  assert.equal(await recovery.issue(attack, 'hash-sintetico'), null);
  assert.equal(await recovery.validate(attack), false);
  await assert.rejects(recovery.consume(attack, 'Synthetic-password-2026!'), { codigo: 'ENLACE_INVALIDO' });
  assertBound(f.calls);
  for (const call of f.calls.filter(c => c.params)) {
    assert.match(call.sql, /\$1/);
    assert.deepEqual(call.params, [attack]);
  }
});

test('el almacén de sesiones mantiene ID, generación y JSON fuera del texto SQL', async () => {
  const f = database(() => ({ rows: [], rowCount: 1 }));
  const store = new PostgresSessionStore(f.pool);
  const stored = { sessionId: attack, userId: '1', absoluteExpiresAt: Date.now() + 60000, cookie: {} };
  const call = (method, ...args) => new Promise((resolve, reject) => store[method](...args,
    (error, data) => error ? reject(error) : resolve(data)));
  await call('get', attack); await call('set', attack, stored);
  await call('compareAndSet', attack, attack, stored); await call('destroy', attack);
  assertBound(f.calls);
  for (const query of f.calls) { assert.match(query.sql, /\$1/); assert.equal(query.params[0], attack); }
});

test('nombres con comillas y sentencias SQL se guardan como parámetros en cuentas, dependencias y auditoría', async () => {
  const user = { id: '1', nombre: attack, correo: "o'hara@example.test", rol: 'consulta', dependencia_id: null };
  const dependency = { id: '7', clave: 'DGSM', nombre: attack, activo: true };
  const f = database(sql => ({ rows: sql.includes('INSERT INTO usuarios') ? [user]
    : sql.includes('INSERT INTO dependencias') ? [dependency] : [], rowCount: 1 }));
  const repository = createUsersRepository(f.pool);
  await repository.createUser({ ...user, password_hash: 'hash-sintetico' }, '1');
  await repository.createDependency({ clave: 'DGSM', nombre: attack }, '1');
  assertBound(f.calls);
  const insert = f.calls.find(c => c.sql.includes('INSERT INTO usuarios'));
  assert.equal(insert.params[0], attack);
  assert.equal(insert.params[1], user.correo);
  assert.equal(insert.sql.includes(user.correo), false);
  assert.ok(f.calls.some(c => c.sql.includes('INSERT INTO auditoria_configuracion') && c.params.at(-1).includes(attack)));
});

test('alta/edición de indicadores usan columnas fijas y parámetros para textos, fórmulas y clasificación', async () => {
  const { fichas } = JSON.parse(await readFile(new URL('./fixtures/indicadores-prueba.json', import.meta.url), 'utf8'));
  const data = createIndicatorSchema.parse({ ...fichas[0].campos,
    nombre: attack, definicion: attack, algoritmo: attack, variables: attack, agrupacion: attack, familia: attack });
  const row = { ...Object.fromEntries(Object.entries(indicatorColumns).map(([key, column]) => [column, data[key]])),
    id: '1', consecutivo: '130', agrupacion: data.agrupacion, familia: data.familia, activo: false,
    creado_en: new Date('2026-11-23T12:00:00Z'), actualizado_en: new Date('2026-11-23T12:00:00Z') };
  const f = database(sql => ({ rows: sql.includes('FOR SHARE') ? [{ id: '35', codigo: 'F35', agrupacion_codigo: '05' }]
    : sql.includes('INSERT INTO indicadores') ? [{ id: '1' }] : /SELECT\s+i\.\*/.test(sql) ? [row] : [], rowCount: 1 }));
  const repository = createIndicatorsRepository(f.pool);
  await repository.create(data, '1'); await repository.update('1', data, '1');
  assertBound(f.calls);
  for (const query of f.calls.filter(c => c.sql.includes('INSERT INTO indicadores') || /UPDATE indicadores\s+SET/.test(c.sql))) {
    assert.ok(query.params.includes(attack));
    assert.match(query.sql, /\$1/);
  }
  assert.equal(createIndicatorSchema.safeParse({ ...data, [attack]: 'columna' }).success, false);
  for (const column of Object.values(indicatorColumns)) assert.match(column, /^[a-z][a-z_]*$/);
});

test('la API rechaza IDs con SQL antes de llamar a repositorios y conserva comillas en campos de texto', async t => {
  const origin = 'http://localhost:5173', password = 'Synthetic-sql-test-password-2026!';
  const account = { id: '1', nombre: 'Admin sintético', correo: 'admin@example.test', rol: 'administrador',
    dependencia_id: null, dependencia_activa: null, activo: true, password_hash: await hash(password) };
  const never = async () => assert.fail('Un ID inválido no debe alcanzar el repositorio.');
  let saved;
  const app = await buildApp(envSchema.parse({ FRONTEND_ORIGIN: origin, SESSION_SECRET: 'synthetic-sql-secret-with-more-than-32-characters' }), {
    repository: { async findByCorreo() { return account; }, async findById() { return account; } }, sessionStore: new session.MemoryStore(),
    indicators: { find: never }, variables: { find: never }, metodologias: { find: never }, activaciones: { find: never },
    users: { async createDependency(data) { saved = data; return { ...data, id: '7', activo: true }; } },
  });
  app.log.level = 'silent'; t.after(() => app.close());
  const cookieOf = response => { const h = response.headers['set-cookie']; return (Array.isArray(h) ? h[0] : h).split(';')[0]; };
  const anonymous = await app.inject('/api/v1/auth/sesion');
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/sesion', payload: { correo: account.correo, password },
    headers: { origin, cookie: cookieOf(anonymous), 'x-csrf-token': anonymous.json().csrf_token } });
  assert.equal(login.statusCode, 200);
  const headers = { origin, cookie: cookieOf(login), 'x-csrf-token': login.json().csrf_token };
  for (const id of [attack, '1 OR 1=1', '1::bigint', '1 UNION SELECT 1']) {
    for (const suffix of ['', '/variables', '/metodologia', '/activacion']) {
      const response = await app.inject({ url: `/api/v1/administracion/indicadores/${encodeURIComponent(id)}${suffix}`, headers });
      assert.equal(response.statusCode, 422, response.body);
      assert.equal(response.json().codigo, 'DATOS_INVALIDOS');
    }
  }
  const response = await app.inject({ method: 'POST', url: '/api/v1/administracion/dependencias', headers,
    payload: { clave: 'DGSM', nombre: attack } });
  assert.equal(response.statusCode, 201, response.body);
  assert.equal(saved.nombre, attack);
});
