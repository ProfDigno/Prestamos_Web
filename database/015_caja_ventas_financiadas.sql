BEGIN;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'movimiento_caja' AND column_name = 'fk_idventa_financiada'
    ) THEN
        ALTER TABLE movimiento_caja ADD COLUMN fk_idventa_financiada INTEGER;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_movimiento_caja_venta_financiada'
    ) THEN
        ALTER TABLE movimiento_caja
            ADD CONSTRAINT fk_movimiento_caja_venta_financiada
            FOREIGN KEY (fk_idventa_financiada) REFERENCES venta_financiada (idventa_financiada);
    END IF;
END $$;

ALTER TABLE movimiento_caja
    DROP CONSTRAINT IF EXISTS ck_movimiento_caja_origen,
    DROP CONSTRAINT IF EXISTS ck_movimiento_caja_tipo_origen,
    ADD CONSTRAINT ck_movimiento_caja_origen CHECK (
        (CASE WHEN fk_idprestamo IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN fk_idpago IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN fk_idgasto IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN fk_iddescuento_operacion IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN fk_idventa_financiada IS NOT NULL THEN 1 ELSE 0 END) = 1
    ),
    ADD CONSTRAINT ck_movimiento_caja_tipo_origen CHECK (
        (fk_idpago IS NOT NULL AND tipo = 'INGRESO')
        OR
        ((fk_idprestamo IS NOT NULL OR fk_idgasto IS NOT NULL OR fk_iddescuento_operacion IS NOT NULL OR fk_idventa_financiada IS NOT NULL) AND tipo = 'EGRESO')
    );

CREATE INDEX IF NOT EXISTS ix_movimiento_caja_venta_financiada
    ON movimiento_caja (fk_idventa_financiada);
CREATE UNIQUE INDEX IF NOT EXISTS uq_movimiento_caja_venta_financiada
    ON movimiento_caja (fk_idventa_financiada)
    WHERE fk_idventa_financiada IS NOT NULL;

COMMIT;
