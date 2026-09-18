import { Decimal } from 'decimal.js';
import { DateTime } from 'luxon';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveAnalyticsRange(
  fromValue: unknown,
  toValue: unknown,
  timezone: string,
  now = DateTime.now().setZone(timezone),
) {
  const defaultTo = now.toISODate() as string;
  const defaultFrom = now.startOf('month').toISODate() as string;
  const from = String(fromValue ?? defaultFrom);
  const to = String(toValue ?? defaultTo);

  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) throw new Error('Las fechas deben tener formato YYYY-MM-DD');
  const start = DateTime.fromISO(from, { zone: timezone });
  const end = DateTime.fromISO(to, { zone: timezone });
  if (!start.isValid || !end.isValid || start.toISODate() !== from || end.toISODate() !== to) throw new Error('Período inválido');
  if (start > end) throw new Error('La fecha de inicio no puede ser posterior a la fecha final');

  return { from, to };
}

export function analyticsPercentage(part: Decimal.Value, total: Decimal.Value) {
  const denominator = new Decimal(total);
  if (denominator.lte(0)) return '0.00';
  return Decimal.min(100, Decimal.max(0, new Decimal(part).div(denominator).mul(100))).toFixed(2);
}
