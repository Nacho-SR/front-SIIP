import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createIndicatorsRepository } from '../src/modules/indicadores/repositories/indicadores.repository.ts';
import { createIndicatorSchema, indicatorColumns } from '../src/modules/indicadores/schemas/indicadores.schema.ts';
import { clavesBase, opcionesFicha } from '../src/modules/indicadores/data/catalogo-base.ts';

const { fichas } = JSON.parse(await readFile(new URL('./fixtures/indicadores-prueba.json', import.meta.url), 'utf8'));
const fields = createIndicatorSchema.parse(fichas[0].campos);
const row = { ...Object.fromEntries(Object.entries(indicatorColumns).map(([key, column]) => [column, fields[key]])),
  id: '9007199254740993', consecutivo: '130', agrupacion: fields.agrupacion, familia: fields.familia,
  activo: false, creado_en: new Date('2026-11-09T12:00:00Z'), actualizado_en: new Date('2026-11-09T12:00:00Z') };
function fixture(override) {
  const calls = []; let released = false;
  const client = { async query(sql, params) {
    calls.push({ sql, params });
    const result = override?.(sql, params);
    if (result) return result;
    if (sql.includes('FOR SHARE')) return { rows: [{ id: '35', codigo: 'F35', agrupacion_codigo: '05' }] };
    if (sql.includes('INSERT INTO indicadores')) return { rows: [{ id: row.id }] };
    if (sql.includes('SELECT i.*')) return { rows: [row] };
    return { rows: [] };
  }, release() { released = true; } };
  const pool = { connect: async () => client, query: client.query };
  return { repository: createIndicatorsRepository(pool), calls, released: () => released };
}

test('la ficha y su auditoría se confirman juntas; la inserción usa parámetros y no permite activo', async () => {
  const f = fixture();
  const saved = await f.repository.create(fields, '1');
  assert.equal(saved.id, row.id);
  assert.deepEqual(saved.campos, { ...fields, consecutivo: '130' });
  const insert = f.calls.find(c => c.sql.includes('INSERT INTO indicadores'));
  assert.equal(insert.params[0], '35');
  assert.doesNotMatch(insert.sql, /activo|consecutivo|creado_en/);
  assert.ok(insert.params.includes(fields.nombre));
  assert.equal(insert.sql.includes(fields.nombre), false);
  const audit = f.calls.find(c => c.sql.includes('INSERT INTO auditoria_configuracion'));
  assert.deepEqual(audit.params, ['1', row.id, JSON.stringify(saved)]);
  assert.equal(f.calls.at(-1).sql, 'COMMIT');
  assert.equal(f.released(), true);
});

test('familias inválidas o claves de otra familia no insertan y liberan la conexión', async () => {
  for (const [override, data, codigo] of [
    [sql => sql.includes('FOR SHARE') ? { rows: [] } : undefined, fields, 'FAMILIA_NO_DISPONIBLE'],
    [undefined, { ...fields, clave: 'SIIP.05.F36.004' }, 'CLAVE_NO_COINCIDE'],
  ]) {
    const f = fixture(override);
    await assert.rejects(f.repository.create(data, '1'), { codigo });
    assert.equal(f.calls.some(c => c.sql.includes('INSERT INTO indicadores')), false);
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
    assert.equal(f.released(), true);
  }
});

test('auditoría fallida revierte la ficha y los duplicados se traducen a 409', async () => {
  const auditFailure = fixture(sql => { if (sql.includes('INSERT INTO auditoria')) throw new Error('Sin auditoría'); });
  await assert.rejects(auditFailure.repository.create(fields, '1'), /Sin auditoría/);
  assert.equal(auditFailure.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(auditFailure.calls.some(c => c.sql === 'COMMIT'), false);
  const duplicate = fixture(sql => { if (sql.includes('INSERT INTO indicadores')) throw { code: '23505', constraint: 'indicadores_codigo_unico' }; });
  await assert.rejects(duplicate.repository.create(fields, '1'), { statusCode: 409, codigo: 'INDICADOR_YA_REGISTRADO' });
});

test('lecturas recuperan IDs como texto y el SQL faltante da 503', async () => {
  const f = fixture();
  assert.equal((await f.repository.list())[0].id, row.id);
  assert.equal((await f.repository.find(row.id)).campos.clave, fields.clave);
  assert.deepEqual(f.calls.at(-1).params, [row.id]);
  const missing = fixture(() => { throw { code: '42P01' }; });
  await assert.rejects(missing.repository.list(), { statusCode: 503, codigo: 'INDICADORES_NO_CONFIGURADOS' });
});

test('la referencia de claves y opciones coincide con las 63 fichas del frontend', async () => {
  const base = JSON.parse(await readFile(new URL('../../siip-frontend/src/modules/consulta/data/indicadores-siip.json', import.meta.url), 'utf8'));
  assert.deepEqual([...clavesBase].sort(), base.map(i => i.clave).sort());
  for (const [property, values] of Object.entries(opcionesFicha)) assert.deepEqual([...values].sort(), [...new Set(base.map(i => i[property]))].sort());
});
