import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { config } from 'dotenv';
import { createPool } from '../src/database/pool.ts';
import { buildApp } from '../src/app.ts';
import { envSchema } from '../src/env.ts';
import { createAuthRepository } from '../src/modules/auth/repositories/auth.repository.ts';
import { PostgresSessionStore } from '../src/modules/auth/repositories/session.repository.ts';
import { createUsersRepository } from '../src/modules/administracion/repositories/usuarios.repository.ts';
import { createUsersService } from '../src/modules/administracion/services/usuarios.service.ts';

config({ quiet: true });

test('PostgreSQL real: bootstrap, altas auditadas y auth de los tres roles', {
  skip: !process.env.TEST_DATABASE_URL, timeout: 60000,
}, async () => {
  const schema = `siip_test_${randomUUID().replaceAll('-', '')}`;
  const database = createPool(process.env.TEST_DATABASE_URL);
  let pool;
  let app;
  let created = false;
  try {
    await database.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    const connection = new URL(process.env.TEST_DATABASE_URL);
    connection.searchParams.set('options', `-c search_path=${schema}`);
    pool = createPool(connection.toString());
    assert.equal((await pool.query('SELECT current_schema() AS schema')).rows[0].schema, schema);
    for (const file of ['001_auth_propuesta.sql', '002_auditoria_configuracion.sql']) {
      await pool.query(await readFile(new URL(`../sql/${file}`, import.meta.url), 'utf8'));
    }
    const users = createUsersRepository(pool);
    const password = 'Synthetic-integration-password-2026!';
    const initial = { nombre: 'Admin sintético', correo: 'admin@example.test', password };
    const service = createUsersService(users);
    const admin = await service.createInitialAdmin(initial);
    await assert.rejects(service.createInitialAdmin(initial), { codigo: 'ADMIN_YA_EXISTE' });
    const origin = 'http://localhost:5173';
    app = await buildApp(envSchema.parse({ FRONTEND_ORIGIN: origin, SESSION_SECRET: randomUUID() }), {
      repository: createAuthRepository(pool), sessionStore: new PostgresSessionStore(pool), users,
    });
    app.log.level = 'silent';
    const sessionUrl = '/api/v1/auth/sesion';
    const userUrl = '/api/v1/administracion/usuarios';
    const cookieOf = (response) => {
      const value = response.headers['set-cookie'];
      return (Array.isArray(value) ? value[0] : value).split(';')[0];
    };
    async function login(correo) {
      const bootstrap = await app.inject(sessionUrl);
      assert.equal(bootstrap.statusCode, 200, bootstrap.body);
      const response = await app.inject({ method: 'POST', url: sessionUrl, payload: { correo, password }, headers: {
        origin, cookie: cookieOf(bootstrap), 'x-csrf-token': bootstrap.json().csrf_token,
      } });
      assert.equal(response.statusCode, 200, response.body);
      return { origin, cookie: cookieOf(response), 'x-csrf-token': response.json().csrf_token };
    }
    const headers = await login(admin.correo);
    const dependency = await app.inject({ method: 'POST', url: '/api/v1/administracion/dependencias', headers,
      payload: { clave: 'DEMO', nombre: 'Dependencia de prueba aislada' } });
    assert.equal(dependency.statusCode, 201, dependency.body);
    for (const rol of ['captura', 'revision']) {
      const payload = { nombre: `Cuenta ${rol}`, correo: `${rol}@example.test`, password, rol,
        ...(rol === 'captura' ? { dependencia_id: dependency.json().id } : {}) };
      const response = await app.inject({ method: 'POST', url: userUrl, headers, payload });
      assert.equal(response.statusCode, 201, response.body);
      assert.equal((await app.inject({ method: 'POST', url: userUrl, headers, payload })).statusCode, 409);
    }
    assert.equal((await app.inject({ method: 'DELETE', url: sessionUrl, headers })).statusCode, 204);
    for (const rol of ['captura', 'revision']) {
      const userHeaders = await login(`${rol}@example.test`);
      const current = await app.inject({ url: sessionUrl, headers: { cookie: userHeaders.cookie } });
      assert.equal(current.json().usuario.rol, rol);
      assert.equal((await app.inject({ method: 'POST', url: userUrl, headers: userHeaders,
        payload: { nombre: 'No autorizado', correo: 'forbidden@example.test', password, rol: 'revision' } })).statusCode, 403);
      assert.equal((await app.inject({ method: 'DELETE', url: sessionUrl, headers: userHeaders })).statusCode, 204);
    }
    assert.equal((await pool.query('SELECT count(*)::int AS total FROM usuarios')).rows[0].total, 3);
    const audit = (await pool.query('SELECT despues FROM auditoria_configuracion')).rows;
    assert.equal(audit.length, 4);
    assert.doesNotMatch(JSON.stringify(audit), /password|\$argon2/);
  } finally {
    await app?.close();
    await pool?.end();
    if (created && /^siip_test_[a-f0-9]{32}$/.test(schema)) {
      await database.query(`DROP SCHEMA "${schema}" CASCADE`);
    }
    await database.end();
  }
});
