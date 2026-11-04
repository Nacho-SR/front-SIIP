import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { databaseErrorMessage } from '../src/database/pool.ts';

test('el CLI falla sin conexión configurada sin imprimir la contraseña', () => {
  const password = 'synthetic-private-cli-password-marker';
  const child = spawnSync(process.execPath, ['--import', 'tsx', 'src/scripts/create-admin.ts'], {
    encoding: 'utf8', timeout: 30000,
    env: {
      ...process.env, NODE_ENV: 'development', FRONTEND_ORIGIN: 'http://localhost:5173',
      DATABASE_URL: '', SESSION_SECRET: 'synthetic-session-secret-for-tests-only',
      ADMIN_NOMBRE: 'Admin sintético', ADMIN_CORREO: 'admin@example.test', ADMIN_PASSWORD: password,
    },
  });
  assert.ifError(child.error);
  assert.equal(child.status, 1);
  assert.match(child.stderr, /DATABASE_URL/);
  assert.equal((child.stdout + child.stderr).includes(password), false);
  assert.equal(child.stdout.includes('Administrador inicial creado'), false);
});

test('el diagnóstico distingue fallos PostgreSQL sin imprimir mensajes o credenciales privadas', () => {
  for (const [code, pattern] of [
    ['28P01', /credenciales.*28P01/], ['3D000', /no existe.*3D000/],
    ['42P01', /tablas.*42P01/], ['42501', /permisos.*42501/],
    ['ECONNREFUSED', /conexión.*ECONNREFUSED/],
    ['ENOTFOUND', /contactar/], ['ETIMEDOUT', /contactar/], ['UNKNOWN', /No se pudo crear/],
  ]) {
    const error = Object.assign(new Error('postgres://private-user:private-password@private-host/db'), { code });
    const message = databaseErrorMessage(error);
    assert.match(message, pattern);
    assert.doesNotMatch(message, /private-user|private-password|private-host|postgres:\/\//);
  }
  assert.match(databaseErrorMessage(new AggregateError([
    Object.assign(new Error('private details'), { code: 'ECONNREFUSED' }),
  ])), /ECONNREFUSED/);
  assert.match(databaseErrorMessage(null), /No se pudo crear/);
});
