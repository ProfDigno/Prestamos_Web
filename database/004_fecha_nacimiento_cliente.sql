BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cliente' AND column_name='fecha_nacimiento') THEN
    ALTER TABLE cliente ADD COLUMN fecha_nacimiento DATE;
  END IF;
END $$;
COMMIT;
