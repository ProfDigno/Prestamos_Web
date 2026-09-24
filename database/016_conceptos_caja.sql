BEGIN;

UPDATE movimiento_caja mc
SET concepto = LEFT('Desembolso de préstamo - ' || c.nombre_completo, 250)
FROM prestamo p
JOIN operacion_financiera o ON o.idoperacion_financiera = p.fk_idoperacion_financiera
JOIN cliente c ON c.idcliente = o.fk_idcliente
WHERE mc.fk_idprestamo = p.idprestamo
  AND mc.concepto = 'Desembolso de préstamo';

UPDATE movimiento_caja mc
SET concepto = LEFT('Venta financiada - ' || c.nombre_completo, 250)
FROM venta_financiada v
JOIN operacion_financiera o ON o.idoperacion_financiera = v.fk_idoperacion_financiera
JOIN cliente c ON c.idcliente = o.fk_idcliente
WHERE mc.fk_idventa_financiada = v.idventa_financiada
  AND mc.concepto = 'Venta financiada';

UPDATE movimiento_caja mc
SET concepto = LEFT(
    CASE WHEN mc.concepto LIKE 'ANULADO:%'
        THEN 'ANULADO: Gasto - ' || gt.nombre || ' - ' || g.concepto
        ELSE 'Gasto - ' || gt.nombre || ' - ' || g.concepto
    END, 250)
FROM gasto g
JOIN gasto_tipo gt ON gt.idgasto_tipo = g.fk_idgasto_tipo
WHERE mc.fk_idgasto = g.idgasto
  AND (mc.concepto = g.concepto OR mc.concepto = 'ANULADO: ' || g.concepto);

COMMIT;
