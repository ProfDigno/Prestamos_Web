BEGIN;
ALTER TABLE configuracion_financiera ALTER COLUMN interes_minimo TYPE NUMERIC(9,0) USING ROUND(interes_minimo);
ALTER TABLE cliente ALTER COLUMN tasa_interes_sugerida TYPE NUMERIC(9,0) USING ROUND(tasa_interes_sugerida);
ALTER TABLE operacion_financiera ALTER COLUMN porcentaje_interes TYPE NUMERIC(9,0) USING ROUND(porcentaje_interes);
COMMIT;
