import { config } from 'dotenv';

import { buildApp } from './app.js';
import { envSchema } from './env.js';

import {
  createPool
} from './database/pool.js';

// ============================================
// AUTENTICACIÓN
// ============================================

import {
  createAuthRepository
} from './modules/auth/repositories/auth.repository.js';

import {
  PostgresSessionStore
} from './modules/auth/repositories/session.repository.js';

// ============================================
// RECUPERACIÓN DE CONTRASEÑA
// ============================================

import {
  createRecoveryRepository
} from './modules/auth/repositories/recovery.repository.js';

import {
  createRecoveryMailer
} from './modules/auth/services/recovery.mail.js';

// ============================================
// USUARIOS Y DEPENDENCIAS
// ============================================

import {
  createUsersRepository
} from './modules/administracion/repositories/usuarios.repository.js';

// ============================================
// INDICADORES
// ============================================

import {
  createIndicatorsRepository
} from './modules/indicadores/repositories/indicadores.repository.js';

// ============================================
// AGRUPACIONES TEMÁTICAS Y FAMILIAS
// ============================================

import {
  createClassificationsRepository
} from './modules/indicadores/repositories/clasificaciones.repository.js';

// ============================================
// VARIABLES DE ENTORNO
// ============================================

config({ quiet: true });

const result = envSchema.safeParse(
  process.env
);

if (!result.success) {
  console.error(
    'Configuración de entorno inválida:'
  );

  for (const issue of result.error.issues) {
    console.error(
      `${issue.path.join('.')}: ${issue.message}`
    );
  }

  process.exit(1);
}

// ============================================
// CONFIGURACIÓN POSTGRESQL
// ============================================

const env = result.data;

const pool = env.DATABASE_URL
  ? createPool(env.DATABASE_URL)
  : undefined;

// ============================================
// INICIALIZACIÓN DE FASTIFY
// ============================================

const app = await buildApp(
  env,
  pool
    ? {
        // ------------------------------------
        // AUTENTICACIÓN
        // ------------------------------------

        repository:
          createAuthRepository(pool),

        sessionStore:
          new PostgresSessionStore(pool),

        // ------------------------------------
        // RECUPERACIÓN DE CONTRASEÑA
        // ------------------------------------

        recovery:
          createRecoveryRepository(pool),

        recoveryMailer:
          createRecoveryMailer(env),

        // ------------------------------------
        // USUARIOS Y DEPENDENCIAS
        // ------------------------------------

        users:
          createUsersRepository(pool),

        // ------------------------------------
        // INDICADORES
        // ------------------------------------

        indicators:
          createIndicatorsRepository(pool),

        // ------------------------------------
        // AGRUPACIONES Y FAMILIAS
        // ------------------------------------

        classifications:
          createClassificationsRepository(pool)
      }
    : undefined
);

// ============================================
// CONEXIONES POSTGRESQL
// ============================================

if (pool) {
  pool.on('error', () => {
    app.log.error(
      'Se perdió una conexión inactiva con PostgreSQL.'
    );
  });

  app.addHook('onClose', async () => {
    await pool.end();
  });
}

// ============================================
// CIERRE CONTROLADO DEL SERVIDOR
// ============================================

for (
  const signal of ['SIGINT', 'SIGTERM'] as const
) {
  process.once(signal, () => {
    void app.close().catch(error => {
      app.log.error(
        error,
        'No se pudo cerrar la API correctamente.'
      );

      process.exitCode = 1;
    });
  });
}

// ============================================
// INICIAR SERVIDOR
// ============================================

try {
  await app.listen({
    host: env.HOST,
    port: env.PORT
  });
} catch (error) {
  app.log.error(
    error,
    'No se pudo iniciar la API.'
  );

  await app.close();

  process.exit(1);
}
