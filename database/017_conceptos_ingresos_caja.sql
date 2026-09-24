BEGIN;

UPDATE movimiento_caja mc
SET concepto = LEFT('Cobro de operación - ' || c.nombre_completo, 250)
FROM pago p
JOIN operacion_financiera o ON o.idoperacion_financiera = p.fk_idoperacion_financiera
JOIN cliente c ON c.idcliente = o.fk_idcliente
WHERE mc.fk_idpago = p.idpago
  AND mc.concepto = 'Cobro de operación';

COMMIT;
