BEGIN;

ALTER TABLE operacion_financiera
  ALTER COLUMN porcentaje_interes TYPE NUMERIC(12,8)
  USING porcentaje_interes;

COMMIT;
