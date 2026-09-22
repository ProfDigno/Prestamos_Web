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
  return calculateFlatLoanFromInterest(principal, interest, installments, percentage);
}

export function calculateBrokerCommission(interest: string, percentage: string): string {
  const amount = new Decimal(interest).mul(percentage).div(100);
  if (amount.lt(0)) throw new Error('Comisión inválida');
  return amount.toDecimalPlaces(2).toFixed(2);
}

function calculateFlatLoanFromInterest(principal: Decimal, interest: Decimal, installments: number, percentage: Decimal) {
  if (principal.lte(0) || interest.lt(0) || installments < 1) throw new Error('Datos financieros inválidos');
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
  return { capital: principal.toFixed(2), percentage: percentage.toFixed(8), interest: interest.toFixed(2), total: total.toFixed(2), cuotas };
}

export function calculateFlatLoanFromInterestAmount(capital: string, interestAmount: string, installments: number) {
  const principal = new Decimal(capital);
  const interest = new Decimal(interestAmount).toDecimalPlaces(2);
  if (principal.lte(0) || interest.lt(0) || installments < 1) throw new Error('Datos financieros inválidos');
  const percentage = interest.div(principal).mul(100);
  return calculateFlatLoanFromInterest(principal, interest, installments, percentage);
}

export interface PayableInstallment {
  idcuota: number;
  numero: number;
  monto_interes: string | number;
  monto_capital: string | number;
  interes_pagado: string | number;
  capital_pagado: string | number;
}

export interface PaymentAllocation {
  idcuota: number;
  numero: number;
  montoInteres: string;
  montoCapital: string;
  montoTotal: string;
}

export function allocatePayment(
  installments: PayableInstallment[],
  value: string | number,
  mode: 'TOTAL' | 'INTERES' = 'TOTAL',
) {
  let remaining = new Decimal(value);
  if (remaining.lte(0)) throw new Error('Monto inválido');
  const allocations: PaymentAllocation[] = [];

  for (const installment of installments) {
    if (remaining.lte(0)) break;
    const interestDue = Decimal.max(0, new Decimal(installment.monto_interes).minus(installment.interes_pagado));
    const capitalDue = Decimal.max(0, new Decimal(installment.monto_capital).minus(installment.capital_pagado));
    const interestPaid = Decimal.min(remaining, interestDue);
    remaining = remaining.minus(interestPaid);
    const capitalPaid = mode === 'INTERES' ? new Decimal(0) : Decimal.min(remaining, capitalDue);
    remaining = remaining.minus(capitalPaid);
    const total = interestPaid.plus(capitalPaid);
    if (total.gt(0)) allocations.push({
      idcuota: installment.idcuota,
      numero: installment.numero,
      montoInteres: interestPaid.toFixed(2),
      montoCapital: capitalPaid.toFixed(2),
      montoTotal: total.toFixed(2),
    });
  }

  return { allocations, remaining: remaining.toFixed(2) };
}
