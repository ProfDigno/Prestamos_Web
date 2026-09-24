import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';

const query = vi.hoisted(() => vi.fn());
vi.mock('./db.js', () => ({ pool: { query }, transaction: vi.fn() }));

import { app } from './index.js';
import { signSession } from './auth.js';

const cookie = `prestamos_session=${signSession({ id: 1, login: 'test', nombre: 'Test', rol: 'Administrador', permisos: [] })}`;
let server: Server;
let baseUrl: string;

async function getAnalysis(queryString: string) {
  const response = await fetch(`${baseUrl}/api/gastos/analisis?${queryString}`, { headers: { Cookie: cookie } });
  return { status: response.status, body: await response.json() };
}

describe('análisis de gastos', () => {
  beforeAll(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No se pudo iniciar el servidor de prueba');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });

  beforeEach(() => {
    query.mockReset();
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT activo FROM usuario')) return { rows: [{ activo: true }] };
      if (sql.includes('WITH dias AS')) return { rows: [
        { fecha: '2026-09-01', monto: '15000.00', cantidad: 1 },
        { fecha: '2026-09-02', monto: '0', cantidad: 0 },
        { fecha: '2026-09-03', monto: '5000.00', cantidad: 1 },
      ] };
      if (sql.includes('JOIN forma_pago')) return { rows: [{ idforma_pago: 1, nombre: 'Efectivo', cantidad: 2, monto: '20000.00' }] };
      if (sql.includes('JOIN gasto_tipo')) return { rows: [{ idgasto_tipo: 3, nombre: 'Oficina', cantidad: 2, monto: '20000.00' }] };
      throw new Error(`Consulta inesperada: ${sql}`);
    });
  });

  it('incluye ambos extremos, días sin gastos y totales de gastos emitidos', async () => {
    const response = await getAnalysis('desde=2026-09-01&hasta=2026-09-03');
    expect(response.status).toBe(200);
    expect(response.body.periodo).toEqual({ from: '2026-09-01', to: '2026-09-03' });
    expect(response.body.total).toBe('20000.00');
    expect(response.body.cantidad).toBe(2);
    expect(response.body.por_dia).toHaveLength(3);
    expect(response.body.por_dia[1]).toEqual({ fecha: '2026-09-02', monto: '0', cantidad: 0 });
    expect(response.body.por_forma_pago[0].porcentaje).toBe('100.00');
    expect(response.body.tipos_frecuentes[0].cantidad).toBe(2);
    const aggregates = query.mock.calls.filter(([sql]) => !sql.startsWith('SELECT activo FROM usuario'));
    expect(aggregates).toHaveLength(3);
    for (const [sql, params] of aggregates) {
      expect(sql).toContain("g.activo AND g.estado='EMITIDO'");
      expect(sql).toContain('g.fecha BETWEEN $1::date AND $2::date');
      expect(params).toEqual(['2026-09-01', '2026-09-03']);
    }
    expect(aggregates[2][0]).toContain('ORDER BY cantidad DESC');
  });

  it('rechaza fechas inválidas antes de consultar gastos', async () => {
    const response = await getAnalysis('desde=2026-09-04&hasta=2026-09-03');
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('inicio');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('devuelve series y totales vacíos cuando no hay gastos', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.startsWith('SELECT activo FROM usuario')) return { rows: [{ activo: true }] };
      if (sql.includes('WITH dias AS')) return { rows: [{ fecha: '2026-09-01', monto: '0', cantidad: 0 }] };
      return { rows: [] };
    });
    const response = await getAnalysis('desde=2026-09-01&hasta=2026-09-01');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ total: '0.00', cantidad: 0, por_dia: [{ fecha: '2026-09-01', monto: '0', cantidad: 0 }], por_forma_pago: [], tipos_frecuentes: [] });
  });
});
