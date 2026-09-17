BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cuota' AND column_name='fecha_pago') THEN
    ALTER TABLE cuota ADD COLUMN fecha_pago TIMESTAMP;
  END IF;
END $$;
COMMIT;
