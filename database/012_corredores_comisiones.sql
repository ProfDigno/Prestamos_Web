BEGIN;

CREATE TABLE corredor (
    idcorredor          SERIAL PRIMARY KEY,
    nombre_completo     VARCHAR(200) NOT NULL,
    cedula              VARCHAR(30) NOT NULL,
    telefono            VARCHAR(40) NOT NULL,
    email               VARCHAR(200),
    porcentaje_comision NUMERIC(9,4) NOT NULL DEFAULT 0,
    fecha_creado        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por          INTEGER NOT NULL,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_corredor_creado_por FOREIGN KEY (creado_por) REFERENCES usuario(idusuario),
    CONSTRAINT uq_corredor_cedula UNIQUE (cedula),
    CONSTRAINT ck_corredor_porcentaje CHECK (porcentaje_comision >= 0 AND porcentaje_comision <= 100)
);

CREATE INDEX ix_corredor_nombre ON corredor(nombre_completo);

CREATE TABLE operacion_corredor (
    idoperacion_corredor SERIAL PRIMARY KEY,
    fk_idoperacion_financiera INTEGER NOT NULL,
    fk_idcorredor         INTEGER NOT NULL,
    porcentaje_comision  NUMERIC(9,4) NOT NULL,
    monto_comision       NUMERIC(18,2) NOT NULL,
    fecha_creado          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por            INTEGER NOT NULL,
    activo                BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_operacion_corredor_operacion FOREIGN KEY (fk_idoperacion_financiera) REFERENCES operacion_financiera(idoperacion_financiera),
    CONSTRAINT fk_operacion_corredor_corredor FOREIGN KEY (fk_idcorredor) REFERENCES corredor(idcorredor),
    CONSTRAINT fk_operacion_corredor_creado_por FOREIGN KEY (creado_por) REFERENCES usuario(idusuario),
    CONSTRAINT uq_operacion_corredor_operacion UNIQUE (fk_idoperacion_financiera),
    CONSTRAINT ck_operacion_corredor_porcentaje CHECK (porcentaje_comision >= 0 AND porcentaje_comision <= 100),
    CONSTRAINT ck_operacion_corredor_monto CHECK (monto_comision >= 0)
);

CREATE INDEX ix_operacion_corredor_corredor ON operacion_corredor(fk_idcorredor);

COMMIT;
