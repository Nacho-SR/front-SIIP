-- Complemento de 001_auth_propuesta.sql. Ejecutar explícitamente en la BD autorizada.
BEGIN;
CREATE TABLE auditoria_configuracion (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id bigint NOT NULL REFERENCES usuarios(id),
    entidad varchar(40) NOT NULL CHECK (entidad IN (
        'usuarios', 'dependencias', 'agrupaciones_tematicas', 'familias', 'indicadores', 'variables_indicador'
    )),
    registro_id bigint NOT NULL,
    accion varchar(30) NOT NULL CHECK (accion IN ('crear', 'modificar', 'activar', 'desactivar')),
    antes jsonb,
    despues jsonb NOT NULL CHECK (jsonb_typeof(despues) = 'object'),
    creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auditoria_configuracion_objeto ON auditoria_configuracion (entidad, registro_id, creado_en);
COMMIT;
