BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='cuota' AND column_name='fecha_pago_interes'
  ) THEN
    ALTER TABLE cuota ADD COLUMN fecha_pago_interes TIMESTAMP NULL;
  END IF;
END $$;
COMMIT;
