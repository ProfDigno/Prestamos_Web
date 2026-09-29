BEGIN;

ALTER TABLE operacion_financiera DROP CONSTRAINT ck_operacion_estado;
ALTER TABLE operacion_financiera ADD CONSTRAINT ck_operacion_estado
  CHECK (estado IN ('PENDIENTE','ACTIVA','PAGADA','CANCELADA','EDITADO'));

CREATE TABLE prestamo_reemplazo (
  idprestamo_reemplazo SERIAL PRIMARY KEY,
  fk_idoperacion_original INTEGER NOT NULL UNIQUE REFERENCES operacion_financiera(idoperacion_financiera),
  fk_idoperacion_nueva INTEGER NOT NULL UNIQUE REFERENCES operacion_financiera(idoperacion_financiera),
  creado_por INTEGER NOT NULL REFERENCES usuario(idusuario),
  fecha_creado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (fk_idoperacion_original <> fk_idoperacion_nueva)
);

CREATE TABLE pago_reemplazo (
  fk_idreemplazo INTEGER NOT NULL REFERENCES prestamo_reemplazo(idprestamo_reemplazo),
  fk_idpago_original INTEGER PRIMARY KEY REFERENCES pago(idpago),
  fk_idpago_nuevo INTEGER NOT NULL UNIQUE REFERENCES pago(idpago)
);

CREATE TABLE descuento_reemplazo (
  fk_idreemplazo INTEGER NOT NULL REFERENCES prestamo_reemplazo(idprestamo_reemplazo),
  fk_iddescuento_original INTEGER PRIMARY KEY REFERENCES descuento_operacion(iddescuento_operacion),
  fk_iddescuento_nuevo INTEGER NOT NULL UNIQUE REFERENCES descuento_operacion(iddescuento_operacion)
);

COMMIT;
