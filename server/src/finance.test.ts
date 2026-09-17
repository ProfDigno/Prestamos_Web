import { describe,expect,it } from 'vitest';
import { calculateFlatLoan,generateDueDates } from './finance.js';

describe('finanzas',()=>{
  it('calcula interés plano y ajusta la última cuota',()=>{const r=calculateFlatLoan('1000','10',3);expect(r.interest).toBe('100.00');expect(r.total).toBe('1100.00');expect(r.cuotas.reduce((s,q)=>s+Number(q.montoTotal),0)).toBe(1100);});
  it('genera días diarios seleccionados después del inicio',()=>{expect(generateDueDates({fechaInicio:'2026-09-11',cantidadCuotas:3,frecuencia:'DIARIA',diasSemana:[1,3,5]})).toEqual(['2026-09-14','2026-09-16','2026-09-18']);});
  it('ajusta mensual al fin de febrero bisiesto',()=>{expect(generateDueDates({fechaInicio:'2028-01-31',cantidadCuotas:2,frecuencia:'MENSUAL',diasMes:[31]})).toEqual(['2028-02-29','2028-03-31']);});
  it('permite dos cuotas quincenales en la misma fecha',()=>{expect(generateDueDates({fechaInicio:'2026-01-31',cantidadCuotas:2,frecuencia:'QUINCENAL',diasMes:[30,31]})).toEqual(['2026-02-28','2026-02-28']);});
});
