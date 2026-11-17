-- Activaciones auditadas. Requiere SQL 001, 002, 005, 006 y 007.
-- Aplicar únicamente en la base autorizada. No activa ni desactiva indicadores existentes.
BEGIN;
ALTER TABLE metodologias_indicador ADD CONSTRAINT metodologias_indicador_propietario UNIQUE (indicador_id, id);
CREATE TABLE activaciones_indicador (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    indicador_id bigint NOT NULL REFERENCES indicadores(id),
    metodologia_id bigint NOT NULL,
    primer_periodo date NOT NULL CHECK (extract(day FROM primer_periodo) = 1),
    creado_por bigint NOT NULL REFERENCES usuarios(id),
    creado_en timestamptz NOT NULL DEFAULT now(),
    desactivado_en timestamptz,
    desactivado_por bigint REFERENCES usuarios(id),
    FOREIGN KEY (indicador_id, metodologia_id) REFERENCES metodologias_indicador(indicador_id, id),
    CHECK ((desactivado_en IS NULL) = (desactivado_por IS NULL)),
    CHECK (desactivado_en IS NULL OR desactivado_en >= creado_en)
);
CREATE UNIQUE INDEX activacion_abierta_por_indicador ON activaciones_indicador(indicador_id) WHERE desactivado_en IS NULL;
COMMIT;
