import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verify } from 'argon2';
import { createUsersRepository } from '../src/modules/administracion/repositories/usuarios.repository.ts';
import { createRecoveryRepository, hashToken } from '../src/modules/auth/repositories/recovery.repository.ts';

function fixture({ failAudit = false, failRevocation = false } = {}) {
  const account = {
    id: '22', nombre: 'Consulta sintética', correo: 'anterior@example.test',
    rol: 'consulta', dependencia_id: null, dependencia_nombre: null, activo: true,
    password_hash: 'hash-anterior',
  };
  const tokens = [
    { usuario_id: account.id, hash: hashToken('a'.repeat(64)), utilizado_en: null },
    { usuario_id: account.id, hash: hashToken('b'.repeat(64)), utilizado_en: null },
    { usuario_id: account.id, hash: hashToken('c'.repeat(64)), utilizado_en: 'fecha-anterior' },
    { usuario_id: '23', hash: hashToken('d'.repeat(64)), utilizado_en: null },
  ];
  const calls = [];
  let snapshot;
  let released = false;
  const result = (rows = [], rowCount = rows.length) => ({ rows, rowCount });
  const client = {
    release() { released = true; },
    async query(sql, params = []) {
      const q = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: q, params });
      if (q === 'BEGIN') { snapshot = structuredClone({ account, tokens }); return result(); }
      if (q === 'ROLLBACK') {
        Object.assign(account, snapshot.account);
        tokens.splice(0, tokens.length, ...snapshot.tokens);
        return result();
      }
      if (q === 'COMMIT') return result();
      if (q.startsWith('SELECT u.id::text')) return result([{ ...account }]);
      if (q.startsWith('UPDATE usuarios SET nombre')) {
        Object.assign(account, { nombre: params[0], correo: params[1], rol: params[2], dependencia_id: params[3] });
        return result([], 1);
      }
      if (q.startsWith('INSERT INTO auditoria_configuracion')) {
        if (failAudit) throw new Error('audit failure');
        return result([], 1);
      }
      if (q.startsWith('SELECT 1 FROM recuperaciones_password r')) {
        return result(tokens.some(t => t.hash === params[0] && !t.utilizado_en && t.usuario_id === account.id) ? [{ one: 1 }] : []);
      }
      if (q.startsWith('SELECT usuario_id::text')) {
        const token = tokens.find(t => t.hash === params[0]);
        return result(token ? [{ usuario_id: token.usuario_id }] : []);
      }
      if (q.startsWith('SELECT u.id FROM usuarios')) return result([{ id: account.id }]);
      if (q.startsWith('UPDATE recuperaciones_password') && q.includes('RETURNING id')) {
        const token = tokens.find(t => t.hash === params[0] && t.usuario_id === params[1] && !t.utilizado_en);
        if (!token) return result();
        token.utilizado_en = 'fecha-nueva';
        return result([{ id: '1' }]);
      }
      if (q.startsWith('UPDATE recuperaciones_password')) {
        if (failRevocation) throw new Error('revocation failure');
        assert.match(q, /WHERE usuario_id = \$1 AND utilizado_en IS NULL$/);
        for (const token of tokens) if (token.usuario_id === params[0] && !token.utilizado_en) token.utilizado_en = 'fecha-nueva';
        return result();
      }
      if (q.startsWith('UPDATE usuarios SET password_hash')) { account.password_hash = params[1]; return result([], 1); }
      if (q.startsWith('DELETE FROM sesiones')) return result([], 1);
      throw new Error('SQL simulado no contemplado: ' + q);
    },
  };
  const pool = { connect: async () => client, query: client.query.bind(client) };
  return { account, tokens, calls, released: () => released,
    users: createUsersRepository(pool), recovery: createRecoveryRepository(pool) };
}

function edit(account, correo = account.correo) {
  return { nombre: 'Nombre editado', correo, rol: account.rol, dependencia_id: account.dependencia_id };
}

test('cambiar correo revoca todos sus enlaces pendientes y el anterior no cambia la contraseña', async () => {
  const f = fixture();
  assert.equal(await f.recovery.validate(f.tokens[0].hash), true);
  const offset = f.calls.length;
  await f.users.updateUser(f.account.id, edit(f.account, 'nuevo@example.test'), '1');
  const transaction = f.calls.slice(offset).map(c => c.sql);
  assert.match(transaction[1], /FOR UPDATE OF u$/);
  assert.ok(transaction.some(q => q.startsWith('UPDATE recuperaciones_password')));
  assert.equal(transaction.at(-1), 'COMMIT');
  assert.equal(await f.recovery.validate(f.tokens[0].hash), false);
  assert.equal(await f.recovery.validate(f.tokens[1].hash), false);
  assert.equal(f.tokens[2].utilizado_en, 'fecha-anterior');
  assert.equal(f.tokens[3].utilizado_en, null);
  await assert.rejects(f.recovery.consume(f.tokens[0].hash, 'Synthetic-password-2026!'), { codigo: 'ENLACE_INVALIDO' });
  assert.equal(f.account.password_hash, 'hash-anterior');
  assert.equal(f.calls.some(c => c.sql.startsWith('DELETE FROM sesiones')), false);
  assert.equal(f.released(), true);
});

test('editar sin cambiar correo conserva el enlace y permite recuperarse una sola vez', async () => {
  const f = fixture();
  await f.users.updateUser(f.account.id, edit(f.account), '1');
  assert.equal(f.calls.some(c => c.sql.startsWith('UPDATE recuperaciones_password')), false);
  assert.equal(await f.recovery.validate(f.tokens[0].hash), true);
  const password = 'Synthetic-password-2026!';
  await f.recovery.consume(f.tokens[0].hash, password);
  assert.equal(await verify(f.account.password_hash, password), true);
  assert.equal(await f.recovery.validate(f.tokens[0].hash), false);
  await assert.rejects(f.recovery.consume(f.tokens[0].hash, password), { codigo: 'ENLACE_INVALIDO' });
});

for (const failure of ['failAudit', 'failRevocation']) {
  test(`${failure}: correo y enlaces se revierten juntos y se libera la conexión`, async () => {
    const f = fixture({ [failure]: true });
    const before = structuredClone({ account: f.account, tokens: f.tokens });
    await assert.rejects(f.users.updateUser(f.account.id, edit(f.account, 'nuevo@example.test'), '1'), /failure/);
    assert.deepEqual({ account: f.account, tokens: f.tokens }, before);
    assert.equal(f.calls.some(c => c.sql === 'COMMIT'), false);
    assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
    assert.equal(f.released(), true);
  });
}
