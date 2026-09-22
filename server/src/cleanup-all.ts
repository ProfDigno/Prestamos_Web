import fs from 'node:fs/promises';
import path from 'node:path';
import { pool, transaction, type DbClient } from './db.js';
import { config } from './config.js';

type CleanupResult = { table: string; deleted: number };

const confirmed = process.env.CONFIRM_CLEANUP_ALL === 'SI';

const targets: Array<[string, string]> = [
  ['movimiento_caja', 'DELETE FROM movimiento_caja'],
  ['pago_aplicacion', 'DELETE FROM pago_aplicacion'],
  ['descuento_aplicacion', 'DELETE FROM descuento_aplicacion'],
  ['pago', 'DELETE FROM pago'],
  ['descuento_operacion', 'DELETE FROM descuento_operacion'],
  ['garantia', 'DELETE FROM garantia'],
  ['operacion_usuario', 'DELETE FROM operacion_usuario'],
  ['cuota', 'DELETE FROM cuota'],
  ['plan_pago_dia_semana', 'DELETE FROM plan_pago_dia_semana'],
  ['plan_pago_dia_mes', 'DELETE FROM plan_pago_dia_mes'],
  ['plan_pago', 'DELETE FROM plan_pago'],
  ['venta_financiada', 'DELETE FROM venta_financiada'],
  ['prestamo', 'DELETE FROM prestamo'],
  ['operacion_financiera', 'DELETE FROM operacion_financiera'],
  ['cliente_archivo', 'DELETE FROM cliente_archivo'],
  ['cliente_referencia', 'DELETE FROM cliente_referencia'],
  ['cliente', 'DELETE FROM cliente'],
  ['gasto', 'DELETE FROM gasto'],
  ['archivo', 'DELETE FROM archivo'],
  ['enlace_cliente', 'DELETE FROM enlace_cliente'],
  ['caja', 'DELETE FROM caja'],
  ['propietario_banco', 'DELETE FROM propietario_banco'],
  ['banco', 'DELETE FROM banco'],
  ['propietario', 'DELETE FROM propietario'],
  ['producto', 'DELETE FROM producto'],
];

async function preview(db: DbClient): Promise<CleanupResult[]> {
  const results: CleanupResult[] = [];
  for (const [table] of targets) {
    const result = await db.query(`SELECT count(*) FROM ${table}`);
    results.push({ table, deleted: Number(result.rows[0].count) });
  }
  return results;
}

async function cleanup(db: DbClient): Promise<{ results: CleanupResult[]; files: string[] }> {
  const files = (await db.query('SELECT ruta FROM archivo')).rows.map(row => String(row.ruta));
  const results: CleanupResult[] = [];
  for (const [table, sql] of targets) {
    const result = await db.query(sql);
    results.push({ table, deleted: result.rowCount ?? 0 });
  }
  return { results, files };
}

function print(results: CleanupResult[]) {
  for (const result of results) console.log(`${result.table}: ${result.deleted}`);
}

async function main() {
  const result = await transaction(async db => confirmed
    ? cleanup(db)
    : { results: await preview(db), files: [] });

  if (confirmed) {
    for (const file of result.files) {
      const resolved = path.resolve(file);
      const uploadRoot = path.resolve(config.uploadDir) + path.sep;
      if (resolved.startsWith(uploadRoot)) await fs.rm(resolved, { force: true });
    }
    console.log('Limpieza total de datos de negocio completada.');
  } else {
    console.log('Vista previa. No se modificaron datos. Para ejecutar: CONFIRM_CLEANUP_ALL=SI npm run db:cleanup-all');
  }
  print(result.results);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
