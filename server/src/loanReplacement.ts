import { Decimal } from 'decimal.js';
import { DateTime } from 'luxon';
import type { DbClient } from './db.js';
import { allocatePayment } from './finance.js';
import { config } from './config.js';

export class ReplacementError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type CreateLoan = (body: Record<string, unknown>, brokerPercentage?: string) => Promise<number>;

// The caller owns the transaction. All writers lock the operation before its children.
export async function replaceLoan(db: DbClient, operationId: number, body: Record<string, unknown>, userId: number, create: CreateLoan) {
  const original = (await db.query(`SELECT o.*,p.idprestamo,p.activo AS prestamo_activo FROM operacion_financiera o
    JOIN prestamo p ON p.fk_idoperacion_financiera=o.idoperacion_financiera
    WHERE o.idoperacion_financiera=$1 FOR UPDATE OF o,p`, [operationId])).rows[0];
  if (!original) throw new ReplacementError(404, 'Préstamo no encontrado');
  if (!original.activo || !original.prestamo_activo || !['ACTIVA','PAGADA','PENDIENTE'].includes(original.estado))
    throw new ReplacementError(409, 'El préstamo ya fue reemplazado, cancelado o desactivado. Actualice la pantalla.');

  const payments = (await db.query('SELECT * FROM pago WHERE fk_idoperacion_financiera=$1 ORDER BY fecha_pago,idpago FOR UPDATE', [operationId])).rows;
  const discounts = (await db.query('SELECT * FROM descuento_operacion WHERE fk_idoperacion_financiera=$1 AND activo ORDER BY fecha_aplicacion,iddescuento_operacion FOR UPDATE', [operationId])).rows;
  const broker = (await db.query('SELECT * FROM operacion_corredor WHERE fk_idoperacion_financiera=$1 AND activo', [operationId])).rows[0];
  const users = (await db.query('SELECT fk_idusuario FROM operacion_usuario WHERE fk_idoperacion_financiera=$1 AND activo', [operationId])).rows;
  const paid = payments.filter(p=>p.activo && p.estado==='CONFIRMADO').reduce((sum,p)=>sum.plus(p.monto),new Decimal(0));
  const discounted = discounts.reduce((sum,d)=>sum.plus(d.monto),new Decimal(0));
  const newId = await create({...body, observacion: original.observacion ?? undefined, usuarios: users.map(u=>u.fk_idusuario), garantia: undefined},
    broker && Number(body.fk_idcorredor)===broker.fk_idcorredor ? broker.porcentaje_comision : undefined);
  const newLoan = (await db.query(`SELECT o.*,p.idprestamo,c.nombre_completo FROM operacion_financiera o
    JOIN prestamo p ON p.fk_idoperacion_financiera=o.idoperacion_financiera JOIN cliente c ON c.idcliente=o.fk_idcliente
    WHERE o.idoperacion_financiera=$1`, [newId])).rows[0];
  if (new Decimal(newLoan.monto_total).lt(paid.plus(discounted)))
    throw new ReplacementError(400, `El nuevo total debe ser como mínimo ${paid.plus(discounted).toFixed(2)} (pagado más descuentos).`);

  const audit = (await db.query(`INSERT INTO prestamo_reemplazo(fk_idoperacion_original,fk_idoperacion_nueva,creado_por)
    VALUES($1,$2,$3) RETURNING idprestamo_reemplazo`, [operationId,newId,userId])).rows[0].idprestamo_reemplazo;
  await db.query(`INSERT INTO garantia(fk_idprestamo,fk_idusuario_tasador,tipo_objeto,descripcion,marca,modelo,identificador,valor_aproximado,valor_tasado,observacion,fecha_creado,creado_por,activo)
    SELECT $2,fk_idusuario_tasador,tipo_objeto,descripcion,marca,modelo,identificador,valor_aproximado,valor_tasado,observacion,fecha_creado,creado_por,activo
    FROM garantia WHERE fk_idprestamo=$1 AND activo`, [original.idprestamo,newLoan.idprestamo]);

  const installments = (await db.query('SELECT * FROM cuota WHERE fk_idoperacion_financiera=$1 ORDER BY fecha_vencimiento,numero', [newId])).rows.map(q=>({...q,interes_pagado:'0',capital_pagado:'0',descuento:'0',fecha_pago:null,fecha_pago_interes:null}));
  const byId = new Map(installments.map(q=>[q.idcuota,q]));
  const paymentIds = new Map<number,number>();
  for (const payment of payments) {
    const copied = (await db.query(`INSERT INTO pago(fk_idoperacion_financiera,fk_idforma_pago,fk_idarchivo,fecha_pago,monto,estado,referencia,observacion,fecha_creado,creado_por,activo)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING idpago`,
      [newId,payment.fk_idforma_pago,payment.fk_idarchivo,payment.fecha_pago,payment.monto,payment.estado,payment.referencia,payment.observacion,payment.fecha_creado,payment.creado_por,payment.activo])).rows[0].idpago;
    paymentIds.set(payment.idpago,copied);
    await db.query('INSERT INTO pago_reemplazo(fk_idreemplazo,fk_idpago_original,fk_idpago_nuevo) VALUES($1,$2,$3)', [audit,payment.idpago,copied]);
    if (payment.activo && payment.estado==='CONFIRMADO') {
      const distribution = allocatePayment(installments,payment.monto);
      if (!new Decimal(distribution.remaining).isZero()) throw new Error('No se pudo distribuir el pago completo');
      for (const a of distribution.allocations) {
        await db.query(`INSERT INTO pago_aplicacion(fk_idpago,fk_idcuota,monto_interes,monto_capital,fecha_creado,creado_por)
          VALUES($1,$2,$3,$4,$5,$6)`, [copied,a.idcuota,a.montoInteres,a.montoCapital,payment.fecha_pago,userId]);
        const q=byId.get(a.idcuota)!;
        q.ultima_fecha_aplicada=payment.fecha_pago;
        q.interes_pagado=new Decimal(q.interes_pagado).plus(a.montoInteres).toFixed(2);
        q.capital_pagado=new Decimal(q.capital_pagado).plus(a.montoCapital).toFixed(2);
        if (new Decimal(q.interes_pagado).eq(q.monto_interes) && !q.fecha_pago_interes) q.fecha_pago_interes=payment.fecha_pago;
        if (new Decimal(q.interes_pagado).plus(q.capital_pagado).eq(q.monto_total)) q.fecha_pago=payment.fecha_pago;
      }
    }
    await db.query('UPDATE movimiento_caja SET fk_idpago=$2,concepto=$3 WHERE fk_idpago=$1', [payment.idpago,copied,`Cobro de operación - ${newLoan.nombre_completo}`.slice(0,250)]);
  }
  for (const discount of discounts) {
    const copiedPayment = paymentIds.get(discount.fk_idpago);
    if (!copiedPayment) throw new Error('El descuento no tiene un pago asociado al préstamo');
    const copied = (await db.query(`INSERT INTO descuento_operacion(fk_idoperacion_financiera,fk_idpago,monto,fecha_aplicacion,fecha_creado,creado_por)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING iddescuento_operacion`, [newId,copiedPayment,discount.monto,discount.fecha_aplicacion,discount.fecha_creado,discount.creado_por])).rows[0].iddescuento_operacion;
    await db.query('INSERT INTO descuento_reemplazo(fk_idreemplazo,fk_iddescuento_original,fk_iddescuento_nuevo) VALUES($1,$2,$3)', [audit,discount.iddescuento_operacion,copied]);
    let remaining=new Decimal(discount.monto);
    for (const q of installments) {
      const due=new Decimal(q.monto_total).minus(q.interes_pagado).minus(q.capital_pagado).minus(q.descuento);
      const applied=Decimal.min(due,remaining);
      if (applied.lte(0)) continue;
      await db.query('INSERT INTO descuento_aplicacion(fk_iddescuento_operacion,fk_idcuota,monto,fecha_creado,creado_por) VALUES($1,$2,$3,$4,$5)', [copied,q.idcuota,applied.toFixed(2),discount.fecha_aplicacion,userId]);
      q.descuento=new Decimal(q.descuento).plus(applied).toFixed(2);
      remaining=remaining.minus(applied);
      const coveredAt=q.ultima_fecha_aplicada && new Date(q.ultima_fecha_aplicada)>new Date(discount.fecha_aplicacion)
        ? q.ultima_fecha_aplicada : discount.fecha_aplicacion;
      if (due.eq(applied)) q.fecha_pago=coveredAt;
      if (!q.fecha_pago_interes && new Decimal(q.interes_pagado).plus(q.descuento).gte(q.monto_interes)) q.fecha_pago_interes=coveredAt;
    }
    if (!remaining.isZero()) throw new Error('No se pudo distribuir el descuento completo');
    await db.query('UPDATE movimiento_caja SET fk_iddescuento_operacion=$2 WHERE fk_iddescuento_operacion=$1', [discount.iddescuento_operacion,copied]);
  }
  const today=DateTime.now().setZone(config.timezone).toISODate()!;
  for (const q of installments) {
    const due=new Decimal(q.monto_total).minus(q.interes_pagado).minus(q.capital_pagado).minus(q.descuento);
    const date=q.fecha_vencimiento instanceof Date ? DateTime.fromJSDate(q.fecha_vencimiento).toISODate()! : String(q.fecha_vencimiento).slice(0,10);
    const status=due.eq(0)?'PAGADA':date<today?'VENCIDA':due.lt(q.monto_total)?'PARCIAL':'PENDIENTE';
    await db.query('UPDATE cuota SET estado=$2,fecha_pago=$3,fecha_pago_interes=$4 WHERE idcuota=$1', [q.idcuota,status,q.fecha_pago,q.fecha_pago_interes]);
  }
  const disbursements=await db.query('SELECT idmovimiento_caja FROM movimiento_caja WHERE fk_idprestamo=$1 AND activo FOR UPDATE', [original.idprestamo]);
  if (disbursements.rows.length!==1) throw new ReplacementError(409, 'El préstamo debe tener un único desembolso activo en caja para editarlo.');
  await db.query('UPDATE movimiento_caja SET fk_idprestamo=$2,monto=$3,concepto=$4 WHERE idmovimiento_caja=$1', [disbursements.rows[0].idmovimiento_caja,newLoan.idprestamo,newLoan.monto_capital,`Desembolso de préstamo - ${newLoan.nombre_completo}`.slice(0,250)]);
  await db.query("UPDATE operacion_financiera SET estado='EDITADO',activo=FALSE WHERE idoperacion_financiera=$1", [operationId]);
  await db.query('UPDATE prestamo SET activo=FALSE WHERE idprestamo=$1', [original.idprestamo]);
  await db.query('UPDATE pago_aplicacion SET activo=FALSE WHERE fk_idpago IN (SELECT idpago FROM pago WHERE fk_idoperacion_financiera=$1)', [operationId]);
  await db.query('UPDATE pago SET activo=FALSE WHERE fk_idoperacion_financiera=$1', [operationId]);
  await db.query('UPDATE descuento_aplicacion SET activo=FALSE WHERE fk_iddescuento_operacion IN (SELECT iddescuento_operacion FROM descuento_operacion WHERE fk_idoperacion_financiera=$1)', [operationId]);
  await db.query('UPDATE descuento_operacion SET activo=FALSE WHERE fk_idoperacion_financiera=$1', [operationId]);
  await db.query('UPDATE cuota SET activo=FALSE WHERE fk_idoperacion_financiera=$1', [operationId]);
  await db.query('UPDATE operacion_corredor SET activo=FALSE WHERE fk_idoperacion_financiera=$1', [operationId]);
  const balance=new Decimal(newLoan.monto_total).minus(paid).minus(discounted);
  await db.query('UPDATE operacion_financiera SET estado=$2 WHERE idoperacion_financiera=$1', [newId,balance.isZero()?'PAGADA':'ACTIVA']);
  return {idoperacion_financiera:newId,idprestamo:newLoan.idprestamo,idoperacion_original:operationId,total_pagado:paid.toFixed(2),total_descontado:discounted.toFixed(2),saldo:balance.toFixed(2)};
}
