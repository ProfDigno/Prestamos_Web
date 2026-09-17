--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.14
-- Dumped by pg_dump version 9.5.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: archivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archivo (
    idarchivo integer NOT NULL,
    ruta text NOT NULL,
    nombre_original character varying(255) NOT NULL,
    tipo_mime character varying(150) NOT NULL,
    tamano_bytes bigint,
    hash_archivo character varying(128),
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_archivo_ruta CHECK ((btrim(ruta) <> ''::text)),
    CONSTRAINT ck_archivo_tamano CHECK (((tamano_bytes IS NULL) OR (tamano_bytes >= 0)))
);


--
-- Name: archivo_idarchivo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.archivo_idarchivo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: archivo_idarchivo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.archivo_idarchivo_seq OWNED BY public.archivo.idarchivo;


--
-- Name: banco; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banco (
    idbanco integer NOT NULL,
    codigo character varying(30),
    nombre character varying(150) NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: banco_idbanco_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.banco_idbanco_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: banco_idbanco_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.banco_idbanco_seq OWNED BY public.banco.idbanco;


--
-- Name: caja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.caja (
    idcaja integer NOT NULL,
    fecha date NOT NULL,
    observacion text,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: caja_idcaja_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.caja_idcaja_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: caja_idcaja_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.caja_idcaja_seq OWNED BY public.caja.idcaja;


--
-- Name: cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cliente (
    idcliente integer NOT NULL,
    nombre_completo character varying(250) NOT NULL,
    cedula character varying(30) NOT NULL,
    ruc character varying(30),
    direccion text NOT NULL,
    telefono1 character varying(30) NOT NULL,
    telefono2 character varying(30),
    email character varying(254),
    latitud numeric(9,6),
    longitud numeric(9,6),
    fecha_ubicacion timestamp without time zone,
    direccion_trabajo text,
    nombre_empresa character varying(200),
    telefono_empresa character varying(30),
    ruc_empresa character varying(30),
    observacion text,
    profesion character varying(150),
    dedicacion character varying(200),
    ingreso_promedio numeric(18,2),
    tasa_interes_sugerida numeric(9,4),
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_cliente_ingreso CHECK (((ingreso_promedio IS NULL) OR (ingreso_promedio >= (0)::numeric))),
    CONSTRAINT ck_cliente_latitud CHECK (((latitud IS NULL) OR ((latitud >= ('-90'::integer)::numeric) AND (latitud <= (90)::numeric)))),
    CONSTRAINT ck_cliente_longitud CHECK (((longitud IS NULL) OR ((longitud >= ('-180'::integer)::numeric) AND (longitud <= (180)::numeric)))),
    CONSTRAINT ck_cliente_tasa CHECK (((tasa_interes_sugerida IS NULL) OR (tasa_interes_sugerida >= (0)::numeric))),
    CONSTRAINT ck_cliente_ubicacion_completa CHECK ((((latitud IS NULL) AND (longitud IS NULL) AND (fecha_ubicacion IS NULL)) OR ((latitud IS NOT NULL) AND (longitud IS NOT NULL) AND (fecha_ubicacion IS NOT NULL))))
);


--
-- Name: cliente_archivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cliente_archivo (
    idcliente_archivo integer NOT NULL,
    fk_idcliente integer NOT NULL,
    fk_idarchivo integer NOT NULL,
    tipo_documento character varying(30) NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_cliente_archivo_tipo CHECK (((tipo_documento)::text = ANY ((ARRAY['CEDULA_FRENTE'::character varying, 'CEDULA_REVERSO'::character varying, 'OTRO'::character varying])::text[])))
);


--
-- Name: cliente_archivo_idcliente_archivo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cliente_archivo_idcliente_archivo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cliente_archivo_idcliente_archivo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cliente_archivo_idcliente_archivo_seq OWNED BY public.cliente_archivo.idcliente_archivo;


--
-- Name: cliente_idcliente_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cliente_idcliente_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cliente_idcliente_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cliente_idcliente_seq OWNED BY public.cliente.idcliente;


--
-- Name: cliente_referencia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cliente_referencia (
    idcliente_referencia integer NOT NULL,
    fk_idcliente integer NOT NULL,
    posicion smallint NOT NULL,
    nombre_completo character varying(250) NOT NULL,
    relacion character varying(100),
    telefono character varying(30) NOT NULL,
    direccion text,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_cliente_referencia_posicion CHECK ((posicion = ANY (ARRAY[1, 2])))
);


--
-- Name: cliente_referencia_idcliente_referencia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cliente_referencia_idcliente_referencia_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cliente_referencia_idcliente_referencia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cliente_referencia_idcliente_referencia_seq OWNED BY public.cliente_referencia.idcliente_referencia;


--
-- Name: configuracion_financiera; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracion_financiera (
    idconfiguracion_financiera integer NOT NULL,
    interes_minimo numeric(9,4) NOT NULL,
    moneda character(3) DEFAULT 'PYG'::bpchar NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_configuracion_interes_minimo CHECK ((interes_minimo >= (0)::numeric)),
    CONSTRAINT ck_configuracion_moneda CHECK (((moneda)::text = upper((moneda)::text)))
);


--
-- Name: configuracion_financiera_idconfiguracion_financiera_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.configuracion_financiera_idconfiguracion_financiera_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: configuracion_financiera_idconfiguracion_financiera_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.configuracion_financiera_idconfiguracion_financiera_seq OWNED BY public.configuracion_financiera.idconfiguracion_financiera;


--
-- Name: cuota; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cuota (
    idcuota integer NOT NULL,
    fk_idoperacion_financiera integer NOT NULL,
    numero integer NOT NULL,
    fecha_vencimiento date NOT NULL,
    monto_capital numeric(18,2) NOT NULL,
    monto_interes numeric(18,2) NOT NULL,
    monto_total numeric(18,2) NOT NULL,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_cuota_capital CHECK ((monto_capital >= (0)::numeric)),
    CONSTRAINT ck_cuota_estado CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'PARCIAL'::character varying, 'PAGADA'::character varying, 'VENCIDA'::character varying, 'ANULADA'::character varying])::text[]))),
    CONSTRAINT ck_cuota_interes CHECK ((monto_interes >= (0)::numeric)),
    CONSTRAINT ck_cuota_numero CHECK ((numero > 0)),
    CONSTRAINT ck_cuota_total CHECK (((monto_total > (0)::numeric) AND (monto_total = (monto_capital + monto_interes))))
);


--
-- Name: cuota_idcuota_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cuota_idcuota_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cuota_idcuota_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cuota_idcuota_seq OWNED BY public.cuota.idcuota;


--
-- Name: evento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evento (
    idevento integer NOT NULL,
    codigo character varying(100) NOT NULL,
    modulo character varying(100) NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: evento_idevento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.evento_idevento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: evento_idevento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.evento_idevento_seq OWNED BY public.evento.idevento;


--
-- Name: forma_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forma_pago (
    idforma_pago integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(100) NOT NULL,
    requiere_comprobante boolean DEFAULT false NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: forma_pago_idforma_pago_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forma_pago_idforma_pago_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forma_pago_idforma_pago_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forma_pago_idforma_pago_seq OWNED BY public.forma_pago.idforma_pago;


--
-- Name: garantia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.garantia (
    idgarantia integer NOT NULL,
    fk_idprestamo integer NOT NULL,
    fk_idusuario_tasador integer NOT NULL,
    tipo_objeto character varying(100) NOT NULL,
    descripcion text NOT NULL,
    marca character varying(100),
    modelo character varying(100),
    identificador character varying(100),
    valor_aproximado numeric(18,2) NOT NULL,
    valor_tasado numeric(18,2) NOT NULL,
    observacion text,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_garantia_valor_aproximado CHECK ((valor_aproximado >= (0)::numeric)),
    CONSTRAINT ck_garantia_valor_tasado CHECK ((valor_tasado >= (0)::numeric))
);


--
-- Name: garantia_idgarantia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.garantia_idgarantia_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: garantia_idgarantia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.garantia_idgarantia_seq OWNED BY public.garantia.idgarantia;


--
-- Name: gasto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gasto (
    idgasto integer NOT NULL,
    fk_idgasto_tipo integer NOT NULL,
    fk_idarchivo integer,
    fecha date NOT NULL,
    concepto character varying(250) NOT NULL,
    monto numeric(18,2) NOT NULL,
    observacion text,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_gasto_monto CHECK ((monto > (0)::numeric))
);


--
-- Name: gasto_idgasto_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gasto_idgasto_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gasto_idgasto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gasto_idgasto_seq OWNED BY public.gasto.idgasto;


--
-- Name: gasto_tipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gasto_tipo (
    idgasto_tipo integer NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: gasto_tipo_idgasto_tipo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gasto_tipo_idgasto_tipo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gasto_tipo_idgasto_tipo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gasto_tipo_idgasto_tipo_seq OWNED BY public.gasto_tipo.idgasto_tipo;


--
-- Name: movimiento_caja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimiento_caja (
    idmovimiento_caja integer NOT NULL,
    fk_idcaja integer NOT NULL,
    fk_idprestamo integer,
    fk_idpago integer,
    fk_idgasto integer,
    tipo character varying(10) NOT NULL,
    monto numeric(18,2) NOT NULL,
    concepto character varying(250) NOT NULL,
    fecha_movimiento timestamp without time zone DEFAULT now() NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_movimiento_caja_monto CHECK ((monto > (0)::numeric)),
    CONSTRAINT ck_movimiento_caja_origen CHECK ((((
CASE
    WHEN (fk_idprestamo IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN (fk_idpago IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN (fk_idgasto IS NOT NULL) THEN 1
    ELSE 0
END) = 1)),
    CONSTRAINT ck_movimiento_caja_tipo CHECK (((tipo)::text = ANY ((ARRAY['INGRESO'::character varying, 'EGRESO'::character varying])::text[]))),
    CONSTRAINT ck_movimiento_caja_tipo_origen CHECK ((((fk_idpago IS NOT NULL) AND ((tipo)::text = 'INGRESO'::text)) OR (((fk_idprestamo IS NOT NULL) OR (fk_idgasto IS NOT NULL)) AND ((tipo)::text = 'EGRESO'::text))))
);


--
-- Name: movimiento_caja_idmovimiento_caja_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.movimiento_caja_idmovimiento_caja_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: movimiento_caja_idmovimiento_caja_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.movimiento_caja_idmovimiento_caja_seq OWNED BY public.movimiento_caja.idmovimiento_caja;


--
-- Name: operacion_financiera; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operacion_financiera (
    idoperacion_financiera integer NOT NULL,
    fk_idcliente integer NOT NULL,
    tipo character varying(20) NOT NULL,
    fecha_inicio date NOT NULL,
    monto_capital numeric(18,2) NOT NULL,
    porcentaje_interes numeric(9,4) NOT NULL,
    monto_interes numeric(18,2) NOT NULL,
    monto_total numeric(18,2) NOT NULL,
    cantidad_cuotas integer NOT NULL,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying NOT NULL,
    observacion text,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_operacion_capital CHECK ((monto_capital > (0)::numeric)),
    CONSTRAINT ck_operacion_cuotas CHECK ((cantidad_cuotas > 0)),
    CONSTRAINT ck_operacion_estado CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'ACTIVA'::character varying, 'PAGADA'::character varying, 'CANCELADA'::character varying])::text[]))),
    CONSTRAINT ck_operacion_interes CHECK ((porcentaje_interes >= (0)::numeric)),
    CONSTRAINT ck_operacion_monto_interes CHECK ((monto_interes = round(((monto_capital * porcentaje_interes) / (100)::numeric), 2))),
    CONSTRAINT ck_operacion_monto_total CHECK ((monto_total = (monto_capital + monto_interes))),
    CONSTRAINT ck_operacion_tipo CHECK (((tipo)::text = ANY ((ARRAY['PRESTAMO'::character varying, 'VENTA_FINANCIADA'::character varying])::text[])))
);


--
-- Name: operacion_financiera_idoperacion_financiera_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operacion_financiera_idoperacion_financiera_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: operacion_financiera_idoperacion_financiera_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operacion_financiera_idoperacion_financiera_seq OWNED BY public.operacion_financiera.idoperacion_financiera;


--
-- Name: operacion_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operacion_usuario (
    idoperacion_usuario integer NOT NULL,
    fk_idoperacion_financiera integer NOT NULL,
    fk_idusuario integer NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: operacion_usuario_idoperacion_usuario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operacion_usuario_idoperacion_usuario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: operacion_usuario_idoperacion_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operacion_usuario_idoperacion_usuario_seq OWNED BY public.operacion_usuario.idoperacion_usuario;


--
-- Name: pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pago (
    idpago integer NOT NULL,
    fk_idoperacion_financiera integer NOT NULL,
    fk_idforma_pago integer NOT NULL,
    fk_idarchivo integer,
    fecha_pago timestamp without time zone DEFAULT now() NOT NULL,
    monto numeric(18,2) NOT NULL,
    estado character varying(20) DEFAULT 'CONFIRMADO'::character varying NOT NULL,
    referencia character varying(100),
    observacion text,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_pago_estado CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'CONFIRMADO'::character varying, 'ANULADO'::character varying])::text[]))),
    CONSTRAINT ck_pago_monto CHECK ((monto > (0)::numeric))
);


--
-- Name: pago_aplicacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pago_aplicacion (
    idpago_aplicacion integer NOT NULL,
    fk_idpago integer NOT NULL,
    fk_idcuota integer NOT NULL,
    monto_interes numeric(18,2) DEFAULT 0 NOT NULL,
    monto_capital numeric(18,2) DEFAULT 0 NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_pago_aplicacion_capital CHECK ((monto_capital >= (0)::numeric)),
    CONSTRAINT ck_pago_aplicacion_interes CHECK ((monto_interes >= (0)::numeric)),
    CONSTRAINT ck_pago_aplicacion_monto CHECK (((monto_interes + monto_capital) > (0)::numeric))
);


--
-- Name: pago_aplicacion_idpago_aplicacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pago_aplicacion_idpago_aplicacion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pago_aplicacion_idpago_aplicacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pago_aplicacion_idpago_aplicacion_seq OWNED BY public.pago_aplicacion.idpago_aplicacion;


--
-- Name: pago_idpago_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pago_idpago_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pago_idpago_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pago_idpago_seq OWNED BY public.pago.idpago;


--
-- Name: plan_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_pago (
    idplan_pago integer NOT NULL,
    fk_idoperacion_financiera integer NOT NULL,
    frecuencia character varying(20) NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_plan_pago_frecuencia CHECK (((frecuencia)::text = ANY ((ARRAY['DIARIA'::character varying, 'SEMANAL'::character varying, 'QUINCENAL'::character varying, 'MENSUAL'::character varying])::text[])))
);


--
-- Name: plan_pago_dia_mes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_pago_dia_mes (
    idplan_pago_dia_mes integer NOT NULL,
    fk_idplan_pago integer NOT NULL,
    dia_mes smallint NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_plan_pago_dia_mes CHECK (((dia_mes >= 1) AND (dia_mes <= 31)))
);


--
-- Name: plan_pago_dia_mes_idplan_pago_dia_mes_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_pago_dia_mes_idplan_pago_dia_mes_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_pago_dia_mes_idplan_pago_dia_mes_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_pago_dia_mes_idplan_pago_dia_mes_seq OWNED BY public.plan_pago_dia_mes.idplan_pago_dia_mes;


--
-- Name: plan_pago_dia_semana; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_pago_dia_semana (
    idplan_pago_dia_semana integer NOT NULL,
    fk_idplan_pago integer NOT NULL,
    dia_semana smallint NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_plan_pago_dia_semana CHECK (((dia_semana >= 1) AND (dia_semana <= 7)))
);


--
-- Name: plan_pago_dia_semana_idplan_pago_dia_semana_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_pago_dia_semana_idplan_pago_dia_semana_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_pago_dia_semana_idplan_pago_dia_semana_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_pago_dia_semana_idplan_pago_dia_semana_seq OWNED BY public.plan_pago_dia_semana.idplan_pago_dia_semana;


--
-- Name: plan_pago_idplan_pago_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plan_pago_idplan_pago_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plan_pago_idplan_pago_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plan_pago_idplan_pago_seq OWNED BY public.plan_pago.idplan_pago;


--
-- Name: prestamo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prestamo (
    idprestamo integer NOT NULL,
    fk_idoperacion_financiera integer NOT NULL,
    fecha_desembolso date NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: prestamo_idprestamo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prestamo_idprestamo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prestamo_idprestamo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prestamo_idprestamo_seq OWNED BY public.prestamo.idprestamo;


--
-- Name: producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.producto (
    idproducto integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(200) NOT NULL,
    descripcion text,
    precio_referencia numeric(18,2),
    observacion text,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_producto_precio CHECK (((precio_referencia IS NULL) OR (precio_referencia >= (0)::numeric)))
);


--
-- Name: producto_idproducto_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.producto_idproducto_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: producto_idproducto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.producto_idproducto_seq OWNED BY public.producto.idproducto;


--
-- Name: propietario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.propietario (
    idpropietario integer NOT NULL,
    nombre_completo character varying(250) NOT NULL,
    cedula character varying(30) NOT NULL,
    ruc character varying(30),
    direccion text,
    telefono1 character varying(30),
    telefono2 character varying(30),
    email character varying(254),
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: propietario_banco; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.propietario_banco (
    idpropietario_banco integer NOT NULL,
    fk_idpropietario integer NOT NULL,
    fk_idbanco integer NOT NULL,
    titular character varying(250) NOT NULL,
    tipo_cuenta character varying(30) NOT NULL,
    numero_cuenta character varying(80) NOT NULL,
    moneda character(3) DEFAULT 'PYG'::bpchar NOT NULL,
    alias_cuenta character varying(100),
    observacion text,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_propietario_banco_moneda CHECK (((moneda)::text = upper((moneda)::text)))
);


--
-- Name: propietario_banco_idpropietario_banco_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.propietario_banco_idpropietario_banco_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: propietario_banco_idpropietario_banco_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.propietario_banco_idpropietario_banco_seq OWNED BY public.propietario_banco.idpropietario_banco;


--
-- Name: propietario_idpropietario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.propietario_idpropietario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: propietario_idpropietario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.propietario_idpropietario_seq OWNED BY public.propietario.idpropietario;


--
-- Name: rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rol (
    idrol integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: rol_evento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rol_evento (
    idrol_evento integer NOT NULL,
    fk_idrol integer NOT NULL,
    fk_idevento integer NOT NULL,
    permitido boolean DEFAULT true NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: rol_evento_idrol_evento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rol_evento_idrol_evento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rol_evento_idrol_evento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rol_evento_idrol_evento_seq OWNED BY public.rol_evento.idrol_evento;


--
-- Name: rol_idrol_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rol_idrol_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rol_idrol_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rol_idrol_seq OWNED BY public.rol.idrol;


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario (
    idusuario integer NOT NULL,
    fk_idrol integer NOT NULL,
    login character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nombres character varying(150) NOT NULL,
    apellidos character varying(150) NOT NULL,
    cedula character varying(30) NOT NULL,
    ruc character varying(30),
    direccion text,
    telefono1 character varying(30),
    telefono2 character varying(30),
    email character varying(254),
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_usuario_login_limpio CHECK ((((login)::text = btrim((login)::text)) AND ((login)::text <> ''::text))),
    CONSTRAINT ck_usuario_password_hash CHECK ((btrim((password_hash)::text) <> ''::text))
);


--
-- Name: usuario_idusuario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuario_idusuario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_idusuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuario_idusuario_seq OWNED BY public.usuario.idusuario;


--
-- Name: venta_financiada; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.venta_financiada (
    idventa_financiada integer NOT NULL,
    fk_idoperacion_financiera integer NOT NULL,
    fk_idproducto integer NOT NULL,
    cantidad integer DEFAULT 1 NOT NULL,
    precio_unitario numeric(18,2) NOT NULL,
    precio_contado numeric(18,2) NOT NULL,
    fecha_creado timestamp without time zone DEFAULT now() NOT NULL,
    creado_por integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_venta_financiada_cantidad CHECK ((cantidad > 0)),
    CONSTRAINT ck_venta_financiada_precio_contado CHECK ((precio_contado >= (0)::numeric)),
    CONSTRAINT ck_venta_financiada_precio_unitario CHECK ((precio_unitario >= (0)::numeric))
);


--
-- Name: venta_financiada_idventa_financiada_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.venta_financiada_idventa_financiada_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: venta_financiada_idventa_financiada_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.venta_financiada_idventa_financiada_seq OWNED BY public.venta_financiada.idventa_financiada;


--
-- Name: idarchivo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo ALTER COLUMN idarchivo SET DEFAULT nextval('public.archivo_idarchivo_seq'::regclass);


--
-- Name: idbanco; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banco ALTER COLUMN idbanco SET DEFAULT nextval('public.banco_idbanco_seq'::regclass);


--
-- Name: idcaja; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja ALTER COLUMN idcaja SET DEFAULT nextval('public.caja_idcaja_seq'::regclass);


--
-- Name: idcliente; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente ALTER COLUMN idcliente SET DEFAULT nextval('public.cliente_idcliente_seq'::regclass);


--
-- Name: idcliente_archivo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_archivo ALTER COLUMN idcliente_archivo SET DEFAULT nextval('public.cliente_archivo_idcliente_archivo_seq'::regclass);


--
-- Name: idcliente_referencia; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_referencia ALTER COLUMN idcliente_referencia SET DEFAULT nextval('public.cliente_referencia_idcliente_referencia_seq'::regclass);


--
-- Name: idconfiguracion_financiera; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_financiera ALTER COLUMN idconfiguracion_financiera SET DEFAULT nextval('public.configuracion_financiera_idconfiguracion_financiera_seq'::regclass);


--
-- Name: idcuota; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuota ALTER COLUMN idcuota SET DEFAULT nextval('public.cuota_idcuota_seq'::regclass);


--
-- Name: idevento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento ALTER COLUMN idevento SET DEFAULT nextval('public.evento_idevento_seq'::regclass);


--
-- Name: idforma_pago; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forma_pago ALTER COLUMN idforma_pago SET DEFAULT nextval('public.forma_pago_idforma_pago_seq'::regclass);


--
-- Name: idgarantia; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantia ALTER COLUMN idgarantia SET DEFAULT nextval('public.garantia_idgarantia_seq'::regclass);


--
-- Name: idgasto; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gasto ALTER COLUMN idgasto SET DEFAULT nextval('public.gasto_idgasto_seq'::regclass);


--
-- Name: idgasto_tipo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gasto_tipo ALTER COLUMN idgasto_tipo SET DEFAULT nextval('public.gasto_tipo_idgasto_tipo_seq'::regclass);


--
-- Name: idmovimiento_caja; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_caja ALTER COLUMN idmovimiento_caja SET DEFAULT nextval('public.movimiento_caja_idmovimiento_caja_seq'::regclass);


--
-- Name: idoperacion_financiera; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operacion_financiera ALTER COLUMN idoperacion_financiera SET DEFAULT nextval('public.operacion_financiera_idoperacion_financiera_seq'::regclass);


--
-- Name: idoperacion_usuario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operacion_usuario ALTER COLUMN idoperacion_usuario SET DEFAULT nextval('public.operacion_usuario_idoperacion_usuario_seq'::regclass);


--
-- Name: idpago; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago ALTER COLUMN idpago SET DEFAULT nextval('public.pago_idpago_seq'::regclass);


--
-- Name: idpago_aplicacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago_aplicacion ALTER COLUMN idpago_aplicacion SET DEFAULT nextval('public.pago_aplicacion_idpago_aplicacion_seq'::regclass);


--
-- Name: idplan_pago; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago ALTER COLUMN idplan_pago SET DEFAULT nextval('public.plan_pago_idplan_pago_seq'::regclass);


--
-- Name: idplan_pago_dia_mes; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago_dia_mes ALTER COLUMN idplan_pago_dia_mes SET DEFAULT nextval('public.plan_pago_dia_mes_idplan_pago_dia_mes_seq'::regclass);


--
-- Name: idplan_pago_dia_semana; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago_dia_semana ALTER COLUMN idplan_pago_dia_semana SET DEFAULT nextval('public.plan_pago_dia_semana_idplan_pago_dia_semana_seq'::regclass);


--
-- Name: idprestamo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo ALTER COLUMN idprestamo SET DEFAULT nextval('public.prestamo_idprestamo_seq'::regclass);


--
-- Name: idproducto; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto ALTER COLUMN idproducto SET DEFAULT nextval('public.producto_idproducto_seq'::regclass);


--
-- Name: idpropietario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propietario ALTER COLUMN idpropietario SET DEFAULT nextval('public.propietario_idpropietario_seq'::regclass);


--
-- Name: idpropietario_banco; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propietario_banco ALTER COLUMN idpropietario_banco SET DEFAULT nextval('public.propietario_banco_idpropietario_banco_seq'::regclass);


--
-- Name: idrol; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol ALTER COLUMN idrol SET DEFAULT nextval('public.rol_idrol_seq'::regclass);


--
-- Name: idrol_evento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_evento ALTER COLUMN idrol_evento SET DEFAULT nextval('public.rol_evento_idrol_evento_seq'::regclass);


--
-- Name: idusuario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario ALTER COLUMN idusuario SET DEFAULT nextval('public.usuario_idusuario_seq'::regclass);


--
-- Name: idventa_financiada; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_financiada ALTER COLUMN idventa_financiada SET DEFAULT nextval('public.venta_financiada_idventa_financiada_seq'::regclass);


--
-- Data for Name: archivo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.archivo (idarchivo, ruta, nombre_original, tipo_mime, tamano_bytes, hash_archivo, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: archivo_idarchivo_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.archivo_idarchivo_seq', 1, false);


--
-- Data for Name: banco; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.banco (idbanco, codigo, nombre, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: banco_idbanco_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.banco_idbanco_seq', 1, false);


--
-- Data for Name: caja; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.caja (idcaja, fecha, observacion, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: caja_idcaja_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.caja_idcaja_seq', 1, false);


--
-- Data for Name: cliente; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cliente (idcliente, nombre_completo, cedula, ruc, direccion, telefono1, telefono2, email, latitud, longitud, fecha_ubicacion, direccion_trabajo, nombre_empresa, telefono_empresa, ruc_empresa, observacion, profesion, dedicacion, ingreso_promedio, tasa_interes_sugerida, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Data for Name: cliente_archivo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cliente_archivo (idcliente_archivo, fk_idcliente, fk_idarchivo, tipo_documento, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: cliente_archivo_idcliente_archivo_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cliente_archivo_idcliente_archivo_seq', 1, false);


--
-- Name: cliente_idcliente_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cliente_idcliente_seq', 1, false);


--
-- Data for Name: cliente_referencia; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cliente_referencia (idcliente_referencia, fk_idcliente, posicion, nombre_completo, relacion, telefono, direccion, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: cliente_referencia_idcliente_referencia_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cliente_referencia_idcliente_referencia_seq', 1, false);


--
-- Data for Name: configuracion_financiera; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.configuracion_financiera (idconfiguracion_financiera, interes_minimo, moneda, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: configuracion_financiera_idconfiguracion_financiera_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.configuracion_financiera_idconfiguracion_financiera_seq', 1, false);


--
-- Data for Name: cuota; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cuota (idcuota, fk_idoperacion_financiera, numero, fecha_vencimiento, monto_capital, monto_interes, monto_total, estado, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: cuota_idcuota_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cuota_idcuota_seq', 1, false);


--
-- Data for Name: evento; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.evento (idevento, codigo, modulo, nombre, descripcion, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: evento_idevento_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.evento_idevento_seq', 1, false);


--
-- Data for Name: forma_pago; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.forma_pago (idforma_pago, codigo, nombre, requiere_comprobante, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: forma_pago_idforma_pago_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.forma_pago_idforma_pago_seq', 1, false);


--
-- Data for Name: garantia; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.garantia (idgarantia, fk_idprestamo, fk_idusuario_tasador, tipo_objeto, descripcion, marca, modelo, identificador, valor_aproximado, valor_tasado, observacion, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: garantia_idgarantia_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.garantia_idgarantia_seq', 1, false);


--
-- Data for Name: gasto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gasto (idgasto, fk_idgasto_tipo, fk_idarchivo, fecha, concepto, monto, observacion, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: gasto_idgasto_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.gasto_idgasto_seq', 1, false);


--
-- Data for Name: gasto_tipo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gasto_tipo (idgasto_tipo, nombre, descripcion, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: gasto_tipo_idgasto_tipo_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.gasto_tipo_idgasto_tipo_seq', 1, false);


--
-- Data for Name: movimiento_caja; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.movimiento_caja (idmovimiento_caja, fk_idcaja, fk_idprestamo, fk_idpago, fk_idgasto, tipo, monto, concepto, fecha_movimiento, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: movimiento_caja_idmovimiento_caja_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.movimiento_caja_idmovimiento_caja_seq', 1, false);


--
-- Data for Name: operacion_financiera; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operacion_financiera (idoperacion_financiera, fk_idcliente, tipo, fecha_inicio, monto_capital, porcentaje_interes, monto_interes, monto_total, cantidad_cuotas, estado, observacion, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: operacion_financiera_idoperacion_financiera_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.operacion_financiera_idoperacion_financiera_seq', 1, false);


--
-- Data for Name: operacion_usuario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operacion_usuario (idoperacion_usuario, fk_idoperacion_financiera, fk_idusuario, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: operacion_usuario_idoperacion_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.operacion_usuario_idoperacion_usuario_seq', 1, false);


--
-- Data for Name: pago; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pago (idpago, fk_idoperacion_financiera, fk_idforma_pago, fk_idarchivo, fecha_pago, monto, estado, referencia, observacion, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Data for Name: pago_aplicacion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pago_aplicacion (idpago_aplicacion, fk_idpago, fk_idcuota, monto_interes, monto_capital, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: pago_aplicacion_idpago_aplicacion_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pago_aplicacion_idpago_aplicacion_seq', 1, false);


--
-- Name: pago_idpago_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pago_idpago_seq', 1, false);


--
-- Data for Name: plan_pago; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plan_pago (idplan_pago, fk_idoperacion_financiera, frecuencia, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Data for Name: plan_pago_dia_mes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plan_pago_dia_mes (idplan_pago_dia_mes, fk_idplan_pago, dia_mes, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: plan_pago_dia_mes_idplan_pago_dia_mes_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.plan_pago_dia_mes_idplan_pago_dia_mes_seq', 1, false);


--
-- Data for Name: plan_pago_dia_semana; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.plan_pago_dia_semana (idplan_pago_dia_semana, fk_idplan_pago, dia_semana, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: plan_pago_dia_semana_idplan_pago_dia_semana_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.plan_pago_dia_semana_idplan_pago_dia_semana_seq', 1, false);


--
-- Name: plan_pago_idplan_pago_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.plan_pago_idplan_pago_seq', 1, false);


--
-- Data for Name: prestamo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.prestamo (idprestamo, fk_idoperacion_financiera, fecha_desembolso, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: prestamo_idprestamo_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.prestamo_idprestamo_seq', 1, false);


--
-- Data for Name: producto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.producto (idproducto, codigo, nombre, descripcion, precio_referencia, observacion, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: producto_idproducto_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.producto_idproducto_seq', 1, false);


--
-- Data for Name: propietario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.propietario (idpropietario, nombre_completo, cedula, ruc, direccion, telefono1, telefono2, email, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Data for Name: propietario_banco; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.propietario_banco (idpropietario_banco, fk_idpropietario, fk_idbanco, titular, tipo_cuenta, numero_cuenta, moneda, alias_cuenta, observacion, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: propietario_banco_idpropietario_banco_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.propietario_banco_idpropietario_banco_seq', 1, false);


--
-- Name: propietario_idpropietario_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.propietario_idpropietario_seq', 1, false);


--
-- Data for Name: rol; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rol (idrol, nombre, descripcion, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Data for Name: rol_evento; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rol_evento (idrol_evento, fk_idrol, fk_idevento, permitido, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: rol_evento_idrol_evento_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rol_evento_idrol_evento_seq', 1, false);


--
-- Name: rol_idrol_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rol_idrol_seq', 1, false);


--
-- Data for Name: usuario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuario (idusuario, fk_idrol, login, password_hash, nombres, apellidos, cedula, ruc, direccion, telefono1, telefono2, email, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: usuario_idusuario_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuario_idusuario_seq', 1, false);


--
-- Data for Name: venta_financiada; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.venta_financiada (idventa_financiada, fk_idoperacion_financiera, fk_idproducto, cantidad, precio_unitario, precio_contado, fecha_creado, creado_por, activo) FROM stdin;
\.


--
-- Name: venta_financiada_idventa_financiada_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.venta_financiada_idventa_financiada_seq', 1, false);


--
-- Name: archivo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo
    ADD CONSTRAINT archivo_pkey PRIMARY KEY (idarchivo);


--
-- Name: banco_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banco
    ADD CONSTRAINT banco_pkey PRIMARY KEY (idbanco);


--
-- Name: caja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja
    ADD CONSTRAINT caja_pkey PRIMARY KEY (idcaja);


--
-- Name: cliente_archivo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_archivo
    ADD CONSTRAINT cliente_archivo_pkey PRIMARY KEY (idcliente_archivo);


--
-- Name: cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_pkey PRIMARY KEY (idcliente);


--
-- Name: cliente_referencia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_referencia
    ADD CONSTRAINT cliente_referencia_pkey PRIMARY KEY (idcliente_referencia);


--
-- Name: configuracion_financiera_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_financiera
    ADD CONSTRAINT configuracion_financiera_pkey PRIMARY KEY (idconfiguracion_financiera);


--
-- Name: cuota_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuota
    ADD CONSTRAINT cuota_pkey PRIMARY KEY (idcuota);


--
-- Name: evento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento
    ADD CONSTRAINT evento_pkey PRIMARY KEY (idevento);


--
-- Name: forma_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forma_pago
    ADD CONSTRAINT forma_pago_pkey PRIMARY KEY (idforma_pago);


--
-- Name: garantia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantia
    ADD CONSTRAINT garantia_pkey PRIMARY KEY (idgarantia);


--
-- Name: gasto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gasto
    ADD CONSTRAINT gasto_pkey PRIMARY KEY (idgasto);


--
-- Name: gasto_tipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gasto_tipo
    ADD CONSTRAINT gasto_tipo_pkey PRIMARY KEY (idgasto_tipo);


--
-- Name: movimiento_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_caja
    ADD CONSTRAINT movimiento_caja_pkey PRIMARY KEY (idmovimiento_caja);


--
-- Name: operacion_financiera_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operacion_financiera
    ADD CONSTRAINT operacion_financiera_pkey PRIMARY KEY (idoperacion_financiera);


--
-- Name: operacion_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operacion_usuario
    ADD CONSTRAINT operacion_usuario_pkey PRIMARY KEY (idoperacion_usuario);


--
-- Name: pago_aplicacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago_aplicacion
    ADD CONSTRAINT pago_aplicacion_pkey PRIMARY KEY (idpago_aplicacion);


--
-- Name: pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_pkey PRIMARY KEY (idpago);


--
-- Name: plan_pago_dia_mes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago_dia_mes
    ADD CONSTRAINT plan_pago_dia_mes_pkey PRIMARY KEY (idplan_pago_dia_mes);


--
-- Name: plan_pago_dia_semana_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago_dia_semana
    ADD CONSTRAINT plan_pago_dia_semana_pkey PRIMARY KEY (idplan_pago_dia_semana);


--
-- Name: plan_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago
    ADD CONSTRAINT plan_pago_pkey PRIMARY KEY (idplan_pago);


--
-- Name: prestamo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo
    ADD CONSTRAINT prestamo_pkey PRIMARY KEY (idprestamo);


--
-- Name: producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT producto_pkey PRIMARY KEY (idproducto);


--
-- Name: propietario_banco_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propietario_banco
    ADD CONSTRAINT propietario_banco_pkey PRIMARY KEY (idpropietario_banco);


--
-- Name: propietario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propietario
    ADD CONSTRAINT propietario_pkey PRIMARY KEY (idpropietario);


--
-- Name: rol_evento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_evento
    ADD CONSTRAINT rol_evento_pkey PRIMARY KEY (idrol_evento);


--
-- Name: rol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_pkey PRIMARY KEY (idrol);


--
-- Name: uq_banco_codigo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banco
    ADD CONSTRAINT uq_banco_codigo UNIQUE (codigo);


--
-- Name: uq_banco_nombre; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banco
    ADD CONSTRAINT uq_banco_nombre UNIQUE (nombre);


--
-- Name: uq_caja_fecha; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja
    ADD CONSTRAINT uq_caja_fecha UNIQUE (fecha);


--
-- Name: uq_cliente_archivo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_archivo
    ADD CONSTRAINT uq_cliente_archivo UNIQUE (fk_idcliente, fk_idarchivo);


--
-- Name: uq_cliente_cedula; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT uq_cliente_cedula UNIQUE (cedula);


--
-- Name: uq_cliente_referencia_posicion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_referencia
    ADD CONSTRAINT uq_cliente_referencia_posicion UNIQUE (fk_idcliente, posicion);


--
-- Name: uq_cliente_ruc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT uq_cliente_ruc UNIQUE (ruc);


--
-- Name: uq_cuota_numero; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuota
    ADD CONSTRAINT uq_cuota_numero UNIQUE (fk_idoperacion_financiera, numero);


--
-- Name: uq_evento_codigo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento
    ADD CONSTRAINT uq_evento_codigo UNIQUE (codigo);


--
-- Name: uq_forma_pago_codigo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forma_pago
    ADD CONSTRAINT uq_forma_pago_codigo UNIQUE (codigo);


--
-- Name: uq_forma_pago_nombre; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forma_pago
    ADD CONSTRAINT uq_forma_pago_nombre UNIQUE (nombre);


--
-- Name: uq_garantia_prestamo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantia
    ADD CONSTRAINT uq_garantia_prestamo UNIQUE (fk_idprestamo);


--
-- Name: uq_gasto_tipo_nombre; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gasto_tipo
    ADD CONSTRAINT uq_gasto_tipo_nombre UNIQUE (nombre);


--
-- Name: uq_operacion_usuario; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operacion_usuario
    ADD CONSTRAINT uq_operacion_usuario UNIQUE (fk_idoperacion_financiera, fk_idusuario);


--
-- Name: uq_pago_aplicacion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago_aplicacion
    ADD CONSTRAINT uq_pago_aplicacion UNIQUE (fk_idpago, fk_idcuota);


--
-- Name: uq_plan_pago_dia_mes; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago_dia_mes
    ADD CONSTRAINT uq_plan_pago_dia_mes UNIQUE (fk_idplan_pago, dia_mes);


--
-- Name: uq_plan_pago_dia_semana; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago_dia_semana
    ADD CONSTRAINT uq_plan_pago_dia_semana UNIQUE (fk_idplan_pago, dia_semana);


--
-- Name: uq_plan_pago_operacion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago
    ADD CONSTRAINT uq_plan_pago_operacion UNIQUE (fk_idoperacion_financiera);


--
-- Name: uq_prestamo_operacion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo
    ADD CONSTRAINT uq_prestamo_operacion UNIQUE (fk_idoperacion_financiera);


--
-- Name: uq_producto_codigo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT uq_producto_codigo UNIQUE (codigo);


--
-- Name: uq_propietario_banco_cuenta; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propietario_banco
    ADD CONSTRAINT uq_propietario_banco_cuenta UNIQUE (fk_idbanco, numero_cuenta);


--
-- Name: uq_propietario_cedula; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propietario
    ADD CONSTRAINT uq_propietario_cedula UNIQUE (cedula);


--
-- Name: uq_rol_evento; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_evento
    ADD CONSTRAINT uq_rol_evento UNIQUE (fk_idrol, fk_idevento);


--
-- Name: uq_rol_nombre; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT uq_rol_nombre UNIQUE (nombre);


--
-- Name: uq_usuario_cedula; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT uq_usuario_cedula UNIQUE (cedula);


--
-- Name: uq_venta_financiada_operacion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_financiada
    ADD CONSTRAINT uq_venta_financiada_operacion UNIQUE (fk_idoperacion_financiera);


--
-- Name: usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (idusuario);


--
-- Name: venta_financiada_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_financiada
    ADD CONSTRAINT venta_financiada_pkey PRIMARY KEY (idventa_financiada);


--
-- Name: ix_archivo_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_archivo_hash ON public.archivo USING btree (hash_archivo) WHERE (hash_archivo IS NOT NULL);


--
-- Name: ix_cliente_archivo_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cliente_archivo_cliente ON public.cliente_archivo USING btree (fk_idcliente);


--
-- Name: ix_cliente_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cliente_nombre ON public.cliente USING btree (nombre_completo);


--
-- Name: ix_cliente_referencia_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cliente_referencia_cliente ON public.cliente_referencia USING btree (fk_idcliente);


--
-- Name: ix_cliente_telefono1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cliente_telefono1 ON public.cliente USING btree (telefono1);


--
-- Name: ix_cuota_estado_vencimiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cuota_estado_vencimiento ON public.cuota USING btree (estado, fecha_vencimiento);


--
-- Name: ix_cuota_operacion_vencimiento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_cuota_operacion_vencimiento ON public.cuota USING btree (fk_idoperacion_financiera, fecha_vencimiento, numero);


--
-- Name: ix_garantia_usuario_tasador; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_garantia_usuario_tasador ON public.garantia USING btree (fk_idusuario_tasador);


--
-- Name: ix_gasto_tipo_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_gasto_tipo_fecha ON public.gasto USING btree (fk_idgasto_tipo, fecha);


--
-- Name: ix_movimiento_caja_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_movimiento_caja_fecha ON public.movimiento_caja USING btree (fk_idcaja, fecha_movimiento);


--
-- Name: ix_movimiento_caja_gasto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_movimiento_caja_gasto ON public.movimiento_caja USING btree (fk_idgasto);


--
-- Name: ix_movimiento_caja_pago; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_movimiento_caja_pago ON public.movimiento_caja USING btree (fk_idpago);


--
-- Name: ix_movimiento_caja_prestamo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_movimiento_caja_prestamo ON public.movimiento_caja USING btree (fk_idprestamo);


--
-- Name: ix_operacion_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_operacion_cliente ON public.operacion_financiera USING btree (fk_idcliente);


--
-- Name: ix_operacion_fecha_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_operacion_fecha_estado ON public.operacion_financiera USING btree (fecha_inicio, estado);


--
-- Name: ix_operacion_usuario_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_operacion_usuario_usuario ON public.operacion_usuario USING btree (fk_idusuario);


--
-- Name: ix_pago_aplicacion_cuota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pago_aplicacion_cuota ON public.pago_aplicacion USING btree (fk_idcuota);


--
-- Name: ix_pago_forma_pago; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pago_forma_pago ON public.pago USING btree (fk_idforma_pago);


--
-- Name: ix_pago_operacion_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pago_operacion_fecha ON public.pago USING btree (fk_idoperacion_financiera, fecha_pago);


--
-- Name: ix_plan_pago_dia_mes_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_plan_pago_dia_mes_plan ON public.plan_pago_dia_mes USING btree (fk_idplan_pago);


--
-- Name: ix_plan_pago_dia_semana_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_plan_pago_dia_semana_plan ON public.plan_pago_dia_semana USING btree (fk_idplan_pago);


--
-- Name: ix_prestamo_creado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_prestamo_creado_por ON public.prestamo USING btree (creado_por);


--
-- Name: ix_producto_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_producto_nombre ON public.producto USING btree (nombre);


--
-- Name: ix_propietario_banco_banco; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_propietario_banco_banco ON public.propietario_banco USING btree (fk_idbanco);


--
-- Name: ix_rol_evento_evento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_rol_evento_evento ON public.rol_evento USING btree (fk_idevento);


--
-- Name: ix_venta_financiada_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_venta_financiada_producto ON public.venta_financiada USING btree (fk_idproducto);


--
-- Name: uq_configuracion_financiera_activa; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_configuracion_financiera_activa ON public.configuracion_financiera USING btree (activo) WHERE (activo = true);


--
-- Name: uq_movimiento_caja_gasto; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_movimiento_caja_gasto ON public.movimiento_caja USING btree (fk_idgasto) WHERE (fk_idgasto IS NOT NULL);


--
-- Name: uq_movimiento_caja_pago; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_movimiento_caja_pago ON public.movimiento_caja USING btree (fk_idpago) WHERE (fk_idpago IS NOT NULL);


--
-- Name: uq_movimiento_caja_prestamo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_movimiento_caja_prestamo ON public.movimiento_caja USING btree (fk_idprestamo) WHERE (fk_idprestamo IS NOT NULL);


--
-- Name: uq_propietario_banco_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_propietario_banco_activo ON public.propietario_banco USING btree (fk_idpropietario) WHERE (activo = true);


--
-- Name: uq_usuario_email_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_usuario_email_lower ON public.usuario USING btree (lower((email)::text)) WHERE (email IS NOT NULL);


--
-- Name: uq_usuario_login_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_usuario_login_lower ON public.usuario USING btree (lower((login)::text));


--
-- Name: fk_archivo_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivo
    ADD CONSTRAINT fk_archivo_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_banco_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banco
    ADD CONSTRAINT fk_banco_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_caja_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caja
    ADD CONSTRAINT fk_caja_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_cliente_archivo_archivo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_archivo
    ADD CONSTRAINT fk_cliente_archivo_archivo FOREIGN KEY (fk_idarchivo) REFERENCES public.archivo(idarchivo);


--
-- Name: fk_cliente_archivo_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_archivo
    ADD CONSTRAINT fk_cliente_archivo_cliente FOREIGN KEY (fk_idcliente) REFERENCES public.cliente(idcliente);


--
-- Name: fk_cliente_archivo_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_archivo
    ADD CONSTRAINT fk_cliente_archivo_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_cliente_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT fk_cliente_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_cliente_referencia_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_referencia
    ADD CONSTRAINT fk_cliente_referencia_cliente FOREIGN KEY (fk_idcliente) REFERENCES public.cliente(idcliente);


--
-- Name: fk_cliente_referencia_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_referencia
    ADD CONSTRAINT fk_cliente_referencia_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_configuracion_financiera_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_financiera
    ADD CONSTRAINT fk_configuracion_financiera_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_cuota_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuota
    ADD CONSTRAINT fk_cuota_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_cuota_operacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuota
    ADD CONSTRAINT fk_cuota_operacion FOREIGN KEY (fk_idoperacion_financiera) REFERENCES public.operacion_financiera(idoperacion_financiera);


--
-- Name: fk_evento_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evento
    ADD CONSTRAINT fk_evento_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_forma_pago_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forma_pago
    ADD CONSTRAINT fk_forma_pago_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_garantia_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantia
    ADD CONSTRAINT fk_garantia_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_garantia_prestamo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantia
    ADD CONSTRAINT fk_garantia_prestamo FOREIGN KEY (fk_idprestamo) REFERENCES public.prestamo(idprestamo);


--
-- Name: fk_garantia_usuario_tasador; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garantia
    ADD CONSTRAINT fk_garantia_usuario_tasador FOREIGN KEY (fk_idusuario_tasador) REFERENCES public.usuario(idusuario);


--
-- Name: fk_gasto_archivo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gasto
    ADD CONSTRAINT fk_gasto_archivo FOREIGN KEY (fk_idarchivo) REFERENCES public.archivo(idarchivo);


--
-- Name: fk_gasto_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gasto
    ADD CONSTRAINT fk_gasto_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_gasto_gasto_tipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gasto
    ADD CONSTRAINT fk_gasto_gasto_tipo FOREIGN KEY (fk_idgasto_tipo) REFERENCES public.gasto_tipo(idgasto_tipo);


--
-- Name: fk_gasto_tipo_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gasto_tipo
    ADD CONSTRAINT fk_gasto_tipo_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_movimiento_caja_caja; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_caja
    ADD CONSTRAINT fk_movimiento_caja_caja FOREIGN KEY (fk_idcaja) REFERENCES public.caja(idcaja);


--
-- Name: fk_movimiento_caja_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_caja
    ADD CONSTRAINT fk_movimiento_caja_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_movimiento_caja_gasto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_caja
    ADD CONSTRAINT fk_movimiento_caja_gasto FOREIGN KEY (fk_idgasto) REFERENCES public.gasto(idgasto);


--
-- Name: fk_movimiento_caja_pago; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_caja
    ADD CONSTRAINT fk_movimiento_caja_pago FOREIGN KEY (fk_idpago) REFERENCES public.pago(idpago);


--
-- Name: fk_movimiento_caja_prestamo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_caja
    ADD CONSTRAINT fk_movimiento_caja_prestamo FOREIGN KEY (fk_idprestamo) REFERENCES public.prestamo(idprestamo);


--
-- Name: fk_operacion_financiera_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operacion_financiera
    ADD CONSTRAINT fk_operacion_financiera_cliente FOREIGN KEY (fk_idcliente) REFERENCES public.cliente(idcliente);


--
-- Name: fk_operacion_financiera_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operacion_financiera
    ADD CONSTRAINT fk_operacion_financiera_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_operacion_usuario_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operacion_usuario
    ADD CONSTRAINT fk_operacion_usuario_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_operacion_usuario_operacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operacion_usuario
    ADD CONSTRAINT fk_operacion_usuario_operacion FOREIGN KEY (fk_idoperacion_financiera) REFERENCES public.operacion_financiera(idoperacion_financiera);


--
-- Name: fk_operacion_usuario_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operacion_usuario
    ADD CONSTRAINT fk_operacion_usuario_usuario FOREIGN KEY (fk_idusuario) REFERENCES public.usuario(idusuario);


--
-- Name: fk_pago_aplicacion_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago_aplicacion
    ADD CONSTRAINT fk_pago_aplicacion_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_pago_aplicacion_cuota; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago_aplicacion
    ADD CONSTRAINT fk_pago_aplicacion_cuota FOREIGN KEY (fk_idcuota) REFERENCES public.cuota(idcuota);


--
-- Name: fk_pago_aplicacion_pago; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago_aplicacion
    ADD CONSTRAINT fk_pago_aplicacion_pago FOREIGN KEY (fk_idpago) REFERENCES public.pago(idpago);


--
-- Name: fk_pago_archivo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT fk_pago_archivo FOREIGN KEY (fk_idarchivo) REFERENCES public.archivo(idarchivo);


--
-- Name: fk_pago_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT fk_pago_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_pago_forma_pago; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT fk_pago_forma_pago FOREIGN KEY (fk_idforma_pago) REFERENCES public.forma_pago(idforma_pago);


--
-- Name: fk_pago_operacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT fk_pago_operacion FOREIGN KEY (fk_idoperacion_financiera) REFERENCES public.operacion_financiera(idoperacion_financiera);


--
-- Name: fk_plan_pago_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago
    ADD CONSTRAINT fk_plan_pago_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_plan_pago_dia_mes_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago_dia_mes
    ADD CONSTRAINT fk_plan_pago_dia_mes_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_plan_pago_dia_mes_plan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago_dia_mes
    ADD CONSTRAINT fk_plan_pago_dia_mes_plan FOREIGN KEY (fk_idplan_pago) REFERENCES public.plan_pago(idplan_pago);


--
-- Name: fk_plan_pago_dia_semana_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago_dia_semana
    ADD CONSTRAINT fk_plan_pago_dia_semana_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_plan_pago_dia_semana_plan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago_dia_semana
    ADD CONSTRAINT fk_plan_pago_dia_semana_plan FOREIGN KEY (fk_idplan_pago) REFERENCES public.plan_pago(idplan_pago);


--
-- Name: fk_plan_pago_operacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_pago
    ADD CONSTRAINT fk_plan_pago_operacion FOREIGN KEY (fk_idoperacion_financiera) REFERENCES public.operacion_financiera(idoperacion_financiera);


--
-- Name: fk_prestamo_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo
    ADD CONSTRAINT fk_prestamo_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_prestamo_operacion_financiera; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamo
    ADD CONSTRAINT fk_prestamo_operacion_financiera FOREIGN KEY (fk_idoperacion_financiera) REFERENCES public.operacion_financiera(idoperacion_financiera);


--
-- Name: fk_producto_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT fk_producto_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_propietario_banco_banco; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propietario_banco
    ADD CONSTRAINT fk_propietario_banco_banco FOREIGN KEY (fk_idbanco) REFERENCES public.banco(idbanco);


--
-- Name: fk_propietario_banco_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propietario_banco
    ADD CONSTRAINT fk_propietario_banco_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_propietario_banco_propietario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propietario_banco
    ADD CONSTRAINT fk_propietario_banco_propietario FOREIGN KEY (fk_idpropietario) REFERENCES public.propietario(idpropietario);


--
-- Name: fk_propietario_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.propietario
    ADD CONSTRAINT fk_propietario_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_rol_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT fk_rol_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: fk_rol_evento_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_evento
    ADD CONSTRAINT fk_rol_evento_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_rol_evento_evento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_evento
    ADD CONSTRAINT fk_rol_evento_evento FOREIGN KEY (fk_idevento) REFERENCES public.evento(idevento);


--
-- Name: fk_rol_evento_rol; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rol_evento
    ADD CONSTRAINT fk_rol_evento_rol FOREIGN KEY (fk_idrol) REFERENCES public.rol(idrol);


--
-- Name: fk_usuario_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT fk_usuario_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_usuario_rol; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT fk_usuario_rol FOREIGN KEY (fk_idrol) REFERENCES public.rol(idrol);


--
-- Name: fk_venta_financiada_creado_por; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_financiada
    ADD CONSTRAINT fk_venta_financiada_creado_por FOREIGN KEY (creado_por) REFERENCES public.usuario(idusuario);


--
-- Name: fk_venta_financiada_operacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_financiada
    ADD CONSTRAINT fk_venta_financiada_operacion FOREIGN KEY (fk_idoperacion_financiera) REFERENCES public.operacion_financiera(idoperacion_financiera);


--
-- Name: fk_venta_financiada_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.venta_financiada
    ADD CONSTRAINT fk_venta_financiada_producto FOREIGN KEY (fk_idproducto) REFERENCES public.producto(idproducto);


--
-- PostgreSQL database dump complete
--

