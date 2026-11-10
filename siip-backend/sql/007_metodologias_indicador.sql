-- Preparación de metodologías, sin vigencia ni activación. Requiere SQL 001, 002, 005 y 006.
-- Aplicar únicamente en la base autorizada; no carga reglas ni asigna dependencias.
BEGIN;
CREATE TABLE metodologias_indicador (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    indicador_id bigint NOT NULL REFERENCES indicadores(id),
    version integer NOT NULL CHECK (version > 0),
    tipo text NOT NULL CHECK (tipo = 'porcentaje_parte_total'),
    numerador_id bigint NOT NULL REFERENCES variables_indicador(id),
    denominador_id bigint NOT NULL REFERENCES variables_indicador(id),
    amarillo_desde numeric NOT NULL CHECK (amarillo_desde >= 0),
    verde_desde numeric NOT NULL CHECK (verde_desde <= 100 AND verde_desde > amarillo_desde),
    contexto jsonb NOT NULL CHECK (jsonb_typeof(contexto) = 'object'),
    creado_por bigint NOT NULL REFERENCES usuarios(id),
    creado_en timestamptz NOT NULL DEFAULT now(),
    CHECK (numerador_id <> denominador_id),
    UNIQUE (indicador_id, version)
);
-- Las versiones preparadas se añaden; la API no expone modificaciones ni borrado.
ALTER TABLE auditoria_configuracion DROP CONSTRAINT auditoria_configuracion_entidad_check;
ALTER TABLE auditoria_configuracion ADD CONSTRAINT auditoria_configuracion_entidad_check CHECK (entidad IN (
    'usuarios', 'dependencias', 'agrupaciones_tematicas', 'familias', 'indicadores', 'variables_indicador', 'metodologias_indicador'
));
COMMIT;
