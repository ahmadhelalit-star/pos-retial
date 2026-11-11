import {useState} from 'react';

export function WarehouseSettings({api,user,organization,english,onSaved}){
  const t=(ar,en)=>english?en:ar;
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const {branches,warehouses}=organization;
  const visibleWarehouses=organization.manageableWarehouses??warehouses;
  async function addWarehouse(event){
    event.preventDefault();
    const form=event.currentTarget,fields=new FormData(form);
    const name=String(fields.get('name')).trim();
    if(!name){setError(t('أدخل اسم المخزن.','Enter a warehouse name.'));return;}
    setBusy(true);
    setError('');
    try{
      await api.request('/organization/warehouses',{method:'POST',body:{name,branchId:fields.get('branchId')}});
      form.reset();
      onSaved();
    }catch(failure){setError(failure.message);}
    finally{setBusy(false);}
  }
  return <section className="rounded-2xl border bg-white p-4 space-y-4">
    <h2 className="font-bold">{t('إدارة المخازن','Warehouse management')}</h2>
    {visibleWarehouses.length?<ul className="divide-y">{visibleWarehouses.map(warehouse=><li key={warehouse.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
      <div><strong>{warehouse.name}</strong>{!warehouses.some(row=>row.id===warehouse.id)&&<p className="text-xs text-gray-500">{t('غير مخصّص لحسابك. يمكن تخصيصه من صفحة المستخدمين.','Not assigned to your account. Assign it from Users.')}</p>}</div><span className="text-gray-500">{branches.find(branch=>branch.id===warehouse.branch_id)?.name}</span>
    </li>)}</ul>:<p>{t('لا توجد مخازن متاحة لحسابك.','No warehouses are available to your account.')}</p>}
    {user.permissions.includes('organization.manage')&&(branches.length?<form onSubmit={addWarehouse} className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1">{t('اسم المخزن','Warehouse name')}<input name="name" required maxLength={200} disabled={busy} className="border rounded-lg px-3"/></label>
      <label className="grid gap-1">{t('الفرع','Branch')}<select name="branchId" required disabled={busy} className="border rounded-lg px-3">{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      <button type="submit" disabled={busy} className="rounded-lg bg-emerald-700 text-white px-4 py-2.5 disabled:opacity-50">{busy?t('جارٍ الحفظ…','Saving…'):t('إضافة مخزن','Add warehouse')}</button>
    </form>:<p>{t('إضافة مخزن تتطلب فرعًا متاحًا لحسابك.','Adding a warehouse requires access to a branch.')}</p>)}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
