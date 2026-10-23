import { useState } from 'react';
import { StoreProfileForm } from './components/StoreProfileForm';
import { ReceiptCustomizationForm } from './components/ReceiptCustomizationForm';
import { PosConfigForm } from './components/PosConfigForm';
import { ReceiptLivePreview } from './components/ReceiptLivePreview';
import { DEFAULT_STORE_SETTINGS } from '../../data/defaultSettings';
import {
  CheckIcon,
  Cog6ToothIcon,
  BuildingOfficeIcon,
  ReceiptPercentIcon,
  LockClosedIcon,
  ArrowPathIcon,
} from '../../components/common/Icons';

export function SettingsPage({
  settings = DEFAULT_STORE_SETTINGS,
  onSaveSettings,
}) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState('receipt'); // 'profile' | 'receipt' | 'pos'
  const [isSavedAlert, setIsSavedAlert] = useState(false);

  const handleSave = () => {
    onSaveSettings(localSettings);
    setIsSavedAlert(true);
    setTimeout(() => {
      setIsSavedAlert(false);
    }, 3500);
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        'هل أنت متأكد من استعادة كافة إعدادات وتخصيصات المتجر الافتراضية؟'
      )
    ) {
      setLocalSettings(DEFAULT_STORE_SETTINGS);
      onSaveSettings(DEFAULT_STORE_SETTINGS);
      setIsSavedAlert(true);
      setTimeout(() => setIsSavedAlert(false), 3000);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="bg-white px-5 py-3.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <Cog6ToothIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900">
              إعدادات المتجر وتخصيص الفاتورة
            </h1>
            <p className="text-xs text-gray-500">
              تهيئة بيانات المنشأة، تصميم الإيصال الحراري، وإعدادات الطابعة والدرج
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isSavedAlert && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in">
              <CheckIcon className="w-4 h-4 text-emerald-600" />
              <span>تم حفظ الإعدادات بنجاح!</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowPathIcon className="w-3.5 h-3.5 text-gray-500" />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <CheckIcon className="w-4 h-4" />
            <span>حفظ الإعدادات والتخصيص</span>
          </button>
        </div>
      </div>

      {/* Main Content: Two columns (Tabs + Forms on Left, Sticky Live Preview on Right) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Tabs & Forms (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Tabs Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-200/80 rounded-2xl border border-gray-300/80">
              {[
                {
                  id: 'profile',
                  label: 'بيانات المنشأة والمتجر',
                  icon: BuildingOfficeIcon,
                },
                {
                  id: 'receipt',
                  label: 'تخصيص فاتورة الكاشير',
                  icon: ReceiptPercentIcon,
                },
                {
                  id: 'pos',
                  label: 'إعدادات الصندوق والدرج',
                  icon: LockClosedIcon,
                },
              ].map((tab) => {
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
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              {activeTab === 'profile' && (
                <StoreProfileForm
                  settings={localSettings}
                  onChange={setLocalSettings}
                />
              )}

              {activeTab === 'receipt' && (
                <ReceiptCustomizationForm
                  settings={localSettings}
                  onChange={setLocalSettings}
                />
              )}

              {activeTab === 'pos' && (
                <PosConfigForm
                  settings={localSettings}
                  onChange={setLocalSettings}
                />
              )}
            </div>
          </div>

          {/* Right Column: Live Thermal Receipt Preview (5 cols) */}
          <div className="lg:col-span-5">
            <ReceiptLivePreview settings={localSettings} />
          </div>
        </div>
      </div>
    </div>
  );
}
