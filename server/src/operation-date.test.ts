import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';

const mocks = vi.hoisted(() => ({ poolQuery: vi.fn(), dbQuery: vi.fn(), transaction: vi.fn() }));
vi.mock('./db.js', () => ({
  pool: { query: mocks.poolQuery },
  transaction: mocks.transaction,
}));

import { app } from './index.js';
import { signSession } from './auth.js';

const cookie = `prestamos_session=${signSession({ id: 1, login: 'test', nombre: 'Test', rol: 'Administrador', permisos: [] })}`;
let server: Server;
let baseUrl: string;

async function changeDate(value: string) {
  const response = await fetch(`${baseUrl}/api/operaciones/42/fecha-inicio`, {
    method: 'PATCH',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha_inicio: value }),
  });
  return { status: response.status, body: await response.json() };
}

describe('edición de fecha de operación', () => {
  beforeAll(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Servidor de prueba no disponible');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });

  beforeEach(() => {
    mocks.poolQuery.mockReset().mockResolvedValue({ rows: [{ activo: true }] });
    mocks.dbQuery.mockReset();
    mocks.transaction.mockReset().mockImplementation(async (fn: (db: { query: typeof mocks.dbQuery }) => Promise<unknown>) => fn({ query: mocks.dbQuery }));
  });

  it.each([
    ['PRESTAMO', 'DIARIA', [1, 2, 3, 4, 5], [], ['2026-09-28', '2026-09-29', '2026-09-30']],
    ['VENTA_FINANCIADA', 'SEMANAL', [1], [], ['2026-09-28', '2026-10-05', '2026-10-12']],
    ['PRESTAMO', 'QUINCENAL', [], [10, 25], ['2026-10-10', '2026-10-25', '2026-11-10']],
    ['VENTA_FINANCIADA', 'MENSUAL', [], [10], ['2026-10-10', '2026-11-10', '2026-12-10']],
  ] as const)('reajusta vencimientos de %s con frecuencia %s', async (type, frequency, weekDays, monthDays, expectedDates) => {
    mocks.dbQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM operacion_financiera o')) return { rows: [{ idoperacion_financiera: 42, tipo: type, cantidad_cuotas: 3, frecuencia: frequency, idprestamo: type === 'PRESTAMO' ? 7 : null }] };
      if (sql.includes('FROM cuota q LEFT JOIN')) return { rows: [
        { idcuota: 1, numero: 1, estado: 'PAGADA', interes_pagado: '20', capital_pagado: '80' },
        { idcuota: 2, numero: 2, estado: 'VENCIDA', interes_pagado: '0', capital_pagado: '0' },
        { idcuota: 3, numero: 3, estado: 'PENDIENTE', interes_pagado: '5', capital_pagado: '0' },
      ] };
      if (sql.includes('FROM plan_pago_dia_semana')) return { rows: weekDays.map(day => ({ dia_semana: day })) };
      if (sql.includes('FROM plan_pago_dia_mes')) return { rows: monthDays.map(day => ({ dia_mes: day })) };
      return { rows: [] };
    });
    const response = await changeDate('25/09/2026');
    expect(response).toEqual({ status: 200, body: { fecha_inicio: '2026-09-25', cuotas_reajustadas: 1 } });
    const updates = mocks.dbQuery.mock.calls.filter(([sql]) => String(sql).startsWith('UPDATE cuota'));
    expect(updates).toHaveLength(1);
    expect(updates[0][1]).toEqual([expectedDates[1], 2]);
    expect(mocks.dbQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE operacion_financiera SET fecha_inicio'))).toBe(true);
    expect(mocks.dbQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE prestamo SET fecha_desembolso'))).toBe(type === 'PRESTAMO');
    expect(mocks.dbQuery.mock.calls.every(([sql]) => !String(sql).includes('movimiento_caja'))).toBe(true);
    expect(mocks.dbQuery.mock.calls.find(([sql]) => String(sql).includes('FROM operacion_financiera o'))?.[0]).toContain('FOR UPDATE OF o');
    expect(mocks.dbQuery.mock.calls.find(([sql]) => String(sql).includes('FROM cuota q LEFT JOIN'))?.[0]).toContain('FOR UPDATE OF q');
  });

  it('rechaza una fecha imposible antes de iniciar la transacción', async () => {
    const response = await changeDate('31/02/2026');
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('reajusta todas las cuotas sin pagos y mantiene sus importes', async () => {
    mocks.dbQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM operacion_financiera o')) return { rows: [{ idoperacion_financiera: 42, tipo: 'VENTA_FINANCIADA', cantidad_cuotas: 2, frecuencia: 'MENSUAL', idprestamo: null }] };
      if (sql.includes('FROM cuota q LEFT JOIN')) return { rows: [
        { idcuota: 1, numero: 1, estado: 'PENDIENTE', interes_pagado: '0', capital_pagado: '0' },
        { idcuota: 2, numero: 2, estado: 'VENCIDA', interes_pagado: '0', capital_pagado: '0' },
      ] };
      if (sql.includes('FROM plan_pago_dia_semana')) return { rows: [] };
      if (sql.includes('FROM plan_pago_dia_mes')) return { rows: [{ dia_mes: 10 }] };
      return { rows: [] };
    });
    const response = await changeDate('25/09/2026');
    expect(response.body.cuotas_reajustadas).toBe(2);
    const updates = mocks.dbQuery.mock.calls.filter(([sql]) => String(sql).startsWith('UPDATE cuota'));
    expect(updates.map(([, params]) => params)).toEqual([['2026-10-10', 1], ['2026-11-10', 2]]);
    expect(updates.every(([sql]) => !String(sql).includes('monto_'))).toBe(true);
  });
});
