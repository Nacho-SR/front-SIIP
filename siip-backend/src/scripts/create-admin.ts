import { config } from 'dotenv';
import { ZodError } from 'zod';
import { envSchema } from '../env.js';
import { createPool } from '../database/pool.js';
import { HttpError } from '../shared/http-error.js';
import { createUsersRepository } from '../modules/administracion/repositories/usuarios.repository.js';
import { createUsersService } from '../modules/administracion/services/usuarios.service.js';
import { initialAdminSchema } from '../modules/administracion/schemas/usuarios.schema.js';

config({ quiet: true });
let pool: ReturnType<typeof createPool> | undefined;
try {
  const env = envSchema.parse(process.env);
  if (!env.DATABASE_URL) throw new Error('Configura DATABASE_URL en .env antes de crear el administrador.');
  const data = initialAdminSchema.parse({
    nombre: process.env.ADMIN_NOMBRE, correo: process.env.ADMIN_CORREO, password: process.env.ADMIN_PASSWORD,
  });
  pool = createPool(env.DATABASE_URL);
  pool.on('error', () => { console.error('Se perdió una conexión con PostgreSQL.'); });
  const user = await createUsersService(createUsersRepository(pool)).createInitialAdmin(data);
  console.log(`Administrador inicial creado. ID: ${user.id}`);
} catch (error) {
  if (error instanceof ZodError) {
    console.error(error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n'));
  } else if (error instanceof HttpError) {
    console.error(`${error.codigo}: ${error.message}`);
  } else if (!pool) {
    console.error('Configura DATABASE_URL, SESSION_SECRET y los datos ADMIN_NOMBRE, ADMIN_CORREO, ADMIN_PASSWORD.');
  } else {
    console.error('No se pudo crear el administrador. Revisa la conexión y que estén aplicados los SQL 001 y 002.');
  }
  process.exitCode = 1;
} finally {
  delete process.env.ADMIN_PASSWORD;
  await pool?.end();
}
