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
      sql = sql.replace(/\s+/g, ' ').trim();
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
  assert.equal(audit.params[3], 'crear');
  assert.equal(audit.params[4], null);
  assert.deepEqual(JSON.parse(audit.params[5]), publicUser);
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
  assert.equal(JSON.parse(audit.params[5]).rol, 'consulta');
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

test('el catálogo administrativo incluye dependencias activas e inactivas y usa un orden estable', async () => {
  let query;
  const expected = [{ id: '9007199254740993', clave: 'REV', nombre: 'Revisión', activo: true },
    { id: '8', clave: 'ANT', nombre: 'Anterior', activo: false }];
  const repository = createUsersRepository({ async query(sql) { query = sql; return { rows: expected }; } });
  assert.deepEqual(await repository.listDependencies(), expected);
  assert.match(query, /id::text/);
  assert.match(query, /ORDER BY nombre, id/);
  assert.doesNotMatch(query, /WHERE|password|SELECT\s+\*/i);
});

test('el listado selecciona solo datos administrativos sin excluir cuentas o dependencias inactivas', async () => {
  let query;
  const expected = [{ ...publicUser, activo: false, dependencia_nombre: 'Dependencia anterior' }];
  const repository = createUsersRepository({ async query(sql) { query = sql; return { rows: expected }; } });
  assert.deepEqual(await repository.listUsers(), expected);
  assert.match(query, /u.id::text/);
  assert.match(query, /u.dependencia_id::text/);
  assert.match(query, /LEFT JOIN dependencias/);
  assert.match(query, /ORDER BY u.nombre, u.id/);
  assert.doesNotMatch(query, /password|SELECT\s+\*|WHERE/i);
});

test('las cuentas administradoras se protegen al editar y cambiar estado sin escrituras', async () => {
  const admin = { ...publicUser, id: '1', rol: 'administrador', dependencia_id: null, activo: true };
  for (const method of ['updateUser', 'changeUserStatus']) {
    const f = fixture(sql => sql.startsWith('SELECT u.id::text') ? { rows: [admin], rowCount: 1 } : undefined);
    const data = method === 'updateUser' ? { nombre: 'Cambio', correo: 'otro@example.test', rol: 'consulta', dependencia_id: null } : { activo: false };
    await assert.rejects(f.repository[method]('1', data, '1'), { codigo: 'ADMIN_PROTEGIDO' });
    assert.equal(f.calls.some(c => /^UPDATE|^INSERT/.test(c.sql)), false);
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK'); assert.equal(f.released(), true);
  }
});

test('desactivar una dependencia con usuarios activos revierte sin modificarla', async () => {
  const dependency = { id: '7', clave: 'PLAN', nombre: 'Planeación', activo: true };
  const f = fixture(sql => {
    if (sql.includes('FROM dependencias WHERE id')) return { rows: [dependency], rowCount: 1 };
    if (sql.includes('FROM usuarios WHERE dependencia_id')) return { rows: [{ one: 1 }], rowCount: 1 };
  });
  await assert.rejects(f.repository.changeDependencyStatus('7', { activo: false }, '1'), { codigo: 'DEPENDENCIA_CON_USUARIOS_ACTIVOS' });
  assert.equal(f.calls.some(c => c.sql.startsWith('UPDATE dependencias')), false);
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK'); assert.equal(f.released(), true);
});
