import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMetodologiaRepository } from '../src/modules/indicadores/repositories/metodologia.repository.ts';
const regla = { tipo: 'porcentaje_parte_total', numeradorId: '1', denominadorId: '2', amarilloDesde: 75, verdeDesde: 90 };
const entries = ['1', '2'].map((id, i) => ({ id, codigo: i ? 'D' : 'N', descripcion: 'Reportes', unidadMedida: 'reportes', tipoDato: 'entero', dependenciaId: '7', dependenciaNombre: 'Servicios Municipales', dependenciaActiva: true }));
const contexto = { versionVariables: 1, frecuencia: 'Mensual', unidadResultado: '%', sentido: 'Ascendente', acumulacion: 'No acumulable', variables: entries };
const input = { version: 0, versionVariables: 1, regla };
function fixture({ activo = false, variables = entries, previous = [], versionVariables = 1, auditFailure = false, dependencyActive = true } = {}) {
  const calls = []; let released = false;
  const versions = structuredClone(previous);
  const client = { async query(sql, params) {
    calls.push({ sql, params });
    if (sql.includes('FROM indicadores WHERE')) return { rows: [{ activo, version_variables: versionVariables, periodicidad: 'Mensual', unidad_medida: '%', sentido: 'Ascendente', acumulacion_texto: 'No acumulable' }] };
    if (sql.includes('FROM metodologias_indicador')) return { rows: versions.map(v => ({ ...v, creadoEn: new Date(v.creadoEn) })) };
    if (sql.includes('FROM variables_indicador')) return { rows: variables };
    if (sql.includes('FROM dependencias')) return { rows: dependencyActive ? [{ id: '7' }] : [] };
    if (sql.includes('INSERT INTO metodologias_indicador')) versions.unshift({ id: '9007199254740993', version: params[1], regla: { tipo: params[2], numeradorId: params[3], denominadorId: params[4], amarilloDesde: params[5], verdeDesde: params[6] }, contexto: JSON.parse(params[7]), creadoPor: params[8], creadoEn: new Date().toISOString() });
    if (sql.includes('INSERT INTO auditoria') && auditFailure) throw new Error('Auditoría fallida');
    return { rows: [] };
  }, release() { released = true; } };
  return { calls, released: () => released, repo: createMetodologiaRepository({ connect: async () => client, query: client.query }) };
}
test('una nueva versión conserva contexto y audita atómicamente, sin vigencia ni activación', async () => {
  const f = fixture();
  const saved = await f.repo.save('1', input, '5');
  assert.equal(saved.version, 1); assert.deepEqual(saved.metodologias[0].contexto, contexto);
  assert.equal(saved.metodologias[0].id, '9007199254740993');
  assert.ok(f.calls.some(c => c.sql.includes('FOR UPDATE'))); assert.ok(f.calls.some(c => c.sql.includes('FOR SHARE')));
  assert.equal(f.calls.find(c => c.sql.includes('INSERT INTO auditoria')).params[0], '5');
  assert.equal(f.calls.some(c => /UPDATE|DELETE FROM/.test(c.sql.replace('FOR UPDATE', ''))), false);
  assert.equal(f.calls.at(-1).sql, 'COMMIT'); assert.equal(f.released(), true);
});
test('sin cambios no genera versión ni evento; un cambio conserva la versión anterior', async () => {
  const previous = [{ id: '10', version: 1, regla, contexto, creadoPor: '5', creadoEn: new Date().toISOString() }];
  const f = fixture({ previous });
  assert.equal((await f.repo.save('1', { ...input, version: 1 }, '5')).version, 1);
  assert.equal(f.calls.some(c => c.sql.includes('INSERT INTO')), false);
  const g = fixture({ previous });
  const result = await g.repo.save('1', { ...input, version: 1, regla: { ...regla, verdeDesde: 95 } }, '5');
  assert.equal(result.version, 2); assert.equal(result.metodologias[0].regla.verdeDesde, 95); assert.deepEqual(result.metodologias[1].regla, regla);
});
test('rechaza activo, conflictos, operandos ajenos, decimal, unidad distinta y dependencia inactiva; revierte fallos', async () => {
  for (const [options, data, codigo] of [
    [{ activo: true }, input, 'INDICADOR_ACTIVO'],
    [{}, { ...input, version: 2 }, 'METODOLOGIA_DESACTUALIZADA'],
    [{ versionVariables: 2 }, input, 'VARIABLES_DESACTUALIZADAS'],
    [{}, { ...input, regla: { ...regla, numeradorId: '99' } }, 'METODOLOGIA_NO_COMPATIBLE'],
    [{ variables: [entries[0]] }, input, 'METODOLOGIA_NO_COMPATIBLE'],
    [{ variables: [entries[0], { ...entries[1], tipoDato: 'decimal' }] }, input, 'METODOLOGIA_NO_COMPATIBLE'],
    [{ variables: [entries[0], { ...entries[1], unidadMedida: 'personas' }] }, input, 'METODOLOGIA_NO_COMPATIBLE'],
    [{ variables: [entries[0], { ...entries[1], dependenciaActiva: false }] }, input, 'DEPENDENCIA_NO_DISPONIBLE'],
    [{ dependencyActive: false }, input, 'DEPENDENCIA_NO_DISPONIBLE'],
  ]) {
    const f = fixture(options);
    await assert.rejects(f.repo.save('1', data, '5'), { codigo });
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK'); assert.equal(f.released(), true);
  }
  const f = fixture({ auditFailure: true });
  await assert.rejects(f.repo.save('1', input, '5'), /Auditoría fallida/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
});
test('la simulación valida pertenencia y versión de variables y no escribe', async () => {
  const f = fixture();
  assert.equal((await f.repo.simulate('1', { versionVariables: 1, regla, numerador: 90, denominador: 100 })).semaforo, 'verde');
  assert.equal(f.calls.some(c => /INSERT|UPDATE|BEGIN/.test(c.sql)), false);
  await assert.rejects(f.repo.simulate('1', { versionVariables: 0, regla, numerador: 90, denominador: 100 }), { codigo: 'VARIABLES_DESACTUALIZADAS' });
});
