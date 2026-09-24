BEGIN;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gasto' AND column_name = 'estado') THEN
        ALTER TABLE gasto ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'EMITIDO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gasto' AND column_name = 'fecha_anulacion') THEN
        ALTER TABLE gasto ADD COLUMN fecha_anulacion TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gasto' AND column_name = 'anulado_por') THEN
        ALTER TABLE gasto ADD COLUMN anulado_por INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gasto' AND column_name = 'motivo_anulacion') THEN
        ALTER TABLE gasto ADD COLUMN motivo_anulacion TEXT;
    END IF;
END $$;

UPDATE gasto SET estado = 'EMITIDO' WHERE estado IS NULL OR estado = '';

ALTER TABLE gasto
    DROP CONSTRAINT IF EXISTS ck_gasto_monto,
    DROP CONSTRAINT IF EXISTS ck_gasto_estado,
    ADD CONSTRAINT ck_gasto_monto CHECK (monto > 0 OR (monto = 0 AND estado = 'ANULADO')),
    ADD CONSTRAINT ck_gasto_estado CHECK (estado IN ('EMITIDO', 'ANULADO'));

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_gasto_anulado_por'
    ) THEN
        ALTER TABLE gasto ADD CONSTRAINT fk_gasto_anulado_por
            FOREIGN KEY (anulado_por) REFERENCES usuario (idusuario);
    END IF;
END $$;

ALTER TABLE movimiento_caja
    DROP CONSTRAINT IF EXISTS ck_movimiento_caja_monto,
    ADD CONSTRAINT ck_movimiento_caja_monto
        CHECK (monto > 0 OR (monto = 0 AND fk_idgasto IS NOT NULL));

CREATE INDEX IF NOT EXISTS ix_gasto_estado_fecha ON gasto (estado, fecha);

COMMIT;
