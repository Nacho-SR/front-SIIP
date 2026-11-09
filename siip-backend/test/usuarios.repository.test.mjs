import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createUsersRepository } from '../src/modules/administracion/repositories/usuarios.repository.ts';

const publicUser = { id: '2', nombre: 'Demo', correo: 'demo@example.test', rol: 'revision', dependencia_id: '7' };
const account = { ...publicUser, password_hash: '$argon2id$synthetic-only' };

function fixture(override) {
  const calls = [];
  let released = false;
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      const result = override?.(sql, params);
      if (result) return result;
      if (sql.includes('SELECT id FROM dependencias')) return { rows: [{ id: '7' }], rowCount: 1 };
      if (sql.includes('INSERT INTO usuarios')) return { rows: [publicUser], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
    release() { released = true; },
  };
  return { calls, repository: createUsersRepository({ async connect() { return client; } }), released: () => released };
}

test('alta y auditoría se confirman juntas sin guardar hashes en la bitácora', async () => {
  const f = fixture();
  assert.deepEqual(await f.repository.createUser(account, '1'), publicUser);
  const audit = f.calls.find((call) => call.sql.includes('INSERT INTO auditoria_configuracion'));
  assert.deepEqual(audit.params.slice(0, 3), ['1', 'usuarios', '2']);
  assert.equal(audit.params[3].includes('password'), false);
  assert.equal(f.calls.at(-1).sql, 'COMMIT');
  assert.equal(f.released(), true);
});

test('un fallo de auditoría revierte el alta y libera la conexión', async () => {
  const f = fixture((sql) => {
    if (sql.includes('INSERT INTO auditoria_configuracion')) throw new Error('audit failure');
  });
  await assert.rejects(f.repository.createUser(account, '1'), /audit failure/);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(f.calls.some((call) => call.sql === 'COMMIT'), false);
  assert.equal(f.released(), true);
});

test('Consulta se inserta con dependencia nula y auditoría en la misma transacción', async () => {
  const consulta = { ...publicUser, rol: 'consulta', dependencia_id: null };
  const f = fixture((sql) => sql.includes('INSERT INTO usuarios') ? { rows: [consulta], rowCount: 1 } : undefined);
  assert.deepEqual(await f.repository.createUser({ ...consulta, password_hash: account.password_hash }, '1'), consulta);
  assert.equal(f.calls.some(({ sql }) => sql.includes('SELECT id FROM dependencias')), false);
  const insert = f.calls.find(({ sql }) => sql.includes('INSERT INTO usuarios'));
  assert.equal(insert.params[3], 'consulta');
  assert.equal(insert.params[4], null);
  const audit = f.calls.find(({ sql }) => sql.includes('INSERT INTO auditoria_configuracion'));
  assert.equal(JSON.parse(audit.params[3]).rol, 'consulta');
  assert.equal(f.calls.at(-1).sql, 'COMMIT');
});

test('bootstrap existente no inserta ni cambia la cuenta y los duplicados son 409', async () => {
  const existing = fixture((sql) => sql.includes('SELECT 1 FROM usuarios') ? { rowCount: 1 } : undefined);
  await assert.rejects(existing.repository.createInitialAdmin({ ...account, rol: 'administrador', dependencia_id: null }), { codigo: 'ADMIN_YA_EXISTE' });
  assert.equal(existing.calls.some((call) => call.sql.includes('INSERT INTO usuarios')), false);
  assert.equal(existing.calls.at(-1).sql, 'ROLLBACK');
  for (const [constraint, codigo] of [
    ['usuarios_correo_unico', 'CORREO_YA_REGISTRADO'],
    ['usuarios_captura_activa_por_dependencia', 'CAPTURISTA_YA_ASIGNADO'],
  ]) {
    const f = fixture((sql) => {
      if (sql.includes('INSERT INTO usuarios')) throw Object.assign(new Error('duplicate'), { code: '23505', constraint });
    });
    await assert.rejects(f.repository.createUser(account, '1'), { statusCode: 409, codigo });
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  }
});

test('dependencia inactiva o inexistente impide insertar Captura y Revisión', async () => {
  for (const rol of ['captura', 'revision']) {
    const f = fixture((sql) => sql.includes('SELECT id FROM dependencias') ? { rows: [], rowCount: 0 } : undefined);
    await assert.rejects(f.repository.createUser({ ...account, rol, dependencia_id: '7' }, '1'), { codigo: 'DEPENDENCIA_NO_DISPONIBLE' });
    assert.equal(f.calls.some((call) => call.sql.includes('INSERT INTO usuarios')), false);
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  }
});

test('el catálogo consulta solo dependencias activas y usa un orden estable', async () => {
  let query;
  const expected = [{ id: '9007199254740993', clave: 'REV', nombre: 'Revisión', activo: true }];
  const repository = createUsersRepository({ async query(sql) { query = sql; return { rows: expected }; } });
  assert.deepEqual(await repository.listDependencies(), expected);
  assert.match(query, /id::text/);
  assert.match(query, /WHERE activo ORDER BY nombre, id/);
});
