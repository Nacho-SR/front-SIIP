import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createVariablesRepository } from '../src/modules/indicadores/repositories/variables.repository.ts';
const variable = { id: '1', codigo: 'N', descripcion: 'Reportes reparados', unidadMedida: 'reportes', tipoDato: 'entero',
  dependenciaId: null, dependenciaNombre: null, dependenciaActiva: null };
function fixture({ version = 0, activo = false, previous = [variable], active = [{ id: '7' }], auditFailure = false } = {}) {
  const calls = []; let released = false;
  const client = { async query(sql, params) {
    calls.push({ sql, params });
    if (sql.includes('FROM indicadores WHERE')) return { rows: [{ id: '1', activo, version_variables: version }] };
    if (sql.includes('FROM variables_indicador')) return { rows: previous };
    if (sql.includes('FROM dependencias')) return { rows: active };
    if (sql.includes('INSERT INTO variables_indicador')) return { rows: [{ id: '2' }] };
    if (sql.includes('INSERT INTO auditoria') && auditFailure) throw new Error('Sin auditoría');
    return { rows: [] };
  }, release() { released = true; } };
  return { calls, released: () => released, repository: createVariablesRepository({ connect: async () => client, query: client.query }) };
}
test('asignación y auditoría se confirman juntas, sin activar ni ejecutar fórmula', async () => {
  const f = fixture();
  const result = await f.repository.save('1', { version: 0, variables: [{ ...variable, dependenciaId: '7' }] }, '5');
  assert.equal(result.version, 1);
  const update = f.calls.find(c => c.sql.startsWith('UPDATE variables_indicador'));
  assert.deepEqual(update.params, ['7', '1', '1']);
  assert.ok(f.calls.some(c => c.sql.includes('FOR UPDATE')));
  assert.ok(f.calls.some(c => c.sql.includes('FOR SHARE')));
  assert.equal(f.calls.find(c => c.sql.includes('INSERT INTO auditoria')).params[0], '5');
  assert.equal(f.calls.some(c => /SET activo/.test(c.sql)), false);
  assert.equal(f.calls.at(-1).sql, 'COMMIT');
  assert.equal(f.released(), true);
});
test('una operación sin cambios conserva versión y no crea auditoría', async () => {
  const f = fixture();
  assert.equal((await f.repository.save('1', { version: 0, variables: [variable] }, '5')).version, 0);
  assert.equal(f.calls.some(c => /INSERT INTO auditoria|UPDATE indicadores/.test(c.sql)), false);
});
test('rechaza activo, versiones obsoletas, dependencias inactivas, variables ajenas u omitidas y cambios de definición', async () => {
  for (const [options, data, codigo] of [
    [{ activo: true }, { version: 0, variables: [variable] }, 'INDICADOR_ACTIVO'],
    [{ version: 1 }, { version: 0, variables: [variable] }, 'CONFIGURACION_DESACTUALIZADA'],
    [{ active: [] }, { version: 0, variables: [{ ...variable, dependenciaId: '7' }] }, 'DEPENDENCIA_NO_DISPONIBLE'],
    [{}, { version: 0, variables: [variable, { ...variable, id: '99', codigo: 'D' }] }, 'VARIABLE_AJENA'],
    [{}, { version: 0, variables: [{ ...variable, id: undefined }] }, 'VARIABLE_OMITIDA'],
    [{}, { version: 0, variables: [{ ...variable, descripcion: 'Otra definición' }] }, 'DEFINICION_NO_EDITABLE'],
  ]) {
    const f = fixture(options);
    await assert.rejects(f.repository.save('1', data, '5'), { codigo });
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
    assert.equal(f.released(), true);
  }
});
test('un fallo de auditoría revierte la asignación y la versión', async () => {
  const f = fixture({ auditFailure: true });
  await assert.rejects(f.repository.save('1', { version: 0, variables: [{ ...variable, dependenciaId: '7' }] }, '5'), /Sin auditoría/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(f.calls.some(c => c.sql === 'COMMIT'), false);
});
