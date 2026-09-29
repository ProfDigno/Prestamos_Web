import { createContext, useContext } from 'react';

export const LoanEditingContext = createContext<{available:boolean;open:(id:number)=>void}>({available:false,open:()=>{}});

export function EditLoanButton({ operation, label='Editar préstamo' }: {operation:any;label?:string}) {
  const editing=useContext(LoanEditingContext);
  if (!editing.available || operation.tipo!=='PRESTAMO' || operation.activo===false || !['PENDIENTE','ACTIVA','PAGADA'].includes(operation.estado)) return null;
  return <button type="button" className="button secondary tiny" onClick={()=>editing.open(Number(operation.idoperacion_financiera))}>{label}</button>;
}
