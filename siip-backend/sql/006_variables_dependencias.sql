-- Configuración de entradas y sus dependencias. Requiere SQL 001, 002 y 005.
-- Aplicar explícitamente en la base autorizada. No activa indicadores ni crea capturas.
BEGIN;
ALTER TABLE indicadores ADD COLUMN version_variables integer NOT NULL DEFAULT 0
    CHECK (version_variables >= 0);
CREATE TABLE variables_indicador (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    indicador_id bigint NOT NULL REFERENCES indicadores(id),
    codigo varchar(40) NOT NULL CHECK (codigo ~ '^[A-Z][A-Z0-9_]{0,39}$'),
    descripcion text NOT NULL CHECK (btrim(descripcion) <> ''),
    unidad_medida varchar(200) NOT NULL CHECK (btrim(unidad_medida) <> ''),
    tipo_dato varchar(10) NOT NULL CHECK (tipo_dato IN ('entero', 'decimal')),
    dependencia_id bigint REFERENCES dependencias(id),
    UNIQUE (indicador_id, codigo)
);
CREATE INDEX variables_indicador_dependencia ON variables_indicador(dependencia_id);
COMMIT;
