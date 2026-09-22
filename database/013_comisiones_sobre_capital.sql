BEGIN;

UPDATE operacion_corredor oc
SET monto_comision = ROUND(o.monto_capital * oc.porcentaje_comision / 100, 2)
FROM operacion_financiera o
WHERE o.idoperacion_financiera = oc.fk_idoperacion_financiera;

COMMIT;
