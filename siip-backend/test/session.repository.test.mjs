import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PostgresSessionStore } from '../src/modules/auth/repositories/session.repository.ts';
import { createPool } from '../src/database/pool.ts';
import { envSchema } from '../src/env.ts';

const stored = {
  sessionId: 'new-generation',
  cookie: { originalMaxAge: 1800000, expires: new Date(Date.now() + 1800000) },
  absoluteExpiresAt: Date.now() + 1800000,
  userId: '7',
};

function callStore(store, method, ...args) {
  return new Promise((resolve, reject) => store[method](...args, (error, result) => error ? reject(error) : resolve(result)));
}

test('el almacén rechaza actualizar una sesión revocada o con generación obsoleta', async () => {
  const calls = [];
  const store = new PostgresSessionStore({
    async query(sql, params) { calls.push({ sql, params }); return { rows: [], rowCount: 0 }; },
  });
  await assert.rejects(callStore(store, 'compareAndSet', 'id', 'old-generation', stored), { code: 'ENOENT' });
  await assert.rejects(callStore(store, 'set', 'id', stored), { code: 'ENOENT' });
  assert.equal(calls[0].params[4], 'old-generation');
  assert.equal(calls[0].params[1], 'new-generation');
  assert.equal(calls[0].params[3].getTime(), stored.absoluteExpiresAt);
  await callStore(store, 'destroy', 'id');
  assert.equal(await callStore(store, 'get', 'id'), null);
});

test('el almacén propaga errores de persistencia sin fingir éxito', async () => {
  const failure = new Error('database unavailable');
  const store = new PostgresSessionStore({ async query() { throw failure; } });
  for (const [method, args] of [
    ['set', ['id', stored]], ['get', ['id']],
    ['compareAndSet', ['id', 'old-generation', stored]], ['destroy', ['id']],
  ]) {
    await assert.rejects(callStore(store, method, ...args), failure);
  }
});

test('TLS remoto valida certificados y no puede debilitarse mediante sslmode', async () => {
  const remote = createPool('postgres://synthetic:synthetic@db.example.test/siip?sslmode=disable');
  const local = createPool('postgres://synthetic:synthetic@localhost/siip');
  try {
    assert.equal(remote.options.ssl.rejectUnauthorized, true);
    assert.equal(new URL(remote.options.connectionString).searchParams.has('sslmode'), false);
    assert.equal(local.options.ssl, false);
  } finally {
    await remote.end();
    await local.end();
  }
});

test('producción exige BD, secreto suficiente y origen HTTPS', () => {
  const production = {
    NODE_ENV: 'production', FRONTEND_ORIGIN: 'https://siip.example.test',
    DATABASE_URL: 'postgres://synthetic:synthetic@db.example.test/siip',
    SESSION_SECRET: 'synthetic-long-secret-for-tests-only',
  };
  assert.equal(envSchema.safeParse(production).success, true);
  assert.equal(envSchema.safeParse({ ...production, DATABASE_URL: '' }).success, false);
  assert.equal(envSchema.safeParse({ ...production, SESSION_SECRET: 'short' }).success, false);
  assert.equal(envSchema.safeParse({ ...production, FRONTEND_ORIGIN: 'http://siip.example.test' }).success, false);
  assert.equal(envSchema.safeParse({ ...production, DATABASE_URL: production.DATABASE_URL + '?ssl=no-verify' }).success, false);
});
