# Edición de préstamos

Aplicar `019_edicion_prestamos.sql` después de las migraciones 001–018, antes de habilitar la nueva interfaz. La aplicación consulta la disponibilidad de la migración y oculta los botones hasta que esté instalada.

Desde la raíz: `npm run db:migrate-loan-editing -w server`. Este comando realiza un respaldo completo con `pg_dump` en `database/backups/` y después aplica la migración en una transacción. Si `pg_dump` no está en PATH, establecer `PG_DUMP_PATH` con su ubicación. Se usa la conexión de `server/.env`; no modifica préstamos existentes.

La edición utiliza el permiso `PRESTAMO_CREAR`. El estado `EDITADO` pertenece a `operacion_financiera`; tanto esa operación como su préstamo quedan inactivos. Las tablas `prestamo_reemplazo`, `pago_reemplazo` y `descuento_reemplazo` conservan la cadena de originales y copias. Los pagos mantienen sus fechas y archivos, pero reciben identificadores nuevos.

El desembolso conserva caja y fecha; cambia el capital, cliente y forma de pago según la edición. Los cobros y descuentos mantienen importes, fechas y cajas y se vinculan a los registros nuevos. Un préstamo sin un único desembolso activo requiere corregir su inconsistencia antes de editar.

Los pagos confirmados se redistribuyen por fecha e identificador entre cuotas ordenadas por vencimiento y número, cubriendo interés antes que capital. Luego se distribuyen descuentos al saldo pendiente con el mismo orden. El nuevo total debe cubrir ambos; la igualdad deja el préstamo pagado. Al volver a cobrar, los descuentos reducen primero interés y luego capital pendiente.

## Verificación aislada

En PowerShell, establecer `$env:RUN_DB_TESTS='1'` y ejecutar `node node_modules/vitest/vitest.mjs run server/src/loanReplacement.integration.test.ts --maxWorkers=1 --pool=threads` desde la raíz. La cuenta de PostgreSQL debe poder crear bases. La prueba crea una base vacía `prestamos_test_replacement_<pid>`, aplica todas las migraciones y elimina únicamente esa base al terminar. Nunca usa los préstamos de la base configurada.

Si falla el despliegue, volver al código anterior solamente antes de que haya reemplazos, o restaurar el respaldo en una base separada para verificarlo primero. No eliminar las tablas de auditoría ni reactivar originales con reemplazos existentes.
