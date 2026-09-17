BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cuota' AND column_name = 'fecha_notificado'
  ) THEN
    ALTER TABLE cuota ADD COLUMN fecha_notificado TIMESTAMP NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_cuota_fecha_notificado
  ON cuota (fecha_vencimiento, fecha_notificado);

COMMIT;
