import { Decimal } from 'decimal.js';
import { DateTime } from 'luxon';

export type Frecuencia = 'DIARIA' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';

export interface PlanInput {
  fechaInicio: string;
  cantidadCuotas: number;
  frecuencia: Frecuencia;
  diasSemana?: number[];
  diasMes?: number[];
}

const iso = (date: DateTime) => date.toISODate() as string;

function adjustedDay(year: number, month: number, requested: number): DateTime {
  const base = DateTime.local(year, month, 1);
  return base.set({ day: Math.min(requested, base.daysInMonth ?? 28) });
}

export function generateDueDates(input: PlanInput): string[] {
  if (!Number.isInteger(input.cantidadCuotas) || input.cantidadCuotas < 1) throw new Error('Cantidad de cuotas inválida');
  const start = DateTime.fromISO(input.fechaInicio).startOf('day');
  if (!start.isValid) throw new Error('Fecha de inicio inválida');
  const result: string[] = [];

  if (input.frecuencia === 'DIARIA' || input.frecuencia === 'SEMANAL') {
    const days = [...new Set(input.diasSemana ?? [])].sort((a, b) => a - b);
    if (!days.length || days.some((d) => d < 1 || d > 7)) throw new Error('Días de semana inválidos');
    if (input.frecuencia === 'SEMANAL' && days.length !== 1) throw new Error('El plan semanal requiere un día');
    let cursor = start.plus({ days: 1 });
    while (result.length < input.cantidadCuotas) {
      if (days.includes(cursor.weekday)) result.push(iso(cursor));
      cursor = cursor.plus({ days: 1 });
    }
    return result;
  }

  const days = [...new Set(input.diasMes ?? [])].sort((a, b) => a - b);
  const expected = input.frecuencia === 'QUINCENAL' ? 2 : 1;
  if (days.length !== expected || days.some((d) => d < 1 || d > 31)) throw new Error('Días del mes inválidos');
  let cursor = start.startOf('month');
  while (result.length < input.cantidadCuotas) {
    for (const day of days) {
      const candidate = adjustedDay(cursor.year, cursor.month, day);
      if (candidate > start && result.length < input.cantidadCuotas) result.push(iso(candidate));
    }
    cursor = cursor.plus({ months: 1 });
  }
  return result;
}

export function calculateFlatLoan(capital: string, rate: string, installments: number) {
  const principal = new Decimal(capital);
  const percentage = new Decimal(rate);
  if (principal.lte(0) || percentage.lt(0) || installments < 1) throw new Error('Datos financieros inválidos');
  const interest = principal.mul(percentage).div(100).toDecimalPlaces(2);
  const total = principal.plus(interest);
  const regularPrincipal = principal.div(installments).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  const regularInterest = interest.div(installments).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  const cuotas = Array.from({ length: installments }, (_, index) => {
    const last = index === installments - 1;
    const montoCapital = last ? principal.minus(regularPrincipal.mul(installments - 1)) : regularPrincipal;
    const montoInteres = last ? interest.minus(regularInterest.mul(installments - 1)) : regularInterest;
    return {
      montoCapital: montoCapital.toFixed(2),
      montoInteres: montoInteres.toFixed(2),
      montoTotal: montoCapital.plus(montoInteres).toFixed(2),
    };
  });
  return { capital: principal.toFixed(2), interest: interest.toFixed(2), total: total.toFixed(2), cuotas };
}
