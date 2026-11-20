import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createIndicatorsService } from '../src/modules/indicadores/services/indicadores.service.ts';
import { clavesBase } from '../src/modules/indicadores/data/catalogo-base.ts';
const { fichas } = JSON.parse(await readFile(new URL('./fixtures/indicadores-prueba.json', import.meta.url), 'utf8'));
const fields = { ...fichas[0].campos, clave: clavesBase[0] };

test('una ficha base ya cargada se puede editar conservando su clave; la reserva continúa en el alta', async () => {
  const calls = [];
  const service = createIndicatorsService({
    async find() { return { id: '1', campos: fields, activo: false }; },
    async update(id, data, actor) { calls.push([id, data, actor]); return { id, campos: data }; },
    async create() { assert.fail('No debe intentar crear una clave base por el alta normal.'); },
  });
  const saved = await service.update('1', { ...fields, nombre: 'Nombre revisado' }, '7');
  assert.equal(saved.campos.nombre, 'Nombre revisado'); assert.equal(calls[0][2], '7');
  await assert.rejects(service.create(fields, '7'), { codigo: 'INDICADOR_YA_REGISTRADO' });
});
test('otra ficha no puede apropiarse de una clave base; un ID inexistente sigue siendo 404', async () => {
  for (const [current, codigo] of [[{ id: '2', campos: fichas[0].campos }, 'INDICADOR_YA_REGISTRADO'], [null, 'INDICADOR_NO_ENCONTRADO']]) {
    const service = createIndicatorsService({ async find() { return current; }, async update() { assert.fail('No debe escribir.'); } });
    await assert.rejects(service.update('2', fields, '7'), { codigo });
  }
});
