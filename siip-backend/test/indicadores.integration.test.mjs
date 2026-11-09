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
import { createIndicatorsRepository } from '../src/modules/indicadores/repositories/indicadores.repository.ts';

config({ quiet: true });
test('PostgreSQL: alta de seis fichas, duplicados, auditoría y lectura tras reiniciar la API', {
  skip: !process.env.TEST_DATABASE_URL, timeout: 60000,
}, async () => {
  const schema = 'siip_test_' + randomUUID().replaceAll('-', '');
  const database = createPool(process.env.TEST_DATABASE_URL);
  let pool, app, created = false;
  try {
    await database.query(`CREATE SCHEMA "${schema}"`); created = true;
    const connection = new URL(process.env.TEST_DATABASE_URL);
    connection.searchParams.set('options', '-c search_path=' + schema);
    pool = createPool(connection.toString());
    assert.equal((await pool.query('SELECT current_schema() AS schema')).rows[0].schema, schema);
    for (const file of ['001_auth_propuesta.sql', '002_auditoria_configuracion.sql', '005_alta_indicadores.sql']) {
      await pool.query(await readFile(new URL('../sql/' + file, import.meta.url), 'utf8'));
    }
    const users = createUsersRepository(pool);
    const password = 'Synthetic-integration-password-2026!';
    const admin = await createUsersService(users).createInitialAdmin({ nombre: 'Admin sintético', correo: 'admin@example.test', password });
    const origin = 'http://localhost:5173';
    const env = envSchema.parse({ FRONTEND_ORIGIN: origin, SESSION_SECRET: randomUUID() });
    const dependencies = { repository: createAuthRepository(pool), sessionStore: new PostgresSessionStore(pool), users,
      indicators: createIndicatorsRepository(pool) };
    app = await buildApp(env, dependencies); app.log.level = 'silent';
    const bootstrap = await app.inject('/api/v1/auth/sesion');
    const cookieOf = response => { const v = response.headers['set-cookie']; return (Array.isArray(v) ? v[0] : v).split(';')[0]; };
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/sesion',
      headers: { origin, cookie: cookieOf(bootstrap), 'x-csrf-token': bootstrap.json().csrf_token },
      payload: { correo: admin.correo, password } });
    assert.equal(login.statusCode, 200, login.body);
    const headers = { origin, cookie: cookieOf(login), 'x-csrf-token': login.json().csrf_token };
    const url = '/api/v1/administracion/indicadores';
    const { fichas } = JSON.parse(await readFile(new URL('./fixtures/indicadores-prueba.json', import.meta.url), 'utf8'));
    for (const ficha of fichas) {
      const response = await app.inject({ method: 'POST', url, headers, payload: ficha.campos });
      assert.equal(response.statusCode, 201, response.body);
      assert.equal(response.json().activo, false);
      assert.deepEqual(response.json().campos, { ...ficha.campos, consecutivo: ficha.consecutivoOrigen });
    }
    assert.equal((await app.inject({ method: 'POST', url, headers, payload: fichas[0].campos })).statusCode, 409);
    const previous = (await app.inject({ url, headers })).json();
    assert.equal(previous.length, 6);
    await app.close(); app = await buildApp(env, dependencies); app.log.level = 'silent';
    const persisted = await app.inject({ url, headers: { cookie: headers.cookie } });
    assert.equal(persisted.statusCode, 200, persisted.body);
    assert.deepEqual(persisted.json(), previous);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM agrupaciones_tematicas')).rows[0].n, 8);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM familias')).rows[0].n, 54);
    const audit = (await pool.query("SELECT actor_id::text, despues FROM auditoria_configuracion WHERE entidad='indicadores'")).rows;
    assert.equal(audit.length, 6);
    assert.ok(audit.every(row => row.actor_id === admin.id && row.despues.activo === false));
  } finally {
    await app?.close(); await pool?.end();
    if (created && /^siip_test_[a-f0-9]{32}$/.test(schema)) await database.query(`DROP SCHEMA "${schema}" CASCADE`);
    await database.end();
  }
});
