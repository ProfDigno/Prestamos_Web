export async function api<T=any>(url:string,options:RequestInit={}):Promise<T>{
  const headers=new Headers(options.headers);if(options.body&&!(options.body instanceof FormData))headers.set('Content-Type','application/json');
  const response=await fetch(url,{...options,headers,credentials:'include'});
  if(!response.ok){let message=`Error ${response.status}`;try{const body=await response.json();message=body.error??message;}catch{}throw new Error(message);}
  if(response.status===204)return undefined as T;return response.json();
}

export const money=(value:string|number|null|undefined)=>new Intl.NumberFormat('es-PY',{style:'currency',currency:'PYG',maximumFractionDigits:0}).format(Number(value??0));
export const shortDate=(value:string|null|undefined)=>value?new Intl.DateTimeFormat('es-PY').format(new Date(`${value.slice(0,10)}T12:00:00`)):'—';
