import {useState} from 'react';

export function StockPolicySettings({api,user,company,english,onSaved}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const allowed=user.permissions.includes('organization.manage');
  const change=async()=>{
    const allowNegativeStock=!company.allow_negative_stock;setBusy(true);setError('');
    try{const result=await api.request('/organization/stock-settings',{method:'PUT',body:{allowNegativeStock}});onSaved(result);}
    catch(failure){setError(failure.message);}finally{setBusy(false);}
  };
  return <div className="flex flex-col items-start gap-1">
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="text-xs font-bold whitespace-nowrap">{english?'Negative stock':'البيع بالسالب'}</span>
      <button type="button" role="switch" aria-label={english?'Allow selling out-of-stock products':'السماح بالبيع بالسالب'} aria-checked={Boolean(company.allow_negative_stock)} disabled={!allowed||busy} onClick={change}
        title={!allowed?(english?'Requires permission to manage store settings':'يتطلب صلاحية إدارة إعدادات المتجر'):(english?'Allow sales when stock is insufficient':'السماح بإتمام البيع رغم عدم كفاية المخزون')}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed ${company.allow_negative_stock?'bg-emerald-600':'bg-gray-300'}`}>
        <span aria-hidden="true" className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${company.allow_negative_stock?'translate-x-4':'translate-x-0'}`}/>
      </button>
    </div>
    {busy&&<p role="status" className="text-xs">{english?'Saving…':'جارٍ الحفظ…'}</p>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
