-- Propuesta mínima de autenticación. Preparada para revisión; NO se ejecuta al arrancar.
-- Solo para una base vacía autorizada. No reemplaza ni aprueba las demás tablas del MVP.
BEGIN;

CREATE TYPE rol_usuario AS ENUM ('captura', 'revision', 'administrador');

CREATE TABLE dependencias (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clave varchar(40) NOT NULL UNIQUE CHECK (btrim(clave) <> ''),
    nombre text NOT NULL CHECK (btrim(nombre) <> ''),
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE usuarios (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dependencia_id bigint REFERENCES dependencias(id),
    nombre text NOT NULL CHECK (btrim(nombre) <> ''),
    correo varchar(255) NOT NULL CHECK (btrim(correo) <> ''),
    password_hash text NOT NULL CHECK (password_hash LIKE '$argon2id$%'),
    rol rol_usuario NOT NULL,
    activo boolean NOT NULL DEFAULT true,
    creado_en timestamptz NOT NULL DEFAULT now(),
    CHECK (rol <> 'captura' OR dependencia_id IS NOT NULL)
);

CREATE UNIQUE INDEX usuarios_correo_unico ON usuarios (lower(btrim(correo)));
CREATE UNIQUE INDEX usuarios_captura_activa_por_dependencia ON usuarios (dependencia_id)
    WHERE rol = 'captura' AND activo;
CREATE INDEX usuarios_dependencia ON usuarios (dependencia_id);

-- Almacén técnico: identidad de sesión, generación para CAS, datos internos y vencimiento.
-- No contiene contraseñas ni password_hash. Una sola generación vigente evita resurrecciones
-- por solicitudes concurrentes tras login/logout. La cuenta vigente se consulta en cada acceso.
CREATE TABLE sesiones (
    id text PRIMARY KEY,
    generacion text NOT NULL,
    datos jsonb NOT NULL CHECK (jsonb_typeof(datos) = 'object'),
    expira_en timestamptz NOT NULL
);
CREATE INDEX sesiones_expiracion ON sesiones (expira_en);

COMMIT;

-- Mantenimiento periódico a programar al desplegar:
-- DELETE FROM sesiones WHERE expira_en <= now();
