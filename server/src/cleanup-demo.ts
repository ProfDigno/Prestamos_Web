import fs from 'node:fs/promises';
import path from 'node:path';
import { pool, transaction, type DbClient } from './db.js';
import { config } from './config.js';

type CleanupResult = { table: string; deleted: number };

const confirmation = process.env.CONFIRM_CLEANUP_DEMO === 'SI';

async function count(db: DbClient, sql: string, params: unknown[] = []): Promise<number> {
  const result = await db.query(sql, params);
  return Number(result.rows[0]?.count ?? 0);
}

async function identify(db: DbClient) {
  await db.query(`
    CREATE TEMP TABLE demo_client_ids ON COMMIT DROP AS
      SELECT idcliente
      FROM cliente
      WHERE email LIKE '%@demo.local'
        AND cedula IN ('3000001','3000002','3000003','3000004','3000005','3000006')
  `);
  await db.query(`
    CREATE TEMP TABLE demo_operation_ids ON COMMIT DROP AS
      SELECT idoperacion_financiera
      FROM operacion_financiera
      WHERE observacion = 'Operación de demostración'
         OR fk_idcliente IN (SELECT idcliente FROM demo_client_ids)
  `);
  await db.query(`
    CREATE TEMP TABLE demo_loan_ids ON COMMIT DROP AS
      SELECT idprestamo
      FROM prestamo
      WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)
  `);
  await db.query(`
    CREATE TEMP TABLE demo_payment_ids ON COMMIT DROP AS
      SELECT idpago
      FROM pago
      WHERE referencia = 'DEMO'
         OR fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)
  `);
  await db.query(`
    CREATE TEMP TABLE demo_expense_ids ON COMMIT DROP AS
      SELECT idgasto
      FROM gasto
      WHERE observacion = 'Gasto demo'
  `);
  await db.query(`
    CREATE TEMP TABLE demo_archive_ids ON COMMIT DROP AS
      SELECT DISTINCT idarchivo
      FROM archivo
      WHERE idarchivo IN (SELECT fk_idarchivo FROM cliente_archivo WHERE fk_idcliente IN (SELECT idcliente FROM demo_client_ids))
         OR idarchivo IN (SELECT fk_idarchivo FROM pago WHERE idpago IN (SELECT idpago FROM demo_payment_ids) AND fk_idarchivo IS NOT NULL)
         OR idarchivo IN (SELECT fk_idarchivo FROM gasto WHERE idgasto IN (SELECT idgasto FROM demo_expense_ids) AND fk_idarchivo IS NOT NULL)
  `);
}

async function preview(db: DbClient): Promise<CleanupResult[]> {
  await identify(db);
  const entries: Array<[string, number]> = [
    ['cliente', await count(db, 'SELECT count(*) FROM demo_client_ids')],
    ['cliente_referencia', await count(db, 'SELECT count(*) FROM cliente_referencia WHERE fk_idcliente IN (SELECT idcliente FROM demo_client_ids)')],
    ['cliente_archivo', await count(db, 'SELECT count(*) FROM cliente_archivo WHERE fk_idcliente IN (SELECT idcliente FROM demo_client_ids)')],
    ['operacion_financiera', await count(db, 'SELECT count(*) FROM demo_operation_ids')],
    ['prestamo', await count(db, 'SELECT count(*) FROM demo_loan_ids')],
    ['venta_financiada', await count(db, 'SELECT count(*) FROM venta_financiada WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)')],
    ['garantia', await count(db, 'SELECT count(*) FROM garantia WHERE fk_idprestamo IN (SELECT idprestamo FROM demo_loan_ids)')],
    ['plan_pago', await count(db, 'SELECT count(*) FROM plan_pago WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)')],
    ['cuota', await count(db, 'SELECT count(*) FROM cuota WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)')],
    ['pago', await count(db, 'SELECT count(*) FROM demo_payment_ids')],
    ['pago_aplicacion', await count(db, 'SELECT count(*) FROM pago_aplicacion WHERE fk_idpago IN (SELECT idpago FROM demo_payment_ids)')],
    ['descuento_aplicacion', await count(db, 'SELECT count(*) FROM descuento_aplicacion WHERE fk_iddescuento_operacion IN (SELECT iddescuento_operacion FROM descuento_operacion WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids))')],
    ['descuento_operacion', await count(db, 'SELECT count(*) FROM descuento_operacion WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)')],
    ['movimiento_caja', await count(db, `SELECT count(*) FROM movimiento_caja WHERE fk_idprestamo IN (SELECT idprestamo FROM demo_loan_ids) OR fk_idventa_financiada IN (SELECT idventa_financiada FROM venta_financiada WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)) OR fk_idpago IN (SELECT idpago FROM demo_payment_ids) OR fk_idgasto IN (SELECT idgasto FROM demo_expense_ids) OR fk_iddescuento_operacion IN (SELECT iddescuento_operacion FROM descuento_operacion WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)) OR concepto IN ('Desembolso de préstamo demo','Cobro de cuotas demo')`)],
    ['gasto', await count(db, 'SELECT count(*) FROM demo_expense_ids')],
    ['archivo', await count(db, 'SELECT count(*) FROM demo_archive_ids')],
    ['producto MOTO-001 candidato', await count(db, `SELECT count(*) FROM producto p WHERE p.codigo='MOTO-001' AND NOT EXISTS (SELECT 1 FROM venta_financiada v WHERE v.fk_idproducto=p.idproducto AND v.fk_idoperacion_financiera NOT IN (SELECT idoperacion_financiera FROM demo_operation_ids))`)],
  ];
  return entries.map(([table, deleted]) => ({ table, deleted }));
}

async function cleanup(db: DbClient): Promise<{ results: CleanupResult[]; files: string[] }> {
  await identify(db);
  const files = (await db.query('SELECT ruta FROM archivo WHERE idarchivo IN (SELECT idarchivo FROM demo_archive_ids)')).rows.map(row => String(row.ruta));
  const statements: Array<[string, string]> = [
    ['movimiento_caja', `DELETE FROM movimiento_caja WHERE fk_idprestamo IN (SELECT idprestamo FROM demo_loan_ids) OR fk_idventa_financiada IN (SELECT idventa_financiada FROM venta_financiada WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)) OR fk_idpago IN (SELECT idpago FROM demo_payment_ids) OR fk_idgasto IN (SELECT idgasto FROM demo_expense_ids) OR fk_iddescuento_operacion IN (SELECT iddescuento_operacion FROM descuento_operacion WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)) OR concepto IN ('Desembolso de préstamo demo','Cobro de cuotas demo')`],
    ['descuento_aplicacion', 'DELETE FROM descuento_aplicacion WHERE fk_iddescuento_operacion IN (SELECT iddescuento_operacion FROM descuento_operacion WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids))'],
    ['descuento_operacion', 'DELETE FROM descuento_operacion WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)'],
    ['pago_aplicacion', 'DELETE FROM pago_aplicacion WHERE fk_idpago IN (SELECT idpago FROM demo_payment_ids)'],
    ['pago', 'DELETE FROM pago WHERE idpago IN (SELECT idpago FROM demo_payment_ids)'],
    ['garantia', 'DELETE FROM garantia WHERE fk_idprestamo IN (SELECT idprestamo FROM demo_loan_ids)'],
    ['operacion_usuario', 'DELETE FROM operacion_usuario WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)'],
    ['cuota', 'DELETE FROM cuota WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)'],
    ['plan_pago_dia_semana', 'DELETE FROM plan_pago_dia_semana WHERE fk_idplan_pago IN (SELECT idplan_pago FROM plan_pago WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids))'],
    ['plan_pago_dia_mes', 'DELETE FROM plan_pago_dia_mes WHERE fk_idplan_pago IN (SELECT idplan_pago FROM plan_pago WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids))'],
    ['plan_pago', 'DELETE FROM plan_pago WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)'],
    ['venta_financiada', 'DELETE FROM venta_financiada WHERE fk_idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)'],
    ['prestamo', 'DELETE FROM prestamo WHERE idprestamo IN (SELECT idprestamo FROM demo_loan_ids)'],
    ['operacion_financiera', 'DELETE FROM operacion_financiera WHERE idoperacion_financiera IN (SELECT idoperacion_financiera FROM demo_operation_ids)'],
    ['cliente_archivo', 'DELETE FROM cliente_archivo WHERE fk_idcliente IN (SELECT idcliente FROM demo_client_ids)'],
    ['cliente_referencia', 'DELETE FROM cliente_referencia WHERE fk_idcliente IN (SELECT idcliente FROM demo_client_ids)'],
    ['cliente', 'DELETE FROM cliente WHERE idcliente IN (SELECT idcliente FROM demo_client_ids)'],
    ['gasto', 'DELETE FROM gasto WHERE idgasto IN (SELECT idgasto FROM demo_expense_ids)'],
    ['archivo', 'DELETE FROM archivo WHERE idarchivo IN (SELECT idarchivo FROM demo_archive_ids)'],
    ['producto', `DELETE FROM producto p WHERE p.codigo='MOTO-001' AND NOT EXISTS (SELECT 1 FROM venta_financiada WHERE fk_idproducto=p.idproducto)`,],
  ];
  const results: CleanupResult[] = [];
  for (const [table, sql] of statements) {
    const result = await db.query(sql);
    results.push({ table, deleted: result.rowCount ?? 0 });
  }
  return { results, files };
}

function print(results: CleanupResult[]) {
  for (const result of results) console.log(`${result.table}: ${result.deleted}`);
}

async function main() {
  if (process.argv.includes('--reset-demo')) throw new Error('El reinicio demo fue desactivado.');
  const result = await transaction(async db => confirmation ? cleanup(db) : { results: await preview(db), files: [] });
  if (confirmation) {
    for (const file of result.files) {
      const resolved = path.resolve(file);
      const uploadRoot = path.resolve(config.uploadDir) + path.sep;
      if (resolved.startsWith(uploadRoot)) await fs.rm(resolved, { force: true });
    }
    console.log('Limpieza demo completada.');
  } else {
    console.log('Vista previa. No se modificaron datos. Para ejecutar: CONFIRM_CLEANUP_DEMO=SI npm run db:cleanup-demo');
  }
  print(result.results);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
