import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import type {Server} from 'node:http';

// Explicit opt-in. Creates and removes its own empty database, never uses business data.
describe.skipIf(process.env.RUN_DB_TESTS!=='1')('reemplazo con PostgreSQL real',()=>{
  const root=process.cwd().endsWith('server')?path.resolve('..'):process.cwd();
  const name=`prestamos_test_replacement_${process.pid}`;
  let admin:pg.Client,db:pg.Client,pool:pg.Pool,server:Server,base:string,cookie:string,limitedCookie:string,creatorCookie:string;
  const payload={fk_idcliente:1,fk_idforma_pago:1,fecha_inicio:'2026-09-01',monto_capital:'1000',porcentaje_interes:'20',cantidad_cuotas:2,frecuencia:'MENSUAL',dias_mes:[10]};
  async function request(url:string,body?:unknown,auth=cookie){
    const r=await fetch(base+url,{method:body===undefined?'GET':'POST',headers:{Cookie:auth,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:r.status,body:await r.json()};
  }
  async function create(extra:Record<string,unknown>={}){
    const r=await request('/api/operaciones/prestamos',{...payload,...extra});
    expect(r.status,JSON.stringify(r.body)).toBe(201);return r.body.idoperacion_financiera as number;
  }
  async function detail(id:number){const r=await request(`/api/operaciones/${id}`);expect(r.status).toBe(200);return r.body;}
  async function pay(id:number,monto:string,extra:Record<string,unknown>={}){const r=await request(`/api/operaciones/${id}/pagos`,{monto,fk_idforma_pago:1,...extra});expect(r.status,JSON.stringify(r.body)).toBe(201);return r.body;}
  async function edit(id:number,extra:Record<string,unknown>={},auth=cookie){return request(`/api/operaciones/${id}/reemplazo`,{...payload,...extra},auth);}
  async function cash(){return (await db.query('SELECT idmovimiento_caja,fk_idcaja,tipo,monto,fecha_movimiento FROM movimiento_caja ORDER BY idmovimiento_caja')).rows;}
  beforeAll(async()=>{
    dotenv.config({path:path.join(root,'server/.env'),quiet:true});
    const options={host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,connectionTimeoutMillis:5000};
    admin=new pg.Client({...options,database:process.env.DB_NAME});await admin.connect();
    if(!/^prestamos_test_replacement_\d+$/.test(name))throw new Error('Nombre de prueba inválido');
    await admin.query(`CREATE DATABASE ${name}`);
    console.info('Base temporal creada:',name);
    process.env.DB_NAME=name;
    db=new pg.Client({...options,database:name});await db.connect();
    const migrations=fs.readdirSync(path.join(root,'database')).filter(f=>/^\d{3}_.*\.sql$/.test(f)).sort();
    await db.query(fs.readFileSync(path.join(root,'database',migrations[0]),'utf8'));
    await db.query(`BEGIN;
      INSERT INTO rol(idrol,nombre,creado_por) VALUES(1,'Administrador',1);
      INSERT INTO usuario(idusuario,fk_idrol,login,password_hash,nombres,apellidos,cedula) VALUES(1,1,'test','unused','Test','Admin','1');
      INSERT INTO forma_pago(idforma_pago,codigo,nombre,creado_por) VALUES(1,'EFECTIVO','Efectivo',1),(2,'TRANSFERENCIA','Transferencia',1);
      COMMIT;`);
    for(const migration of migrations.slice(1))await db.query(fs.readFileSync(path.join(root,'database',migration),'utf8'));
    console.info('Migraciones verificadas en la base temporal');
    await db.query(`INSERT INTO cliente(idcliente,nombre_completo,cedula,direccion,telefono1,creado_por) VALUES(1,'Cliente Uno','11','Ciudad','0981123456',1),(2,'Cliente Dos','22','Ciudad','0981123457',1);
      INSERT INTO cliente_referencia(fk_idcliente,posicion,nombre_completo,telefono,fk_idtipo_referencia,creado_por) SELECT idcliente,1,'Referencia','123',1,1 FROM cliente;
      INSERT INTO corredor(idcorredor,nombre_completo,cedula,telefono,porcentaje_comision,creado_por) VALUES(1,'Corredor Uno','33','123',5,1),(2,'Corredor Dos','44','123',8,1);`);
    ({pool}=await import('./db.js'));
    const {app}=await import('./index.js');
    console.info('Aplicación de pruebas cargada');
    const {signSession}=await import('./auth.js');
    cookie=`prestamos_session=${signSession({id:1,login:'test',nombre:'Test',rol:'Administrador',permisos:[]})}`;
    limitedCookie=`prestamos_session=${signSession({id:1,login:'test',nombre:'Test',rol:'Consulta',permisos:[]})}`;
    creatorCookie=`prestamos_session=${signSession({id:1,login:'test',nombre:'Test',rol:'Operador',permisos:['PRESTAMO_CREAR']})}`;
    server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
    const address=server.address();if(!address || typeof address==='string')throw new Error('Servidor no disponible');base=`http://127.0.0.1:${address.port}`;
  },120000);
  afterAll(async()=>{
    if(server)await new Promise<void>(r=>server.close(()=>r()));
    if(pool)await pool.end();if(db)await db.end();
    if(admin){if(/^prestamos_test_replacement_\d+$/.test(name))await admin.query(`DROP DATABASE IF EXISTS ${name}`);await admin.end();}
  },30000);

  it('precarga calendario y conserva garantía, usuarios y comisión; corrige caja sin duplicar',async()=>{
    const id=await create({fk_idcorredor:1,usuarios:[1],observacion:'Conservar',garantia:{tipo_objeto:'Vehículo',descripcion:'Garantía',valor_aproximado:'50',valor_tasado:'40'}});
    const old=await detail(id);expect(old.dias_mes).toEqual([10]);expect(old.fk_idcorredor).toBe(1);
    await db.query('UPDATE corredor SET porcentaje_comision=7 WHERE idcorredor=1');
    const before=await cash();const r=await edit(id,{fk_idcliente:2,fk_idforma_pago:2,fk_idcorredor:1,monto_capital:'2000',cantidad_cuotas:3,frecuencia:'SEMANAL',dias_mes:[],dias_semana:[3]});
    expect(r.status,JSON.stringify(r.body)).toBe(201);const loan=await detail(r.body.idoperacion_financiera);
    expect(loan).toMatchObject({fk_idcliente:2,porcentaje_comision:'5.0000',monto_comision:'100.00',observacion:'Conservar',dias_semana:[3],prestamo_fk_idforma_pago:2});
    expect(loan.garantia.descripcion).toBe('Garantía');expect(loan.usuarios[0].idusuario).toBe(1);expect(loan.cuotas).toHaveLength(3);
    const after=await cash();expect(after).toHaveLength(before.length);expect(after.at(-1)).toEqual({...before.at(-1),monto:'2000.00'});
    expect((await db.query('SELECT estado,activo FROM operacion_financiera WHERE idoperacion_financiera=$1',[id])).rows[0]).toEqual({estado:'EDITADO',activo:false});
    expect((await request(`/api/operaciones/${id}`)).status).toBe(404);
    expect((await request('/api/operaciones')).body.some((o:any)=>o.idoperacion_financiera===id)).toBe(false);
  });
  it('permite crear y editar con un interés menor al sugerido por el cliente',async()=>{
    await db.query('UPDATE cliente SET tasa_interes_sugerida=30 WHERE idcliente=1');
    const id=await create({porcentaje_interes:'20'});
    const created=await detail(id);
    expect(created.porcentaje_interes).toBe('20.00');
    const replaced=await edit(id,{porcentaje_interes:'10'});
    expect(replaced.status,JSON.stringify(replaced.body)).toBe(201);
    expect((await detail(replaced.body.idoperacion_financiera)).porcentaje_interes).toBe('10.00');
  });
  it('conserva pagos parciales, fechas, referencias y caja; permite editar de nuevo',async()=>{
    const id=await create();const p=await pay(id,'250',{referencia:'REF',observacion:'Abono'});
    const before=await cash();const originalPayment=(await db.query('SELECT * FROM pago WHERE idpago=$1',[p.idpago])).rows[0];
    const r=await edit(id,{cantidad_cuotas:4,fk_idcliente:2});expect(r.status).toBe(201);
    const loan=await detail(r.body.idoperacion_financiera);expect(loan.total_pagado).toBe('250.00');expect(loan.saldo).toBe('950.00');expect(loan.pagos[0]).toMatchObject({monto:'250.00',referencia:'REF',observacion:'Abono'});
    expect(new Date(loan.pagos[0].fecha_pago).getTime()).toBe(originalPayment.fecha_pago.getTime());expect(await cash()).toEqual(before);
    expect(loan.pagos[0].aplicaciones[0]).toMatchObject({monto_interes:'50.00',monto_capital:'200.00'});
    const again=await edit(r.body.idoperacion_financiera);expect(again.status).toBe(201);expect((await detail(again.body.idoperacion_financiera)).total_pagado).toBe('250.00');
    expect(await cash()).toEqual(before);
    const receipt=await fetch(`${base}/api/pagos/${p.idpago}/comprobante.pdf`,{headers:{Cookie:cookie},redirect:'manual'});
    expect(receipt.status).toBe(307);expect(receipt.headers.get('location')).toContain('/comprobante.pdf');
  });
  it('redistribuye pagos de solo interés y acepta total igual a lo cobrado',async()=>{
    const id=await create();const old=await detail(id);await pay(id,'100',{modo:'INTERES',cuota_ids:[old.cuotas[0].idcuota]});
    const r=await edit(id,{monto_capital:'100',porcentaje_interes:'0',cantidad_cuotas:1});expect(r.status).toBe(201);
    const loan=await detail(r.body.idoperacion_financiera);expect(loan).toMatchObject({estado:'PAGADA',saldo:'0.00',total_pagado:'100.00'});expect(loan.cuotas[0].capital_pagado).toBe('100.00');
  });
  it('rechaza monto inferior y revierte todos los registros',async()=>{
    const id=await create();await pay(id,'500');const before=await cash();const count=(await db.query('SELECT count(*) FROM operacion_financiera')).rows[0].count;
    expect((await edit(id,{monto_capital:'100',porcentaje_interes:'0'})).status).toBe(400);
    expect((await db.query('SELECT count(*) FROM operacion_financiera')).rows[0].count).toBe(count);expect(await cash()).toEqual(before);expect((await detail(id)).activo).toBe(true);
  });
  it('conserva descuentos, aplica el mínimo y cobra luego solo el saldo real',async()=>{
    const id=await create();const old=await detail(id);await pay(id,'500',{cuota_ids:[old.cuotas[0].idcuota],descuento_general:'100'});
    expect((await edit(id,{monto_capital:'550',porcentaje_interes:'0'})).status).toBe(400);
    const before=await cash();const r=await edit(id,{monto_capital:'1000',porcentaje_interes:'0'});expect(r.status).toBe(201);
    let loan=await detail(r.body.idoperacion_financiera);expect(loan).toMatchObject({total_pagado:'500.00',total_descontado:'100.00',saldo:'400.00'});expect(await cash()).toEqual(before);
    const list=(await request('/api/operaciones')).body.find((o:any)=>o.idoperacion_financiera===loan.idoperacion_financiera);expect(list.saldo).toBe('400.00');
    await pay(loan.idoperacion_financiera,'400');loan=await detail(loan.idoperacion_financiera);expect(loan).toMatchObject({estado:'PAGADA',saldo:'0.00',total_pagado:'900.00'});
    const equal=await edit(loan.idoperacion_financiera,{monto_capital:'1000',porcentaje_interes:'0'});expect(equal.status).toBe(201);expect(equal.body.saldo).toBe('0.00');
  });
  it('la fecha de cancelación incluye el último abono aunque el descuento sea anterior',async()=>{
    const id=await create();const old=await detail(id);
    const first=await pay(id,'500',{cuota_ids:[old.cuotas[0].idcuota],descuento_general:'100'});
    const last=await pay(id,'600');
    await db.query("UPDATE pago SET fecha_pago=CASE WHEN idpago=$1 THEN '2026-09-10 12:00:00'::timestamp ELSE '2026-09-20 12:00:00'::timestamp END WHERE idpago IN ($1,$2)",[first.idpago,last.idpago]);
    await db.query("UPDATE descuento_operacion SET fecha_aplicacion='2026-09-10 12:00:00' WHERE fk_idoperacion_financiera=$1",[id]);
    const r=await edit(id);expect(r.status).toBe(201);const loan=await detail(r.body.idoperacion_financiera);
    expect(loan.estado).toBe('PAGADA');expect(loan.cuotas[1].fecha_pago.slice(0,10)).toBe('2026-09-20');
  });
  it('copia pagos pendientes y anulados sin descontarlos del saldo',async()=>{
    const id=await create();await db.query("INSERT INTO pago(fk_idoperacion_financiera,fk_idforma_pago,monto,estado,creado_por) VALUES($1,1,50,'PENDIENTE',1),($1,1,50,'ANULADO',1)",[id]);
    const r=await edit(id);expect(r.status).toBe(201);const loan=await detail(r.body.idoperacion_financiera);expect(loan.pagos).toHaveLength(2);expect(loan.total_pagado).toBe('0.00');expect(loan.saldo).toBe('1200.00');
  });
  it('valida permisos y rechaza originales inactivos o cancelados',async()=>{
    const id=await create();expect((await edit(id,{},limitedCookie)).status).toBe(403);
    const r=await edit(id,{},creatorCookie);expect(r.status).toBe(201);expect((await edit(id)).status).toBe(409);
    const cancelled=await create();await db.query("UPDATE operacion_financiera SET estado='CANCELADA' WHERE idoperacion_financiera=$1",[cancelled]);expect((await edit(cancelled)).status).toBe(409);
  });
  it('solo admite uno de dos reemplazos simultáneos',async()=>{
    const id=await create();const r=await Promise.all([edit(id),edit(id)]);expect(r.map(x=>x.status).sort()).toEqual([201,409]);
    expect((await db.query('SELECT count(*) FROM prestamo_reemplazo WHERE fk_idoperacion_original=$1',[id])).rows[0].count).toBe('1');
  });
  it('serializa cobro concurrente sin perderlo ni permitirlo sobre el original inactivo',async()=>{
    const id=await create();const [payment,replacement]=await Promise.all([request(`/api/operaciones/${id}/pagos`,{monto:'100',fk_idforma_pago:1}),edit(id)]);
    expect(replacement.status).toBe(201);expect([201,400]).toContain(payment.status);
    const loan=await detail(replacement.body.idoperacion_financiera);expect(loan.total_pagado).toBe(payment.status===201?'100.00':'0.00');
  });
  it('reportes, calendario y caja consultan el reemplazo con sus descuentos',async()=>{
    const id=await create();const old=await detail(id);await pay(id,'500',{cuota_ids:[old.cuotas[0].idcuota],descuento_general:'100'});
    const r=await edit(id,{monto_capital:'1100',porcentaje_interes:'0',fk_idcorredor:2,cantidad_cuotas:3});expect(r.status).toBe(201);
    const loan=await detail(r.body.idoperacion_financiera);expect(loan.monto_comision).toBe('88.00');
    const calendar=await request('/api/calendario?mes=2026-09');expect(calendar.status).toBe(200);expect(calendar.body.cuotas.some((q:any)=>q.idoperacion_financiera===id)).toBe(false);
    for(const suffix of ['cuenta.pdf','cuenta.xlsx']){const response=await fetch(`${base}/api/operaciones/${loan.idoperacion_financiera}/${suffix}`,{headers:{Cookie:cookie}});expect(response.status).toBe(200);expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(100);}
    const dashboard=await request('/api/dashboard?desde=2026-09-01&hasta=2026-12-31');expect(dashboard.status).toBe(200);
    expect((await request('/api/caja')).status).toBe(200);
  });
  it('revierte también un fallo al final del reemplazo',async()=>{
    const id=await create();await pay(id,'100');const original=await detail(id);
    await db.query('UPDATE movimiento_caja SET activo=FALSE WHERE fk_idprestamo=$1',[original.idprestamo]);
    const before=await cash();const count=(await db.query('SELECT count(*) FROM pago')).rows[0].count;
    expect((await edit(id)).status).toBe(409);expect(await cash()).toEqual(before);expect((await db.query('SELECT count(*) FROM pago')).rows[0].count).toBe(count);expect((await detail(id)).total_pagado).toBe('100.00');
  });
});
