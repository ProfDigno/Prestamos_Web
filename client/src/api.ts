const fieldNames:Record<string,string>={nombre_completo:'Nombre completo',cedula:'Cédula',fecha_nacimiento:'Fecha de nacimiento',direccion:'Dirección',telefono1:'Teléfono 1',telefono2:'Teléfono 2',email:'Email',ruc:'RUC',profesion:'Profesión',dedicacion:'Dedicación',ingreso_promedio:'Ingreso promedio',tasa_interes_sugerida:'Interés sugerido',referencias:'Referencia',fk_idtipo_referencia:'Tipo de referencia'};
const readableField=(field:string)=>fieldNames[field]??field.replace(/_/g,' ');
export async function api<T=any>(url:string,options:RequestInit={}):Promise<T>{
  const headers=new Headers(options.headers);if(options.body&&!(options.body instanceof FormData))headers.set('Content-Type','application/json');
  const response=await fetch(url,{...options,headers,credentials:'include'});
  if(!response.ok){let message=`Error ${response.status}`;try{const body=await response.json();message=body.error??message;const fields=body.detalles?.fieldErrors as Record<string,string[]>|undefined;if(fields){const detail=Object.entries(fields).filter(([,messages])=>messages?.length).map(([field,messages])=>`${readableField(field)}: ${messages.join(', ')}`).join(' · ');if(detail)message=`${message}. ${detail}`;}}catch{}throw new Error(message);}
  if(response.status===204)return undefined as T;return response.json();
}

export const money=(value:string|number|null|undefined)=>new Intl.NumberFormat('es-PY',{style:'currency',currency:'PYG',maximumFractionDigits:0}).format(Number(value??0));
export const shortDate=(value:string|null|undefined)=>value?new Intl.DateTimeFormat('es-PY').format(new Date(`${value.slice(0,10)}T12:00:00`)):'—';
