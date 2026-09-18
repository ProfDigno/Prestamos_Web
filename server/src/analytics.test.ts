import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { analyticsPercentage, resolveAnalyticsRange } from './analytics.js';

describe('analítica del dashboard', () => {
  it('usa el primer día del mes y hoy como período predeterminado', () => {
    const now = DateTime.fromISO('2026-09-18T12:00:00', { zone: 'America/Asuncion' });
    expect(resolveAnalyticsRange(undefined, undefined, 'America/Asuncion', now)).toEqual({ from: '2026-09-01', to: '2026-09-18' });
  });

  it('rechaza períodos invertidos o fechas inexistentes', () => {
    expect(() => resolveAnalyticsRange('2026-09-20', '2026-09-18', 'America/Asuncion')).toThrow('inicio');
    expect(() => resolveAnalyticsRange('2026-02-30', '2026-03-01', 'America/Asuncion')).toThrow('inválido');
  });

  it('calcula porcentajes seguros y acotados', () => {
    expect(analyticsPercentage('25', '100')).toBe('25.00');
    expect(analyticsPercentage('0', '0')).toBe('0.00');
    expect(analyticsPercentage('120', '100')).toBe('100.00');
  });
});
