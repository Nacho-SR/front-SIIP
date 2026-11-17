import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { config } from 'dotenv';
import { createPool } from '../src/database/pool.ts';
import { createUsersRepository } from '../src/modules/administracion/repositories/usuarios.repository.ts';
import { createUsersService } from '../src/modules/administracion/services/usuarios.service.ts';
import { createIndicatorsRepository } from '../src/modules/indicadores/repositories/indicadores.repository.ts';
import { createVariablesRepository } from '../src/modules/indicadores/repositories/variables.repository.ts';
import { createMetodologiaRepository } from '../src/modules/indicadores/repositories/metodologia.repository.ts';

config({ quiet: true });
test('PostgreSQL: metodología inmutable, concurrencia, responsables, auditoría y persistencia', {
  skip: !process.env.TEST_DATABASE_URL, timeout: 90000,
}, async () => {
  const schema = 'siip_test_' + randomUUID().replaceAll('-', '');
  const database = createPool(process.env.TEST_DATABASE_URL);
  let pool, created = false;
  try {
    await database.query(`CREATE SCHEMA "${schema}"`); created = true;
    const connection = new URL(process.env.TEST_DATABASE_URL);
    connection.searchParams.set('options', '-c search_path=' + schema);
    pool = createPool(connection.toString());
    assert.equal((await pool.query('SELECT current_schema() AS schema')).rows[0].schema, schema);
    for (const file of ['001_auth_propuesta.sql', '002_auditoria_configuracion.sql', '005_alta_indicadores.sql', '006_variables_dependencias.sql', '007_metodologias_indicador.sql'])
      await pool.query(await readFile(new URL('../sql/' + file, import.meta.url), 'utf8'));
    const users = createUsersService(createUsersRepository(pool));
    const admin = await users.createInitialAdmin({ nombre: 'Admin sintético', correo: 'admin@example.test', password: 'Synthetic-integration-password-2026!' });
    const dep = await users.createDependency({ clave: 'QA', nombre: 'Dirección General de Servicios Municipales' }, admin.id);
    const { fichas } = JSON.parse(await readFile(new URL('./fixtures/indicadores-prueba.json', import.meta.url), 'utf8'));
    const indicators = createIndicatorsRepository(pool);
    const ficha = await indicators.create(fichas[0].campos, admin.id);
    const variables = createVariablesRepository(pool);
    const savedVars = await variables.save(ficha.id, { version: 0, variables: ['N', 'D'].map(codigo => ({ codigo,
      descripcion: codigo === 'N' ? 'Reparados dentro del plazo' : 'Reportes con plazo vencido', unidadMedida: 'reportes', tipoDato: 'entero', dependenciaId: dep.id })) }, admin.id);
    const repo = createMetodologiaRepository(pool);
    const regla = { tipo: 'porcentaje_parte_total', numeradorId: savedVars.variables[0].id, denominadorId: savedVars.variables[1].id, amarilloDesde: 75, verdeDesde: 90 };
    const initial = { version: 0, versionVariables: savedVars.version, regla };
    assert.equal((await repo.find(ficha.id)).version, 0);
    const saved = await repo.save(ficha.id, initial, admin.id);
    assert.equal(saved.version, 1); assert.equal(saved.metodologias[0].contexto.variables[0].dependenciaId, dep.id);
    const same = await repo.save(ficha.id, { ...initial, version: 1 }, admin.id);
    assert.deepEqual(same, saved);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM auditoria_configuracion WHERE entidad='metodologias_indicador'")).rows[0].n, 1);
    const concurrent = await Promise.allSettled([
      repo.save(ficha.id, { ...initial, version: 1, regla: { ...regla, verdeDesde: 95 } }, admin.id),
      repo.save(ficha.id, { ...initial, version: 1, regla: { ...regla, verdeDesde: 96 } }, admin.id),
    ]);
    assert.equal(concurrent.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(concurrent.find(r => r.status === 'rejected').reason.codigo, 'METODOLOGIA_DESACTUALIZADA');
    const after = await repo.find(ficha.id);
    assert.deepEqual(after.metodologias[1], saved.metodologias[0]);
    await assert.rejects(repo.save(ficha.id, { ...initial, version: 2 }, '9223372036854775807'), { code: '23503' });
    assert.deepEqual(await repo.find(ficha.id), after);
    await pool.query("ALTER TABLE auditoria_configuracion ADD CONSTRAINT qa_auditoria CHECK (entidad <> 'metodologias_indicador') NOT VALID");
    await assert.rejects(repo.save(ficha.id, { ...initial, version: 2 }, admin.id), { code: '23514' });
    assert.deepEqual(await repo.find(ficha.id), after);
    await pool.query('ALTER TABLE auditoria_configuracion DROP CONSTRAINT qa_auditoria');
    const renamed = await variables.save(ficha.id, { version: savedVars.version,
      variables: savedVars.variables.map(({ dependenciaNombre, dependenciaActiva, ...v }) => ({ ...v, dependenciaId: null })) }, admin.id);
    await assert.rejects(repo.save(ficha.id, { ...initial, version: 2 }, admin.id), { codigo: 'VARIABLES_DESACTUALIZADAS' });
    const third = await repo.save(ficha.id, { ...initial, version: 2, versionVariables: renamed.version }, admin.id);
    assert.equal(third.version, 3); assert.equal(third.metodologias[0].contexto.variables[0].dependenciaId, null);
    assert.equal(third.metodologias[2].contexto.variables[0].dependenciaId, dep.id);
    assert.equal((await repo.simulate(ficha.id, { versionVariables: renamed.version, regla, numerador: 90, denominador: 100 })).semaforo, 'verde');
    assert.equal((await repo.find(ficha.id)).version, 3);
    assert.equal((await indicators.find(ficha.id)).activo, false);
    await pool.end(); pool = createPool(connection.toString());
    assert.deepEqual(await createMetodologiaRepository(pool).find(ficha.id), third);
  } finally {
    await pool?.end();
    if (created && /^siip_test_[a-f0-9]{32}$/.test(schema)) await database.query(`DROP SCHEMA "${schema}" CASCADE`);
    await database.end();
  }
});
