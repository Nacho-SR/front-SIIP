import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { buildApp } from '../src/app.ts';
import { envSchema } from '../src/env.ts';

const frontendOrigin = 'http://localhost:5173';
const config = envSchema.parse({ FRONTEND_ORIGIN: frontendOrigin });

test('acepta la configuración local y rechaza puertos u orígenes inválidos', () => {
  const env = envSchema.parse({ FRONTEND_ORIGIN: frontendOrigin });
  assert.equal(env.HOST, '127.0.0.1');
  assert.equal(env.PORT, 3000);
  assert.equal(envSchema.parse({ ...env, PORT: '4000' }).PORT, 4000);

  for (const PORT of ['', 'abc', '0', '65536', '3000.5']) {
    assert.equal(envSchema.safeParse({ ...env, PORT }).success, false);
  }
  for (const FRONTEND_ORIGIN of [
    '*', 'ftp://localhost', 'https://example.test/app',
    'https://example.test/', 'https://example.test?query=1',
    'https://user:password@example.test',
  ]) {
    assert.equal(envSchema.safeParse({ ...env, FRONTEND_ORIGIN }).success, false);
  }
  assert.equal(envSchema.safeParse({ ...env, NODE_ENV: 'invalid' }).success, false);
});

test('salud responde sin acceder a una BD ni crear una sesión', async (t) => {
  const app = await buildApp(config);
  t.after(() => app.close());

  const response = await app.inject('/api/v1/salud');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { estado: 'ok' });
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['set-cookie'], undefined);
});

test('CORS permite el frontend configurado sin habilitar otros orígenes', async (t) => {
  const app = await buildApp(config);
  t.after(() => app.close());

  const response = await app.inject({
    method: 'OPTIONS', url: '/api/v1/salud',
    headers: {
      origin: frontendOrigin,
      'access-control-request-method': 'DELETE',
      'access-control-request-headers': 'X-CSRF-Token',
    },
  });
  assert.equal(response.statusCode, 204);
  assert.equal(response.headers['access-control-allow-origin'], frontendOrigin);
  assert.equal(response.headers['access-control-allow-credentials'], 'true');
  assert.match(response.headers['access-control-allow-methods'], /DELETE/);
  assert.match(response.headers['access-control-allow-headers'], /X-CSRF-Token/);

  const otherOrigin = await app.inject({
    url: '/api/v1/salud', headers: { origin: 'https://other.example.test' },
  });
  assert.equal(otherOrigin.headers['access-control-allow-origin'], undefined);
});

test('el límite por IP responde 429 al superar 100 peticiones por minuto', async (t) => {
  const app = await buildApp(config);
  t.after(() => app.close());

  for (let i = 0; i < 100; i++) {
    assert.equal((await app.inject('/api/v1/salud')).statusCode, 200);
  }
  const limited = await app.inject('/api/v1/salud');
  assert.equal(limited.statusCode, 429);
  assert.ok(limited.headers['retry-after']);
});

test('el arranque falla ante configuración inválida sin imprimir secretos', () => {
  const child = spawnSync(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
    encoding: 'utf8', timeout: 30000,
    env: {
      ...process.env, PORT: 'invalid', FRONTEND_ORIGIN: frontendOrigin,
      DATABASE_URL: 'private-database-marker', SESSION_SECRET: 'private-session-marker',
    },
  });
  assert.ifError(child.error);
  assert.equal(child.status, 1);
  assert.match(child.stderr, /PORT/);
  assert.doesNotMatch(child.stdout + child.stderr, /private-database-marker|private-session-marker/);
});
