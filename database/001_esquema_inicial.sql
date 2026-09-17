BEGIN;

-- Esquema inicial para PostgreSQL 9.5 del sistema de prestamos y ventas financiadas.
-- Los archivos fisicos se almacenan fuera de PostgreSQL; esta base conserva
-- solamente su ruta y metadatos.

CREATE TABLE rol (
    idrol              SERIAL PRIMARY KEY,
    nombre             VARCHAR(100) NOT NULL,
    descripcion        TEXT,
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_rol_nombre UNIQUE (nombre)
);

CREATE TABLE evento (
    idevento           SERIAL PRIMARY KEY,
    codigo             VARCHAR(100) NOT NULL,
    modulo             VARCHAR(100) NOT NULL,
    nombre             VARCHAR(150) NOT NULL,
    descripcion        TEXT,
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_evento_codigo UNIQUE (codigo)
);

CREATE TABLE usuario (
    idusuario          SERIAL PRIMARY KEY,
    fk_idrol           INTEGER NOT NULL,
    login              VARCHAR(100) NOT NULL,
    password_hash      VARCHAR(255) NOT NULL,
    nombres            VARCHAR(150) NOT NULL,
    apellidos          VARCHAR(150) NOT NULL,
    cedula             VARCHAR(30) NOT NULL,
    ruc                VARCHAR(30),
    direccion          TEXT,
    telefono1          VARCHAR(30),
    telefono2          VARCHAR(30),
    email              VARCHAR(254),
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (fk_idrol) REFERENCES rol (idrol),
    CONSTRAINT fk_usuario_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_usuario_cedula UNIQUE (cedula),
    CONSTRAINT ck_usuario_login_limpio CHECK (login = BTRIM(login) AND login <> ''),
    CONSTRAINT ck_usuario_password_hash CHECK (BTRIM(password_hash) <> '')
);

-- La comparacion de login y correo no distingue mayusculas de minusculas.
CREATE UNIQUE INDEX uq_usuario_login_lower ON usuario (LOWER(login));
CREATE UNIQUE INDEX uq_usuario_email_lower
    ON usuario (LOWER(email))
    WHERE email IS NOT NULL;

-- Estas referencias se agregan luego de crear usuario para resolver el ciclo
-- de auditoria. Son diferibles para permitir la carga inicial de rol y admin
-- dentro de una sola transaccion.
ALTER TABLE rol
    ADD CONSTRAINT fk_rol_creado_por
    FOREIGN KEY (creado_por) REFERENCES usuario (idusuario)
    DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE evento
    ADD CONSTRAINT fk_evento_creado_por
    FOREIGN KEY (creado_por) REFERENCES usuario (idusuario)
    DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE rol_evento (
    idrol_evento       SERIAL PRIMARY KEY,
    fk_idrol           INTEGER NOT NULL,
    fk_idevento        INTEGER NOT NULL,
    permitido          BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_rol_evento_rol
        FOREIGN KEY (fk_idrol) REFERENCES rol (idrol),
    CONSTRAINT fk_rol_evento_evento
        FOREIGN KEY (fk_idevento) REFERENCES evento (idevento),
    CONSTRAINT fk_rol_evento_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_rol_evento UNIQUE (fk_idrol, fk_idevento)
);

CREATE TABLE configuracion_financiera (
    idconfiguracion_financiera SERIAL PRIMARY KEY,
    interes_minimo             NUMERIC(9,0) NOT NULL,
    moneda                     CHAR(3) NOT NULL DEFAULT 'PYG',
    fecha_creado               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por                 INTEGER NOT NULL,
    activo                     BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_configuracion_financiera_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT ck_configuracion_interes_minimo CHECK (interes_minimo >= 0),
    CONSTRAINT ck_configuracion_moneda CHECK (moneda = UPPER(moneda))
);

CREATE UNIQUE INDEX uq_configuracion_financiera_activa
    ON configuracion_financiera (activo)
    WHERE activo = TRUE;

CREATE TABLE archivo (
    idarchivo          SERIAL PRIMARY KEY,
    ruta               TEXT NOT NULL,
    nombre_original    VARCHAR(255) NOT NULL,
    tipo_mime          VARCHAR(150) NOT NULL,
    tamano_bytes       BIGINT,
    hash_archivo       VARCHAR(128),
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_archivo_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT ck_archivo_ruta CHECK (BTRIM(ruta) <> ''),
    CONSTRAINT ck_archivo_tamano CHECK (tamano_bytes IS NULL OR tamano_bytes >= 0)
);

CREATE INDEX ix_archivo_hash ON archivo (hash_archivo) WHERE hash_archivo IS NOT NULL;

CREATE TABLE propietario (
    idpropietario      SERIAL PRIMARY KEY,
    nombre_completo    VARCHAR(250) NOT NULL,
    cedula             VARCHAR(30) NOT NULL,
    ruc                VARCHAR(30),
    direccion          TEXT,
    telefono1          VARCHAR(30),
    telefono2          VARCHAR(30),
    email              VARCHAR(254),
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_propietario_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_propietario_cedula UNIQUE (cedula)
);

CREATE TABLE banco (
    idbanco            SERIAL PRIMARY KEY,
    codigo             VARCHAR(30),
    nombre             VARCHAR(150) NOT NULL,
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_banco_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_banco_codigo UNIQUE (codigo),
    CONSTRAINT uq_banco_nombre UNIQUE (nombre)
);

CREATE TABLE propietario_banco (
    idpropietario_banco SERIAL PRIMARY KEY,
    fk_idpropietario    INTEGER NOT NULL,
    fk_idbanco          INTEGER NOT NULL,
    titular             VARCHAR(250) NOT NULL,
    tipo_cuenta         VARCHAR(30) NOT NULL,
    numero_cuenta       VARCHAR(80) NOT NULL,
    moneda              CHAR(3) NOT NULL DEFAULT 'PYG',
    alias_cuenta        VARCHAR(100),
    observacion         TEXT,
    fecha_creado        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por          INTEGER NOT NULL,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_propietario_banco_propietario
        FOREIGN KEY (fk_idpropietario) REFERENCES propietario (idpropietario),
    CONSTRAINT fk_propietario_banco_banco
        FOREIGN KEY (fk_idbanco) REFERENCES banco (idbanco),
    CONSTRAINT fk_propietario_banco_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_propietario_banco_cuenta
        UNIQUE (fk_idbanco, numero_cuenta),
    CONSTRAINT ck_propietario_banco_moneda CHECK (moneda = UPPER(moneda))
);

CREATE UNIQUE INDEX uq_propietario_banco_activo
    ON propietario_banco (fk_idpropietario)
    WHERE activo = TRUE;

CREATE TABLE cliente (
    idcliente              SERIAL PRIMARY KEY,
    nombre_completo        VARCHAR(250) NOT NULL,
    cedula                 VARCHAR(30) NOT NULL,
    fecha_nacimiento       DATE,
    ruc                    VARCHAR(30),
    direccion              TEXT NOT NULL,
    telefono1              VARCHAR(30) NOT NULL,
    telefono2              VARCHAR(30),
    email                  VARCHAR(254),
    latitud                NUMERIC(9,6),
    longitud               NUMERIC(9,6),
    fecha_ubicacion        TIMESTAMP,
    direccion_trabajo      TEXT,
    nombre_empresa         VARCHAR(200),
    telefono_empresa       VARCHAR(30),
    ruc_empresa            VARCHAR(30),
    observacion            TEXT,
    profesion              VARCHAR(150),
    dedicacion             VARCHAR(200),
    ingreso_promedio       NUMERIC(18,2),
    tasa_interes_sugerida  NUMERIC(9,0),
    fecha_creado           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por             INTEGER NOT NULL,
    activo                 BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_cliente_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_cliente_cedula UNIQUE (cedula),
    CONSTRAINT uq_cliente_ruc UNIQUE (ruc),
    CONSTRAINT ck_cliente_ingreso CHECK (ingreso_promedio IS NULL OR ingreso_promedio >= 0),
    CONSTRAINT ck_cliente_tasa CHECK (tasa_interes_sugerida IS NULL OR tasa_interes_sugerida >= 0),
    CONSTRAINT ck_cliente_latitud CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
    CONSTRAINT ck_cliente_longitud CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180),
    CONSTRAINT ck_cliente_ubicacion_completa CHECK (
        (latitud IS NULL AND longitud IS NULL AND fecha_ubicacion IS NULL)
        OR
        (latitud IS NOT NULL AND longitud IS NOT NULL AND fecha_ubicacion IS NOT NULL)
    )
);

CREATE INDEX ix_cliente_nombre ON cliente (nombre_completo);
CREATE INDEX ix_cliente_telefono1 ON cliente (telefono1);

CREATE TABLE tipo_referencia (
    idtipo_referencia SERIAL PRIMARY KEY,
    nombre             VARCHAR(100) NOT NULL,
    descripcion        TEXT,
    orden              SMALLINT NOT NULL DEFAULT 1,
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_tipo_referencia_nombre UNIQUE (nombre),
    CONSTRAINT fk_tipo_referencia_creado_por FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT ck_tipo_referencia_orden CHECK (orden > 0)
);

CREATE TABLE cliente_referencia (
    idcliente_referencia SERIAL PRIMARY KEY,
    fk_idcliente         INTEGER NOT NULL,
    posicion             SMALLINT NOT NULL,
    nombre_completo      VARCHAR(250) NOT NULL,
    relacion             VARCHAR(100),
    fk_idtipo_referencia INTEGER,
    telefono             VARCHAR(30) NOT NULL,
    direccion            TEXT,
    fecha_creado         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por           INTEGER NOT NULL,
    activo               BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_cliente_referencia_cliente
        FOREIGN KEY (fk_idcliente) REFERENCES cliente (idcliente),
    CONSTRAINT fk_cliente_referencia_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT fk_cliente_referencia_tipo
        FOREIGN KEY (fk_idtipo_referencia) REFERENCES tipo_referencia (idtipo_referencia),
    CONSTRAINT uq_cliente_referencia_posicion UNIQUE (fk_idcliente, posicion),
    CONSTRAINT ck_cliente_referencia_posicion CHECK (posicion IN (1, 2))
);

CREATE INDEX ix_cliente_referencia_cliente
    ON cliente_referencia (fk_idcliente);

CREATE TABLE cliente_archivo (
    idcliente_archivo  SERIAL PRIMARY KEY,
    fk_idcliente       INTEGER NOT NULL,
    fk_idarchivo       INTEGER NOT NULL,
    tipo_documento     VARCHAR(30) NOT NULL,
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_cliente_archivo_cliente
        FOREIGN KEY (fk_idcliente) REFERENCES cliente (idcliente),
    CONSTRAINT fk_cliente_archivo_archivo
        FOREIGN KEY (fk_idarchivo) REFERENCES archivo (idarchivo),
    CONSTRAINT fk_cliente_archivo_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_cliente_archivo UNIQUE (fk_idcliente, fk_idarchivo),
    CONSTRAINT ck_cliente_archivo_tipo CHECK (
        tipo_documento IN ('CEDULA_FRENTE', 'CEDULA_REVERSO', 'OTRO')
    )
);

CREATE INDEX ix_cliente_archivo_cliente ON cliente_archivo (fk_idcliente);

CREATE TABLE operacion_financiera (
    idoperacion_financiera SERIAL PRIMARY KEY,
    fk_idcliente           INTEGER NOT NULL,
    tipo                   VARCHAR(20) NOT NULL,
    fecha_inicio           DATE NOT NULL,
    monto_capital          NUMERIC(18,2) NOT NULL,
    porcentaje_interes     NUMERIC(9,0) NOT NULL,
    monto_interes          NUMERIC(18,2) NOT NULL,
    monto_total            NUMERIC(18,2) NOT NULL,
    cantidad_cuotas        INTEGER NOT NULL,
    estado                 VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    observacion            TEXT,
    fecha_creado           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por             INTEGER NOT NULL,
    activo                 BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_operacion_financiera_cliente
        FOREIGN KEY (fk_idcliente) REFERENCES cliente (idcliente),
    CONSTRAINT fk_operacion_financiera_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT ck_operacion_tipo CHECK (tipo IN ('PRESTAMO', 'VENTA_FINANCIADA')),
    CONSTRAINT ck_operacion_capital CHECK (monto_capital > 0),
    CONSTRAINT ck_operacion_interes CHECK (porcentaje_interes >= 0),
    CONSTRAINT ck_operacion_monto_interes CHECK (
        monto_interes = ROUND(monto_capital * porcentaje_interes / 100, 2)
    ),
    CONSTRAINT ck_operacion_monto_total CHECK (
        monto_total = monto_capital + monto_interes
    ),
    CONSTRAINT ck_operacion_cuotas CHECK (cantidad_cuotas > 0),
    CONSTRAINT ck_operacion_estado CHECK (
        estado IN ('PENDIENTE', 'ACTIVA', 'PAGADA', 'CANCELADA')
    )
);

CREATE INDEX ix_operacion_cliente ON operacion_financiera (fk_idcliente);
CREATE INDEX ix_operacion_fecha_estado ON operacion_financiera (fecha_inicio, estado);

CREATE TABLE prestamo (
    idprestamo             SERIAL PRIMARY KEY,
    fk_idoperacion_financiera INTEGER NOT NULL,
    fecha_desembolso       DATE NOT NULL,
    fecha_creado           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por             INTEGER NOT NULL,
    activo                 BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_prestamo_operacion_financiera
        FOREIGN KEY (fk_idoperacion_financiera)
        REFERENCES operacion_financiera (idoperacion_financiera),
    CONSTRAINT fk_prestamo_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_prestamo_operacion UNIQUE (fk_idoperacion_financiera)
);

CREATE TABLE producto (
    idproducto          SERIAL PRIMARY KEY,
    codigo              VARCHAR(50) NOT NULL,
    nombre              VARCHAR(200) NOT NULL,
    descripcion         TEXT,
    precio_referencia   NUMERIC(18,2),
    observacion         TEXT,
    fecha_creado        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por          INTEGER NOT NULL,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_producto_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_producto_codigo UNIQUE (codigo),
    CONSTRAINT ck_producto_precio CHECK (precio_referencia IS NULL OR precio_referencia >= 0)
);

CREATE INDEX ix_producto_nombre ON producto (nombre);

CREATE TABLE venta_financiada (
    idventa_financiada     SERIAL PRIMARY KEY,
    fk_idoperacion_financiera INTEGER NOT NULL,
    fk_idproducto          INTEGER NOT NULL,
    cantidad               INTEGER NOT NULL DEFAULT 1,
    precio_unitario        NUMERIC(18,2) NOT NULL,
    precio_contado         NUMERIC(18,2) NOT NULL,
    fecha_creado           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por             INTEGER NOT NULL,
    activo                 BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_venta_financiada_operacion
        FOREIGN KEY (fk_idoperacion_financiera)
        REFERENCES operacion_financiera (idoperacion_financiera),
    CONSTRAINT fk_venta_financiada_producto
        FOREIGN KEY (fk_idproducto) REFERENCES producto (idproducto),
    CONSTRAINT fk_venta_financiada_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_venta_financiada_operacion UNIQUE (fk_idoperacion_financiera),
    CONSTRAINT ck_venta_financiada_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_venta_financiada_precio_unitario CHECK (precio_unitario >= 0),
    CONSTRAINT ck_venta_financiada_precio_contado CHECK (precio_contado >= 0)
);

CREATE INDEX ix_venta_financiada_producto ON venta_financiada (fk_idproducto);

CREATE TABLE operacion_usuario (
    idoperacion_usuario    SERIAL PRIMARY KEY,
    fk_idoperacion_financiera INTEGER NOT NULL,
    fk_idusuario           INTEGER NOT NULL,
    fecha_creado           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por             INTEGER NOT NULL,
    activo                 BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_operacion_usuario_operacion
        FOREIGN KEY (fk_idoperacion_financiera)
        REFERENCES operacion_financiera (idoperacion_financiera),
    CONSTRAINT fk_operacion_usuario_usuario
        FOREIGN KEY (fk_idusuario) REFERENCES usuario (idusuario),
    CONSTRAINT fk_operacion_usuario_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_operacion_usuario UNIQUE (fk_idoperacion_financiera, fk_idusuario)
);

CREATE INDEX ix_operacion_usuario_usuario ON operacion_usuario (fk_idusuario);

CREATE TABLE garantia (
    idgarantia          SERIAL PRIMARY KEY,
    fk_idprestamo       INTEGER NOT NULL,
    fk_idusuario_tasador INTEGER NOT NULL,
    tipo_objeto         VARCHAR(100) NOT NULL,
    descripcion         TEXT NOT NULL,
    marca               VARCHAR(100),
    modelo              VARCHAR(100),
    identificador       VARCHAR(100),
    valor_aproximado    NUMERIC(18,2) NOT NULL,
    valor_tasado        NUMERIC(18,2) NOT NULL,
    observacion         TEXT,
    fecha_creado        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por          INTEGER NOT NULL,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_garantia_prestamo
        FOREIGN KEY (fk_idprestamo) REFERENCES prestamo (idprestamo),
    CONSTRAINT fk_garantia_usuario_tasador
        FOREIGN KEY (fk_idusuario_tasador) REFERENCES usuario (idusuario),
    CONSTRAINT fk_garantia_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_garantia_prestamo UNIQUE (fk_idprestamo),
    CONSTRAINT ck_garantia_valor_aproximado CHECK (valor_aproximado >= 0),
    CONSTRAINT ck_garantia_valor_tasado CHECK (valor_tasado >= 0)
);

CREATE TABLE plan_pago (
    idplan_pago            SERIAL PRIMARY KEY,
    fk_idoperacion_financiera INTEGER NOT NULL,
    frecuencia             VARCHAR(20) NOT NULL,
    fecha_creado           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por             INTEGER NOT NULL,
    activo                 BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_plan_pago_operacion
        FOREIGN KEY (fk_idoperacion_financiera)
        REFERENCES operacion_financiera (idoperacion_financiera),
    CONSTRAINT fk_plan_pago_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_plan_pago_operacion UNIQUE (fk_idoperacion_financiera),
    CONSTRAINT ck_plan_pago_frecuencia CHECK (
        frecuencia IN ('DIARIA', 'SEMANAL', 'QUINCENAL', 'MENSUAL')
    )
);

CREATE TABLE plan_pago_dia_semana (
    idplan_pago_dia_semana SERIAL PRIMARY KEY,
    fk_idplan_pago         INTEGER NOT NULL,
    dia_semana             SMALLINT NOT NULL,
    fecha_creado           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por             INTEGER NOT NULL,
    activo                 BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_plan_pago_dia_semana_plan
        FOREIGN KEY (fk_idplan_pago) REFERENCES plan_pago (idplan_pago),
    CONSTRAINT fk_plan_pago_dia_semana_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_plan_pago_dia_semana UNIQUE (fk_idplan_pago, dia_semana),
    CONSTRAINT ck_plan_pago_dia_semana CHECK (dia_semana BETWEEN 1 AND 7)
);

CREATE TABLE plan_pago_dia_mes (
    idplan_pago_dia_mes SERIAL PRIMARY KEY,
    fk_idplan_pago      INTEGER NOT NULL,
    dia_mes             SMALLINT NOT NULL,
    fecha_creado        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por          INTEGER NOT NULL,
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_plan_pago_dia_mes_plan
        FOREIGN KEY (fk_idplan_pago) REFERENCES plan_pago (idplan_pago),
    CONSTRAINT fk_plan_pago_dia_mes_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_plan_pago_dia_mes UNIQUE (fk_idplan_pago, dia_mes),
    CONSTRAINT ck_plan_pago_dia_mes CHECK (dia_mes BETWEEN 1 AND 31)
);

CREATE TABLE cuota (
    idcuota                 SERIAL PRIMARY KEY,
    fk_idoperacion_financiera INTEGER NOT NULL,
    numero                  INTEGER NOT NULL,
    fecha_vencimiento       DATE NOT NULL,
    fecha_pago              TIMESTAMP,
    monto_capital           NUMERIC(18,2) NOT NULL,
    monto_interes           NUMERIC(18,2) NOT NULL,
    monto_total             NUMERIC(18,2) NOT NULL,
    estado                  VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    fecha_creado            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por              INTEGER NOT NULL,
    activo                  BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_cuota_operacion
        FOREIGN KEY (fk_idoperacion_financiera)
        REFERENCES operacion_financiera (idoperacion_financiera),
    CONSTRAINT fk_cuota_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_cuota_numero UNIQUE (fk_idoperacion_financiera, numero),
    CONSTRAINT ck_cuota_numero CHECK (numero > 0),
    CONSTRAINT ck_cuota_capital CHECK (monto_capital >= 0),
    CONSTRAINT ck_cuota_interes CHECK (monto_interes >= 0),
    CONSTRAINT ck_cuota_total CHECK (
        monto_total > 0 AND monto_total = monto_capital + monto_interes
    ),
    CONSTRAINT ck_cuota_estado CHECK (
        estado IN ('PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA', 'ANULADA')
    )
);

-- No se declara unicidad por fecha: dos cuotas quincenales pueden coincidir
-- cuando ambas se ajustan al ultimo dia de un mes corto.
CREATE INDEX ix_cuota_operacion_vencimiento
    ON cuota (fk_idoperacion_financiera, fecha_vencimiento, numero);
CREATE INDEX ix_cuota_estado_vencimiento ON cuota (estado, fecha_vencimiento);

CREATE TABLE forma_pago (
    idforma_pago       SERIAL PRIMARY KEY,
    codigo             VARCHAR(30) NOT NULL,
    nombre             VARCHAR(100) NOT NULL,
    requiere_comprobante BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_forma_pago_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_forma_pago_codigo UNIQUE (codigo),
    CONSTRAINT uq_forma_pago_nombre UNIQUE (nombre)
);

CREATE TABLE pago (
    idpago                  SERIAL PRIMARY KEY,
    fk_idoperacion_financiera INTEGER NOT NULL,
    fk_idforma_pago         INTEGER NOT NULL,
    fk_idarchivo            INTEGER,
    fecha_pago              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monto                   NUMERIC(18,2) NOT NULL,
    estado                  VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADO',
    referencia              VARCHAR(100),
    observacion             TEXT,
    fecha_creado            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por              INTEGER NOT NULL,
    activo                  BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_pago_operacion
        FOREIGN KEY (fk_idoperacion_financiera)
        REFERENCES operacion_financiera (idoperacion_financiera),
    CONSTRAINT fk_pago_forma_pago
        FOREIGN KEY (fk_idforma_pago) REFERENCES forma_pago (idforma_pago),
    CONSTRAINT fk_pago_archivo
        FOREIGN KEY (fk_idarchivo) REFERENCES archivo (idarchivo),
    CONSTRAINT fk_pago_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT ck_pago_monto CHECK (monto > 0),
    CONSTRAINT ck_pago_estado CHECK (estado IN ('PENDIENTE', 'CONFIRMADO', 'ANULADO'))
);

CREATE INDEX ix_pago_operacion_fecha
    ON pago (fk_idoperacion_financiera, fecha_pago);
CREATE INDEX ix_pago_forma_pago ON pago (fk_idforma_pago);

CREATE TABLE pago_aplicacion (
    idpago_aplicacion  SERIAL PRIMARY KEY,
    fk_idpago          INTEGER NOT NULL,
    fk_idcuota         INTEGER NOT NULL,
    monto_interes      NUMERIC(18,2) NOT NULL DEFAULT 0,
    monto_capital      NUMERIC(18,2) NOT NULL DEFAULT 0,
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_pago_aplicacion_pago
        FOREIGN KEY (fk_idpago) REFERENCES pago (idpago),
    CONSTRAINT fk_pago_aplicacion_cuota
        FOREIGN KEY (fk_idcuota) REFERENCES cuota (idcuota),
    CONSTRAINT fk_pago_aplicacion_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_pago_aplicacion UNIQUE (fk_idpago, fk_idcuota),
    CONSTRAINT ck_pago_aplicacion_interes CHECK (monto_interes >= 0),
    CONSTRAINT ck_pago_aplicacion_capital CHECK (monto_capital >= 0),
    CONSTRAINT ck_pago_aplicacion_monto CHECK (monto_interes + monto_capital > 0)
);

CREATE INDEX ix_pago_aplicacion_cuota ON pago_aplicacion (fk_idcuota);

CREATE TABLE caja (
    idcaja             SERIAL PRIMARY KEY,
    fecha              DATE NOT NULL,
    observacion        TEXT,
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_caja_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_caja_fecha UNIQUE (fecha)
);

CREATE TABLE gasto_tipo (
    idgasto_tipo       SERIAL PRIMARY KEY,
    nombre             VARCHAR(150) NOT NULL,
    descripcion        TEXT,
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_gasto_tipo_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT uq_gasto_tipo_nombre UNIQUE (nombre)
);

CREATE TABLE gasto (
    idgasto            SERIAL PRIMARY KEY,
    fk_idgasto_tipo    INTEGER NOT NULL,
    fk_idarchivo       INTEGER,
    fecha              DATE NOT NULL,
    concepto           VARCHAR(250) NOT NULL,
    monto              NUMERIC(18,2) NOT NULL,
    observacion        TEXT,
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_gasto_gasto_tipo
        FOREIGN KEY (fk_idgasto_tipo) REFERENCES gasto_tipo (idgasto_tipo),
    CONSTRAINT fk_gasto_archivo
        FOREIGN KEY (fk_idarchivo) REFERENCES archivo (idarchivo),
    CONSTRAINT fk_gasto_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT ck_gasto_monto CHECK (monto > 0)
);

CREATE INDEX ix_gasto_tipo_fecha ON gasto (fk_idgasto_tipo, fecha);

CREATE TABLE movimiento_caja (
    idmovimiento_caja  SERIAL PRIMARY KEY,
    fk_idcaja          INTEGER NOT NULL,
    fk_idprestamo      INTEGER,
    fk_idpago          INTEGER,
    fk_idgasto         INTEGER,
    tipo               VARCHAR(10) NOT NULL,
    monto              NUMERIC(18,2) NOT NULL,
    concepto           VARCHAR(250) NOT NULL,
    fecha_movimiento   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_creado       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por         INTEGER NOT NULL,
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_movimiento_caja_caja
        FOREIGN KEY (fk_idcaja) REFERENCES caja (idcaja),
    CONSTRAINT fk_movimiento_caja_prestamo
        FOREIGN KEY (fk_idprestamo) REFERENCES prestamo (idprestamo),
    CONSTRAINT fk_movimiento_caja_pago
        FOREIGN KEY (fk_idpago) REFERENCES pago (idpago),
    CONSTRAINT fk_movimiento_caja_gasto
        FOREIGN KEY (fk_idgasto) REFERENCES gasto (idgasto),
    CONSTRAINT fk_movimiento_caja_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuario (idusuario),
    CONSTRAINT ck_movimiento_caja_tipo CHECK (tipo IN ('INGRESO', 'EGRESO')),
    CONSTRAINT ck_movimiento_caja_monto CHECK (monto > 0),
    CONSTRAINT ck_movimiento_caja_origen CHECK (
        (CASE WHEN fk_idprestamo IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN fk_idpago IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN fk_idgasto IS NOT NULL THEN 1 ELSE 0 END) = 1
    ),
    CONSTRAINT ck_movimiento_caja_tipo_origen CHECK (
        (fk_idpago IS NOT NULL AND tipo = 'INGRESO')
        OR
        ((fk_idprestamo IS NOT NULL OR fk_idgasto IS NOT NULL) AND tipo = 'EGRESO')
    )
);

CREATE INDEX ix_movimiento_caja_fecha ON movimiento_caja (fk_idcaja, fecha_movimiento);
CREATE UNIQUE INDEX uq_movimiento_caja_prestamo
    ON movimiento_caja (fk_idprestamo)
    WHERE fk_idprestamo IS NOT NULL;
CREATE UNIQUE INDEX uq_movimiento_caja_pago
    ON movimiento_caja (fk_idpago)
    WHERE fk_idpago IS NOT NULL;
CREATE UNIQUE INDEX uq_movimiento_caja_gasto
    ON movimiento_caja (fk_idgasto)
    WHERE fk_idgasto IS NOT NULL;

-- Indices para las claves foraneas mas consultadas que no quedaron cubiertas
-- por una restriccion UNIQUE o por otro indice compuesto.
CREATE INDEX ix_rol_evento_evento ON rol_evento (fk_idevento);
CREATE INDEX ix_propietario_banco_banco ON propietario_banco (fk_idbanco);
CREATE INDEX ix_prestamo_creado_por ON prestamo (creado_por);
CREATE INDEX ix_garantia_usuario_tasador ON garantia (fk_idusuario_tasador);
CREATE INDEX ix_plan_pago_dia_semana_plan ON plan_pago_dia_semana (fk_idplan_pago);
CREATE INDEX ix_plan_pago_dia_mes_plan ON plan_pago_dia_mes (fk_idplan_pago);
CREATE INDEX ix_movimiento_caja_prestamo ON movimiento_caja (fk_idprestamo);
CREATE INDEX ix_movimiento_caja_pago ON movimiento_caja (fk_idpago);
CREATE INDEX ix_movimiento_caja_gasto ON movimiento_caja (fk_idgasto);

COMMIT;
