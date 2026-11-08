import { useEffect,useMemo,useState } from 'react';
import { useLocation,useNavigate } from 'react-router-dom';
import App from '../App';
import { AppProvider } from '../store/AppProvider';
import { createApiClient } from '../services/apiClient';
import { Sidebar } from '../components/layout/Sidebar';
import { AppHeader } from '../components/layout/AppHeader';
import { HeaderSearchSlotContext } from '../components/layout/headerSearchSlot';
import { ServerCatalog } from './ServerCatalog';
import { readPreference,writePreference } from './preferences';
import { MODULE_TITLES } from '../../../shared/features';
import { ActivationPage } from '../commercial/ActivationPage';
import { ServerPOS } from '../commercial/ServerPOS';
import { PartnersView,ShiftsView,DocumentsView,PurchasingView,PaymentsView,ReportsView,OrdersView } from '../commercial/views';
import { FinanceSettings,AccessEditor,LegacyMigration } from '../commercial/admin';
import { terminalId } from '../commercial/device';
import { OperationsSettings } from '../commercial/OperationsSettings';
import { DeviceSettings } from '../commercial/AgentPrinting';

export function RetailRuntime() {
  const [demo,setDemo]=useState(import.meta.env.VITE_DATA_MODE==='demo');
  const [session,setSession]=useState(null),[checking,setChecking]=useState(true),[error,setError]=useState('');
  const [activation,setActivation]=useState(null);
  const api=useMemo(()=>createApiClient({onUnauthorized:()=>setSession(null),onActivationRequired:details=>setActivation({enforced:true,status:details.activationStatus??'NOT_ACTIVATED'})}),[]);
  const [attempt,setAttempt]=useState(0),[locale,setLocale]=useState(()=>readPreference('locale',document.documentElement.lang)==='en'?'en':'ar');
  const [dark,setDark]=useState(()=>readPreference('theme',document.documentElement.classList.contains('dark')?'dark':'light')==='dark');
  const navigate=useNavigate();
  const location=useLocation();
  useEffect(()=>{
    if(demo)return;
    const controller=new AbortController();
    api.request('/auth/me',{signal:controller.signal}).then(setSession).catch(failure=>{if(failure.name!=='AbortError'&&failure.status!==401)setError(failure.message);}).finally(()=>{if(!controller.signal.aborted)setChecking(false);});
    return ()=>controller.abort();
  },[api,demo,attempt]);
  useEffect(()=>{document.documentElement.lang=locale;document.documentElement.dir=locale==='ar'?'rtl':'ltr';window.dispatchEvent(new Event('retail-locale'));writePreference('locale',locale);},[locale]);
  useEffect(()=>{writePreference('theme',dark?'dark':'light');},[dark]);
  const english=locale==='en';
  useEffect(()=>{if(demo)return;let live=true;const check=()=>api.request('/offline-activation/status').then(value=>{if(live)setActivation(value);}).catch(()=>{});check();const timer=setInterval(check,10000);return()=>{live=false;clearInterval(timer);};},[api,demo]);
  if(demo)return <><div className="fixed bottom-2 left-2 z-[100] rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 shadow-lg"><strong>تجربة محلية / Local demo</strong><p>العمليات هنا مستقلة عن خادم Retail وغير إنتاجية.</p><button className="underline" onClick={()=>{setChecking(true);setError('');setDemo(false);navigate('/inventory');}}>العودة للخادم / Return to server</button></div><AppProvider><App /></AppProvider></>;
  const preferences=<><button onClick={()=>setLocale(value=>value==='ar'?'en':'ar')}>{english?'العربية':'English'}</button><button onClick={()=>setDark(value=>!value)}>{dark?(english?'Light':'فاتح'):(english?'Dark':'داكن')}</button></>;
  if(activation?.enforced&&(activation.status!=='ACTIVE'||location.pathname==='/activation'))return <div className={`retail-server ${dark?'retail-dark':''}`}><ActivationPage api={api} status={activation.status} english={english} onActivated={value=>{setActivation({...value,enforced:true});setChecking(true);setAttempt(previous=>previous+1);navigate('/inventory');}}/></div>;
  if(checking)return <div className="min-h-screen flex items-center justify-center" role="status">{english?'Checking session…':'جارٍ التحقق من الجلسة…'}</div>;
  if(!session)return <div className={`retail-server min-h-screen flex items-center justify-center p-5 bg-gray-100 ${dark?'retail-dark':''}`} dir={english?'ltr':'rtl'}><div className="bg-white rounded-3xl border shadow-sm w-full max-w-md p-7 space-y-5">
    <div className="flex justify-end gap-4 text-sm">{preferences}</div>
    <h1 className="text-xl font-bold">Sham Touch Retail</h1>
    <p className="text-gray-500">{english?'Sign in to the Retail server':'تسجيل الدخول إلى خادم Retail'}</p>
    {error&&<div role="alert" className="bg-red-50 text-red-700 p-3 rounded-xl">{error}<button onClick={()=>{setChecking(true);setError('');setAttempt(value=>value+1);}} className="block underline">{english?'Retry connection':'إعادة الاتصال'}</button></div>}
    <LoginForm api={api} english={english} onLogin={setSession} />
    <p className="text-xs text-gray-500">{english?'Local test version connected to the Retail server.':'نسخة اختبار محلية متصلة بسيرفر Retail.'}</p>
    <button className="text-xs underline" onClick={()=>{setDemo(true);navigate('/sales');}}>{english?'Open the separate local demo':'فتح التجربة المحلية المنفصلة'}</button>
  </div></div>;
  return <ServerShell api={api} session={session} preferences={preferences} locale={locale} dark={dark} onDemo={()=>{setDemo(true);navigate('/sales');}} onLogout={async()=>{await api.request('/auth/logout',{method:'POST',body:{}});api.setCsrfToken(null);setSession(null);}} />;
}

function LoginForm({api,english,onLogin}) {
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  return <form className="space-y-4" onSubmit={async event=>{
    event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setError('');
    try{onLogin(await api.request('/auth/login',{method:'POST',body:{username:form.get('username'),password:form.get('password')}}));}catch(failure){setError(failure.message);}finally{setBusy(false);}
  }}>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    <label className="block">{english?'Username':'اسم المستخدم'}<input className="block mt-1 w-full border rounded-xl p-3" required name="username" autoComplete="username" maxLength={80} /></label>
    <label className="block">{english?'Password':'كلمة المرور'}<input className="block mt-1 w-full border rounded-xl p-3" required name="password" type="password" autoComplete="current-password" maxLength={200} /></label>
    <button className="bg-emerald-600 text-white rounded-xl w-full p-3 font-bold" disabled={busy}>{busy?(english?'Signing in…':'جارٍ الدخول…'):(english?'Sign in':'تسجيل الدخول')}</button>
  </form>;
}

function CommercialContent(props){
  const {api,user,organization,english,path,search,onShift,onDemo,onOrganizationChange}=props;
  const allowed=permission=>user.permissions.includes(permission),denied=<p className="p-6">{english?'Permission required':'ليست لديك صلاحية'}</p>;
  if(!organization)return null;
  if(path==='/devices')return allowed('printing.create')?<DeviceSettings english={english}/>:denied;
  if(path==='/operations')return allowed('organization.manage')&&user.roles.some(role=>role.is_admin)?<OperationsSettings api={api} english={english}/>:denied;
  if(path==='/sales'&&allowed('sales.post'))return <ServerPOS api={api} user={user} organization={organization} english={english} onShift={onShift}/>;
  if(path==='/invoices')return allowed('sales.read')?<DocumentsView api={api} user={user} organization={organization} english={english}/>:denied;
  if(path==='/purchases'&&new URLSearchParams(search).get('view')==='suppliers')return allowed('partners.read')?<PartnersView api={api} user={user} english={english} kind="supplier"/>:denied;
  if(path==='/purchases')return allowed('purchases.post')?<PurchasingView api={api} user={user} organization={organization} english={english}/>:denied;
  if(path==='/purchase-history')return allowed('purchases.read')?<DocumentsView api={api} user={user} organization={organization} english={english} type="purchases"/>:denied;
  if(path==='/customers'||path==='/suppliers')return allowed('partners.read')?<PartnersView api={api} user={user} english={english} kind={path==='/customers'?'customer':'supplier'}/>:denied;
  if(path==='/shift')return allowed('shifts.read')?<ShiftsView api={api} user={user} organization={organization} english={english}/>:denied;
  if(path==='/payments')return allowed('payments.read')?<PaymentsView api={api} user={user} organization={organization} english={english}/>:denied;
  if(path==='/dashboard')return allowed('reports.read')?<ReportsView api={api} english={english}/>:denied;
  if(path==='/orders')return allowed('modules.advancedSales')?<OrdersView api={api} user={user} english={english}/>:denied;
  if(path==='/settings')return allowed('organization.read')?<FinanceSettings api={api} user={user} organization={organization} english={english} onSaved={onOrganizationChange}/>:denied;
  return <div className="p-8 space-y-4"><h1 className="font-bold text-xl">{english?'Local demo is separate from the server':'التجربة المحلية مستقلة عن السيرفر'}</h1><p>{english?'Use the connected cashier for actual test transactions. The old local demo retains its own browser data.':'استخدم الكاشير المتصل لعمليات الاختبار الفعلية. التجربة المحلية القديمة تحتفظ ببيانات المتصفح الخاصة بها.'}</p><button className="border rounded-xl p-3" onClick={onDemo}>{english?'Open local demo':'فتح التجربة المحلية'}</button></div>;
}

function ServerShell({api,session,preferences,locale,dark,onDemo,onLogout}) {
  const [organization,setOrganization]=useState(null),[error,setError]=useState(''),[searchSlot,setSearchSlot]=useState(null);
  const location=useLocation(),navigate=useNavigate(),user=session.user,english=locale==='en';
  const [orgRevision,setOrgRevision]=useState(0),[currentShift,setCurrentShift]=useState(null),[modules,setModules]=useState([]),[device]=useState(()=>terminalId());
  const allowed=permission=>user.permissions.includes(permission);
  useEffect(()=>{let active=true;api.request('/organization').then(value=>{if(active)setOrganization(value);}).catch(failure=>{if(active)setError(failure.message);});api.request('/modules').then(value=>{if(active)setModules(value.items);}).catch(()=>{});return()=>{active=false;};},[api,orgRevision]);
  useEffect(()=>{if(!user.permissions.includes('shifts.read'))return;let active=true;api.request('/shifts').then(value=>{if(active)setCurrentShift(value.items.find(row=>!row.closed_at&&row.user_id===user.id&&row.device_id===device)??null);}).catch(()=>{});return()=>{active=false;};},[api,user,device,location.pathname]);
  const path=location.pathname,inventory=path==='/'||path==='/inventory';
  const activeTab=inventory?'inventory':path.slice(1);
  const adminPage=path.startsWith('/admin/');
  const handleLogout=async()=>{try{await onLogout();}catch(failure){setError(failure.message);}};
  return <HeaderSearchSlotContext.Provider value={searchSlot}><div className={`retail-server h-screen flex bg-gray-100 text-gray-800 ${dark?'retail-dark':''}`} dir={english?'ltr':'rtl'}>
    <Sidebar storeSettings={{storeName:organization?.company.name??'Sham Touch Retail'}} cashier={user.name} shiftStatus={currentShift?'open':'closed'} invoicesCount={0} />
    <div className="min-w-0 flex-1 flex flex-col">
      <div className="flex flex-wrap justify-between items-center gap-3 px-4 py-2 bg-white border-b text-xs">
        <span>{english?'Server catalog · Local testing':'كتالوج الخادم · اختبار محلي'} — {user.name}</span>
        <div className="flex gap-4">{preferences}<button onClick={handleLogout}>{english?'Sign out':'تسجيل الخروج'}</button></div>
      </div>
      <AppHeader activeTab={activeTab} shift={{status:currentShift?'open':'closed'}} cashier={user.name} onTabChange={tab=>navigate(`/${tab}`)} searchSlotRef={setSearchSlot} />
      <nav className="flex flex-wrap gap-4 px-4 py-2 bg-white border-b text-xs">
        {allowed('catalog.read')&&<button onClick={()=>navigate('/inventory')}>{english?'Products':'المنتجات'}</button>}
        {allowed('modules.read')&&<button onClick={()=>navigate('/admin/modules')}>{english?'Modules':'الوحدات'}</button>}
        {allowed('users.read')&&<button onClick={()=>navigate('/admin/users')}>{english?'Users':'المستخدمون'}</button>}
        {allowed('roles.read')&&<button onClick={()=>navigate('/admin/roles')}>{english?'Roles':'الأدوار'}</button>}
        {allowed('imports.preview')&&<button onClick={()=>navigate('/admin/import')}>{english?'Import copy':'استيراد نسخة'}</button>}
        {allowed('sales.post')&&<button onClick={()=>navigate('/sales')}>{english?'Cashier':'الكاشير'}</button>}
        {allowed('purchases.read')&&<button onClick={()=>navigate('/purchase-history')}>{english?'Purchase history':'سجل الشراء'}</button>}
        {allowed('payments.read')&&<button onClick={()=>navigate('/payments')}>{english?'Payments':'السندات'}</button>}
        {allowed('printing.create')&&<button onClick={()=>navigate('/devices')}>{english?'Device / printers':'الجهاز والطابعات'}</button>}
        {allowed('organization.manage')&&user.roles.some(role=>role.is_admin)&&<button onClick={()=>navigate('/operations')}>{english?'Backups / recovery':'النسخ والاستعادة'}</button>}
        {modules.some(row=>row.id==='advancedSales'&&row.available)&&<button onClick={()=>navigate('/orders')}>{english?'Sales orders':'أوامر البيع'}</button>}
        {allowed('imports.preview')&&<button onClick={()=>navigate('/admin/legacy')}>{english?'Legacy migration':'ترحيل النسخة القديمة'}</button>}
        <button onClick={()=>navigate('/activation')}>{english?'License / renewal':'الترخيص والتجديد'}</button>
      </nav>
      {error&&<p role="alert" className="p-3 text-red-700">{error}</p>}
      <main className="flex-1 min-h-0 overflow-auto">
        {!organization&&!error?<p role="status" className="p-5">{english?'Loading organization…':'جارٍ تحميل إعدادات الشركة…'}</p>:inventory&&organization?(allowed('catalog.read')?<ServerCatalog api={api} user={user} organization={organization} locale={locale} />:<p className="p-5">{english?'Permission required':'ليست لديك صلاحية'}</p>):path==='/admin/legacy'?<LegacyMigration api={api} english={english}/>:adminPage?<AdminView key={path} api={api} user={user} organization={organization} page={path.split('/')[2]} english={english} />:<CommercialContent api={api} user={user} organization={organization} english={english} path={path} search={location.search} onShift={()=>navigate('/shift')} onDemo={onDemo} onOrganizationChange={()=>setOrgRevision(value=>value+1)}/>}
      </main>
    </div>
  </div></HeaderSearchSlotContext.Provider>;
}

function AdminView({api,user,organization,page,english}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const [edit,setEdit]=useState(undefined);
  const allowed=permission=>user.permissions.includes(permission);
  const permission={modules:'modules.read',users:'users.read',roles:'roles.read',import:'imports.preview'}[page];
  useEffect(()=>{
    if(page==='import'||!permission||!user.permissions.includes(permission))return;
    let active=true;api.request(`/${page}`).then(value=>{if(active)setData(value);}).catch(failure=>{if(active)setError(failure.message);});return()=>{active=false;};
  },[api,page,permission,user,revision]);
  if(!permission||!allowed(permission))return <p className="p-5">{english?'Permission required':'ليست لديك صلاحية'}</p>;
  if(page==='import')return <ImportCopy api={api} organization={organization} canCommit={allowed('imports.commit')} english={english} />;
  return <div className="p-5 space-y-4">
    <h1 className="font-bold text-lg">{english?({modules:'Optional modules',users:'Users',roles:'Roles'})[page]:({modules:'الوحدات الإضافية',users:'المستخدمون',roles:'الأدوار'})[page]}</h1>
    {['users','roles'].includes(page)&&allowed(page==='users'?'users.manage':'roles.manage')&&<button className="border bg-white rounded-xl p-3" onClick={()=>setEdit(null)}>{english?'Add':'إضافة'}</button>}
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    {!data?<p role="status">{english?'Loading…':'جارٍ التحميل…'}</p>:page==='modules'?<>
      <p className="text-sm text-gray-500">{data.license.status==='ACTIVE'?(english?'Current licensed modules. Business preferences never grant a license.':'الوحدات في الترخيص الساري. إعداد النشاط لا يمنح ترخيصًا.'):(english?'Offline activation is not connected. Changing a business preference does not grant a license.':'تفعيل Offline لم يُربط بعد. تغيير إعداد النشاط لا يمنح ترخيصًا.')}</p>
      {data.items.map(module=><div key={module.id} className="flex flex-wrap gap-4 p-4 bg-white border rounded-xl"><strong>{MODULE_TITLES[module.id]?.[english?'en':'ar']??module.id}</strong><span>{module.available?(english?'Available':'متاح'):(english?'Unavailable':'غير متاح')}</span><label className="flex gap-2"><input type="checkbox" disabled={!allowed('modules.configure')} checked={module.enabled} onChange={async event=>{
        const enabled=event.target.checked,previous=data;
        setData(value=>({...value,items:value.items.map(item=>item.id===module.id?{...item,enabled}:item)}));
        try{await api.request(`/modules/${module.id}`,{method:'PUT',body:{enabled}});setRevision(value=>value+1);}catch(failure){setData(previous);setError(failure.message);}
      }} />{english?'Business preference':'إعداد النشاط'}</label></div>)}
    </>:<div className="bg-white border rounded-xl divide-y">{data.items.map(entry=><div key={entry.id} className="p-4"><strong>{entry.name}</strong>{entry.username&&<span className="mx-3">{entry.username} · {entry.active?(english?'Active':'فعّال'):(english?'Inactive':'غير فعّال')}</span>}{entry.permissions&&<p className="text-xs text-gray-500 mt-2">{entry.permissions.join(' · ')}</p>}{!entry.is_admin&&allowed(page==='users'?'users.manage':'roles.manage')&&<button className="underline mx-3" onClick={()=>setEdit(entry)}>{english?'Edit access':'تعديل الصلاحيات'}</button>}</div>)}{!data.items.length&&<p className="p-4">{english?'No records':'لا توجد سجلات'}</p>}</div>}
    {edit!==undefined&&<AccessEditor api={api} user={user} organization={organization} page={page} entry={edit} english={english} onClose={()=>setEdit(undefined)} onSaved={()=>{setEdit(undefined);setRevision(value=>value+1);}}/>}
  </div>;
}

function ImportCopy({api,organization,canCommit,english}) {
  const [products,setProducts]=useState(null),[report,setReport]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [warehouseId,setWarehouseId]=useState(organization?.warehouses[0]?.id??'');
  const run=async commit=>{
    setBusy(true);setError('');try{setReport(await api.request(`/imports/${commit?'commit':'preview'}`,{method:'POST',body:{products,warehouseId}}));}catch(failure){setError(failure.message);setReport({valid:false,errors:failure.details??[]});}finally{setBusy(false);}
  };
  return <div className="p-5 space-y-4 max-w-2xl"><h1 className="text-lg font-bold">{english?'Import a catalog copy':'استيراد نسخة من الكتالوج'}</h1><p>{english?'Choose an exported JSON copy. Preview checks it without changes. Import preserves the source and applies the entire batch together.':'اختر نسخة JSON مصدّرة. المعاينة تفحصها دون تغيير البيانات، والاستيراد يحفظ الأصل ويطبق الدفعة كاملة.'}</p>
    <input aria-label={english?'Catalog copy':'نسخة الكتالوج'} type="file" accept=".json,application/json" onChange={async event=>{setReport(null);setError('');try{const file=event.target.files[0];if(!file)return;if(file.size>5*1024*1024)throw new Error('Maximum 5 MB');const parsed=JSON.parse(await file.text());const rows=Array.isArray(parsed)?parsed:parsed.products??parsed['shamtouch:v1:products'];if(!Array.isArray(rows))throw new Error('A products array is required');setProducts(rows);}catch(failure){setProducts(null);setError(failure.message);}}} />
    <label className="block">{english?'Opening stock warehouse':'مخزن الرصيد الافتتاحي'}<select className="border rounded-lg p-2 mx-2" value={warehouseId} onChange={event=>{setWarehouseId(event.target.value);setReport(null);}}>{organization?.warehouses.map(warehouse=><option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
    <div className="flex gap-4"><button className="border rounded-xl p-3" disabled={!products||busy} onClick={()=>run(false)}>{english?'Preview only':'معاينة فقط'}</button><button className="bg-emerald-600 text-white rounded-xl p-3" disabled={!canCommit||!report?.valid||busy} onClick={()=>run(true)}>{english?'Import validated copy':'استيراد النسخة المفحوصة'}</button></div>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    {report&&<div role="status" className="border rounded-xl bg-white p-4"><p>{report.imported!==undefined?(english?`Imported ${report.imported}`:`تم استيراد ${report.imported}`):report.valid?(english?`Valid: ${report.count} products`:`الفحص ناجح: ${report.count} منتج`):(english?'Validation failed':'فشل الفحص')}</p>{report.errors?.map((entry,index)=><p key={index}>{entry.index}: {entry.message}</p>)}</div>}
  </div>;
}
