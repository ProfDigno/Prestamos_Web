import { describe,expect,it } from 'vitest';
import { allocatePayment,calculateBrokerCommission,calculateFlatLoan,calculateFlatLoanFromInterestAmount,generateDueDates } from './finance.js';

describe('finanzas',()=>{
  it('calcula interés plano y ajusta la última cuota',()=>{const r=calculateFlatLoan('1000','10',3);expect(r.interest).toBe('100.00');expect(r.total).toBe('1100.00');expect(r.cuotas.reduce((s,q)=>s+Number(q.montoTotal),0)).toBe(1100);});
  it('acepta porcentajes decimales',()=>{const r=calculateFlatLoan('1000000','12.5',3);expect(r.percentage).toBe('12.50000000');expect(r.interest).toBe('125000.00');expect(r.total).toBe('1125000.00');});
  it('calcula el porcentaje desde un monto de interés',()=>{const r=calculateFlatLoanFromInterestAmount('1000000','125000',3);expect(r.percentage).toBe('12.50000000');expect(r.interest).toBe('125000.00');});
  it('calcula la comisión del corredor sobre el capital',()=>{expect(calculateBrokerCommission('1000000','15')).toBe('150000.00');expect(calculateBrokerCommission('1000000','15')).not.toBe('45000.00');expect(calculateBrokerCommission('3','33.3333')).toBe('1.00');});
  it('conserva un monto directo aunque el porcentaje no sea periódico',()=>{const r=calculateFlatLoanFromInterestAmount('3','1',2);expect(r.percentage).toBe('33.33333333');expect(r.interest).toBe('1.00');expect(r.cuotas.reduce((s,q)=>s+Number(q.montoInteres),0)).toBe(1);});
  it('genera días diarios seleccionados después del inicio',()=>{expect(generateDueDates({fechaInicio:'2026-09-11',cantidadCuotas:3,frecuencia:'DIARIA',diasSemana:[1,3,5]})).toEqual(['2026-09-14','2026-09-16','2026-09-18']);});
  it('ajusta mensual al fin de febrero bisiesto',()=>{expect(generateDueDates({fechaInicio:'2028-01-31',cantidadCuotas:2,frecuencia:'MENSUAL',diasMes:[31]})).toEqual(['2028-02-29','2028-03-31']);});
  it('permite dos cuotas quincenales en la misma fecha',()=>{expect(generateDueDates({fechaInicio:'2026-01-31',cantidadCuotas:2,frecuencia:'QUINCENAL',diasMes:[30,31]})).toEqual(['2026-02-28','2026-02-28']);});
  it('distribuye un pago entre cuotas y deja el saldo en la siguiente',()=>{
    const cuotas=[1,2,3].map(numero=>({idcuota:numero,numero,monto_interes:'20000',monto_capital:'80000',interes_pagado:'0',capital_pagado:'0'}));
    const result=allocatePayment(cuotas,'250000');
    expect(result.remaining).toBe('0.00');
    expect(result.allocations.map(a=>a.montoTotal)).toEqual(['100000.00','100000.00','50000.00']);
    expect(result.allocations[2]).toMatchObject({montoInteres:'20000.00',montoCapital:'30000.00'});
  });
  it('acepta un abono menor que el interés pendiente',()=>{
    const result=allocatePayment([{idcuota:1,numero:1,monto_interes:'30000',monto_capital:'70000',interes_pagado:'0',capital_pagado:'0'}],'10000');
    expect(result.allocations[0]).toMatchObject({montoInteres:'10000.00',montoCapital:'0.00'});
  });
  it('devuelve el excedente que no puede aplicarse',()=>{
    const result=allocatePayment([{idcuota:1,numero:1,monto_interes:'20',monto_capital:'80',interes_pagado:'0',capital_pagado:'0'}],'120');
    expect(result.remaining).toBe('20.00');
  });
});
