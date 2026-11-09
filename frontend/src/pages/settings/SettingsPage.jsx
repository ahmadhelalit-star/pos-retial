import {receiptDesignFields} from '../../../../shared/receiptDesign.js';
import { useEffect,useState } from 'react';
import { StoreProfileForm } from './components/StoreProfileForm';
import { ReceiptCustomizationForm } from './components/ReceiptCustomizationForm';
import { PosConfigForm } from './components/PosConfigForm';
import { ReceiptLivePreview } from './components/ReceiptLivePreview';
import { DEFAULT_STORE_SETTINGS } from '../../domain/presentationDefaults';
import { FinanceSettings } from '../../commercial/admin';
import { useLocation,useNavigate } from 'react-router-dom';
import {
  CheckIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  ReceiptPercentIcon,
  LockClosedIcon,
  ArrowPathIcon,
} from '../../components/common/Icons';

const fields=[...receiptDesignFields,'storeName','companyName','branchName','taxNumber','commercialRegister','phone','mobile','email','address','logoEmoji','receiptTitle','receiptPaperWidth','headerMessage','footerMessage','showTaxNumber','showCashierName','showCustomerInfo','showTaxBreakdown','defaultOpeningFloat'];
export function SettingsPage(props){
 const {api,english}=props;const [settings,setSettings]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;api.request('/organization/presentation').then(value=>{if(live)setSettings({...value,defaultTaxRate:Number(props.organization.taxes[0]?.rate??0)});}).catch(failure=>{if(live)setError(failure.message);});return()=>{live=false;};},[api,props.organization.taxes]);
 if(error)return <p role="alert" className="p-4 text-red-700">{error}</p>;
 if(!settings)return <p role="status" className="p-4">{english?'Loading…':'جارٍ التحميل…'}</p>;
 return <SettingsEditor {...props} settings={settings}/>;
}
function SettingsEditor({api,user,organization,english,onSaved,settings,printing=false,extraTabs=[]}){
 const [localSettings,setLocalSettings]=useState(settings),[isSavedAlert,setIsSavedAlert]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const location=useLocation(),navigate=useNavigate();
 const baseTabs=printing?[{id:'receipt',label:english?'Cashier receipt customization':'تخصيص فاتورة الكاشير',icon:ReceiptPercentIcon}]:[{id:'profile',label:english?'Store profile':'بيانات المنشأة والمتجر',icon:BuildingOfficeIcon},{id:'pos',label:english?'Cashbox settings':'إعدادات الصندوق والدرج',icon:LockClosedIcon},{id:'finance',label:english?'Currencies and taxes':'العملات والضرائب',icon:ReceiptPercentIcon}];
 const tabs=[...baseTabs,...extraTabs.map(tab=>({...tab,icon:Cog6ToothIcon}))],requested=new URLSearchParams(location.search).get('tab'),activeTab=tabs.some(tab=>tab.id===requested)?requested:tabs[0].id;
 const setActiveTab=id=>{const params=new URLSearchParams(location.search);params.set('tab',id);navigate(location.pathname+'?'+params);};
 const updateSettings=value=>{setLocalSettings(value);setIsSavedAlert(false);};
 const allowed=user.permissions.includes('organization.manage');
 const handleSave=async()=>{setBusy(true);setError('');setIsSavedAlert(false);try{const result=await api.request('/organization/presentation',{method:'PUT',body:Object.fromEntries(fields.map(key=>[key,localSettings[key]]))});setLocalSettings(result);setIsSavedAlert(true);onSaved?.();}catch(failure){setError(failure.message);}finally{setBusy(false);}};
 const handleResetToDefault=()=>{if(window.confirm('استعادة التصميم الافتراضي في النموذج؟ لن يُحفظ حتى تضغط حفظ.'))setLocalSettings({...localSettings,...DEFAULT_STORE_SETTINGS,storeName:settings.storeName,currency:settings.currency,allowNegativeStock:settings.allowNegativeStock,autoPrintReceipt:false,openCashDrawerOnPrint:false,showQrCode:false,showLoyaltyPoints:false});};
  return (
    <div className="retail-page retail-original-settings h-full flex flex-col bg-gray-50 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="bg-white px-5 py-3.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <Cog6ToothIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900">
              {printing?(english?'Printing settings':'إعدادات الطباعة'):(english?'Settings':'إعدادات المتجر')}
            </h1>
            <p className="text-xs text-gray-500">
              {printing?'تصميم الإيصال ومعاينته وإعدادات الجهاز والطابعات':'بيانات المنشأة والوحدات والاستيراد والنسخ الاحتياطي'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {['profile','pos','receipt'].includes(activeTab)&&<div className="flex items-center gap-2">
          {isSavedAlert && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in">
              <CheckIcon className="w-4 h-4 text-emerald-600" />
              <span>تم حفظ الإعدادات بنجاح!</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={!allowed||busy}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowPathIcon className="w-3.5 h-3.5 text-gray-500" />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!allowed||busy}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <CheckIcon className="w-4 h-4" />
            <span>حفظ الإعدادات والتخصيص</span>
          </button>
        </div>}
      </div>

      {error&&<p role="alert" className="p-3 text-red-700">{error}</p>}
      {/* Main Content: Two columns (Tabs + Forms on Left, Sticky Live Preview on Right) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Tabs & Forms (7 cols) */}
          <div className={printing&&activeTab==='receipt'?"lg:col-span-7 space-y-4":"lg:col-span-12 space-y-4"}>
            {/* Tabs Selector */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-200/80 rounded-2xl border border-gray-300/80">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-emerald-900 shadow-xs border border-gray-200/60'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-emerald-600' : 'text-gray-500'
                      }`}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tab Form Container */}
            {baseTabs.some(tab=>tab.id===activeTab)&&<fieldset disabled={!allowed||busy} className="min-w-0 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              {activeTab === 'profile' && (
                <StoreProfileForm serverControlled
                  settings={localSettings}
                  onChange={updateSettings}
                />
              )}

              {activeTab === 'receipt' && (
                <ReceiptCustomizationForm serverControlled
                  settings={localSettings}
                  onChange={updateSettings}
                />
              )}

              {activeTab === 'pos' && (
                <PosConfigForm serverControlled
                  settings={localSettings}
                  onChange={updateSettings}
                />
              )}
              {activeTab==='finance'&&<FinanceSettings api={api} user={user} organization={organization} english={english} onSaved={onSaved}/>}
            </fieldset>}
            {extraTabs.find(tab=>tab.id===activeTab)?.content}

          </div>

          {/* Right Column: Live Thermal Receipt Preview (5 cols) */}
          {printing&&activeTab==='receipt'&&<div className="lg:col-span-5">
            <ReceiptLivePreview settings={localSettings} />
          </div>}
        </div>
      </div>
    </div>
  );
}
