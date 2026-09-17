import { describe,expect,it } from 'vitest';
import { money,shortDate } from './api';

describe('formatos de interfaz',()=>{
  it('formatea guaraníes sin decimales',()=>expect(money('1500000.00')).toContain('1.500.000'));
  it('formatea una fecha ISO para Paraguay',()=>expect(shortDate('2026-09-14')).toContain('14'));
});
