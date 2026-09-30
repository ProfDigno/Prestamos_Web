// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';

const api=vi.hoisted(()=>vi.fn());
vi.mock('./api',()=>({api,money:(v:unknown)=>`Gs. ${v}`,shortDate:(v:string)=>v}));
import {NewOperation} from './App';
import {EditLoanButton,LoanEditingContext} from './LoanEditing';
const loan={idoperacion_financiera:42,idprestamo:10,tipo:'PRESTAMO',activo:true,estado:'ACTIVA',fk_idcliente:2,nombre_completo:'Cliente Dos',cedula:'22',fk_idcorredor:1,corredor_nombre:'Corredor',porcentaje_comision:'5',prestamo_fk_idforma_pago:2,prestamo_forma_pago:'Transferencia',fecha_inicio:'2026-09-01',monto_capital:'1000.00',monto_interes:'200.00',porcentaje_interes:'20',cantidad_cuotas:2,frecuencia:'QUINCENAL',dias_semana:[],dias_mes:[10,25],total_pagado:'500.00',total_descontado:'100.00'};
function mockApi(){api.mockImplementation(async(url:string)=>{
  if(url==='/api/operaciones/42')return loan;
  if(url==='/api/clientes')return [{idcliente:1,nombre_completo:'Cliente Uno',cedula:'11',tasa_interes_sugerida:30},{idcliente:2,nombre_completo:'Cliente Dos',cedula:'22'}];
  if(url==='/api/corredores/activos')return [{idcorredor:1,nombre_completo:'Corredor',porcentaje_comision:5}];
  if(url==='/api/formas-pago')return [{idforma_pago:1,codigo:'EFECTIVO',nombre:'Efectivo'},{idforma_pago:2,nombre:'Transferencia'}];
  if(url==='/api/productos')return [];
  if(url==='/api/operaciones/42/reemplazo'||url==='/api/operaciones/prestamos')return {idoperacion_financiera:99};
  throw new Error('API inesperada: '+url);
});}
afterEach(()=>{cleanup();api.mockReset();});
describe('edición de préstamos',()=>{
  it('precarga todos los campos sin sobrescribirlos con valores predeterminados y guarda un reemplazo',async()=>{
    mockApi();const done=vi.fn();render(<MemoryRouter><NewOperation editId={42} onDone={done}/></MemoryRouter>);
    await screen.findByText('Editar préstamo #10');
    expect((screen.getByLabelText('Monto') as HTMLInputElement).value).toBe('1.000');
    expect((screen.getByLabelText('Interés (%)') as HTMLInputElement).value).toBe('20');
    expect((screen.getByLabelText('Forma de pago') as HTMLSelectElement).value).toBe('2');
    expect((screen.getByLabelText('Primera fecha del mes') as HTMLInputElement).value).toBe('10');
    expect((screen.getByLabelText('Segunda fecha del mes') as HTMLInputElement).value).toBe('25');
    expect(screen.getByLabelText('Resumen de edición').textContent).toContain('Gs. 600');
    fireEvent.click(screen.getByRole('button',{name:'Guardar edición'}));
    fireEvent.click(screen.getByRole('button',{name:'Aceptar y guardar edición'}));
    await waitFor(()=>expect(done).toHaveBeenCalledWith(99));
    const [,options]=api.mock.calls.find(([url])=>url==='/api/operaciones/42/reemplazo')!;
    expect(JSON.parse(options.body)).toMatchObject({fk_idcliente:2,fk_idforma_pago:2,fk_idcorredor:1,monto_capital:'1000.00',monto_interes_objetivo:'200.00',modo_interes:'MONTO',dias_mes:[10,25]});
    expect(api.mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(1);
  });
  it('cancelar no escribe y un total inferior al mínimo no abre la confirmación',async()=>{
    mockApi();const cancel=vi.fn();render(<MemoryRouter><NewOperation editId={42} onCancel={cancel}/></MemoryRouter>);
    await screen.findByText('Editar préstamo #10');
    fireEvent.change(screen.getByLabelText('Monto'),{target:{value:'100'}});
    fireEvent.click(screen.getByRole('button',{name:'Guardar edición'}));
    expect(screen.getByText('El nuevo total no puede ser menor a lo pagado más los descuentos conservados.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Cancelar edición'}));expect(cancel).toHaveBeenCalled();
    expect(api.mock.calls.some(([,options])=>options?.method==='POST')).toBe(false);
  });
  it('el botón depende del permiso y estado y abre la operación correcta',()=>{
    const open=vi.fn();const view=render(<LoanEditingContext.Provider value={{available:false,open}}><EditLoanButton operation={loan}/></LoanEditingContext.Provider>);
    expect(screen.queryByRole('button')).toBeNull();
    view.rerender(<LoanEditingContext.Provider value={{available:true,open}}><EditLoanButton operation={loan}/></LoanEditingContext.Provider>);
    fireEvent.click(screen.getByRole('button',{name:'Editar préstamo'}));expect(open).toHaveBeenCalledWith(42);
    view.rerender(<LoanEditingContext.Provider value={{available:true,open}}><EditLoanButton operation={{...loan,estado:'EDITADO',activo:false}}/></LoanEditingContext.Provider>);
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('la creación habitual sigue usando su endpoint y sus valores predeterminados',async()=>{
    mockApi();const done=vi.fn();render(<MemoryRouter><NewOperation onDone={done}/></MemoryRouter>);
    await waitFor(()=>expect((screen.getByLabelText('Forma de pago') as HTMLSelectElement).value).toBe('1'));
    fireEvent.change(screen.getByLabelText('Monto'),{target:{value:'1000'}});
    fireEvent.click(screen.getByRole('button',{name:'Crear préstamo y generar cuotas'}));
    fireEvent.click(screen.getByRole('button',{name:'Aceptar y crear'}));await waitFor(()=>expect(done).toHaveBeenCalledWith(99));
    expect(api.mock.calls.some(([url])=>url==='/api/operaciones/prestamos')).toBe(true);
  });
  it('envía el cliente seleccionado después de filtrarlo por búsqueda',async()=>{
    mockApi();const done=vi.fn();render(<MemoryRouter><NewOperation onDone={done}/></MemoryRouter>);
    await waitFor(()=>expect((screen.getByLabelText('Cliente') as HTMLSelectElement).value).toBe('1'));
    fireEvent.change(screen.getByLabelText('Buscar cliente por nombre o cédula'),{target:{value:'Cliente Dos'}});
    fireEvent.change(screen.getByLabelText('Cliente'),{target:{value:'2'}});
    expect((screen.getByLabelText('Cliente') as HTMLSelectElement).value).toBe('2');
    fireEvent.click(screen.getByRole('button',{name:'Crear préstamo y generar cuotas'}));
    fireEvent.click(screen.getByRole('button',{name:'Aceptar y crear'}));
    await waitFor(()=>expect(done).toHaveBeenCalledWith(99));
    const [,options]=api.mock.calls.find(([url])=>url==='/api/operaciones/prestamos')!;
    expect(JSON.parse(options.body).fk_idcliente).toBe(2);
  });
});
