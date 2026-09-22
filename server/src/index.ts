import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { Decimal } from 'decimal.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { config } from './config.js';
import { pool, transaction, type DbClient } from './db.js';
import { requireAuth, requirePermission, signSession } from './auth.js';
import { allocatePayment, calculateFlatLoan, calculateFlatLoanFromInterestAmount, generateDueDates, type Frecuencia } from './finance.js';
import { analyticsPercentage, resolveAnalyticsRange } from './analytics.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = new Set([config.origin, 'http://localhost:3000', 'https://localhost:3443', 'http://localhost:5173', 'https://localhost:5173']);
  if (origin && allowed.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    return res.sendStatus(204);
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && origin && !allowed.has(origin)) {
    return res.status(403).json({ error: 'Origen no autorizado' });
  }
  next();
});

const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(handler(req, res)).catch(next);

class PublicFormError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

const publicCedulaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, cb) => cb(null, ['image/jpeg', 'image/png'].includes(file.mimetype)),
});

const publicClientSchema = z.object({
  nombre_completo: z.string().trim().min(3),
  cedula: z.string().trim().min(3),
  fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  direccion: z.string().trim().min(3),
  telefono1: z.string().trim().min(3),
  ruc: z.string().nullish(), telefono2: z.string().nullish(), email: z.string().email().nullish().or(z.literal('')),
  latitud: z.union([z.string(), z.number()]).nullish(), longitud: z.union([z.string(), z.number()]).nullish(),
  direccion_trabajo: z.string().nullish(), nombre_empresa: z.string().nullish(), telefono_empresa: z.string().nullish(), ruc_empresa: z.string().nullish(),
  observacion: z.string().nullish(), dedicacion: z.string().nullish(), ingreso_promedio: z.union([z.string(), z.number()]).refine(value => /^\d+(\.\d{1,4})?$/.test(String(value)) && Number(value) >= 0, 'Debe ser un número no negativo').nullish(),
  referencias: z.array(z.object({ nombre_completo: z.string().trim().min(3), telefono: z.string().trim().min(3), direccion: z.string().nullish(), fk_idtipo_referencia: z.coerce.number().int().positive() })).length(1),
}).superRefine((value, ctx) => {
  const hasLatitude = value.latitud !== null && value.latitud !== undefined;
  const hasLongitude = value.longitud !== null && value.longitud !== undefined;
  if (!hasLatitude || !hasLongitude) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['latitud'], message: 'La ubicación GPS es obligatoria' });
  if (hasLatitude !== hasLongitude) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['latitud'], message: 'Debe enviar latitud y longitud juntas' });
});

function today() { return DateTime.now().setZone(config.timezone).toISODate() as string; }
function timestamp() { return DateTime.now().setZone(config.timezone).toFormat('yyyy-MM-dd HH:mm:ss'); }

async function sessionUser(id: number) {
  const result = await pool.query(`
    SELECT u.idusuario, u.login, u.nombres, u.apellidos, r.nombre AS rol,
      COALESCE(array_agg(e.codigo) FILTER (WHERE e.codigo IS NOT NULL AND re.activo AND re.permitido), '{}') AS permisos
    FROM usuario u
    JOIN rol r ON r.idrol=u.fk_idrol
    LEFT JOIN rol_evento re ON re.fk_idrol=r.idrol AND re.activo
    LEFT JOIN evento e ON e.idevento=re.fk_idevento AND e.activo
    WHERE u.idusuario=$1 AND u.activo
    GROUP BY u.idusuario, r.nombre`, [id]);
  const row = result.rows[0];
  if (!row) return null;
  return { id: row.idusuario, login: row.login, nombre: `${row.nombres} ${row.apellidos}`, rol: row.rol, permisos: row.permisos };
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  const result = await pool.query('SELECT current_setting(\'server_version\') AS version');
  res.json({ ok: true, database: 'conectada', postgres: result.rows[0].version });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const parsed = z.object({ login: z.string().min(1), password: z.string().min(1) }).parse(req.body);
  const result = await pool.query('SELECT idusuario, password_hash FROM usuario WHERE LOWER(login)=LOWER($1) AND activo', [parsed.login.trim()]);
  const row = result.rows[0];
  if (!row || !(await bcrypt.compare(parsed.password, row.password_hash))) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  const user = await sessionUser(row.idusuario);
  if (!user) return res.status(401).json({ error: 'Usuario inactivo' });
  res.cookie('prestamos_session', signSession(user), { httpOnly: true, secure: req.secure || config.nodeEnv === 'production', sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 });
  res.json({ user });
}));
app.post('/api/auth/logout', (_req, res) => { res.clearCookie('prestamos_session'); res.status(204).end(); });
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

app.get('/api/public/clientes/:token', asyncRoute(async (req, res) => {
  const hash = crypto.createHash('sha256').update(String(req.params.token)).digest('hex');
  const result = await pool.query('SELECT fecha_expira, fecha_uso, activo FROM enlace_cliente WHERE token_hash=$1', [hash]);
  const row = result.rows[0];
  if (!row) return res.status(404).json({ disponible: false, estado: 'NO_ENCONTRADO' });
  if (row.fecha_uso || !row.activo) return res.status(410).json({ disponible: false, estado: 'USADO' });
  if (new Date(row.fecha_expira).getTime() <= Date.now()) return res.status(410).json({ disponible: false, estado: 'VENCIDO' });
  const types = await pool.query('SELECT idtipo_referencia, nombre FROM tipo_referencia WHERE activo ORDER BY orden, nombre');
  res.json({ disponible: true, fecha_expira: row.fecha_expira, tipos_referencia: types.rows });
}));

app.post('/api/public/clientes/:token', publicCedulaUpload.fields([{ name: 'cedula_frente', maxCount: 1 }, { name: 'cedula_atras', maxCount: 1 }]), asyncRoute(async (req, res) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const frente = files?.cedula_frente?.[0];
  const atras = files?.cedula_atras?.[0];
  const payload = typeof req.body.datos === 'string' ? JSON.parse(req.body.datos) : req.body;
  const data = publicClientSchema.parse(payload);
  const hash = crypto.createHash('sha256').update(String(req.params.token)).digest('hex');
  const filePaths: string[] = [];
  try {
    const result = await transaction(async db => {
      const link = (await db.query('SELECT idenlace_cliente, creado_por, fecha_expira, fecha_uso, activo FROM enlace_cliente WHERE token_hash=$1 FOR UPDATE', [hash])).rows[0];
      if (!link) throw new PublicFormError(404, 'Enlace no encontrado');
      if (link.fecha_uso || !link.activo) throw new PublicFormError(410, 'Este enlace ya fue utilizado');
      if (new Date(link.fecha_expira).getTime() <= Date.now()) throw new PublicFormError(410, 'Este enlace venció');
      const client = await db.query(`INSERT INTO cliente (nombre_completo,cedula,fecha_nacimiento,ruc,direccion,telefono1,telefono2,email,latitud,longitud,fecha_ubicacion,direccion_trabajo,nombre_empresa,telefono_empresa,ruc_empresa,observacion,dedicacion,ingreso_promedio,creado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING idcliente`, [data.nombre_completo, data.cedula, data.fecha_nacimiento, data.ruc || null, data.direccion, data.telefono1, data.telefono2 || null, data.email || null, data.latitud, data.longitud, timestamp(), data.direccion_trabajo || null, data.nombre_empresa || null, data.telefono_empresa || null, data.ruc_empresa || null, data.observacion || null, data.dedicacion || null, data.ingreso_promedio ?? '0', link.creado_por]);
      const clientId = client.rows[0].idcliente;
      const ref = data.referencias[0];
      const type = await db.query('SELECT nombre FROM tipo_referencia WHERE idtipo_referencia=$1 AND activo', [ref.fk_idtipo_referencia]);
      if (!type.rows[0]) throw new PublicFormError(400, 'Tipo de referencia inválido');
      await db.query('INSERT INTO cliente_referencia (fk_idcliente,posicion,nombre_completo,fk_idtipo_referencia,relacion,telefono,direccion,creado_por) VALUES ($1,1,$2,$3,$4,$5,$6,$7)', [clientId, ref.nombre_completo, ref.fk_idtipo_referencia, type.rows[0].nombre, ref.telefono, ref.direccion || null, link.creado_por]);
      const folder = path.join(config.uploadDir, 'cedula_publica', DateTime.now().toFormat('yyyy/MM')); fs.mkdirSync(folder, { recursive: true });
      for (const [file, lado] of [[frente, 'FRENTE'], [atras, 'ATRAS']] as const) {
        if (!file) continue;
        const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
        const filePath = path.join(folder, `${crypto.randomUUID()}_${lado}${ext}`); await fs.promises.writeFile(filePath, file.buffer); filePaths.push(filePath);
        const digest = crypto.createHash('sha256').update(file.buffer).digest('hex');
        const archive = await db.query('INSERT INTO archivo (ruta,nombre_original,tipo_mime,tamano_bytes,hash_archivo,creado_por) VALUES ($1,$2,$3,$4,$5,$6) RETURNING idarchivo', [filePath, file.originalname, file.mimetype, file.size, digest, link.creado_por]);
        await db.query('INSERT INTO cliente_archivo (fk_idcliente,fk_idarchivo,tipo_documento,creado_por) VALUES ($1,$2,$3,$4)', [clientId, archive.rows[0].idarchivo, lado === 'FRENTE' ? 'CEDULA_FRENTE' : 'CEDULA_REVERSO', link.creado_por]);
      }
      await db.query('UPDATE enlace_cliente SET fecha_uso=CURRENT_TIMESTAMP, activo=FALSE WHERE idenlace_cliente=$1 AND fecha_uso IS NULL AND activo', [link.idenlace_cliente]);
      return clientId;
    });
    res.status(201).json({ idcliente: result, mensaje: 'Datos enviados correctamente' });
  } catch (error) {
    await Promise.all(filePaths.map(filePath => fs.promises.unlink(filePath).catch(() => undefined)));
    throw error;
  }
}));

app.use('/api', requireAuth);

app.get('/api/tipos-referencia', asyncRoute(async (_req, res) => {
  const result = await pool.query('SELECT idtipo_referencia, nombre, descripcion, orden, activo FROM tipo_referencia WHERE activo ORDER BY orden, nombre');
  res.json(result.rows);
}));
app.get('/api/administracion/tipos-referencia', requirePermission('ADMINISTRAR'), asyncRoute(async (_req, res) => {
  const result = await pool.query('SELECT idtipo_referencia, nombre, descripcion, orden, activo FROM tipo_referencia ORDER BY orden, nombre');
  res.json(result.rows);
}));
const referenceTypeSchema = z.object({ nombre: z.string().trim().min(2).max(100), descripcion: z.string().nullish(), orden: z.coerce.number().int().positive() });
app.post('/api/administracion/tipos-referencia', requirePermission('ADMINISTRAR'), asyncRoute(async (req, res) => {
  const data = referenceTypeSchema.parse(req.body);
  const result = await pool.query('INSERT INTO tipo_referencia(nombre,descripcion,orden,creado_por) VALUES($1,$2,$3,$4) RETURNING *', [data.nombre, data.descripcion || null, data.orden, req.user!.id]);
  res.status(201).json(result.rows[0]);
}));
app.patch('/api/administracion/tipos-referencia/:id', requirePermission('ADMINISTRAR'), asyncRoute(async (req, res) => {
  const data = referenceTypeSchema.partial().parse(req.body); const entries = Object.entries(data);
  if (!entries.length) return res.status(400).json({ error: 'Sin cambios' });
  const values = entries.map(([, value]) => value); const sets = entries.map(([key], i) => `${key}=$${i + 1}`);
  const result = await pool.query(`UPDATE tipo_referencia SET ${sets.join(',')} WHERE idtipo_referencia=$${values.length + 1} RETURNING *`, [...values, req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Tipo de referencia no encontrado' }); res.json(result.rows[0]);
}));
app.delete('/api/administracion/tipos-referencia/:id', requirePermission('ADMINISTRAR'), asyncRoute(async (req, res) => {
  await pool.query('UPDATE tipo_referencia SET activo=FALSE WHERE idtipo_referencia=$1', [req.params.id]); res.status(204).end();
}));
app.get('/api/mapa/config', asyncRoute(async (_req, res) => { res.json({ apiKey: config.googleMapsApiKey }); }));

app.get('/api/dashboard', asyncRoute(async (req, res) => {
  const range = resolveAnalyticsRange(req.query.desde, req.query.hasta, config.timezone);
  const params = [range.from, range.to];
  const [cash, methods, activity, interest, portfolio] = await Promise.all([
    pool.query(`WITH dias AS (
        SELECT generate_series($1::date,$2::date,'1 day'::interval)::date AS fecha
      ), movimientos AS (
        SELECT mc.fecha_movimiento::date AS fecha,
          COALESCE(SUM(CASE WHEN mc.tipo='INGRESO' THEN mc.monto ELSE 0 END),0) AS ingresos,
          COALESCE(SUM(CASE WHEN mc.tipo='EGRESO' THEN mc.monto ELSE 0 END),0) AS egresos
        FROM movimiento_caja mc
        LEFT JOIN pago p ON p.idpago=mc.fk_idpago
        LEFT JOIN prestamo pr ON pr.idprestamo=mc.fk_idprestamo
        LEFT JOIN operacion_financiera op_pr ON op_pr.idoperacion_financiera=pr.fk_idoperacion_financiera
        LEFT JOIN descuento_operacion dsc ON dsc.iddescuento_operacion=mc.fk_iddescuento_operacion
        LEFT JOIN operacion_financiera op_dsc ON op_dsc.idoperacion_financiera=dsc.fk_idoperacion_financiera
        WHERE mc.activo AND mc.fecha_movimiento >= $1::date AND mc.fecha_movimiento < ($2::date + 1)
          AND (mc.fk_idpago IS NULL OR (p.activo AND p.estado='CONFIRMADO'))
          AND (mc.fk_idprestamo IS NULL OR (op_pr.activo AND op_pr.estado<>'CANCELADA'))
          AND (mc.fk_iddescuento_operacion IS NULL OR (dsc.activo AND op_dsc.activo AND op_dsc.estado<>'CANCELADA'))
        GROUP BY mc.fecha_movimiento::date
      )
      SELECT to_char(dias.fecha,'YYYY-MM-DD') AS fecha,
        COALESCE(m.ingresos,0) AS ingresos,COALESCE(m.egresos,0) AS egresos,
        COALESCE(m.ingresos,0)-COALESCE(m.egresos,0) AS neto
      FROM dias LEFT JOIN movimientos m ON m.fecha=dias.fecha ORDER BY dias.fecha`, params),
    pool.query(`SELECT fp.nombre,COUNT(*)::integer AS cantidad,COALESCE(SUM(p.monto),0) AS monto
      FROM pago p JOIN forma_pago fp ON fp.idforma_pago=p.fk_idforma_pago
      JOIN operacion_financiera o ON o.idoperacion_financiera=p.fk_idoperacion_financiera
      WHERE p.activo AND p.estado='CONFIRMADO' AND o.activo AND o.estado<>'CANCELADA'
        AND p.fecha_pago >= $1::date AND p.fecha_pago < ($2::date + 1)
      GROUP BY fp.idforma_pago,fp.nombre ORDER BY monto DESC,fp.nombre`, params),
    pool.query(`WITH dias AS (
        SELECT generate_series($1::date,$2::date,'1 day'::interval)::date AS fecha
      ), operaciones AS (
        SELECT o.fecha_inicio AS fecha,
          COALESCE(SUM(CASE WHEN o.tipo='PRESTAMO' THEN o.monto_capital ELSE 0 END),0) AS capital_prestamos,
          COALESCE(SUM(CASE WHEN o.tipo='VENTA_FINANCIADA' THEN o.monto_capital ELSE 0 END),0) AS capital_ventas,
          COUNT(*)::integer AS operaciones
        FROM operacion_financiera o
        WHERE o.activo AND o.estado<>'CANCELADA' AND o.fecha_inicio BETWEEN $1::date AND $2::date
        GROUP BY o.fecha_inicio
      ), clientes AS (
        SELECT c.fecha_creado::date AS fecha,COUNT(*)::integer AS clientes_nuevos
        FROM cliente c WHERE c.activo AND c.fecha_creado >= $1::date AND c.fecha_creado < ($2::date + 1)
        GROUP BY c.fecha_creado::date
      )
      SELECT to_char(dias.fecha,'YYYY-MM-DD') AS fecha,
        COALESCE(o.capital_prestamos,0) AS capital_prestamos,
        COALESCE(o.capital_ventas,0) AS capital_ventas,
        COALESCE(o.operaciones,0)::integer AS operaciones,
        COALESCE(c.clientes_nuevos,0)::integer AS clientes_nuevos
      FROM dias LEFT JOIN operaciones o ON o.fecha=dias.fecha LEFT JOIN clientes c ON c.fecha=dias.fecha
      ORDER BY dias.fecha`, params),
    pool.query(`SELECT COALESCE(SUM(pa.monto_interes),0) AS interes_cobrado
      FROM pago_aplicacion pa JOIN pago p ON p.idpago=pa.fk_idpago
      JOIN operacion_financiera o ON o.idoperacion_financiera=p.fk_idoperacion_financiera
      WHERE pa.activo AND p.activo AND p.estado='CONFIRMADO' AND o.activo AND o.estado<>'CANCELADA'
        AND p.fecha_pago >= $1::date AND p.fecha_pago < ($2::date + 1)`, params),
    pool.query(`WITH pagado AS (
        SELECT pa.fk_idcuota,SUM(pa.monto_interes+pa.monto_capital) AS monto
        FROM pago_aplicacion pa JOIN pago p ON p.idpago=pa.fk_idpago
        WHERE pa.activo AND p.activo AND p.estado='CONFIRMADO' AND p.fecha_pago < ($2::date + 1)
        GROUP BY pa.fk_idcuota
      ), descontado AS (
        SELECT da.fk_idcuota,SUM(da.monto) AS monto
        FROM descuento_aplicacion da JOIN descuento_operacion dsc ON dsc.iddescuento_operacion=da.fk_iddescuento_operacion
        WHERE da.activo AND dsc.activo AND dsc.fecha_aplicacion < ($2::date + 1)
        GROUP BY da.fk_idcuota
      ), saldos AS (
        SELECT q.idcuota,o.fk_idcliente,q.fecha_vencimiento,q.monto_total,
          GREATEST(q.monto_total-COALESCE(p.monto,0)-COALESCE(d.monto,0),0) AS saldo
        FROM cuota q JOIN operacion_financiera o ON o.idoperacion_financiera=q.fk_idoperacion_financiera
        LEFT JOIN pagado p ON p.fk_idcuota=q.idcuota LEFT JOIN descontado d ON d.fk_idcuota=q.idcuota
        WHERE q.activo AND o.activo AND o.estado<>'CANCELADA' AND o.fecha_inicio <= $2::date
      )
      SELECT COALESCE(SUM(saldo),0) AS cartera_pendiente,
        COALESCE(SUM(saldo) FILTER (WHERE fecha_vencimiento<$2::date),0) AS cartera_vencida,
        COUNT(*) FILTER (WHERE saldo>0 AND fecha_vencimiento<$2::date)::integer AS cuotas_vencidas,
        COUNT(DISTINCT fk_idcliente) FILTER (WHERE saldo>0)::integer AS clientes_con_saldo,
        COUNT(DISTINCT fk_idcliente) FILTER (WHERE saldo>0 AND fecha_vencimiento<$2::date)::integer AS clientes_morosos,
        COALESCE(SUM(monto_total) FILTER (WHERE fecha_vencimiento BETWEEN $1::date AND $2::date),0) AS vencimientos_periodo,
        COALESCE(SUM(LEAST(monto_total,monto_total-saldo)) FILTER (WHERE fecha_vencimiento BETWEEN $1::date AND $2::date),0) AS vencimientos_cubiertos
      FROM saldos`, params),
  ]);

  const cashRows = cash.rows.map((row: any) => ({ fecha: row.fecha, ingresos: String(row.ingresos), egresos: String(row.egresos), neto: String(row.neto) }));
  const activityRows = activity.rows.map((row: any) => ({ fecha: row.fecha, capital_prestamos: String(row.capital_prestamos), capital_ventas: String(row.capital_ventas), operaciones: Number(row.operaciones), clientes_nuevos: Number(row.clientes_nuevos) }));
  const ingresos = cashRows.reduce((sum: Decimal, row: any) => sum.plus(row.ingresos), new Decimal(0));
  const egresos = cashRows.reduce((sum: Decimal, row: any) => sum.plus(row.egresos), new Decimal(0));
  const capitalPrestamos = activityRows.reduce((sum: Decimal, row: any) => sum.plus(row.capital_prestamos), new Decimal(0));
  const capitalVentas = activityRows.reduce((sum: Decimal, row: any) => sum.plus(row.capital_ventas), new Decimal(0));
  const operacionesNuevas = activityRows.reduce((sum: number, row: any) => sum + row.operaciones, 0);
  const clientesNuevos = activityRows.reduce((sum: number, row: any) => sum + row.clientes_nuevos, 0);
  const capitalColocado = capitalPrestamos.plus(capitalVentas);
  const methodTotal = methods.rows.reduce((sum: Decimal, row: any) => sum.plus(row.monto), new Decimal(0));
  const methodRows = methods.rows.map((row: any) => ({ nombre: row.nombre, cantidad: Number(row.cantidad), monto: String(row.monto), porcentaje: analyticsPercentage(row.monto, methodTotal) }));
  const p = portfolio.rows[0];
  const carteraPendiente = new Decimal(p.cartera_pendiente);
  const carteraVencida = new Decimal(p.cartera_vencida);

  res.json({
    periodo: range,
    kpis: {
      ingresos: ingresos.toFixed(2), egresos: egresos.toFixed(2), flujo_neto: ingresos.minus(egresos).toFixed(2),
      capital_colocado: capitalColocado.toFixed(2), capital_prestamos: capitalPrestamos.toFixed(2), capital_ventas: capitalVentas.toFixed(2),
      interes_cobrado: String(interest.rows[0].interes_cobrado), cartera_pendiente: carteraPendiente.toFixed(2), cartera_vencida: carteraVencida.toFixed(2),
      morosidad_porcentaje: analyticsPercentage(carteraVencida, carteraPendiente), clientes_con_saldo: Number(p.clientes_con_saldo),
      clientes_morosos: Number(p.clientes_morosos), clientes_morosos_porcentaje: analyticsPercentage(p.clientes_morosos, p.clientes_con_saldo),
      cuotas_vencidas: Number(p.cuotas_vencidas), cumplimiento_porcentaje: analyticsPercentage(p.vencimientos_cubiertos, p.vencimientos_periodo),
      clientes_nuevos: clientesNuevos, operaciones_nuevas: operacionesNuevas,
      ticket_promedio: operacionesNuevas ? capitalColocado.div(operacionesNuevas).toFixed(2) : '0.00',
    },
    flujo_diario: cashRows,
    formas_pago: methodRows,
    actividad_diaria: activityRows,
    morosidad: {
      cartera_al_dia: Decimal.max(0, carteraPendiente.minus(carteraVencida)).toFixed(2), cartera_vencida: carteraVencida.toFixed(2),
      clientes_con_saldo: Number(p.clientes_con_saldo), clientes_morosos: Number(p.clientes_morosos), cuotas_vencidas: Number(p.cuotas_vencidas),
    },
  });
}));

app.get('/api/calendario', requirePermission('PRESTAMO_VER'), asyncRoute(async (req, res) => {
  const month = String(req.query.mes ?? '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return res.status(400).json({ error: 'El mes debe tener formato YYYY-MM' });
  const start = DateTime.fromFormat(month, 'yyyy-MM', { zone: config.timezone }).startOf('month');
  if (!start.isValid) return res.status(400).json({ error: 'Mes inválido' });
  const from = start.toISODate()!;
  const to = start.plus({ months: 1 }).toISODate()!;
  const result = await pool.query(`
    WITH aplicado AS (
      SELECT pa.fk_idcuota,
        COALESCE(SUM(pa.monto_interes),0) AS interes_pagado,
        COALESCE(SUM(pa.monto_capital),0) AS capital_pagado
      FROM pago_aplicacion pa
      JOIN pago p ON p.idpago=pa.fk_idpago AND p.activo AND p.estado='CONFIRMADO'
      WHERE pa.activo
      GROUP BY pa.fk_idcuota
    ), saldos AS (
      SELECT q.idcuota,q.fk_idoperacion_financiera AS idoperacion_financiera,q.fk_idoperacion_financiera,q.numero,q.fecha_vencimiento::text AS fecha_vencimiento,q.estado,q.fecha_notificado::text AS fecha_notificado,
        c.nombre_completo AS cliente,c.cedula,
        GREATEST(q.monto_interes-COALESCE(a.interes_pagado,0),0) AS monto_interes_pendiente,
        GREATEST(q.monto_capital-COALESCE(a.capital_pagado,0),0) AS monto_capital_pendiente
      FROM cuota q
      JOIN operacion_financiera o ON o.idoperacion_financiera=q.fk_idoperacion_financiera AND o.activo
      JOIN cliente c ON c.idcliente=o.fk_idcliente AND c.activo
      LEFT JOIN aplicado a ON a.fk_idcuota=q.idcuota
      WHERE q.activo AND q.estado IN ('PENDIENTE','PARCIAL','VENCIDA')
        AND q.fecha_vencimiento >= $1::date AND q.fecha_vencimiento < $2::date
        AND ($3::text='Administrador' OR o.creado_por=$4 OR EXISTS (
          SELECT 1 FROM operacion_usuario ou
          WHERE ou.fk_idoperacion_financiera=o.idoperacion_financiera AND ou.fk_idusuario=$4 AND ou.activo
        ))
    )
    SELECT *, (monto_interes_pendiente+monto_capital_pendiente) AS monto_pendiente,
      (fecha_notificado IS NOT NULL AND fecha_notificado::date=$5::date) AS notificado_hoy
    FROM saldos
    WHERE monto_interes_pendiente+monto_capital_pendiente > 0
    ORDER BY fecha_vencimiento, cliente, numero`, [from, to, req.user!.rol, req.user!.id, today()]);
  const monto = result.rows.reduce((sum, row) => sum + Number(row.monto_pendiente), 0);
  res.json({ mes: month, resumen: { cantidad: result.rows.length, monto_total: monto.toFixed(2) }, cuotas: result.rows });
}));

app.post('/api/cuotas/:id/notificar', asyncRoute(async (req, res) => {
  if (req.user?.rol !== 'Administrador' && !req.user?.permisos.includes('CUOTA_NOTIFICAR') && !req.user?.permisos.includes('PAGO_CREAR')) {
    return res.status(403).json({ error: 'No tiene permiso para notificar cuotas' });
  }
  const result = await transaction(async db => {
    const cuota = await db.query(`
      SELECT q.idcuota,q.fk_idoperacion_financiera,q.numero,q.fecha_vencimiento,q.estado,q.fecha_notificado,
        q.monto_interes,q.monto_capital,q.monto_total,o.monto_total AS operacion_total,
        o.creado_por AS operacion_creado_por,c.nombre_completo,c.cedula,c.telefono1,
        EXISTS (SELECT 1 FROM operacion_usuario ou WHERE ou.fk_idoperacion_financiera=o.idoperacion_financiera AND ou.fk_idusuario=$2 AND ou.activo) AS compartida
      FROM cuota q
      JOIN operacion_financiera o ON o.idoperacion_financiera=q.fk_idoperacion_financiera AND o.activo
      JOIN cliente c ON c.idcliente=o.fk_idcliente AND c.activo
      WHERE q.idcuota=$1 AND q.activo
        AND ($3::text='Administrador' OR o.creado_por=$2 OR EXISTS (
          SELECT 1 FROM operacion_usuario ou2 WHERE ou2.fk_idoperacion_financiera=o.idoperacion_financiera AND ou2.fk_idusuario=$2 AND ou2.activo
        ))
      FOR UPDATE`, [req.params.id, req.user!.id, req.user!.rol]);
    const q = cuota.rows[0];
    if (!q) throw new Error('Cuota no encontrada o no autorizada');
    if (q.estado === 'PAGADA' || q.estado === 'ANULADA') throw new Error('No se puede notificar una cuota pagada o anulada');
    const applied = await db.query(`SELECT COALESCE(SUM(monto_interes),0) AS interes_pagado,COALESCE(SUM(monto_capital),0) AS capital_pagado FROM pago_aplicacion WHERE fk_idcuota=$1 AND activo`, [q.idcuota]);
    const interest = Decimal.max(0, new Decimal(q.monto_interes).minus(applied.rows[0].interes_pagado));
    const capital = Decimal.max(0, new Decimal(q.monto_capital).minus(applied.rows[0].capital_pagado));
    const pending = interest.plus(capital);
    if (pending.lte(0)) throw new Error('La cuota no tiene saldo pendiente');
    const phone = normalizeWhatsApp(q.telefono1);
    if (!phone) throw new Error('El cliente no tiene un teléfono válido para WhatsApp');
    const notifiedAt = timestamp();
    await db.query('UPDATE cuota SET fecha_notificado=$1 WHERE idcuota=$2', [notifiedAt, q.idcuota]);
    const texto = [
      'NM CREDITOS',
      'RECORDATORIO DE PAGO',
      `Cliente: ${q.nombre_completo}`,
      `C.I.: ${q.cedula}`,
      `Cuota: ${q.numero}`,
      `Vencimiento: ${formatReportDate(q.fecha_vencimiento)}`,
      `Estado: ${q.estado}`,
      `Interés pendiente: ${formatGuarani(interest)}`,
      `Capital pendiente: ${formatGuarani(capital)}`,
      `Total a pagar: ${formatGuarani(pending)}`,
      `Saldo de la operación: ${formatGuarani(q.operacion_total)}`
    ].join('\n');
    return { idcuota: q.idcuota, idoperacion_financiera: q.fk_idoperacion_financiera, fecha_notificado: notifiedAt, notificado_hoy: true, cliente: q.nombre_completo, telefono1: q.telefono1, telefono_whatsapp: phone, monto_interes_pendiente: interest.toFixed(2), monto_capital_pendiente: capital.toFixed(2), monto_pendiente: pending.toFixed(2), texto_whatsapp: texto, whatsapp_url: `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(texto)}` };
  });
  res.json(result);
}));

app.get('/api/clientes', asyncRoute(async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const result = await pool.query(`SELECT c.*,
    (SELECT COUNT(*) FROM operacion_financiera o WHERE o.fk_idcliente=c.idcliente AND o.activo) AS operaciones
    FROM cliente c WHERE c.activo AND ($1='' OR c.nombre_completo ILIKE '%'||$1||'%' OR c.cedula ILIKE '%'||$1||'%')
    ORDER BY c.nombre_completo`, [q]);
  res.json(result.rows);
}));

app.get('/api/clientes/:id', asyncRoute(async (req, res) => {
  const [client, refs, files] = await Promise.all([
    pool.query('SELECT * FROM cliente WHERE idcliente=$1 AND activo', [req.params.id]),
    pool.query('SELECT * FROM cliente_referencia WHERE fk_idcliente=$1 AND activo ORDER BY posicion', [req.params.id]),
    pool.query(`SELECT ca.*, a.nombre_original, a.tipo_mime FROM cliente_archivo ca JOIN archivo a ON a.idarchivo=ca.fk_idarchivo WHERE ca.fk_idcliente=$1 AND ca.activo`, [req.params.id]),
  ]);
  if (!client.rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
  const fileWithUrl=(file:any)=>file?({...file,url:`/api/archivos/${file.fk_idarchivo}`}):null;
  res.json({ ...client.rows[0], referencias: refs.rows, archivos: files.rows.map(fileWithUrl), cedula_frente: fileWithUrl(files.rows.find((file:any)=>file.tipo_documento==='CEDULA_FRENTE')), cedula_atras: fileWithUrl(files.rows.find((file:any)=>file.tipo_documento==='CEDULA_REVERSO')), cedula_imagen: fileWithUrl(files.rows.find((file:any)=>file.tipo_documento==='CEDULA_FRENTE')) });
}));

const decimalInput = z.union([z.string(), z.number()]).refine(value => {
  const text = String(value); return /^\d+(\.\d{1,4})?$/.test(text) && Number(text) >= 0;
}, 'Debe ser un número no negativo');
const integerInput = z.union([z.string(), z.number()]).refine(value => /^\d+$/.test(String(value)) && Number(value) >= 0, 'Debe ser un número entero no negativo');
const clientSchema = z.object({
  nombre_completo: z.string().min(3), cedula: z.string().min(3), fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(), ruc: z.string().nullish(), direccion: z.string().min(3),
  telefono1: z.string().min(3), telefono2: z.string().nullish(), email: z.string().email().nullish().or(z.literal('')),
  latitud: z.union([z.string(), z.number()]).nullish(), longitud: z.union([z.string(), z.number()]).nullish(),
  direccion_trabajo: z.string().nullish(), nombre_empresa: z.string().nullish(), telefono_empresa: z.string().nullish(), ruc_empresa: z.string().nullish(),
  observacion: z.string().nullish(), profesion: z.string().nullish(), dedicacion: z.string().nullish(),
  ingreso_promedio: decimalInput.nullish(), tasa_interes_sugerida: integerInput.nullish(),
  referencias: z.array(z.object({ nombre_completo: z.string().min(3), fk_idtipo_referencia: z.coerce.number().int().positive(), telefono: z.string().min(3), direccion: z.string().nullish() })).length(1),
});

app.post('/api/clientes/enlaces', requirePermission('CLIENTE_CREAR'), asyncRoute(async (req, res) => {
  const token = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = DateTime.now().setZone(config.timezone).plus({ hours: 24 }).toFormat('yyyy-MM-dd HH:mm:ss');
  await pool.query('INSERT INTO enlace_cliente (token_hash,creado_por,fecha_expira) VALUES ($1,$2,$3)', [hash, req.user!.id, expiresAt]);
  const origin = config.origin.replace(/\/$/, '');
  res.status(201).json({ url: `${origin}/carga-cliente/${token}`, fecha_expira: expiresAt });
}));

app.post('/api/clientes', requirePermission('CLIENTE_CREAR'), asyncRoute(async (req, res) => {
  const data = clientSchema.parse(req.body);
  const id = await transaction(async (db) => {
    const result = await db.query(`INSERT INTO cliente (nombre_completo,cedula,fecha_nacimiento,ruc,direccion,telefono1,telefono2,email,latitud,longitud,fecha_ubicacion,direccion_trabajo,nombre_empresa,telefono_empresa,ruc_empresa,observacion,profesion,dedicacion,ingreso_promedio,tasa_interes_sugerida,creado_por)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NULLIF($8,''),$9,$10,CASE WHEN $9::numeric IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING idcliente`,
      [data.nombre_completo,data.cedula,data.fecha_nacimiento||null,data.ruc||null,data.direccion,data.telefono1,data.telefono2||null,data.email||null,data.latitud??null,data.longitud??null,data.direccion_trabajo||null,data.nombre_empresa||null,data.telefono_empresa||null,data.ruc_empresa||null,data.observacion||null,data.profesion||null,data.dedicacion||null,data.ingreso_promedio??null,data.tasa_interes_sugerida??null,req.user!.id]);
    for (let i=0;i<1;i++) { const ref=data.referencias[i]; const type = await db.query('SELECT idtipo_referencia FROM tipo_referencia WHERE idtipo_referencia=$1 AND activo', [ref.fk_idtipo_referencia]); if (!type.rows[0]) throw new Error('Tipo de referencia inválido'); await db.query('INSERT INTO cliente_referencia (fk_idcliente,posicion,nombre_completo,fk_idtipo_referencia,relacion,telefono,direccion,creado_por) VALUES ($1,$2,$3,$4,(SELECT nombre FROM tipo_referencia WHERE idtipo_referencia=$4),$5,$6,$7)',[result.rows[0].idcliente,i+1,ref.nombre_completo,ref.fk_idtipo_referencia,ref.telefono,ref.direccion||null,req.user!.id]); }
    return result.rows[0].idcliente;
  });
  res.status(201).json({ idcliente: id });
}));

app.patch('/api/clientes/:id', requirePermission('CLIENTE_EDITAR'), asyncRoute(async (req, res) => {
  const allowed=['nombre_completo','fecha_nacimiento','latitud','longitud','fecha_ubicacion','ruc','direccion','telefono1','telefono2','email','direccion_trabajo','nombre_empresa','telefono_empresa','ruc_empresa','observacion','profesion','dedicacion','ingreso_promedio','tasa_interes_sugerida'];
  const entries=Object.entries(req.body).filter(([k])=>allowed.includes(k));
  if(!entries.length) return res.status(400).json({error:'Sin campos para actualizar'});
  const values=entries.map(([,v])=>v===''?null:v); const sets=entries.map(([k],i)=>`${k}=$${i+1}`);
  const result=await pool.query(`UPDATE cliente SET ${sets.join(',')} WHERE idcliente=$${values.length+1} AND activo RETURNING *`,[...values,req.params.id]);
  if(!result.rows[0]) return res.status(404).json({error:'Cliente no encontrado'}); res.json(result.rows[0]);
}));
app.patch('/api/clientes/:id/referencias', requirePermission('CLIENTE_EDITAR'), asyncRoute(async (req,res)=>{
  const refs=z.array(z.object({idcliente_referencia:z.number().int().optional(),posicion:z.number().int().min(1).max(1),nombre_completo:z.string().min(3),telefono:z.string().min(3),direccion:z.string().nullish(),fk_idtipo_referencia:z.number().int().positive()})).length(1).parse(req.body.referencias);
  await transaction(async db=>{await db.query('UPDATE cliente_referencia SET activo=FALSE WHERE fk_idcliente=$1 AND posicion>1 AND activo',[req.params.id]);for(const ref of refs){const type=await db.query('SELECT 1 FROM tipo_referencia WHERE idtipo_referencia=$1 AND activo',[ref.fk_idtipo_referencia]);if(!type.rows[0])throw new Error('Tipo de referencia inválido');await db.query('UPDATE cliente_referencia SET activo=TRUE,nombre_completo=$1,telefono=$2,direccion=$3,fk_idtipo_referencia=$4,relacion=(SELECT nombre FROM tipo_referencia WHERE idtipo_referencia=$4) WHERE fk_idcliente=$5 AND posicion=$6',[ref.nombre_completo,ref.telefono,ref.direccion||null,ref.fk_idtipo_referencia,req.params.id,ref.posicion]);}});
  res.json({ok:true});
}));
app.delete('/api/clientes/:id', requirePermission('CLIENTE_EDITAR'), asyncRoute(async (req,res)=>{await pool.query('UPDATE cliente SET activo=FALSE WHERE idcliente=$1',[req.params.id]);res.status(204).end();}));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => { const folder=path.join(config.uploadDir,DateTime.now().toFormat('yyyy/MM')); fs.mkdirSync(folder,{recursive:true}); cb(null,folder); },
  filename: (_req,file,cb)=>cb(null,`${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload=multer({storage,limits:{fileSize:8*1024*1024},fileFilter:(_req,file,cb)=>cb(null,['image/jpeg','image/png','application/pdf'].includes(file.mimetype))});

const cedulaUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024},fileFilter:(_req,file,cb)=>cb(null,['image/jpeg','image/png'].includes(file.mimetype))});
const safeFilePart=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').toUpperCase()||'CLIENTE';

app.post('/api/clientes/:id/archivos', requirePermission('CLIENTE_EDITAR'), upload.single('archivo'), asyncRoute(async (req,res)=>{
  if(!req.file) return res.status(400).json({error:'Archivo requerido'});
  const type=String(req.body.tipo_documento??'OTRO'); if(!['CEDULA_FRENTE','CEDULA_REVERSO','OTRO'].includes(type)) return res.status(400).json({error:'Tipo inválido'});
  const digest=crypto.createHash('sha256').update(await fs.promises.readFile(req.file.path)).digest('hex');
  const id=await transaction(async db=>{const a=await db.query('INSERT INTO archivo (ruta,nombre_original,tipo_mime,tamano_bytes,hash_archivo,creado_por) VALUES ($1,$2,$3,$4,$5,$6) RETURNING idarchivo',[req.file!.path,req.file!.originalname,req.file!.mimetype,req.file!.size,digest,req.user!.id]);await db.query('INSERT INTO cliente_archivo (fk_idcliente,fk_idarchivo,tipo_documento,creado_por) VALUES ($1,$2,$3,$4)',[req.params.id,a.rows[0].idarchivo,type,req.user!.id]);return a.rows[0].idarchivo;});
  res.status(201).json({idarchivo:id});
}));

app.post('/api/clientes/:id/cedula', requirePermission('CLIENTE_EDITAR'), cedulaUpload.single('cedula'), asyncRoute(async (req,res)=>{
  if(!req.file) return res.status(400).json({error:'Imagen de cédula requerida (JPEG o PNG)'});
  const client=(await pool.query('SELECT idcliente,nombre_completo,cedula FROM cliente WHERE idcliente=$1 AND activo',[req.params.id])).rows[0];
  if(!client) return res.status(404).json({error:'Cliente no encontrado'});
  const lado=String(req.body.lado??'FRENTE').toUpperCase(); if(!['FRENTE','ATRAS'].includes(lado)) return res.status(400).json({error:'Lado de cédula inválido'});
  const tipoDocumento=lado==='FRENTE'?'CEDULA_FRENTE':'CEDULA_REVERSO';
  const ext=req.file.mimetype==='image/png'?'.png':'.jpg';
  const folder=path.join(config.uploadDir,'cedula_cliente',DateTime.now().toFormat('yyyy/MM')); fs.mkdirSync(folder,{recursive:true});
  const filename=`${safeFilePart(client.nombre_completo)}_${safeFilePart(client.cedula)}_${lado}${ext}`; const filePath=path.join(folder,filename);
  await fs.promises.writeFile(filePath,req.file.buffer);
  const digest=crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  try {
    const id=await transaction(async db=>{await db.query(`UPDATE cliente_archivo SET activo=FALSE WHERE fk_idcliente=$1 AND tipo_documento=$2 AND activo`,[client.idcliente,tipoDocumento]);const a=await db.query('INSERT INTO archivo (ruta,nombre_original,tipo_mime,tamano_bytes,hash_archivo,creado_por) VALUES ($1,$2,$3,$4,$5,$6) RETURNING idarchivo',[filePath,filename,req.file!.mimetype,req.file!.size,digest,req.user!.id]);await db.query('INSERT INTO cliente_archivo (fk_idcliente,fk_idarchivo,tipo_documento,creado_por) VALUES ($1,$2,$3,$4)',[client.idcliente,a.rows[0].idarchivo,tipoDocumento,req.user!.id]);return a.rows[0].idarchivo;});
    res.status(201).json({idarchivo:id,nombre_archivo:filename,tipo_mime:req.file.mimetype,url:`/api/archivos/${id}`});
  } catch(error) { await fs.promises.unlink(filePath).catch(()=>{}); throw error; }
}));

app.get('/api/archivos/:id', asyncRoute(async(req,res)=>{const result=await pool.query('SELECT * FROM archivo WHERE idarchivo=$1 AND activo',[req.params.id]);const row=result.rows[0];if(!row||!fs.existsSync(row.ruta))return res.status(404).json({error:'Archivo no encontrado'});res.type(row.tipo_mime).download(row.ruta,row.nombre_original);}));

app.get('/api/operaciones', asyncRoute(async(req,res)=>{
  const tipo=String(req.query.tipo??''); const estado=String(req.query.estado??''); const cliente=String(req.query.cliente??'').trim();
  const result=await pool.query(`SELECT o.*,c.nombre_completo,c.telefono1,p.idprestamo,v.idventa_financiada,pp.frecuencia,
    COALESCE((SELECT SUM(pa.monto_interes+pa.monto_capital) FROM pago_aplicacion pa JOIN pago pg ON pg.idpago=pa.fk_idpago WHERE pg.fk_idoperacion_financiera=o.idoperacion_financiera AND pa.activo AND pg.activo AND pg.estado='CONFIRMADO'),0) AS total_pagado,
    (SELECT MIN(fecha_vencimiento) FROM cuota q WHERE q.fk_idoperacion_financiera=o.idoperacion_financiera AND q.activo AND q.estado IN ('PENDIENTE','PARCIAL','VENCIDA')) AS proximo_vencimiento,
    (SELECT COUNT(*) FROM cuota q WHERE q.fk_idoperacion_financiera=o.idoperacion_financiera AND q.activo AND q.estado='PAGADA') AS cuotas_pagadas
    FROM operacion_financiera o JOIN cliente c ON c.idcliente=o.fk_idcliente LEFT JOIN prestamo p ON p.fk_idoperacion_financiera=o.idoperacion_financiera LEFT JOIN venta_financiada v ON v.fk_idoperacion_financiera=o.idoperacion_financiera LEFT JOIN plan_pago pp ON pp.fk_idoperacion_financiera=o.idoperacion_financiera
    WHERE o.activo AND ($1='' OR o.tipo=$1) AND ($2='' OR o.estado=$2) AND ($3='' OR c.nombre_completo ILIKE '%'||$3||'%' OR c.cedula ILIKE '%'||$3||'%') ORDER BY o.fecha_inicio DESC,o.idoperacion_financiera DESC`,[tipo,estado,cliente]);
  res.json(result.rows.map(r=>({...r,saldo:new Decimal(r.monto_total).minus(r.total_pagado).toFixed(2)})));
}));

app.get('/api/operaciones/:id', asyncRoute(async(req,res)=>{
  const operation=await pool.query(`SELECT o.*,c.nombre_completo,c.cedula,c.telefono1,pp.idplan_pago,pp.frecuencia,p.idprestamo,v.idventa_financiada,v.fk_idproducto,v.cantidad AS producto_cantidad,v.precio_unitario AS producto_precio_unitario,v.precio_contado AS producto_precio_contado,pr.nombre AS producto,pr.codigo AS producto_codigo
    FROM operacion_financiera o JOIN cliente c ON c.idcliente=o.fk_idcliente JOIN plan_pago pp ON pp.fk_idoperacion_financiera=o.idoperacion_financiera LEFT JOIN prestamo p ON p.fk_idoperacion_financiera=o.idoperacion_financiera LEFT JOIN venta_financiada v ON v.fk_idoperacion_financiera=o.idoperacion_financiera LEFT JOIN producto pr ON pr.idproducto=v.fk_idproducto WHERE o.idoperacion_financiera=$1 AND o.activo`,[req.params.id]);
  if(!operation.rows[0])return res.status(404).json({error:'Operación no encontrada'});
  const [cuotas,pagos,aplicaciones,garantia,usuarios]=await Promise.all([
    pool.query(`SELECT q.*,COALESCE(pa.interes_pagado,0) AS interes_pagado,COALESCE(pa.capital_pagado,0) AS capital_pagado
      FROM cuota q LEFT JOIN (
        SELECT pa.fk_idcuota,SUM(pa.monto_interes) AS interes_pagado,SUM(pa.monto_capital) AS capital_pagado
        FROM pago_aplicacion pa JOIN pago p ON p.idpago=pa.fk_idpago
        WHERE pa.activo AND p.activo AND p.estado='CONFIRMADO' GROUP BY pa.fk_idcuota
      ) pa ON pa.fk_idcuota=q.idcuota
      WHERE q.fk_idoperacion_financiera=$1 AND q.activo ORDER BY q.numero`,[req.params.id]),
    pool.query('SELECT p.*,fp.nombre AS forma_pago FROM pago p JOIN forma_pago fp ON fp.idforma_pago=p.fk_idforma_pago WHERE p.fk_idoperacion_financiera=$1 AND p.activo ORDER BY p.fecha_pago DESC',[req.params.id]),
    pool.query(`SELECT pa.fk_idpago,q.idcuota,q.numero,pa.monto_interes,pa.monto_capital,
      (pa.monto_interes+pa.monto_capital) AS monto_total
      FROM pago_aplicacion pa JOIN pago p ON p.idpago=pa.fk_idpago JOIN cuota q ON q.idcuota=pa.fk_idcuota
      WHERE p.fk_idoperacion_financiera=$1 AND p.activo AND p.estado='CONFIRMADO' AND pa.activo
      ORDER BY p.fecha_pago DESC,q.numero`,[req.params.id]),
    pool.query('SELECT g.* FROM garantia g JOIN prestamo p ON p.idprestamo=g.fk_idprestamo WHERE p.fk_idoperacion_financiera=$1 AND g.activo',[req.params.id]),
    pool.query('SELECT u.idusuario,u.nombres,u.apellidos FROM operacion_usuario ou JOIN usuario u ON u.idusuario=ou.fk_idusuario WHERE ou.fk_idoperacion_financiera=$1 AND ou.activo',[req.params.id])]);
  const cuotasConSaldo=cuotas.rows.map(q=>{const montoPagado=new Decimal(q.interes_pagado).plus(q.capital_pagado);return {...q,monto_pagado:montoPagado.toFixed(2),saldo_pendiente:Decimal.max(0,new Decimal(q.monto_total).minus(montoPagado)).toFixed(2)};});
  const pagado=cuotasConSaldo.reduce((sum,q)=>sum.plus(q.monto_pagado),new Decimal(0));
  const aplicacionesPorPago=new Map<number,unknown[]>();
  for(const aplicacion of aplicaciones.rows){const list=aplicacionesPorPago.get(aplicacion.fk_idpago)??[];list.push(aplicacion);aplicacionesPorPago.set(aplicacion.fk_idpago,list);}
  const pagosConDetalle=pagos.rows.map(p=>({...p,aplicaciones:aplicacionesPorPago.get(p.idpago)??[]}));
  res.json({...operation.rows[0],cuotas:cuotasConSaldo,pagos:pagosConDetalle,garantia:garantia.rows[0]??null,usuarios:usuarios.rows,total_pagado:pagado.toFixed(2),saldo:new Decimal(operation.rows[0].monto_total).minus(pagado).toFixed(2)});
}));

const percentageInput=z.union([z.string(),z.number()]).refine(value => /^\d+(\.\d{1,4})?$/.test(String(value)) && Number(value) >= 0, 'El porcentaje debe ser un número no negativo con hasta 4 decimales');
const operationSchema=z.object({fk_idcliente:z.number().int(),fecha_inicio:z.string(),monto_capital:z.union([z.string(),z.number()]),porcentaje_interes:percentageInput,monto_interes_objetivo:decimalInput.optional(),modo_interes:z.enum(['PORCENTAJE','MONTO']).default('PORCENTAJE'),cantidad_cuotas:z.number().int().positive(),frecuencia:z.enum(['DIARIA','SEMANAL','QUINCENAL','MENSUAL']),dias_semana:z.array(z.number().int()).optional(),dias_mes:z.array(z.number().int()).optional(),observacion:z.string().optional(),usuarios:z.array(z.number().int()).default([]),garantia:z.object({tipo_objeto:z.string(),descripcion:z.string(),marca:z.string().optional(),modelo:z.string().optional(),identificador:z.string().optional(),valor_aproximado:z.union([z.string(),z.number()]),valor_tasado:z.union([z.string(),z.number()])}).optional(),fk_idproducto:z.number().int().optional(),cantidad:z.number().int().positive().default(1),precio_contado:z.union([z.string(),z.number()]).optional()}).superRefine((value,ctx)=>{if(value.modo_interes==='MONTO'&&value.monto_interes_objetivo===undefined)ctx.addIssue({code:z.ZodIssueCode.custom,path:['monto_interes_objetivo'],message:'El monto de interés es obligatorio'});});

async function ensureCash(db:DbClient,date:string,user:number){const r=await db.query(`INSERT INTO caja (fecha,creado_por) VALUES ($1,$2) ON CONFLICT (fecha) DO UPDATE SET activo=TRUE RETURNING idcaja`,[date,user]);return r.rows[0].idcaja;}

async function createOperation(req:Request,res:Response,type:'PRESTAMO'|'VENTA_FINANCIADA'){
  const data=operationSchema.parse(req.body); const calc=data.modo_interes==='MONTO'
    ? calculateFlatLoanFromInterestAmount(String(data.monto_capital),String(data.monto_interes_objetivo),data.cantidad_cuotas)
    : calculateFlatLoan(String(data.monto_capital),String(data.porcentaje_interes),data.cantidad_cuotas); const effectivePercentage=calc.percentage; const dates=generateDueDates({fechaInicio:data.fecha_inicio,cantidadCuotas:data.cantidad_cuotas,frecuencia:data.frecuencia as Frecuencia,diasSemana:data.dias_semana,diasMes:data.dias_mes});
  const id=await transaction(async db=>{
    const c=await db.query(`SELECT c.idcliente,COALESCE(c.tasa_interes_sugerida,(SELECT interes_minimo FROM configuracion_financiera WHERE activo LIMIT 1),0) AS minimo,(SELECT COUNT(*) FROM cliente_referencia r WHERE r.fk_idcliente=c.idcliente AND r.activo) AS referencias FROM cliente c WHERE c.idcliente=$1 AND c.activo FOR UPDATE`,[data.fk_idcliente]);
    if(!c.rows[0])throw new Error('Cliente no encontrado');if(Number(c.rows[0].referencias)<1)throw new Error('El cliente debe tener al menos una referencia');if(new Decimal(effectivePercentage).lt(c.rows[0].minimo))throw new Error(`El interés mínimo es ${c.rows[0].minimo}%`);
    const op=await db.query(`INSERT INTO operacion_financiera (fk_idcliente,tipo,fecha_inicio,monto_capital,porcentaje_interes,monto_interes,monto_total,cantidad_cuotas,estado,observacion,creado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVA',$9,$10) RETURNING idoperacion_financiera`,[data.fk_idcliente,type,data.fecha_inicio,calc.capital,effectivePercentage,calc.interest,calc.total,data.cantidad_cuotas,data.observacion??null,req.user!.id]);
    const opId=op.rows[0].idoperacion_financiera;const plan=await db.query('INSERT INTO plan_pago (fk_idoperacion_financiera,frecuencia,creado_por) VALUES ($1,$2,$3) RETURNING idplan_pago',[opId,data.frecuencia,req.user!.id]);
    for(const day of data.dias_semana??[])await db.query('INSERT INTO plan_pago_dia_semana (fk_idplan_pago,dia_semana,creado_por) VALUES ($1,$2,$3)',[plan.rows[0].idplan_pago,day,req.user!.id]);
    for(const day of data.dias_mes??[])await db.query('INSERT INTO plan_pago_dia_mes (fk_idplan_pago,dia_mes,creado_por) VALUES ($1,$2,$3)',[plan.rows[0].idplan_pago,day,req.user!.id]);
    for(let i=0;i<dates.length;i++){const q=calc.cuotas[i];await db.query('INSERT INTO cuota (fk_idoperacion_financiera,numero,fecha_vencimiento,monto_capital,monto_interes,monto_total,creado_por) VALUES ($1,$2,$3,$4,$5,$6,$7)',[opId,i+1,dates[i],q.montoCapital,q.montoInteres,q.montoTotal,req.user!.id]);}
    for(const userId of [...new Set(data.usuarios)])await db.query('INSERT INTO operacion_usuario (fk_idoperacion_financiera,fk_idusuario,creado_por) VALUES ($1,$2,$3)',[opId,userId,req.user!.id]);
    if(type==='PRESTAMO'){const p=await db.query('INSERT INTO prestamo (fk_idoperacion_financiera,fecha_desembolso,creado_por) VALUES ($1,$2,$3) RETURNING idprestamo',[opId,data.fecha_inicio,req.user!.id]);if(data.garantia)await db.query(`INSERT INTO garantia (fk_idprestamo,fk_idusuario_tasador,tipo_objeto,descripcion,marca,modelo,identificador,valor_aproximado,valor_tasado,creado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$2)`,[p.rows[0].idprestamo,req.user!.id,data.garantia.tipo_objeto,data.garantia.descripcion,data.garantia.marca??null,data.garantia.modelo??null,data.garantia.identificador??null,String(data.garantia.valor_aproximado),String(data.garantia.valor_tasado)]);const cashId=await ensureCash(db,data.fecha_inicio,req.user!.id);await db.query(`INSERT INTO movimiento_caja (fk_idcaja,fk_idprestamo,tipo,monto,concepto,fecha_movimiento,creado_por) VALUES ($1,$2,'EGRESO',$3,$4,$5,$6)`,[cashId,p.rows[0].idprestamo,calc.capital,'Desembolso de préstamo',`${data.fecha_inicio} 12:00:00`,req.user!.id]);}
    else{if(!data.fk_idproducto)throw new Error('Producto requerido');await db.query('INSERT INTO venta_financiada (fk_idoperacion_financiera,fk_idproducto,cantidad,precio_unitario,precio_contado,creado_por) VALUES ($1,$2,$3,$4,$5,$6)',[opId,data.fk_idproducto,data.cantidad,new Decimal(data.monto_capital).div(data.cantidad).toFixed(2),String(data.precio_contado??data.monto_capital),req.user!.id]);}
    return opId;
  });res.status(201).json({idoperacion_financiera:id});
}
app.post('/api/operaciones/prestamos',requirePermission('PRESTAMO_CREAR'),asyncRoute((req,res)=>createOperation(req,res,'PRESTAMO')));
app.post('/api/operaciones/ventas',requirePermission('VENTA_CREAR'),asyncRoute((req,res)=>createOperation(req,res,'VENTA_FINANCIADA')));

app.post('/api/operaciones/:id/pagos',requirePermission('PAGO_CREAR'),asyncRoute(async(req,res)=>{
  const data=z.object({monto:z.union([z.string(),z.number()]).optional(),cuota_ids:z.array(z.number().int().positive()).optional(),modo:z.enum(['TOTAL','INTERES']).default('TOTAL'),descuento_general:z.union([z.string(),z.number()]).optional(),fk_idforma_pago:z.number().int(),referencia:z.string().optional(),observacion:z.string().optional()}).parse(req.body);
  if(data.modo==='INTERES'&&!data.cuota_ids?.length)throw new Error('El modo solo interés requiere seleccionar cuotas');
  const id=await transaction(async db=>{
    const op=await db.query('SELECT * FROM operacion_financiera WHERE idoperacion_financiera=$1 AND activo FOR UPDATE',[req.params.id]);
    if(!op.rows[0])throw new Error('Operación no encontrada');
    const installments=await db.query(`SELECT q.*,COALESCE(pa.interes_pagado,0) AS interes_pagado,COALESCE(pa.capital_pagado,0) AS capital_pagado
      FROM cuota q LEFT JOIN (
        SELECT pa.fk_idcuota,SUM(pa.monto_interes) AS interes_pagado,SUM(pa.monto_capital) AS capital_pagado
        FROM pago_aplicacion pa JOIN pago p ON p.idpago=pa.fk_idpago
        WHERE pa.activo AND p.activo AND p.estado='CONFIRMADO' GROUP BY pa.fk_idcuota
      ) pa ON pa.fk_idcuota=q.idcuota
      WHERE q.fk_idoperacion_financiera=$1 AND q.activo AND q.estado<>'ANULADA'
      ORDER BY q.fecha_vencimiento,q.numero FOR UPDATE OF q`,[req.params.id]);
    const pending=installments.rows.filter(q=>new Decimal(q.monto_total).minus(q.interes_pagado).minus(q.capital_pagado).gt(0));
    const selected=data.cuota_ids?.length?pending.filter(q=>data.cuota_ids!.includes(q.idcuota)):pending;
    if(data.cuota_ids?.length && data.cuota_ids.length!==selected.length)throw new Error('Una cuota seleccionada no pertenece a la operación o ya está pagada');
    if(!selected.length)throw new Error('Seleccione al menos una cuota');
    const discount=new Decimal(data.descuento_general??0);
    if(discount.lt(0))throw new Error('El descuento no puede ser negativo');
    if(discount.gt(0)&&(data.modo!=='TOTAL'||!data.cuota_ids?.length))throw new Error('El descuento solo se permite al liquidar cuotas seleccionadas');
    const contractual=selected.reduce((sum,q)=>sum.plus(new Decimal(q.monto_total).minus(q.interes_pagado).minus(q.capital_pagado)),new Decimal(0));
    let amount=data.cuota_ids?.length?(data.monto!==undefined?new Decimal(data.monto):contractual):new Decimal(data.monto??0);
    if(discount.gt(0)){if(discount.gte(contractual))throw new Error('El descuento debe ser menor que el saldo');if(!amount.plus(discount).eq(contractual))throw new Error('El pago más el descuento debe cubrir exactamente el saldo seleccionado');}
    if(amount.lte(0))throw new Error('Monto inválido');
    if(amount.gt(contractual))throw new Error(`El monto supera el saldo pendiente. Máximo permitido: ${contractual.toFixed(2)}`);
    const distribution=allocatePayment(selected,amount.toFixed(2),data.modo);
    if(new Decimal(distribution.remaining).gt(0))throw new Error(`El monto supera el saldo aplicable. Máximo permitido: ${contractual.toFixed(2)}`);
    const payment=await db.query(`INSERT INTO pago (fk_idoperacion_financiera,fk_idforma_pago,fecha_pago,monto,estado,referencia,observacion,creado_por) VALUES ($1,$2,$3,$4,'CONFIRMADO',$5,$6,$7) RETURNING idpago`,[req.params.id,data.fk_idforma_pago,timestamp(),amount.toFixed(2),data.referencia??null,data.observacion??null,req.user!.id]);
    const appliedByInstallment=new Map<number,{montoInteres:string;montoCapital:string}>();
    for(const application of distribution.allocations){await db.query('INSERT INTO pago_aplicacion (fk_idpago,fk_idcuota,monto_interes,monto_capital,creado_por) VALUES ($1,$2,$3,$4,$5)',[payment.rows[0].idpago,application.idcuota,application.montoInteres,application.montoCapital,req.user!.id]);appliedByInstallment.set(application.idcuota,application);}
    const after=selected.map(q=>{const applied=appliedByInstallment.get(q.idcuota);return {q,interestDue:Decimal.max(0,new Decimal(q.monto_interes).minus(q.interes_pagado).minus(applied?.montoInteres??0)),capitalDue:Decimal.max(0,new Decimal(q.monto_capital).minus(q.capital_pagado).minus(applied?.montoCapital??0))};});
    let discountRemaining=discount;let discountId=null;
    if(discount.gt(0)){const d=await db.query('INSERT INTO descuento_operacion (fk_idoperacion_financiera,fk_idpago,monto,fecha_aplicacion,creado_por) VALUES ($1,$2,$3,$4,$5) RETURNING iddescuento_operacion',[req.params.id,payment.rows[0].idpago,discount.toFixed(2),timestamp(),req.user!.id]);discountId=d.rows[0].iddescuento_operacion;}
    for(const item of after){let due=item.interestDue.plus(item.capitalDue);let applied=new Decimal(0);if(discountRemaining.gt(0)&&due.gt(0)){applied=Decimal.min(discountRemaining,due);discountRemaining=discountRemaining.minus(applied);await db.query('INSERT INTO descuento_aplicacion (fk_iddescuento_operacion,fk_idcuota,monto,creado_por) VALUES ($1,$2,$3,$4)',[discountId,item.q.idcuota,applied.toFixed(2),req.user!.id]);due=due.minus(applied);}const dueDate=item.q.fecha_vencimiento instanceof Date?DateTime.fromJSDate(item.q.fecha_vencimiento).toISODate():DateTime.fromISO(String(item.q.fecha_vencimiento)).toISODate();const status=due.eq(0)?'PAGADA':(dueDate&&dueDate<today()?'VENCIDA':'PENDIENTE');await db.query('UPDATE cuota SET estado=$1,fecha_pago=CASE WHEN $2 THEN COALESCE(fecha_pago,CURRENT_TIMESTAMP) ELSE NULL END,fecha_pago_interes=CASE WHEN $3 THEN COALESCE(fecha_pago_interes,CURRENT_TIMESTAMP) ELSE fecha_pago_interes END WHERE idcuota=$4',[status,status==='PAGADA',item.interestDue.eq(0),item.q.idcuota]);}
    const remainingBalance=installments.rows.reduce((sum,q)=>sum.plus(new Decimal(q.monto_total).minus(q.interes_pagado).minus(q.capital_pagado)),new Decimal(0)).minus(amount).minus(discount);
    if(remainingBalance.lte(0))await db.query(`UPDATE operacion_financiera SET estado='PAGADA' WHERE idoperacion_financiera=$1`,[req.params.id]);
    const cashId=await ensureCash(db,today(),req.user!.id);await db.query(`INSERT INTO movimiento_caja (fk_idcaja,fk_idpago,tipo,monto,concepto,fecha_movimiento,creado_por) VALUES ($1,$2,'INGRESO',$3,$4,$5,$6)`,[cashId,payment.rows[0].idpago,amount.toFixed(2),'Cobro de operación',timestamp(),req.user!.id]);
    if(discountId)await db.query(`INSERT INTO movimiento_caja (fk_idcaja,fk_iddescuento_operacion,tipo,monto,concepto,fecha_movimiento,creado_por) VALUES ($1,$2,'EGRESO',$3,$4,$5,$6)`,[cashId,discountId,discount.toFixed(2),'Descuento general de liquidación',timestamp(),req.user!.id]);
    return payment.rows[0].idpago;
  });
  const summary=(await pool.query(    `SELECT p.idpago,p.fecha_pago,p.monto,c.nombre_completo,c.cedula,c.telefono1,fp.nombre AS forma_pago,o.monto_total,(SELECT nombre_completo FROM propietario WHERE activo LIMIT 1) AS propietario,COALESCE((SELECT SUM(pa.monto_interes+pa.monto_capital) FROM pago_aplicacion pa JOIN pago px ON px.idpago=pa.fk_idpago WHERE px.fk_idoperacion_financiera=o.idoperacion_financiera AND pa.activo AND px.activo AND px.estado='CONFIRMADO'),0) AS total_pagado,
      COALESCE((SELECT SUM(pa.monto_interes) FROM pago_aplicacion pa WHERE pa.fk_idpago=p.idpago AND pa.activo),0) AS interes_aplicado,
      COALESCE((SELECT SUM(pa.monto_capital) FROM pago_aplicacion pa WHERE pa.fk_idpago=p.idpago AND pa.activo),0) AS capital_aplicado,
      COALESCE((SELECT d.monto FROM descuento_operacion d WHERE d.fk_idpago=p.idpago AND d.activo),0) AS descuento_aplicado
      FROM pago p JOIN cliente c ON c.idcliente=(SELECT fk_idcliente FROM operacion_financiera WHERE idoperacion_financiera=p.fk_idoperacion_financiera)
      JOIN forma_pago fp ON fp.idforma_pago=p.fk_idforma_pago JOIN operacion_financiera o ON o.idoperacion_financiera=p.fk_idoperacion_financiera WHERE p.idpago=$1`,[id])).rows[0];
  const totalAplicado=new Decimal(summary.interes_aplicado).plus(summary.capital_aplicado);const totalPagado=new Decimal(summary.total_pagado);const saldo=new Decimal(summary.monto_total).minus(totalPagado).minus(summary.descuento_aplicado);const concepto=Number(summary.descuento_aplicado)>0?'LIQUIDACIÓN CON DESCUENTO':Number(summary.capital_aplicado)===0?'PAGO DE INTERESES':'PAGO DE CUOTA';
  const phone=normalizeWhatsApp(summary.telefono1);const texto=[`PRÉSTAMOS CDE`,`COMPROBANTE DE PAGO #${summary.idpago}`,`Propietario: ${summary.propietario??'Préstamos CDE'}`,`Cliente: ${summary.nombre_completo}`,`C.I.: ${summary.cedula}`,`Fecha: ${DateTime.fromJSDate(summary.fecha_pago).toFormat('dd/MM/yyyy HH:mm')}`,`Forma de pago: ${summary.forma_pago}`,`Concepto: ${concepto}`,`Monto recibido: ${formatGuarani(summary.monto)}`,`Total pagado: ${formatGuarani(totalPagado)}`,...(Number(summary.descuento_aplicado)>0?[`Descuento aplicado: ${formatGuarani(summary.descuento_aplicado)}`]:[]),`Saldo restante: ${formatGuarani(saldo)}`,'Firma: ____________________'].join('\n');
  res.status(201).json({idpago:id,resumen:{...summary,saldo:saldo.toFixed(2),telefono_whatsapp:phone,texto_whatsapp:texto,whatsapp_url:phone?`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(texto)}`:null}});
}));


function formatReportDate(value: unknown){if(value instanceof Date)return DateTime.fromJSDate(value).toFormat('dd/MM/yyyy');const parsed=DateTime.fromISO(String(value??''));return parsed.isValid?parsed.toFormat('dd/MM/yyyy'):'—';}

function normalizeWhatsApp(value: unknown){let n=String(value??'').replace(/\D/g,'');if(n.startsWith('00'))n=n.slice(2);if(n.startsWith('0'))n='595'+n.slice(1);else if(!n.startsWith('595')&&n.length===9)n='595'+n;return n.length>=11?n:'';}

function formatGuarani(value: unknown){const integer=new Decimal(String(value??0)).toDecimalPlaces(0).toFixed(0);return 'Gs. '+integer.replace(/\B(?=(\d{3})+(?!\d))/g,'.');}

app.get('/api/operaciones/:id/cuenta.pdf',asyncRoute(async(req,res)=>{
  const op=(await pool.query(`SELECT o.*,pp.frecuencia AS frecuencia,c.nombre_completo,c.cedula,c.telefono1,pr.nombre_completo propietario FROM operacion_financiera o JOIN cliente c ON c.idcliente=o.fk_idcliente JOIN plan_pago pp ON pp.fk_idoperacion_financiera=o.idoperacion_financiera LEFT JOIN propietario pr ON pr.activo WHERE o.idoperacion_financiera=$1 AND o.activo`,[req.params.id])).rows[0];
  if(!op)return res.status(404).json({error:'Operación no encontrada'});
  const cuotas=(await pool.query(`SELECT q.*,COALESCE(pa.interes_pagado,0) interes_pagado,COALESCE(pa.capital_pagado,0) capital_pagado FROM cuota q LEFT JOIN (SELECT pa.fk_idcuota,SUM(pa.monto_interes) interes_pagado,SUM(pa.monto_capital) capital_pagado FROM pago_aplicacion pa JOIN pago p ON p.idpago=pa.fk_idpago WHERE pa.activo AND p.activo AND p.estado='CONFIRMADO' GROUP BY pa.fk_idcuota) pa ON pa.fk_idcuota=q.idcuota WHERE q.fk_idoperacion_financiera=$1 AND q.activo ORDER BY q.numero`,[req.params.id])).rows;
  const totalPagado=cuotas.reduce((s,q)=>s.plus(q.interes_pagado).plus(q.capital_pagado),new Decimal(0));const saldo=new Decimal(op.monto_total).minus(totalPagado);
  res.type('application/pdf');res.setHeader('Content-Disposition',`attachment; filename=cuenta-${op.idoperacion_financiera}.pdf`);const doc=new PDFDocument({size:'A4',margin:40});doc.pipe(res);const navy='#17324d',blue='#4f91c7',muted='#657b8c',line='#d6e1e8';
  doc.fillColor(navy).fontSize(22).font('Helvetica-Bold').text('PRÉSTAMOS CDE');doc.fontSize(11).font('Helvetica').fillColor(muted).text('CUENTA DETALLADA DEL PRÉSTAMO');doc.moveDown(.8).strokeColor(blue).lineWidth(2).moveTo(40,doc.y).lineTo(555,doc.y).stroke();doc.moveDown(1);
  doc.fillColor(navy).fontSize(13).font('Helvetica-Bold').text(`Cliente: ${op.nombre_completo}`).fontSize(10).font('Helvetica').fillColor('#222').text(`C.I.: ${op.cedula}`).text(`Fecha de inicio: ${formatReportDate(op.fecha_inicio)}`).text(`Frecuencia: ${op.frecuencia}`).text(`Tasa de interés: ${op.porcentaje_interes}%`).moveDown(.8);
  const boxY=doc.y;doc.roundedRect(40,boxY,515,55,6).fillAndStroke('#edf5f8',line);doc.fillColor(muted).fontSize(9).text('PRESTADO',55,boxY+10).text('TOTAL A COBRAR',220,boxY+10).text('TOTAL PAGADO',385,boxY+10);doc.fillColor(navy).fontSize(13).font('Helvetica-Bold').text(formatGuarani(op.monto_capital),55,boxY+27).text(formatGuarani(op.monto_total),220,boxY+27).text(formatGuarani(totalPagado),385,boxY+27);doc.y=boxY+75;doc.fillColor(navy).fontSize(12).font('Helvetica-Bold').text(`Saldo restante: ${formatGuarani(saldo)}`);doc.moveDown(.8);
  const cols=[40,75,170,270,370,470];const headers=['#','VENCIMIENTO','INTERÉS','CAPITAL','TOTAL','ESTADO'];const drawHeader=()=>{const y=doc.y;doc.rect(40,y,515,22).fill('#17324d');doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');headers.forEach((h,i)=>doc.text(h,cols[i]+3,y+7,{width:(i===0?32: i===1?90: i===4?95: i===5?80:100)}));doc.y=y+22};drawHeader();doc.font('Helvetica').fontSize(8).fillColor('#222');for(const q of cuotas){if(doc.y>760){doc.addPage();drawHeader();doc.font('Helvetica').fontSize(8).fillColor('#222')}const y=doc.y;doc.strokeColor(line).moveTo(40,y+20).lineTo(555,y+20).stroke();doc.text(`${q.numero}`,43,y+6).text(formatReportDate(q.fecha_vencimiento),78,y+6).text(formatGuarani(q.monto_interes),173,y+6).text(formatGuarani(q.monto_capital),273,y+6).text(formatGuarani(q.monto_total),373,y+6).text(q.estado,473,y+6);doc.y=y+21}doc.moveDown(1);doc.font('Helvetica-Bold').fontSize(10).text(`Total contractual: ${formatGuarani(op.monto_total)}`).text(`Total pagado: ${formatGuarani(totalPagado)}`).text(`Saldo restante: ${formatGuarani(saldo)}`);doc.moveDown(2).font('Helvetica').fillColor(muted).text('Documento generado por Préstamos CDE',{align:'center'});doc.end();
}));

app.get('/api/operaciones/:id/cuenta.xlsx',asyncRoute(async(req,res)=>{
  const op=(await pool.query(`SELECT o.*,pp.frecuencia AS frecuencia,c.nombre_completo,c.cedula,c.telefono1,pr.nombre_completo propietario FROM operacion_financiera o JOIN cliente c ON c.idcliente=o.fk_idcliente JOIN plan_pago pp ON pp.fk_idoperacion_financiera=o.idoperacion_financiera LEFT JOIN propietario pr ON pr.activo WHERE o.idoperacion_financiera=$1 AND o.activo`,[req.params.id])).rows[0];if(!op)return res.status(404).json({error:'Operación no encontrada'});
  const cuotas=(await pool.query(`SELECT q.*,COALESCE(pa.interes_pagado,0) interes_pagado,COALESCE(pa.capital_pagado,0) capital_pagado FROM cuota q LEFT JOIN (SELECT pa.fk_idcuota,SUM(pa.monto_interes) interes_pagado,SUM(pa.monto_capital) capital_pagado FROM pago_aplicacion pa JOIN pago p ON p.idpago=pa.fk_idpago WHERE pa.activo AND p.activo AND p.estado='CONFIRMADO' GROUP BY pa.fk_idcuota) pa ON pa.fk_idcuota=q.idcuota WHERE q.fk_idoperacion_financiera=$1 AND q.activo ORDER BY q.numero`,[req.params.id])).rows;const totalPagado=cuotas.reduce((s,q)=>s.plus(q.interes_pagado).plus(q.capital_pagado),new Decimal(0));const saldo=new Decimal(op.monto_total).minus(totalPagado);const wb=new ExcelJS.Workbook();wb.creator='Préstamos CDE';const ws=wb.addWorksheet('Cuenta');ws.mergeCells('A1:G1');ws.getCell('A1').value='PRÉSTAMOS CDE - CUENTA DETALLADA';ws.getCell('A1').font={bold:true,size:16,color:{argb:'FFFFFFFF'}};ws.getCell('A1').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF17324D'}};ws.getCell('A1').alignment={horizontal:'center'};ws.addRow(['Cliente',op.nombre_completo,'C.I.',op.cedula]);ws.addRow(['Fecha inicio',op.fecha_inicio,'Frecuencia',op.frecuencia]);ws.addRow(['Prestado',Number(op.monto_capital),'Total a cobrar',Number(op.monto_total),'Total pagado',Number(totalPagado),'Saldo',Number(saldo)]);ws.addRow([]);const header=ws.addRow(['#','Vencimiento','Interés','Capital','Total','Estado','Fecha de pago']);header.eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF17324D'}}});for(const q of cuotas)ws.addRow([q.numero,q.fecha_vencimiento,Number(q.monto_interes),Number(q.monto_capital),Number(q.monto_total),q.estado,q.fecha_pago??'']);ws.getColumn(1).width=8;ws.getColumn(2).width=16;ws.getColumn(3).width=16;ws.getColumn(4).width=16;ws.getColumn(5).width=16;ws.getColumn(6).width=14;ws.getColumn(7).width=20;[3,4,5].forEach(i=>ws.getColumn(i).numFmt='#,##0');ws.getRow(3).font={bold:true};ws.views=[{state:'frozen',ySplit:5}];res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition',`attachment; filename=cuenta-${op.idoperacion_financiera}.xlsx`);await wb.xlsx.write(res);res.end();
}));


app.get('/api/pagos/:id/comprobante.pdf',asyncRoute(async(req,res)=>{const result=await pool.query(`SELECT p.*,fp.nombre forma_pago,o.monto_total,c.nombre_completo,c.cedula,COALESCE((SELECT SUM(pa.monto_interes+pa.monto_capital) FROM pago_aplicacion pa JOIN pago px ON px.idpago=pa.fk_idpago WHERE px.fk_idoperacion_financiera=o.idoperacion_financiera AND pa.activo AND px.activo AND px.estado='CONFIRMADO'),0) total_pagado,COALESCE((SELECT SUM(pa.monto_capital) FROM pago_aplicacion pa WHERE pa.fk_idpago=p.idpago AND pa.activo),0) capital_aplicado,COALESCE((SELECT monto FROM descuento_operacion d WHERE d.fk_idpago=p.idpago AND d.activo),0) descuento_aplicado,pr.nombre_completo propietario,pr.ruc propietario_ruc FROM pago p JOIN forma_pago fp ON fp.idforma_pago=p.fk_idforma_pago JOIN operacion_financiera o ON o.idoperacion_financiera=p.fk_idoperacion_financiera JOIN cliente c ON c.idcliente=o.fk_idcliente LEFT JOIN propietario pr ON pr.activo WHERE p.idpago=$1`,[req.params.id]);const row=result.rows[0];if(!row)return res.status(404).json({error:'Pago no encontrado'});res.type('application/pdf');res.setHeader('Content-Disposition',`attachment; filename=comprobante-${row.idpago}.pdf`);const doc=new PDFDocument({size:[255,480],margin:20});doc.pipe(res);const navy='#17324d',muted='#5f7180',line='#d8e2e8';doc.fillColor(navy).fontSize(17).font('Helvetica-Bold').text('PRÉSTAMOS CDE',{align:'center'});doc.moveDown(.25).fontSize(9).font('Helvetica').fillColor(muted).text('COMPROBANTE DE PAGO',{align:'center',characterSpacing:1});doc.moveDown(.8);doc.strokeColor(navy).lineWidth(1).moveTo(20,doc.y).lineTo(235,doc.y).stroke();doc.moveDown(.8);doc.fillColor(navy).fontSize(12).font('Helvetica-Bold').text(`Comprobante N.º ${row.idpago}`);doc.moveDown(.7).fontSize(9).font('Helvetica').fillColor('#222').text(`Propietario: ${row.propietario??'Préstamos CDE'}`).text(`Cliente: ${row.nombre_completo}`).text(`C.I.: ${row.cedula}`).text(`Fecha: ${DateTime.fromJSDate(row.fecha_pago).toFormat('dd/MM/yyyy HH:mm')}`).text(`Forma de pago: ${row.forma_pago}`);doc.moveDown(.9);doc.fillColor(muted).fontSize(8).font('Helvetica-Bold').text(Number(row.descuento_aplicado)>0?'CONCEPTO: LIQUIDACIÓN CON DESCUENTO':Number(row.capital_aplicado)===0?'CONCEPTO: PAGO DE INTERESES':'CONCEPTO: PAGO DE CUOTA');doc.roundedRect(20,doc.y,215,55,6).fillAndStroke('#edf5f8',line);doc.fillColor(muted).fontSize(8).font('Helvetica-Bold').text('MONTO RECIBIDO',30,doc.y+10);doc.fillColor(navy).fontSize(19).font('Helvetica-Bold').text(formatGuarani(row.monto),30,doc.y+23);doc.y+=68;doc.strokeColor(line).moveTo(20,doc.y).lineTo(235,doc.y).stroke();doc.moveDown(.7).fillColor('#222').fontSize(10).font('Helvetica').text(`Total pagado:  ${formatGuarani(row.total_pagado)}`).text(`Saldo restante: ${formatGuarani(new Decimal(row.monto_total).minus(row.total_pagado).minus(row.descuento_aplicado))}`).text(Number(row.descuento_aplicado)>0?`Descuento aplicado: ${formatGuarani(row.descuento_aplicado)}`:'');doc.moveDown(2.5).fillColor(muted).fontSize(9).text('Firma: ____________________',{align:'center'});doc.end();}));

async function simpleList(res:Response,sql:string,params:unknown[]=[]){const r=await pool.query(sql,params);res.json(r.rows);}
app.get('/api/productos',asyncRoute(async(_q,res)=>simpleList(res,'SELECT * FROM producto WHERE activo ORDER BY nombre')));
app.post('/api/productos',requirePermission('PRODUCTO_EDITAR'),asyncRoute(async(req,res)=>{const d=z.object({codigo:z.string(),nombre:z.string(),descripcion:z.string().optional(),precio_referencia:z.union([z.string(),z.number()])}).parse(req.body);const r=await pool.query('INSERT INTO producto (codigo,nombre,descripcion,precio_referencia,creado_por) VALUES ($1,$2,$3,$4,$5) RETURNING *',[d.codigo,d.nombre,d.descripcion??null,String(d.precio_referencia),req.user!.id]);res.status(201).json(r.rows[0]);}));
app.patch('/api/productos/:id',requirePermission('PRODUCTO_EDITAR'),asyncRoute(async(req,res)=>{const d=z.object({nombre:z.string(),descripcion:z.string().nullish(),precio_referencia:z.union([z.string(),z.number()])}).parse(req.body);const r=await pool.query('UPDATE producto SET nombre=$1,descripcion=$2,precio_referencia=$3 WHERE idproducto=$4 AND activo RETURNING *',[d.nombre,d.descripcion??null,String(d.precio_referencia),req.params.id]);res.json(r.rows[0]);}));
app.delete('/api/productos/:id',requirePermission('PRODUCTO_EDITAR'),asyncRoute(async(req,res)=>{await pool.query('UPDATE producto SET activo=FALSE WHERE idproducto=$1',[req.params.id]);res.status(204).end();}));
app.get('/api/formas-pago',asyncRoute(async(_q,res)=>simpleList(res,'SELECT * FROM forma_pago WHERE activo ORDER BY nombre')));
const userResponse=`u.idusuario,u.login,u.nombres,u.apellidos,u.cedula,u.email,u.activo,u.fk_idrol,r.nombre AS rol`;
app.get('/api/usuarios',requirePermission('ADMINISTRAR'),asyncRoute(async(_q,res)=>simpleList(res,`SELECT ${userResponse} FROM usuario u JOIN rol r ON r.idrol=u.fk_idrol ORDER BY u.nombres,u.apellidos`)));
app.post('/api/usuarios',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const d=z.object({fk_idrol:z.number().int().positive(),login:z.string().trim().email(),password:z.string().min(8),nombres:z.string().trim().min(2),apellidos:z.string().trim().min(2),cedula:z.string().trim().min(3),email:z.string().trim().email().or(z.literal('')).optional()}).parse(req.body);const role=await pool.query('SELECT idrol FROM rol WHERE idrol=$1 AND activo',[d.fk_idrol]);if(!role.rows[0])throw new Error('El rol seleccionado no está activo');const hash=await bcrypt.hash(d.password,12);const r=await pool.query('INSERT INTO usuario(fk_idrol,login,password_hash,nombres,apellidos,cedula,email,creado_por) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING idusuario,login,nombres,apellidos,cedula,email,activo,fk_idrol',[d.fk_idrol,d.login,hash,d.nombres,d.apellidos,d.cedula,d.email||d.login,req.user!.id]);res.status(201).json(r.rows[0]);}));
app.patch('/api/usuarios/:id',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const d=z.object({fk_idrol:z.number().int().positive().optional(),login:z.string().trim().email().optional(),nombres:z.string().trim().min(2).optional(),apellidos:z.string().trim().min(2).optional(),cedula:z.string().trim().min(3).optional(),email:z.string().trim().email().or(z.literal('')).nullish()}).strict().parse(req.body);if(!Object.keys(d).length)return res.status(400).json({error:'Sin cambios'});if(d.fk_idrol!==undefined){const role=await pool.query('SELECT idrol FROM rol WHERE idrol=$1 AND activo',[d.fk_idrol]);if(!role.rows[0])throw new Error('El rol seleccionado no está activo');}const entries=Object.entries(d);const values=entries.map(([,value])=>value||null);const sets=entries.map(([key],index)=>`${key}=$${index+1}`);const r=await pool.query(`UPDATE usuario SET ${sets.join(',')} WHERE idusuario=$${values.length+1} RETURNING idusuario,login,nombres,apellidos,cedula,email,activo,fk_idrol`,[...values,req.params.id]);if(!r.rows[0])return res.status(404).json({error:'Usuario no encontrado'});res.json(r.rows[0]);}));
app.patch('/api/usuarios/:id/estado',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const d=z.object({activo:z.boolean()}).parse(req.body);if(Number(req.params.id)===req.user!.id&&!d.activo)throw new Error('No puede desactivar su propio usuario');const r=await pool.query('UPDATE usuario SET activo=$1 WHERE idusuario=$2 RETURNING idusuario,activo',[d.activo,req.params.id]);if(!r.rows[0])return res.status(404).json({error:'Usuario no encontrado'});res.json(r.rows[0]);}));
app.get('/api/roles',requirePermission('ADMINISTRAR'),asyncRoute(async(_q,res)=>simpleList(res,`SELECT r.*,COUNT(DISTINCT u.idusuario) FILTER (WHERE u.activo)::integer AS usuarios,COUNT(DISTINCT re.fk_idevento) FILTER (WHERE re.activo AND re.permitido)::integer AS permisos FROM rol r LEFT JOIN usuario u ON u.fk_idrol=r.idrol LEFT JOIN rol_evento re ON re.fk_idrol=r.idrol GROUP BY r.idrol ORDER BY r.nombre`)));
app.post('/api/roles',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const d=z.object({nombre:z.string().trim().min(2),descripcion:z.string().trim().nullish()}).parse(req.body);const r=await pool.query('INSERT INTO rol(nombre,descripcion,creado_por) VALUES($1,$2,$3) RETURNING *',[d.nombre,d.descripcion||null,req.user!.id]);res.status(201).json(r.rows[0]);}));
app.patch('/api/roles/:id',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const d=z.object({nombre:z.string().trim().min(2).optional(),descripcion:z.string().trim().nullish()}).strict().parse(req.body);if(!Object.keys(d).length)return res.status(400).json({error:'Sin cambios'});const entries=Object.entries(d);const values=entries.map(([,value])=>value??null);const sets=entries.map(([key],index)=>`${key}=$${index+1}`);const r=await pool.query(`UPDATE rol SET ${sets.join(',')} WHERE idrol=$${values.length+1} RETURNING *`,[...values,req.params.id]);if(!r.rows[0])return res.status(404).json({error:'Rol no encontrado'});res.json(r.rows[0]);}));
app.patch('/api/roles/:id/estado',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const d=z.object({activo:z.boolean()}).parse(req.body);const r=await pool.query('UPDATE rol SET activo=$1 WHERE idrol=$2 RETURNING idrol,activo',[d.activo,req.params.id]);if(!r.rows[0])return res.status(404).json({error:'Rol no encontrado'});res.json(r.rows[0]);}));
app.get('/api/roles/:id/permisos',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const r=await pool.query(`SELECT e.idevento,e.codigo,e.modulo,e.nombre,e.descripcion,e.activo,COALESCE(re.permitido AND re.activo,FALSE) AS permitido FROM evento e LEFT JOIN rol_evento re ON re.fk_idevento=e.idevento AND re.fk_idrol=$1 WHERE e.activo ORDER BY e.modulo,e.nombre`,[req.params.id]);res.json(r.rows);}));
app.put('/api/roles/:id/permisos',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const d=z.object({permisos:z.array(z.object({idevento:z.number().int().positive(),permitido:z.boolean()}))}).parse(req.body);const result=await transaction(async db=>{const role=await db.query('SELECT idrol FROM rol WHERE idrol=$1',[req.params.id]);if(!role.rows[0])throw new Error('Rol no encontrado');const ids=d.permisos.map(item=>item.idevento);if(ids.length)await db.query('UPDATE rol_evento SET permitido=FALSE,activo=FALSE WHERE fk_idrol=$1 AND NOT (fk_idevento=ANY($2::integer[]))',[req.params.id,ids]);else await db.query('UPDATE rol_evento SET permitido=FALSE,activo=FALSE WHERE fk_idrol=$1',[req.params.id]);for(const item of d.permisos){await db.query(`INSERT INTO rol_evento(fk_idrol,fk_idevento,permitido,creado_por,activo) VALUES($1,$2,$3,$4,$3) ON CONFLICT(fk_idrol,fk_idevento) DO UPDATE SET permitido=EXCLUDED.permitido,activo=EXCLUDED.activo,creado_por=EXCLUDED.creado_por`,[req.params.id,item.idevento,item.permitido,req.user!.id]);}return db.query(`SELECT e.idevento,e.codigo,e.modulo,e.nombre,e.descripcion,e.activo,COALESCE(re.permitido AND re.activo,FALSE) AS permitido FROM evento e LEFT JOIN rol_evento re ON re.fk_idevento=e.idevento AND re.fk_idrol=$1 WHERE e.activo ORDER BY e.modulo,e.nombre`,[req.params.id]);});res.json(result.rows);}));
app.get('/api/eventos',requirePermission('ADMINISTRAR'),asyncRoute(async(_q,res)=>simpleList(res,`SELECT e.*,COUNT(DISTINCT re.fk_idrol) FILTER (WHERE re.activo AND re.permitido)::integer AS roles FROM evento e LEFT JOIN rol_evento re ON re.fk_idevento=e.idevento GROUP BY e.idevento ORDER BY e.modulo,e.nombre`)));
app.post('/api/eventos',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const d=z.object({codigo:z.string().trim().min(2),modulo:z.string().trim().min(2),nombre:z.string().trim().min(2),descripcion:z.string().trim().nullish()}).parse(req.body);const r=await pool.query('INSERT INTO evento(codigo,modulo,nombre,descripcion,creado_por) VALUES($1,$2,$3,$4,$5) RETURNING *',[d.codigo,d.modulo,d.nombre,d.descripcion||null,req.user!.id]);res.status(201).json(r.rows[0]);}));
app.patch('/api/eventos/:id',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const d=z.object({codigo:z.string().trim().min(2).optional(),modulo:z.string().trim().min(2).optional(),nombre:z.string().trim().min(2).optional(),descripcion:z.string().trim().nullish()}).strict().parse(req.body);if(!Object.keys(d).length)return res.status(400).json({error:'Sin cambios'});const entries=Object.entries(d);const values=entries.map(([,value])=>value??null);const sets=entries.map(([key],index)=>`${key}=$${index+1}`);const r=await pool.query(`UPDATE evento SET ${sets.join(',')} WHERE idevento=$${values.length+1} RETURNING *`,[...values,req.params.id]);if(!r.rows[0])return res.status(404).json({error:'Evento no encontrado'});res.json(r.rows[0]);}));
app.patch('/api/eventos/:id/estado',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const d=z.object({activo:z.boolean()}).parse(req.body);const r=await pool.query('UPDATE evento SET activo=$1 WHERE idevento=$2 RETURNING idevento,activo',[d.activo,req.params.id]);if(!r.rows[0])return res.status(404).json({error:'Evento no encontrado'});res.json(r.rows[0]);}));
app.get('/api/bancos',asyncRoute(async(_q,res)=>simpleList(res,'SELECT * FROM banco WHERE activo ORDER BY nombre')));
app.post('/api/bancos',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const d=z.object({codigo:z.string().min(2),nombre:z.string().min(2)}).parse(req.body);const r=await pool.query('INSERT INTO banco(codigo,nombre,creado_por) VALUES($1,$2,$3) RETURNING *',[d.codigo,d.nombre,req.user!.id]);res.status(201).json(r.rows[0]);}));
app.delete('/api/bancos/:id',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{await pool.query('UPDATE banco SET activo=FALSE WHERE idbanco=$1',[req.params.id]);res.status(204).end();}));
app.get('/api/configuracion',asyncRoute(async(_q,res)=>simpleList(res,'SELECT idconfiguracion_financiera, trunc(interes_minimo)::integer AS interes_minimo, moneda, fecha_creado, creado_por, activo FROM configuracion_financiera WHERE activo LIMIT 1')));
app.patch('/api/configuracion/:id',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const d=z.object({interes_minimo:integerInput,moneda:z.literal('PYG')}).parse(req.body);const r=await pool.query('UPDATE configuracion_financiera SET interes_minimo=$1,moneda=$2 WHERE idconfiguracion_financiera=$3 AND activo RETURNING *',[String(d.interes_minimo),d.moneda,req.params.id]);res.json(r.rows[0]);}));
app.get('/api/gasto-tipos',asyncRoute(async(_q,res)=>simpleList(res,'SELECT * FROM gasto_tipo WHERE activo ORDER BY nombre')));
app.post('/api/gasto-tipos',requirePermission('ADMINISTRAR'),asyncRoute(async(req,res)=>{const d=z.object({nombre:z.string().min(2),descripcion:z.string().optional()}).parse(req.body);const r=await pool.query('INSERT INTO gasto_tipo(nombre,descripcion,creado_por) VALUES($1,$2,$3) RETURNING *',[d.nombre,d.descripcion??null,req.user!.id]);res.status(201).json(r.rows[0]);}));
app.get('/api/gastos',asyncRoute(async(req,res)=>simpleList(res,`SELECT g.*,gt.nombre tipo FROM gasto g JOIN gasto_tipo gt ON gt.idgasto_tipo=g.fk_idgasto_tipo WHERE g.activo AND ($1='' OR g.fecha=$1::date) ORDER BY g.fecha DESC,g.idgasto DESC`,[String(req.query.fecha??'')])));
app.post('/api/gastos',requirePermission('GASTO_CREAR'),asyncRoute(async(req,res)=>{const d=z.object({fk_idgasto_tipo:z.number().int(),fecha:z.string(),concepto:z.string(),monto:z.union([z.string(),z.number()]),observacion:z.string().optional()}).parse(req.body);const id=await transaction(async db=>{const g=await db.query('INSERT INTO gasto (fk_idgasto_tipo,fecha,concepto,monto,observacion,creado_por) VALUES ($1,$2,$3,$4,$5,$6) RETURNING idgasto',[d.fk_idgasto_tipo,d.fecha,d.concepto,String(d.monto),d.observacion??null,req.user!.id]);const cash=await ensureCash(db,d.fecha,req.user!.id);await db.query(`INSERT INTO movimiento_caja (fk_idcaja,fk_idgasto,tipo,monto,concepto,fecha_movimiento,creado_por) VALUES ($1,$2,'EGRESO',$3,$4,$5,$6)`,[cash,g.rows[0].idgasto,String(d.monto),d.concepto,`${d.fecha} 12:00:00`,req.user!.id]);return g.rows[0].idgasto;});res.status(201).json({idgasto:id});}));
app.get('/api/caja',asyncRoute(async(req,res)=>{const date=String(req.query.fecha??today());const r=await pool.query(`SELECT c.idcaja,c.fecha,mc.*,CASE WHEN mc.tipo='INGRESO' THEN mc.monto ELSE -mc.monto END AS efecto FROM caja c LEFT JOIN movimiento_caja mc ON mc.fk_idcaja=c.idcaja AND mc.activo WHERE c.fecha=$1 ORDER BY mc.fecha_movimiento,mc.idmovimiento_caja`,[date]);const rows=r.rows;const ingreso=rows.reduce((s,x)=>x.tipo==='INGRESO'?s.plus(x.monto):s,new Decimal(0));const egreso=rows.reduce((s,x)=>x.tipo==='EGRESO'?s.plus(x.monto):s,new Decimal(0));res.json({fecha:date,movimientos:rows.filter(x=>x.idmovimiento_caja),ingresos:ingreso.toFixed(2),egresos:egreso.toFixed(2),saldo:ingreso.minus(egreso).toFixed(2)});}));

if(fs.existsSync(config.clientDist)){app.use(express.static(config.clientDist));app.use((req,res,next)=>{if(req.path.startsWith('/api/'))return next();res.sendFile(path.join(config.clientDist,'index.html'));});}

app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{if(error instanceof PublicFormError)return res.status(error.status).json({error:error.message});if(error instanceof multer.MulterError){if(error.code==='LIMIT_FILE_SIZE')return res.status(413).json({error:'La imagen supera el límite de 8 MB. Elegí otra imagen o reducí su tamaño.'});return res.status(400).json({error:'No se pudieron cargar las imágenes de cédula'});}console.error(error);if(error instanceof z.ZodError)return res.status(400).json({error:'Datos inválidos',detalles:error.flatten()});const pgError=error as {code?:string;constraint?:string;message?:string};if(pgError.code==='23505')return res.status(409).json({error:'El registro ya existe',campo:pgError.constraint});if(pgError.code==='23503')return res.status(409).json({error:'El registro está relacionado con otros datos'});res.status(400).json({error:pgError.message??'Error inesperado'});});

export { app };

if(process.env.NODE_ENV!=='test'){
  const start=async()=>{await pool.query('SELECT 1');fs.mkdirSync(config.uploadDir,{recursive:true});if(fs.existsSync(config.certPath)&&fs.existsSync(config.keyPath)){https.createServer({cert:fs.readFileSync(config.certPath),key:fs.readFileSync(config.keyPath)},app).listen(config.port,config.host,()=>console.log(`Préstamos CDE: https://${config.lanHost}:${config.port}`));http.createServer(app).listen(config.httpPort,config.host,()=>console.log(`Acceso local: http://localhost:${config.httpPort}`));}else{http.createServer(app).listen(config.httpPort,config.host,()=>console.log(`Préstamos CDE: http://localhost:${config.httpPort} (ejecute npm run cert:generate para HTTPS/GPS)`));}};start().catch(error=>{console.error('No se pudo iniciar:',error);process.exit(1);});
}

