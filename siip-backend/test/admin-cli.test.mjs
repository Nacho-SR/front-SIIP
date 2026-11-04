import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

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
