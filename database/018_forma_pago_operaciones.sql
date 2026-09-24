BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prestamo' AND column_name='fk_idforma_pago') THEN
    ALTER TABLE prestamo ADD COLUMN fk_idforma_pago INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='venta_financiada' AND column_name='fk_idforma_pago') THEN
    ALTER TABLE venta_financiada ADD COLUMN fk_idforma_pago INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='gasto' AND column_name='fk_idforma_pago') THEN
    ALTER TABLE gasto ADD COLUMN fk_idforma_pago INTEGER;
  END IF;
END $$;

DO $$
DECLARE efectivo_id INTEGER;
BEGIN
  SELECT idforma_pago INTO efectivo_id FROM forma_pago WHERE codigo='EFECTIVO' LIMIT 1;
  IF efectivo_id IS NULL THEN
    RAISE EXCEPTION 'No existe la forma de pago EFECTIVO para completar los registros existentes';
  END IF;
  UPDATE prestamo SET fk_idforma_pago=efectivo_id WHERE fk_idforma_pago IS NULL;
  UPDATE venta_financiada SET fk_idforma_pago=efectivo_id WHERE fk_idforma_pago IS NULL;
  UPDATE gasto SET fk_idforma_pago=efectivo_id WHERE fk_idforma_pago IS NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_prestamo_forma_pago') THEN
    ALTER TABLE prestamo ADD CONSTRAINT fk_prestamo_forma_pago FOREIGN KEY (fk_idforma_pago) REFERENCES forma_pago(idforma_pago);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_venta_financiada_forma_pago') THEN
    ALTER TABLE venta_financiada ADD CONSTRAINT fk_venta_financiada_forma_pago FOREIGN KEY (fk_idforma_pago) REFERENCES forma_pago(idforma_pago);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_gasto_forma_pago') THEN
    ALTER TABLE gasto ADD CONSTRAINT fk_gasto_forma_pago FOREIGN KEY (fk_idforma_pago) REFERENCES forma_pago(idforma_pago);
  END IF;
END $$;

ALTER TABLE prestamo ALTER COLUMN fk_idforma_pago SET NOT NULL;
ALTER TABLE venta_financiada ALTER COLUMN fk_idforma_pago SET NOT NULL;
ALTER TABLE gasto ALTER COLUMN fk_idforma_pago SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_prestamo_forma_pago ON prestamo(fk_idforma_pago);
CREATE INDEX IF NOT EXISTS ix_venta_financiada_forma_pago ON venta_financiada(fk_idforma_pago);
CREATE INDEX IF NOT EXISTS ix_gasto_forma_pago ON gasto(fk_idforma_pago);

COMMIT;
