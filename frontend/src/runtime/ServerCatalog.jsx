import { lazy,Suspense,useEffect,useState,useCallback,useRef } from 'react';
import { useLocation,useNavigate } from 'react-router-dom';
const InventoryPage = lazy(() => import('../pages/inventory/InventoryPage'));
const CategoriesPanel = lazy(() => import('../pages/inventory/CategoriesPanel'));
import { productQuery } from '../services/apiClient';
import { LabelPrinting } from '../commercial/views';
import {StockPolicySettings} from '../pages/inventory/StockPolicySettings';

export function ServerCatalog({api,user,organization,locale,onCategoriesChanged,onStockPolicySaved}) {
  const location=useLocation();
  const navigate=useNavigate(),categoryTab=new URLSearchParams(location.search).get('tab')==='categories';
  const openTab=tab=>{const parameters=new URLSearchParams(location.search);parameters.delete('labels');if(tab==='categories')parameters.set('tab',tab);else parameters.delete('tab');navigate({pathname:location.pathname,search:parameters.toString()});};
  const [query,setQuery]=useState({q:'',category:'all',stock:'all',page:1,limit:50,warehouseId:organization.warehouses[0]?.id??''});
  const categoriesChanged=useCallback(items=>{onCategoriesChanged(items);setQuery(previous=>previous.category!=='all'&&!items.some(row=>row.id===previous.category)?{...previous,category:'all',page:1}:previous);},[onCategoriesChanged]);
  const [result,setResult]=useState({items:[],total:0});
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const [movementProduct,setMovementProduct]=useState(null);
  const [labelProduct,setLabelProduct]=useState(null);
  const english=locale==='en';
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      setLoading(true);setError('');
      api.request(productQuery(query),{signal:controller.signal}).then(setResult).catch(failure=>{if(failure.name!=='AbortError')setError(failure.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    },200);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[api,query,revision]);
  const loadVariantBalances=useCallback(id=>api.request(`/products/${encodeURIComponent(id)}/variant-balances`),[api]);
  const refresh=()=>setRevision(value=>value+1);
  const save=async product=>{
    const openingBalances=!product.version&&product.type==='stock'?(product.variants.length?product.variants.map(row=>({variantId:row.id,quantity:Number(row.stock)})):[{variantId:'',quantity:Number(product.stock)}]).filter(row=>row.quantity>0):[];
    const body=openingBalances.length?{...product,stock:0,variants:product.variants.map(row=>({...row,stock:0})),openingBalances}:product;
    const persisted=await api.request(`/products${product.version?`/${encodeURIComponent(product.id)}`:''}?warehouseId=${query.warehouseId}`,{method:product.version?'PUT':'POST',body});refresh();return persisted;
  };
  const archive=async id=>{try{await api.request(`/products/${encodeURIComponent(id)}`,{method:'DELETE'});refresh();}catch(failure){setError(failure.message);}};
  const changeQuery=change=>{setLoading(true);setQuery(previous=>({...previous,...change,page:change.page??1}));};
  return <div className="h-full flex flex-col min-h-0">
    <div className="retail-cashier-status">
      <label>{english?'Warehouse':'المخزن'} <select aria-label={english?'Warehouse':'المخزن'} className="border rounded-lg p-2" value={query.warehouseId} onChange={event=>changeQuery({warehouseId:event.target.value})}>{organization.warehouses.map(warehouse=><option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
      <span className="self-center text-gray-500">{english?'Catalog saved on server · Stock changes require a ledger entry':'الكتالوج محفوظ على الخادم · تغيير الرصيد بحركة موثقة'}</span>
    </div>
    {error&&<div role="alert" className="m-3 p-3 rounded-xl bg-red-50 text-red-700">{error} <button onClick={refresh}>{english?'Retry':'إعادة المحاولة'}</button></div>}
    {loading&&<p role="status" className="p-2 text-center">{english?'Loading…':'جارٍ التحميل…'}</p>}
    {!error&&<div className={`flex-1 min-h-0 ${loading?'opacity-50 pointer-events-none':''}`}>
      <Suspense fallback={<p role="status">{english?'Loading…':'جارٍ التحميل…'}</p>}><InventoryPage stockPolicyControl={<StockPolicySettings api={api} user={user} company={organization.company} english={english} onSaved={onStockPolicySaved}/>} key={location.key} initialLabelsOpen={new URLSearchParams(location.search).get('labels')==='1'} serverTotal={result.total} products={result.items} serverQuery={query} onServerQueryChange={changeQuery} permissions={user.permissions} ledgerMode financialOptions={organization} onPrepareLabels={product=>setLabelProduct(product)} onSaveProduct={save} onLoadVariantBalances={loadVariantBalances} onDeleteProduct={archive} onOpenCategories={()=>openTab('categories')} onAdjustStock={id=>setMovementProduct(result.items.find(product=>product.id===id))} /></Suspense>
    </div>}
    <div className="flex items-center justify-center gap-5 p-3 bg-white border-t text-sm">
      <button disabled={query.page<=1||loading} onClick={()=>changeQuery({page:query.page-1})}>{english?'Previous':'السابق'}</button>
      <span>{english?'Page':'صفحة'} {query.page} · {result.total} {english?'products':'منتج'}</span>
      <button disabled={query.page*query.limit>=result.total||loading} onClick={()=>changeQuery({page:query.page+1})}>{english?'Next':'التالي'}</button>
    </div>
    {categoryTab&&<CategoriesDialog english={english} onClose={()=>openTab('products')}><Suspense fallback={<p role="status" className="p-4">Loading...</p>}><CategoriesPanel api={api} permissions={user.permissions} english={english} onChanged={categoriesChanged} onShowProducts={id=>{changeQuery({category:id,q:'',stock:'all'});openTab('products');}}/></Suspense></CategoriesDialog>}
    {movementProduct&&<MovementForm product={movementProduct} warehouseId={query.warehouseId} api={api} locale={locale} onClose={()=>setMovementProduct(null)} onSaved={()=>{setMovementProduct(null);refresh();}} />}
    {labelProduct&&<LabelPrinting api={api} product={labelProduct} warehouseId={query.warehouseId} english={english} onClose={()=>setLabelProduct(null)}/>}
  </div>;
}

function CategoriesDialog({english,onClose,children}){
  const dialog=useRef(null);
  useEffect(()=>{const element=dialog.current;element.showModal();return()=>element.close();},[]);
  return <dialog ref={dialog} aria-label={english?'Manage categories':'إدارة التصنيفات'} onCancel={event=>{event.preventDefault();onClose();}} className="m-auto w-[calc(100%-2rem)] max-w-6xl max-h-[90vh] p-0 rounded-2xl border border-gray-200 bg-white text-gray-800 shadow-2xl backdrop:bg-black/50" dir={english?'ltr':'rtl'}>
    <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sticky top-0 bg-white z-10"><h2 className="font-bold text-[#00236f]">{english?'Categories':'التصنيفات'}</h2><button type="button" onClick={onClose} aria-label={english?'Close categories':'إغلاق التصنيفات'} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100">{english?'Close ✕':'إغلاق ✕'}</button></div>
    {children}
  </dialog>;
}

function MovementForm({product,warehouseId,api,locale,onClose,onSaved}) {
  const english=locale==='en', [error,setError]=useState(''),[busy,setBusy]=useState(false),[requestKey,setRequestKey]=useState(()=>crypto.randomUUID());
  const [form,setForm]=useState({unitId:product.baseUnitId??'base',variantId:product.variants?.[0]?.id??'',quantity:'1',unitCost:String(product.costPrice??0),reference:'',kind:'receipt'});
  const field=(name,value)=>{setForm(previous=>({...previous,[name]:value}));setRequestKey(crypto.randomUUID());};
  return <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><form className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3" onSubmit={async event=>{
    event.preventDefault();setBusy(true);setError('');
    try{await api.request('/stock/movements',{method:'POST',key:requestKey,body:{productId:product.id,warehouseId,unitId:form.unitId,variantId:form.variantId,quantity:Number(form.quantity),unitCost:Number(form.unitCost),reference:form.reference,kind:form.kind}});onSaved();}catch(failure){setError(failure.message);}finally{setBusy(false);}
  }}>
    <h2 className="font-bold">{english?'Documented stock movement':'حركة مخزون موثقة'} — {product.name}</h2>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    <label className="block">{english?'Type':'نوع الحركة'}<select className="border rounded-lg w-full p-2" value={form.kind} onChange={event=>field('kind',event.target.value)}><option value="receipt">{english?'Receipt':'إدخال'}</option><option value="issue">{english?'Issue (negative quantity)':'إخراج (كمية سالبة)'}</option><option value="adjustment">{english?'Adjustment':'تسوية'}</option><option value="opening">{english?'Opening':'رصيد افتتاحي'}</option></select></label>
    <label className="block">{english?'Unit':'الوحدة'}<select className="border rounded-lg w-full p-2" value={form.unitId} onChange={event=>field('unitId',event.target.value)}>{product.units.map(unit=><option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
    {product.variants.length>0&&<label className="block">{english?'Variant':'المتغير'}<select className="border rounded-lg w-full p-2" value={form.variantId} onChange={event=>field('variantId',event.target.value)}>{product.variants.map(variant=><option key={variant.id} value={variant.id}>{Object.values(variant.values).join(' / ')}</option>)}</select></label>}
    <label className="block">{english?'Quantity':'الكمية'}<input className="border rounded-lg w-full p-2" required type="number" step={product.allowFractional?'any':'1'} value={form.quantity} onChange={event=>field('quantity',event.target.value)} /></label>
    <label className="block">{english?'Cost per selected unit':'تكلفة الوحدة المختارة'}<input className="border rounded-lg w-full p-2" required type="number" min="0" step="any" value={form.unitCost} onChange={event=>field('unitCost',event.target.value)} /></label>
    <label className="block">{english?'Document reference':'مرجع المستند'}<input className="border rounded-lg w-full p-2" required maxLength={200} value={form.reference} onChange={event=>field('reference',event.target.value)} /></label>
    <div className="flex justify-between"><button type="button" disabled={busy} onClick={onClose}>{english?'Cancel':'إلغاء'}</button><button type="submit" disabled={busy} className="rounded-lg px-4 py-2 bg-emerald-600 text-white">{english?'Post movement':'تسجيل الحركة'}</button></div>
  </form></div>;
}
