import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClassificationsRepository } from '../src/modules/indicadores/repositories/clasificaciones.repository.ts';

const group = { id: '90', codigo: '09', nombre: 'Agrupación sintética', activo: true };
const family = { id: '9007199254740993', codigo: 'F55', nombre: 'Familia sintética', agrupacion_id: '90', agrupacion_nombre: '09. Agrupación sintética', activo: true };
function fixture({ activeParent = true, failAudit = false, duplicate = false } = {}) {
  const calls = []; let released = false;
  const client = { release() { released = true; }, async query(sql, params) {
    const q = sql.replace(/\s+/g, ' ').trim(); calls.push({ sql: q, params });
    if (q.startsWith('SELECT id FROM agrupaciones_tematicas')) return { rows: activeParent ? [{ id: '90' }] : [], rowCount: activeParent ? 1 : 0 };
    if (q.startsWith('INSERT INTO auditoria_configuracion')) {
      if (failAudit) throw new Error('audit failure');
      return { rows: [], rowCount: 1 };
    }
    if (q.startsWith('INSERT INTO')) {
      if (duplicate) throw Object.assign(new Error('duplicate'), { code: '23505' });
      return { rows: [q.includes('INSERT INTO familias') ? { id: family.id } : group], rowCount: 1 };
    }
    if (q.includes('FROM familias f')) return { rows: [family], rowCount: 1 };
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(q)) return { rows: [], rowCount: 0 };
    throw new Error('Consulta no contemplada: ' + q);
  } };
  return { calls, released: () => released, repository: createClassificationsRepository({ connect: async () => client }) };
}

for (const [method, data, expected] of [
  ['createAgrupacion', { codigo: '09', nombre: group.nombre }, group],
  ['createFamilia', { codigo: 'F55', nombre: family.nombre, agrupacion_id: '90' }, family],
]) {
  test(`${method}: alta y auditoría se confirman juntas conservando ID y actor`, async () => {
    const f = fixture(); assert.deepEqual(await f.repository[method](data, '1'), expected);
    const audit = f.calls.find(c => c.sql.startsWith('INSERT INTO auditoria_configuracion'));
    assert.deepEqual(audit.params, ['1', expected.id, JSON.stringify(expected)]);
    assert.equal(f.calls.at(-1).sql, 'COMMIT'); assert.equal(f.released(), true);
  });
  test(`${method}: error de auditoría o clave duplicada revierte y libera la conexión`, async () => {
    for (const [options, error] of [[{ failAudit: true }, /audit failure/], [{ duplicate: true }, { codigo: 'CLAVE_DUPLICADA' }]]) {
      const f = fixture(options); await assert.rejects(f.repository[method](data, '1'), error);
      assert.equal(f.calls.at(-1).sql, 'ROLLBACK'); assert.equal(f.calls.some(c => c.sql === 'COMMIT'), false);
      assert.equal(f.released(), true);
    }
  });
}

test('una familia no se crea en una agrupación inexistente o inactiva', async () => {
  const f = fixture({ activeParent: false });
  await assert.rejects(f.repository.createFamilia({ codigo: 'F55', nombre: family.nombre, agrupacion_id: '90' }, '1'), { codigo: 'AGRUPACION_NO_DISPONIBLE' });
  assert.match(f.calls[1].sql, /AND activo = true FOR SHARE$/);
  assert.equal(f.calls.some(c => c.sql.startsWith('INSERT INTO')), false);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
});
