import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
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
import { createVariablesRepository } from '../src/modules/indicadores/repositories/variables.repository.ts';

config({ quiet: true });
test('PostgreSQL: carga repetible 130–133, asignación auditada, concurrencia, rollback y persistencia', {
  skip: !process.env.TEST_DATABASE_URL, timeout: 90000,
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
    for (const file of ['001_auth_propuesta.sql', '002_auditoria_configuracion.sql', '005_alta_indicadores.sql', '006_variables_dependencias.sql']) {
      await pool.query(await readFile(new URL('../sql/' + file, import.meta.url), 'utf8'));
    }
    const users = createUsersRepository(pool), service = createUsersService(users);
    const password = 'Synthetic-integration-password-2026!';
    const admin = await service.createInitialAdmin({ nombre: 'Admin sintético', correo: 'admin@example.test', password });
    function loadExamples(apply) {
      const child = spawnSync(process.execPath, ['--import', 'tsx', 'src/scripts/cargar-indicadores-prueba.ts', '--actor=' + admin.id,
        ...(apply ? ['--aplicar'] : [])], { encoding: 'utf8', timeout: 30000,
        env: { ...process.env, NODE_ENV: 'development', DATABASE_URL: connection.toString() } });
      assert.equal(child.status, 0, child.stderr);
      return JSON.parse(child.stdout);
    }
    assert.equal(loadExamples(false).aplicar, false);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM indicadores')).rows[0].n, 0);
    assert.equal(loadExamples(true).fichas.length, 4);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM indicadores WHERE NOT activo')).rows[0].n, 4);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM variables_indicador WHERE dependencia_id IS NULL')).rows[0].n, 8);
    const indicators = createIndicatorsRepository(pool), variables = createVariablesRepository(pool);
    const rows = await indicators.list(), id = rows.find(row => row.campos.clave === 'SIIP.05.F35.004').id;
    const dependency = await service.createDependency({ clave: 'QA', nombre: 'Dependencia de prueba aislada' }, admin.id);
    const origin = 'http://localhost:5173', env = envSchema.parse({ FRONTEND_ORIGIN: origin, SESSION_SECRET: randomUUID() });
    const dependencies = { repository: createAuthRepository(pool), sessionStore: new PostgresSessionStore(pool), users, indicators, variables };
    app = await buildApp(env, dependencies); app.log.level = 'silent';
    const cookie = response => { const value = response.headers['set-cookie']; return (Array.isArray(value) ? value[0] : value).split(';')[0]; };
    const initial = await app.inject('/api/v1/auth/sesion');
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/sesion', payload: { correo: admin.correo, password },
      headers: { origin, cookie: cookie(initial), 'x-csrf-token': initial.json().csrf_token } });
    assert.equal(login.statusCode, 200, login.body);
    const headers = { origin, cookie: cookie(login), 'x-csrf-token': login.json().csrf_token };
    const url = '/api/v1/administracion/indicadores/' + id + '/variables';
    const editable = data => data.variables.map(({ dependenciaNombre, dependenciaActiva, ...item }) => item);
    const initialConfig = (await app.inject({ url, headers })).json();
    assert.equal(initialConfig.variables.length, 2);
    const input = editable(initialConfig); input[0].dependenciaId = dependency.id;
    const saved = await app.inject({ method: 'PUT', url, headers, payload: { version: initialConfig.version, variables: input } });
    assert.equal(saved.statusCode, 200, saved.body);
    assert.equal(saved.json().variables[0].dependenciaNombre, dependency.nombre);
    assert.equal((await app.inject({ method: 'PUT', url, headers, payload: { version: initialConfig.version, variables: input } })).statusCode, 409);
    const foreign = (await variables.find(rows.find(row => row.id !== id).id)).variables[0];
    const current = saved.json();
    const extra = { ...foreign }; delete extra.dependenciaNombre; delete extra.dependenciaActiva;
    extra.codigo = 'X';
    assert.equal((await app.inject({ method: 'PUT', url, headers,
      payload: { version: current.version, variables: [...editable(current), extra] } })).statusCode, 422);
    const rollbackInput = editable(current); rollbackInput[0].dependenciaId = null;
    await assert.rejects(variables.save(id, { version: current.version, variables: rollbackInput }, '9223372036854775807'), { code: '23503' });
    assert.deepEqual(await variables.find(id), current);
    const concurrent = await Promise.all([
      app.inject({ method: 'PUT', url, headers, payload: { version: current.version, variables: rollbackInput } }),
      app.inject({ method: 'PUT', url, headers, payload: { version: current.version, variables: rollbackInput } }),
    ]);
    assert.deepEqual(concurrent.map(response => response.statusCode).sort(), [200, 409]);
    const after = await variables.find(id);
    assert.equal(loadExamples(true).fichas.length, 4);
    assert.deepEqual(await variables.find(id), after);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM indicadores')).rows[0].n, 4);
    await pool.query('UPDATE dependencias SET activo=false WHERE id=$1', [dependency.id]);
    assert.equal((await app.inject({ method: 'PUT', url, headers,
      payload: { version: after.version, variables: input } })).statusCode, 422);
    await pool.query('UPDATE indicadores SET activo=true WHERE id=$1', [id]);
    assert.equal((await app.inject({ method: 'PUT', url, headers,
      payload: { version: after.version, variables: editable(after) } })).statusCode, 409);
    await pool.query('UPDATE indicadores SET activo=false WHERE id=$1', [id]);
    const audit = (await pool.query("SELECT antes, despues FROM auditoria_configuracion WHERE entidad='variables_indicador' ORDER BY id")).rows;
    assert.equal(audit.length, 10);
    assert.ok(audit[8].antes && audit[8].despues);
    await app.close(); app = await buildApp(env, dependencies); app.log.level = 'silent';
    assert.deepEqual((await app.inject({ url, headers })).json(), after);
  } finally {
    await app?.close(); await pool?.end();
    if (created && /^siip_test_[a-f0-9]{32}$/.test(schema)) await database.query(`DROP SCHEMA "${schema}" CASCADE`);
    await database.end();
  }
});
