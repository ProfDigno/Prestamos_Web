# Actualización a 1.1.0

Esta actualización requiere PostgreSQL 9.5 o posterior y una instalación con las migraciones `001` a `013` aplicadas. Los SQL `014` a `018` se ejecutan en ese orden. Cada archivo contiene su propia transacción y puede repetirse si una instalación ya tiene parte de los cambios.

Antes de comenzar, detenga la aplicación y cree un respaldo de la base. Con las herramientas de PostgreSQL 9.5 y desde la raíz del proyecto:

```powershell
$pg = 'C:\Program Files\PostgreSQL\9.5\bin'
$respaldo = 'database\backups\bdprestamo_1_pre_1.1.0_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.backup'
& "$pg\pg_dump.exe" -h 127.0.0.1 -p 5432 -U postgres -Fc -f $respaldo bdprestamo_1
if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el respaldo' }
& "$pg\pg_restore.exe" -l $respaldo | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer el respaldo' }
```

Compruebe que `pg_dump` termina sin error y que el respaldo tiene contenido. Pruébelo en una base temporal antes de modificar la base principal:

```powershell
$prueba = 'bdprestamo_1_prueba_110_' + (Get-Date -Format 'yyyyMMddHHmmss')
& "$pg\createdb.exe" -h 127.0.0.1 -p 5432 -U postgres $prueba
if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear la base de prueba' }
& "$pg\pg_restore.exe" -h 127.0.0.1 -p 5432 -U postgres -d $prueba --exit-on-error $respaldo
if ($LASTEXITCODE -ne 0) { throw 'No se pudo restaurar el respaldo' }
foreach ($numero in 14..18) {
  $archivo = Get-ChildItem database -Filter ("{0:D3}_*.sql" -f $numero) | Select-Object -First 1
  if (!$archivo) { throw "Falta la migración $numero" }
  & "$pg\psql.exe" -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d $prueba -f $archivo.FullName
  if ($LASTEXITCODE -ne 0) { throw "Falló la migración $($archivo.Name)" }
}
```

Si la restauración y las cinco migraciones terminan correctamente, repita el bloque `foreach` con `-d bdprestamo_1`. No ejecute las migraciones restantes después de un error. Compruebe el esquema y los datos con estas consultas en la base actualizada:

```sql
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public' AND
 ((table_name='gasto' AND column_name IN ('estado','fecha_anulacion','fk_idforma_pago'))
  OR (table_name='movimiento_caja' AND column_name IN ('fk_idventa_financiada','fk_iddescuento_operacion')))
ORDER BY table_name,column_name;

SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conname IN ('ck_gasto_estado','ck_movimiento_caja_origen','ck_movimiento_caja_tipo_origen','fk_gasto_forma_pago')
ORDER BY conname;

SELECT estado, count(*) AS gastos FROM gasto GROUP BY estado ORDER BY estado;
SELECT count(*) AS descuentos FROM movimiento_caja WHERE fk_iddescuento_operacion IS NOT NULL;
SELECT count(*) AS ventas FROM movimiento_caja WHERE fk_idventa_financiada IS NOT NULL;
```

La restricción `ck_movimiento_caja_origen` debe incluir **préstamo, pago, gasto, descuento y venta financiada**; la restricción de tipo debe admitir descuentos como egresos. Revise en la aplicación la caja, un gasto anulado, las ventas financiadas y las formas de pago. Luego ejecute `npm test`, `npm run build` y reinicie la aplicación.

Los respaldos nuevos dentro de `database/backups/` son locales y se excluyen de Git. Conserve el respaldo hasta verificar la instalación; después puede eliminar la base temporal con `dropdb` indicando exactamente el nombre guardado en `$prueba`.
