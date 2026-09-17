BEGIN;

ALTER TABLE movimiento_caja
  DROP CONSTRAINT IF EXISTS ck_movimiento_caja_origen,
  DROP CONSTRAINT IF EXISTS ck_movimiento_caja_tipo_origen;

ALTER TABLE movimiento_caja
  ADD CONSTRAINT ck_movimiento_caja_origen CHECK (
    (CASE WHEN fk_idprestamo IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN fk_idpago IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN fk_idgasto IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN fk_iddescuento_operacion IS NOT NULL THEN 1 ELSE 0 END) = 1
  ),
  ADD CONSTRAINT ck_movimiento_caja_tipo_origen CHECK (
    (fk_idpago IS NOT NULL AND tipo = 'INGRESO')
    OR
    ((fk_idprestamo IS NOT NULL OR fk_idgasto IS NOT NULL OR fk_iddescuento_operacion IS NOT NULL) AND tipo = 'EGRESO')
  );

COMMIT;
