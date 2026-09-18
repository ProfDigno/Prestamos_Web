BEGIN;

CREATE TABLE IF NOT EXISTS enlace_cliente (
    idenlace_cliente SERIAL PRIMARY KEY,
    token_hash       CHAR(64) NOT NULL,
    creado_por       INTEGER NOT NULL,
    fecha_creado     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expira     TIMESTAMP NOT NULL,
    fecha_uso        TIMESTAMP,
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_enlace_cliente_token UNIQUE (token_hash),
    CONSTRAINT fk_enlace_cliente_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario)
);

CREATE INDEX IF NOT EXISTS ix_enlace_cliente_disponible
    ON enlace_cliente (token_hash, activo, fecha_expira);

COMMIT;
