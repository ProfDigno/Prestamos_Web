BEGIN;
CREATE TABLE IF NOT EXISTS descuento_operacion (
  iddescuento_operacion SERIAL PRIMARY KEY,
  fk_idoperacion_financiera INTEGER NOT NULL,
  fk_idpago INTEGER NOT NULL,
  monto NUMERIC(18,2) NOT NULL,
  fecha_aplicacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_por INTEGER NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_descuento_operacion_operacion FOREIGN KEY (fk_idoperacion_financiera) REFERENCES operacion_financiera(idoperacion_financiera),
  CONSTRAINT fk_descuento_operacion_pago FOREIGN KEY (fk_idpago) REFERENCES pago(idpago),
  CONSTRAINT fk_descuento_operacion_creado_por FOREIGN KEY (creado_por) REFERENCES usuario(idusuario),
  CONSTRAINT ck_descuento_operacion_monto CHECK (monto > 0),
  CONSTRAINT uq_descuento_operacion_operacion UNIQUE (fk_idoperacion_financiera)
);
CREATE TABLE IF NOT EXISTS descuento_aplicacion (
  iddescuento_aplicacion SERIAL PRIMARY KEY,
  fk_iddescuento_operacion INTEGER NOT NULL,
  fk_idcuota INTEGER NOT NULL,
  monto NUMERIC(18,2) NOT NULL,
  fecha_creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_por INTEGER NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_descuento_aplicacion_descuento FOREIGN KEY (fk_iddescuento_operacion) REFERENCES descuento_operacion(iddescuento_operacion),
  CONSTRAINT fk_descuento_aplicacion_cuota FOREIGN KEY (fk_idcuota) REFERENCES cuota(idcuota),
  CONSTRAINT fk_descuento_aplicacion_creado_por FOREIGN KEY (creado_por) REFERENCES usuario(idusuario),
  CONSTRAINT ck_descuento_aplicacion_monto CHECK (monto > 0),
  CONSTRAINT uq_descuento_aplicacion_cuota UNIQUE (fk_iddescuento_operacion, fk_idcuota)
);
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='movimiento_caja' AND column_name='fk_iddescuento_operacion') THEN ALTER TABLE movimiento_caja ADD COLUMN fk_iddescuento_operacion INTEGER; END IF; END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_movimiento_caja_descuento') THEN
    ALTER TABLE movimiento_caja ADD CONSTRAINT fk_movimiento_caja_descuento FOREIGN KEY (fk_iddescuento_operacion) REFERENCES descuento_operacion(iddescuento_operacion);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_movimiento_caja_origen_descuento') THEN
    ALTER TABLE movimiento_caja ADD CONSTRAINT ck_movimiento_caja_origen_descuento CHECK (fk_iddescuento_operacion IS NULL OR tipo='EGRESO');
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_movimiento_caja_descuento ON movimiento_caja(fk_iddescuento_operacion) WHERE fk_iddescuento_operacion IS NOT NULL;
COMMIT;
