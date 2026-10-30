import { config } from 'dotenv';
import { buildApp } from './app.js';
import { envSchema } from './env.js';
import { createPool } from './database/pool.js';
import { createAuthRepository } from './modules/auth/repositories/auth.repository.js';
import { PostgresSessionStore } from './modules/auth/repositories/session.repository.js';

config({ quiet: true });

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Configuración de entorno inválida:');
  for (const issue of result.error.issues) {
    console.error(`${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = result.data;
const pool = env.DATABASE_URL ? createPool(env.DATABASE_URL) : undefined;
const app = await buildApp(env, pool ? {
  repository: createAuthRepository(pool), sessionStore: new PostgresSessionStore(pool),
} : undefined);

if (pool) {
  pool.on('error', () => app.log.error('Se perdió una conexión inactiva con PostgreSQL.'));
  app.addHook('onClose', async () => { await pool.end(); });
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().catch((error) => {
      app.log.error(error, 'No se pudo cerrar la API correctamente.');
      process.exitCode = 1;
    });
  });
}

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error(error, 'No se pudo iniciar la API.');
  await app.close();
  process.exit(1);
}
