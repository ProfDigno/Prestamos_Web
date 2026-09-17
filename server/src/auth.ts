import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { config } from './config.js';

export interface SessionUser { id: number; login: string; nombre: string; rol: string; permisos: string[] }
declare global { namespace Express { interface Request { user?: SessionUser } } }

export function signSession(user: SessionUser) {
  return jwt.sign(user, config.sessionSecret, { expiresIn: '8h' });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.prestamos_session;
    if (!token) return res.status(401).json({ error: 'Sesión requerida' });
    const decoded = jwt.verify(token, config.sessionSecret) as SessionUser;
    const active = await pool.query('SELECT activo FROM usuario WHERE idusuario=$1', [decoded.id]);
    if (!active.rows[0]?.activo) return res.status(401).json({ error: 'Usuario inactivo' });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o vencida' });
  }
}

export function requirePermission(code: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.rol === 'Administrador' || req.user?.permisos.includes(code)) return next();
    return res.status(403).json({ error: 'No tiene permiso para esta acción' });
  };
}
