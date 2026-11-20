
import { config } from 'dotenv';

import { buildApp } from './app.js';
import { envSchema } from './env.js';

import { createPool } from './database/pool.js';

// ============================================
// AUTENTICACIÓN
// ============================================

import {
  createAuthRepository
} from './modules/auth/repositories/auth.repository.js';

// ============================================
// SESIONES
// ============================================

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
// VARIABLES
// ============================================

import {
  createVariablesRepository
} from './modules/indicadores/repositories/variables.repository.js';

// ============================================
// METODOLOGÍAS
// ============================================

import {
  createMetodologiaRepository
} from './modules/indicadores/repositories/metodologia.repository.js';

// ============================================
// ACTIVACIONES
// ============================================

import {
  createActivacionRepository
} from './modules/indicadores/repositories/activacion.repository.js';

// ============================================
// VARIABLES DE ENTORNO
// ============================================

config({ quiet: true });

const result = envSchema.safeParse(process.env);

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

const env = result.data;

// ============================================
// CONEXIÓN A POSTGRESQL
// ============================================

const pool = env.DATABASE_URL
  ? createPool(env.DATABASE_URL)
  : undefined;

// ============================================
// CONFIGURACIÓN DE RECUPERACIÓN
// ============================================

// El mailer se inicializa únicamente
// cuando existe una conexión PostgreSQL.
//
// Su propiedad "enabled" indica si están
// configuradas las variables necesarias
// para enviar correos.
//
// Nunca se imprimen credenciales SMTP.

const recoveryMailer = pool
  ? createRecoveryMailer(env)
  : undefined;

// ============================================
// CONSTRUCCIÓN DE LA APLICACIÓN FASTIFY
// ============================================

const app = await buildApp(
  env,
  pool
    ? {
        // ------------------------------------
        // AUTENTICACIÓN
        // ------------------------------------

        repository: createAuthRepository(pool),

        // ------------------------------------
        // SESIONES
        // ------------------------------------

        sessionStore:
          new PostgresSessionStore(pool),

        // ------------------------------------
        // RECUPERACIÓN DE CONTRASEÑA
        // ------------------------------------

        recovery: createRecoveryRepository(pool),

        // Solo entregar el servicio si
        // la configuración SMTP está completa.
        //
        // De lo contrario, auth.routes.ts
        // mantendrá la ruta indisponible
        // hasta que se configure el correo.

        recoveryMailer:
          recoveryMailer?.enabled
            ? recoveryMailer
            : undefined,

        // ------------------------------------
        // USUARIOS Y DEPENDENCIAS
        // ------------------------------------

        users: createUsersRepository(pool),

        // ------------------------------------
        // INDICADORES
        // ------------------------------------

        indicators:
          createIndicatorsRepository(pool),

        // ------------------------------------
        // AGRUPACIONES TEMÁTICAS Y FAMILIAS
        // ------------------------------------

        classifications:
          createClassificationsRepository(pool),

        // ------------------------------------
        // VARIABLES
        // ------------------------------------

        variables:
          createVariablesRepository(pool),

        // ------------------------------------
        // METODOLOGÍAS
        // ------------------------------------

        metodologias:
          createMetodologiaRepository(pool),

        // ------------------------------------
        // ACTIVACIONES
        // ------------------------------------

        activaciones:
          createActivacionRepository(pool)
      }
    : undefined
);

// ============================================
// DIAGNÓSTICO DE RECUPERACIÓN
// ============================================

// Solo se registra información booleana.
// No se muestran contraseñas, tokens,
// direcciones de correo ni secretos.

app.log.info(
  {
    postgresConfigurado: Boolean(pool),

    repositorioRecuperacion:
      Boolean(pool),

    smtpConfigurado:
      recoveryMailer?.enabled ?? false,

    recuperacionHabilitada:
      Boolean(pool && recoveryMailer?.enabled)
  },
  'Estado de configuración de recuperación de contraseña.'
);

// ============================================
// MANEJO DE CONEXIONES POSTGRESQL
// ============================================

if (pool) {
  pool.on('error', (error) => {
    app.log.error(
      { err: error },
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
