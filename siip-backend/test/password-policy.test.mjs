import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createUserSchema, initialAdminSchema } from '../src/modules/administracion/schemas/usuarios.schema.ts';
import { recoveryConfirmSchema } from '../src/modules/auth/schemas/recovery.schema.ts';

test('alta, administrador inicial y recuperación comparten los límites 15–1024 sin recortar contraseñas', () => {
  const base = { nombre: 'Cuenta sintética', correo: 'synthetic@example.test' };
  for (const [length, accepted] of [[0, false], [12, false], [14, false], [15, true], [129, true], [1024, true], [1025, false]]) {
    const password = 'a'.repeat(length);
    for (const result of [
      initialAdminSchema.safeParse({ ...base, password }),
      createUserSchema.safeParse({ ...base, password, rol: 'consulta', dependencia_id: null }),
      recoveryConfirmSchema.safeParse({ token: 'a'.repeat(64), password }),
    ]) {
      assert.equal(result.success, accepted, `longitud ${length}`);
      if (result.success) assert.equal(result.data.password, password);
    }
  }
  const password = '  contraseña con espacios  ';
  assert.equal(recoveryConfirmSchema.parse({ token: 'a'.repeat(64), password }).password, password);
});
