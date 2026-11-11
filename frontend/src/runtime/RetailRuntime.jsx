import { lazy,Suspense,useEffect,useMemo,useState,useCallback } from 'react';
import {CategoryContext} from '../domain/categories';
import { Navigate,useLocation,useNavigate } from 'react-router-dom';
import { createApiClient } from '../services/apiClient';
import { Sidebar } from '../components/layout/Sidebar';
import { AppHeader } from '../components/layout/AppHeader';
import { HeaderSearchSlotContext } from '../components/layout/headerSearchSlot';
import { ServerCatalog } from './ServerCatalog';
import { readPreference,writePreference } from './preferences';
import { MODULE_TITLES } from '../../../shared/features';
import InitialAdminSetup from '../pages/auth/InitialAdminSetup';
const LocalLoginPage=lazy(()=>import('../pages/auth/LocalLoginPage'));
const ThermalPrintingPage=lazy(()=>import('../pages/settings/ThermalPrintingPage'));
const LicenseManagementPage=lazy(()=>import('../pages/settings/LicenseManagementPage'));
const UsersPage=lazy(()=>import('../pages/users/UsersPage'));
const AdminRecovery=lazy(()=>import('../pages/auth/AdminRecovery'));
const RegisterPage=lazy(()=>import('../pages/auth/RegisterPage'));
import { SalesPage as ServerPOS } from '../pages/sales/SalesPage';
import { PaymentsView,OrdersView } from '../commercial/views';
import { CustomersPage as PartnersView } from '../pages/customers/CustomersPage';
import { ShiftPage as ShiftsView } from '../pages/shift/ShiftPage';
import { InvoicesPage as DocumentsView } from '../pages/invoices/InvoicesPage';
import { PurchasesPage as PurchasingView } from '../pages/purchases/PurchasesPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { AccessEditor } from '../commercial/admin';
import { SettingsPage as FinanceSettings } from '../pages/settings/SettingsPage';
import { WarehouseSettings } from '../pages/settings/WarehouseSettings';
import { terminalId } from '../commercial/device';
import { OperationsSettings } from '../commercial/OperationsSettings';
import { DeviceSettings } from '../commercial/AgentPrinting';
import './connected.css';
import { PageHeading,EmptyState } from '../commercial/ConnectedUI';
import { ShieldCheckIcon } from '../components/common/Icons';

export function RetailRuntime() {
  const [session,setSession]=useState(null),[checking,setChecking]=useState(true),[error,setError]=useState('');
  const [activation,setActivation]=useState(null),[activationError,setActivationError]=useState(''),[recovering,setRecovering]=useState(false),[recoveryUser,setRecoveryUser]=useState(null);
  const api=useMemo(()=>createApiClient({onUnauthorized:()=>setSession(null),onActivationRequired:details=>setActivation({enforced:true,status:details.activationStatus??'NOT_ACTIVATED'})}),[]);
  const [attempt,setAttempt]=useState(0),[locale,setLocale]=useState(()=>readPreference('locale',document.documentElement.lang)==='en'?'en':'ar');
  const [dark,setDark]=useState(()=>readPreference('theme',document.documentElement.classList.contains('dark')?'dark':'light')==='dark');
  const navigate=useNavigate();
  const location=useLocation();
  useEffect(()=>{
    const controller=new AbortController();
    api.request('/auth/me',{signal:controller.signal}).then(setSession).catch(failure=>{if(failure.name!=='AbortError'&&failure.status!==401)setError(failure.message);}).finally(()=>{if(!controller.signal.aborted)setChecking(false);});
    return ()=>controller.abort();
  },[api,attempt]);
  useEffect(()=>{document.documentElement.lang=locale;document.documentElement.dir=locale==='ar'?'rtl':'ltr';window.dispatchEvent(new Event('retail-locale'));writePreference('locale',locale);},[locale]);
  useEffect(()=>{writePreference('theme',dark?'dark':'light');},[dark]);
  const english=locale==='en';
  useEffect(()=>{let live=true;const check=()=>api.request('/offline-activation/status').then(value=>{if(live){setActivation(value);setActivationError('');}}).catch(()=>{if(live)setActivationError('تعذر الاتصال بخدمة التفعيل المحلية. تأكد أن Backend يعمل.');});check();const timer=setInterval(check,10000);return()=>{live=false;clearInterval(timer);};},[api,attempt]);
  const preferences=<><button onClick={()=>setLocale(value=>value==='ar'?'en':'ar')}>{english?'العربية':'English'}</button><button onClick={()=>setDark(value=>!value)}>{dark?(english?'Light':'فاتح'):(english?'Dark':'داكن')}</button></>;
  if(activationError)return <div className="min-h-screen flex flex-col gap-4 items-center justify-center p-6"><p role="alert">{activationError}</p><button onClick={()=>setAttempt(value=>value+1)}>إعادة المحاولة</button></div>;
  if(!activation)return <p role="status" className="p-6">جارٍ التحقق من التفعيل…</p>;
  const active=activation.status==='ACTIVE'&&activation.activated===true&&activation.product==='retail';
  if(!active){if(location.pathname!=='/register')return <Navigate replace to="/register"/>;return <Suspense fallback={<p role="status" className="p-6">جارٍ تحميل التسجيل…</p>}><RegisterPage api={api} activationStatus={activation.status} onActivated={()=>{setActivation(null);setChecking(true);setAttempt(previous=>previous+1);navigate('/inventory',{replace:true});}}/></Suspense>;}
  if(activation.setupBlocked)return <p role="alert" className="p-6">تعذر إكمال الإعداد: بيانات المنشأة موجودة دون حسابات. يلزم مراجعة المدير.</p>;
  if(activation.setupRequired){if(location.pathname!=='/setup-admin')return <Navigate replace to="/setup-admin"/>;return <InitialAdminSetup api={api} onCreated={()=>{setActivation(null);setAttempt(value=>value+1);navigate('/inventory',{replace:true});}}/>;}
  if(['/register','/setup-admin','/activation'].includes(location.pathname))return <Navigate replace to="/inventory"/>;
  if(checking)return <div className="min-h-screen flex items-center justify-center" role="status">{english?'Checking session…':'جارٍ التحقق من الجلسة…'}</div>;
  if(!session&&recovering)return <Suspense fallback={<p>جارٍ التحميل…</p>}><AdminRecovery api={api} initialUser={recoveryUser} onClose={()=>setRecovering(false)}/></Suspense>;
  if(!session)return <Suspense fallback={<p role="status" className="p-6">جارٍ التحميل…</p>}><LocalLoginPage api={api} onLogin={setSession} onRecover={user=>{setRecoveryUser(user);setRecovering(true);}} preferences={preferences} initialError={error} english={english} dark={dark}/></Suspense>;
  return <ServerShell api={api} session={session} preferences={preferences} locale={locale} dark={dark} onLogout={async()=>{await api.request('/auth/logout',{method:'POST',body:{}});api.setCsrfToken(null);setSession(null);}} />;
}

function CommercialContent(props){
  const {api,user,organization,english,path,search,salesControls,onOrganizationChange}=props;
  const allowed=permission=>user.permissions.includes(permission),denied=<p className="p-6">{english?'Permission required':'ليست لديك صلاحية'}</p>;
  if(!organization)return null;
  if(path==='/license')return <Suspense fallback={<p role="status">Loading…</p>}><LicenseManagementPage api={api} user={user} english={english}/></Suspense>;
  if(path==='/devices')return allowed('printing.create')?<DeviceSettings api={api} english={english}/>:denied;
  if(path==='/operations')return allowed('organization.manage')&&user.roles.some(role=>role.is_admin)?<OperationsSettings api={api} english={english}/>:denied;
  if(path==='/sales'&&allowed('sales.post'))return <ServerPOS api={api} user={user} organization={organization} english={english} headerControls={salesControls}/>;
  if(path==='/invoices')return allowed('sales.read')?<DocumentsView key={path+search} api={api} user={user} organization={organization} english={english}/>:denied;
  if(path==='/purchases'&&new URLSearchParams(search).get('view')==='suppliers')return allowed('partners.read')?<PartnersView key={path+search} api={api} user={user} english={english} kind="supplier"/>:denied;
  if(path==='/purchases')return allowed('purchases.post')?<PurchasingView key="new-purchase" api={api} user={user} organization={organization} english={english}/>:denied;
  if(path==='/purchase-history')return allowed('purchases.read')?<DocumentsView key={path+search} api={api} user={user} organization={organization} english={english} type="purchases"/>:denied;
  if(path==='/customers'||path==='/suppliers')return allowed('partners.read')?<PartnersView key={path+search} api={api} user={user} english={english} kind={path==='/customers'?'customer':'supplier'}/>:denied;
  if(path==='/shift')return allowed('shifts.read')?<ShiftsView api={api} user={user} organization={organization} english={english}/>:denied;
  if(path==='/payments')return allowed('payments.read')?<PaymentsView key={path+search} api={api} user={user} organization={organization} english={english}/>:denied;
  if(path==='/reports')return <Navigate replace to='/dashboard'/>;
  if(path==='/dashboard')return allowed('reports.read')?<DashboardPage api={api} user={user} english={english}/>:denied;
  if(path==='/orders')return allowed('modules.advancedSales')?<OrdersView api={api} user={user} english={english}/>:denied;
  if(path==='/settings')return allowed('organization.read')?<FinanceSettings api={api} user={user} organization={organization} english={english} onSaved={onOrganizationChange}/>:denied;
  return <EmptyState title={english?'Page unavailable':'الصفحة غير متاحة'} description={english?'Choose an available page from the navigation.':'اختر إحدى الصفحات المتاحة من القائمة.'}/>;
}

function ServerShell({api,session,preferences,locale,dark,onLogout}) {
  const [organization,setOrganization]=useState(null),[error,setError]=useState(''),[searchSlot,setSearchSlot]=useState(null),[salesControls,setSalesControls]=useState(null);
  const location=useLocation(),navigate=useNavigate(),user=session.user,english=locale==='en';
  const [orgRevision,setOrgRevision]=useState(0),[shiftRevision,setShiftRevision]=useState(0),[currentShift,setCurrentShift]=useState(null),[modules,setModules]=useState([]),[device]=useState(()=>terminalId());
  useEffect(()=>{const update=()=>setOrgRevision(value=>value+1);window.addEventListener('retail-license-updated',update);return()=>window.removeEventListener('retail-license-updated',update);},[]);
  useEffect(()=>{const update=()=>setShiftRevision(value=>value+1);window.addEventListener('retail-shift-updated',update);return()=>window.removeEventListener('retail-shift-updated',update);},[]);
  const categoriesChanged=useCallback(items=>setOrganization(previous=>previous?{...previous,categories:items.map(({id,name})=>({id,name}))}:previous),[]);
  useEffect(()=>{let active=true;api.request('/organization').then(value=>{if(active)setOrganization(value);}).catch(failure=>{if(active)setError(failure.message);});api.request('/modules').then(value=>{if(active)setModules(value.items);}).catch(()=>{});return()=>{active=false;};},[api,orgRevision]);
  useEffect(()=>{if(!user.permissions.includes('shifts.read'))return;let active=true;api.request('/shifts').then(value=>{if(active)setCurrentShift(value.items.find(row=>!row.closed_at&&row.user_id===user.id&&row.device_id===device)??null);}).catch(()=>{});return()=>{active=false;};},[api,user,device,location.pathname,shiftRevision]);
  const allowed=permission=>user.permissions.includes(permission);
  const path=location.pathname,inventory=path==='/'||path==='/inventory';
  const activeTab=inventory?'inventory':path.slice(1);
  const handleLogout=async()=>{try{await onLogout();}catch(failure){setError(failure.message);}};
  return <CategoryContext.Provider value={organization?.categories??[]}><HeaderSearchSlotContext.Provider value={searchSlot}><div className={`retail-server h-screen flex bg-[#f9f9ff] text-gray-800 ${dark?'retail-dark':''}`} dir={english?'ltr':'rtl'}>
    <Sidebar storeSettings={{storeName:organization?.company.name??'Sham Touch Retail'}} cashier={user.name} shiftStatus={currentShift?'open':'closed'} invoicesCount={0} permissions={user.permissions} advancedSales={modules.some(row=>row.id==='advancedSales'&&row.available)} sessionControls={<>{preferences}<button type="button" onClick={handleLogout}>{english?'Sign out':'تسجيل الخروج'}</button></>} />
    <div className="min-w-0 flex-1 flex flex-col">
      <AppHeader activeTab={activeTab} shift={{status:currentShift?'open':'closed'}} cashier={user.name} onTabChange={tab=>navigate(`/${tab}`)} searchSlotRef={setSearchSlot} salesControlsRef={setSalesControls} />
      {error&&<p role="alert" className="p-3 text-red-700">{error}</p>}
      <main className="flex-1 min-h-0 overflow-auto">
        {!organization&&!error?<p role="status" className="p-5">{english?'Loading organization…':'جارٍ تحميل إعدادات الشركة…'}</p>:inventory&&organization?(allowed('catalog.read')?<ServerCatalog api={api} user={user} organization={organization} locale={locale} onCategoriesChanged={categoriesChanged} onStockPolicySaved={({allowNegativeStock})=>setOrganization(previous=>({...previous,company:{...previous.company,allow_negative_stock:allowNegativeStock}}))}/>:<p className="p-5">{english?'Permission required':'ليست لديك صلاحية'}</p>):<WorkspaceContent api={api} user={user} organization={organization} english={english} path={path} search={location.search} salesControls={salesControls} onOrganizationChange={()=>setOrgRevision(value=>value+1)}/>}
      </main>
    </div>
  </div></HeaderSearchSlotContext.Provider></CategoryContext.Provider>;
}

function WorkspaceContent(props){
 const {api,user,organization,english,path,search,onOrganizationChange}=props;
 const navigate=useNavigate();
 if(!organization)return null;
 const allowed=p=>user.permissions.includes(p),params=new URLSearchParams(search),tab=params.get('tab');
 const legacy={'/admin/users':['/users','users'],'/admin/roles':['/users','roles'],'/admin/modules':['/settings','modules'],'/purchase-history':['/purchases','history'],'/payments':['/invoices','payments'],'/devices':['/printing','device'],'/operations':['/settings','backups']};
 if(legacy[path]){const [target,value]=legacy[path];params.set('tab',value);return <Navigate replace to={target+'?'+params}/>;}
 const admin=page=>page==='users'?<Suspense fallback={<p>جارٍ التحميل…</p>}><UsersPage api={api} user={user} organization={organization} english={english}/></Suspense>:<AdminView key={page} api={api} user={user} organization={organization} page={page} english={english}/>;
 if(path==='/printing')return allowed('organization.read')?<Suspense fallback={<p role="status">Loading…</p>}><ThermalPrintingPage api={api} user={user} english={english}/></Suspense>:<p>Permission required</p>;
 if(path==='/settings'||path==='/printing'){
   if(!allowed('organization.read'))return <p className="p-5">{english?'Permission required':'ليست لديك صلاحية'}</p>;
   const printing=path==='/printing';
   const extraTabs=printing?[
     ...(allowed('printing.create')?[{id:'device',label:english?'Device and printers':'الجهاز والطابعات',content:<DeviceSettings api={api} english={english}/>}]:[])
   ]:[
     {id:'warehouses',label:english?'Warehouses':'المخازن',content:<WarehouseSettings api={api} user={user} organization={organization} english={english} onSaved={onOrganizationChange}/>},
     ...(allowed('modules.read')?[{id:'modules',label:english?'Modules':'الوحدات',content:admin('modules')}]:[]),
     ...(allowed('organization.manage')&&user.roles.some(r=>r.is_admin)?[{id:'backups',label:english?'Backup and recovery':'النسخ والاستعادة',content:<OperationsSettings api={api} english={english}/>}]:[])
   ];
   return <FinanceSettings key={path} api={api} user={user} organization={organization} english={english} onSaved={onOrganizationChange} printing={printing} extraTabs={extraTabs}/>;
 }
 let tabs=[];
 if(path==='/users')tabs=[['users',english?'Users':'المستخدمون','users.read',admin('users')],['roles',english?'Roles':'الأدوار','roles.read',admin('roles')]];
 if(path==='/invoices')tabs=[['invoices',english?'Invoices':'الفواتير','sales.read',<CommercialContent key={path+search} {...props}/>],['payments',english?'Payments':'السندات','payments.read',<PaymentsView key={search} api={api} user={user} organization={organization} english={english}/>]];
 if(path==='/purchases')tabs=[['new',english?'New purchase':'فاتورة شراء','purchases.post',<PurchasingView key="new-purchase" api={api} user={user} organization={organization} english={english}/>],['history',english?'Purchase history':'سجل الشراء','purchases.read',<DocumentsView key={search} api={api} user={user} organization={organization} english={english} type="purchases"/>],['suppliers',english?'Suppliers':'حسابات الموردين','partners.read',<PartnersView key="supplier-accounts" api={api} user={user} english={english} kind="supplier"/>]];
 tabs=tabs.filter(([, ,permission])=>allowed(permission));
 if(tabs.length){const active=tabs.find(([id])=>id===tab)??(params.get('view')==='suppliers'?tabs.find(([id])=>id==='suppliers'):null)??tabs[0];return <div className="h-full min-h-0 flex flex-col"><nav className="retail-section-tabs" aria-label={english?'Page tabs':'تبويبات الصفحة'}>{tabs.map(([id,label])=><button type="button" key={id} aria-current={active[0]===id?'page':undefined} onClick={()=>{const next=new URLSearchParams(search);next.set('tab',id);next.delete('view');navigate(path+'?'+next);}}>{label}</button>)}</nav><div className="flex-1 min-h-0 overflow-auto">{active[3]}</div></div>;}
 if(path==='/users')return <p className="p-5">{english?'Permission required':'ليست لديك صلاحية'}</p>;
 return <CommercialContent {...props}/>;
}

function AdminView({api,user,organization,page,english}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const [edit,setEdit]=useState(undefined);
  const allowed=permission=>user.permissions.includes(permission);
  const permission={modules:'modules.read',users:'users.read',roles:'roles.read'}[page];
  useEffect(()=>{
    if(!permission||!user.permissions.includes(permission))return;
    let active=true;api.request(`/${page}`).then(value=>{if(active)setData(value);}).catch(failure=>{if(active)setError(failure.message);});return()=>{active=false;};
  },[api,page,permission,user,revision]);
  if(!permission||!allowed(permission))return <p className="p-5">{english?'Permission required':'ليست لديك صلاحية'}</p>;
  return <div className="retail-page p-5 space-y-4">
    <PageHeading icon={ShieldCheckIcon} title={english?({modules:'Optional modules',users:'Users',roles:'Roles'})[page]:({modules:'الوحدات الإضافية',users:'المستخدمون',roles:'الأدوار'})[page]}/>
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
