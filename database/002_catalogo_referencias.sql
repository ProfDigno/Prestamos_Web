BEGIN;

CREATE TABLE IF NOT EXISTS tipo_referencia (
    idtipo_referencia SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    orden SMALLINT NOT NULL DEFAULT 1,
    fecha_creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por INTEGER NOT NULL REFERENCES usuario(idusuario),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_tipo_referencia_nombre UNIQUE (nombre),
    CONSTRAINT ck_tipo_referencia_orden CHECK (orden > 0)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cliente_referencia' AND column_name='fk_idtipo_referencia') THEN
    ALTER TABLE cliente_referencia ADD COLUMN fk_idtipo_referencia INTEGER;
  END IF;
END $$;

DO $$
DECLARE
  v_admin INTEGER;
  v_familiar INTEGER;
  v_amistad INTEGER;
BEGIN
  SELECT idusuario INTO v_admin FROM usuario WHERE activo ORDER BY idusuario LIMIT 1;
  IF v_admin IS NULL THEN RAISE EXCEPTION 'Debe existir un usuario administrador antes de aplicar la migración'; END IF;
  INSERT INTO tipo_referencia(nombre, descripcion, orden, creado_por)
    VALUES ('Familiar','Referencia familiar',1,v_admin)
    ON CONFLICT (nombre) DO UPDATE SET activo=TRUE;
  INSERT INTO tipo_referencia(nombre, descripcion, orden, creado_por)
    VALUES ('Amistad','Referencia de amistad',2,v_admin)
    ON CONFLICT (nombre) DO UPDATE SET activo=TRUE;
  SELECT idtipo_referencia INTO v_familiar FROM tipo_referencia WHERE nombre='Familiar';
  SELECT idtipo_referencia INTO v_amistad FROM tipo_referencia WHERE nombre='Amistad';
  UPDATE cliente_referencia SET fk_idtipo_referencia = CASE
    WHEN lower(trim(coalesce(relacion,''))) IN ('amistad','amigo','amiga') THEN v_amistad
    ELSE v_familiar END
  WHERE fk_idtipo_referencia IS NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_cliente_referencia_tipo') THEN
    ALTER TABLE cliente_referencia ADD CONSTRAINT fk_cliente_referencia_tipo
      FOREIGN KEY (fk_idtipo_referencia) REFERENCES tipo_referencia(idtipo_referencia);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_cliente_referencia_tipo ON cliente_referencia(fk_idtipo_referencia);
COMMIT;
