BEGIN;

CREATE TABLE IF NOT EXISTS recuperaciones_password (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  usuario_id BIGINT NOT NULL
    REFERENCES usuarios(id) ON DELETE CASCADE,

  token_hash CHAR(64) NOT NULL UNIQUE,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  expira_en TIMESTAMPTZ NOT NULL,

  utilizado_en TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS
  recuperaciones_password_usuario_idx
ON recuperaciones_password (
  usuario_id,
  creado_en DESC
);

CREATE INDEX IF NOT EXISTS
  recuperaciones_password_expira_idx
ON recuperaciones_password (
  expira_en
);

COMMIT;
