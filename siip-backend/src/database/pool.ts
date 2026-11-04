import { Pool } from 'pg';

export function databaseErrorMessage(error: unknown): string {
  if (error instanceof AggregateError) return databaseErrorMessage(error.errors[0]);
  const code = (error as { code?: unknown } | null)?.code;
  switch (code) {
    case '28P01':
      return 'PostgreSQL rechazó las credenciales (28P01). Revisa el usuario y la contraseña de DATABASE_URL; no son los datos ADMIN_CORREO/ADMIN_PASSWORD de SIIP.';
    case '3D000':
      return 'La base indicada en DATABASE_URL no existe (3D000). Revisa NOMBRE_BD.';
    case '42P01':
      return 'Faltan tablas en la base o esquema configurado (42P01). Comprueba que estén aplicados los SQL 001 y 002 en esa misma base.';
    case '42501':
      return 'El usuario PostgreSQL no tiene los permisos necesarios (42501). Revisa los permisos de tablas y secuencias.';
    case 'ECONNREFUSED':
      return 'PostgreSQL rechazó la conexión (ECONNREFUSED). Comprueba que el servicio esté iniciado y que el host y puerto sean correctos.';
    case 'ENOTFOUND':
    case 'ETIMEDOUT':
      return 'No se pudo localizar o contactar el servidor PostgreSQL. Revisa host, puerto y conectividad.';
    default:
      return 'No se pudo crear el administrador. Revisa la conexión y que estén aplicados los SQL 001 y 002.';
  }
}

export function createPool(connectionString: string) {
  const url = new URL(connectionString);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  // La configuración TLS se controla aquí; sslmode no debe reemplazarla.
  url.searchParams.delete('sslmode');

  const pool = new Pool({
    connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: true },
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
  return pool;
}
