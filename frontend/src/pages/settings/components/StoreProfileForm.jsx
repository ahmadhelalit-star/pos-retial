import { BuildingOfficeIcon } from '../../../components/common/Icons';

export function StoreProfileForm({ settings, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
          <BuildingOfficeIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-gray-900">
            بيانات المنشأة والمتجر الرئيسي
          </h3>
          <p className="text-xs text-gray-500">
            البيانات الرسمية التي تظهر في ترويسة الفواتير والتقارير المالية
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* اسم المتجر التجاري */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            اسم المتجر التجاري (Brand Name) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={settings.storeName || ''}
            onChange={(e) => handleChange('storeName', e.target.value)}
            placeholder="مثال: شام تاتش للتجزئة"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* الاسم الرسمي للشركة */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            الاسم القانوني للمنشأة / الشركة
          </label>
          <input
            type="text"
            value={settings.companyName || ''}
            onChange={(e) => handleChange('companyName', e.target.value)}
            placeholder="مثال: مؤسسة شام تاتش للتجارة"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* اسم الفرع */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            اسم الفرع
          </label>
          <input
            type="text"
            value={settings.branchName || ''}
            onChange={(e) => handleChange('branchName', e.target.value)}
            placeholder="مثال: الفرع الرئيسي - الرياض"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* الرقم الضريبي */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            الرقم الضريبي للمنشأة (15 رقماً) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            maxLength={15}
            value={settings.taxNumber || ''}
            onChange={(e) => handleChange('taxNumber', e.target.value)}
            placeholder="310XXXXXXXXXXXX"
            dir="ltr"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* السجل التجاري */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            رقم السجل التجاري (CR No)
          </label>
          <input
            type="text"
            value={settings.commercialRegister || ''}
            onChange={(e) => handleChange('commercialRegister', e.target.value)}
            placeholder="1010XXXXXX"
            dir="ltr"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* الهاتف الثابت */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            رقم الهاتف الثابت
          </label>
          <input
            type="text"
            value={settings.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="011XXXXXXX"
            dir="ltr"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* الجوال */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            رقم جوال المتجر / الواتساب
          </label>
          <input
            type="text"
            value={settings.mobile || ''}
            onChange={(e) => handleChange('mobile', e.target.value)}
            placeholder="05XXXXXXXX"
            dir="ltr"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* البريد الإلكتروني */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            البريد الإلكتروني الرسمي
          </label>
          <input
            type="email"
            value={settings.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="info@store.sa"
            dir="ltr"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* العنوان الوطني */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            العنوان الوطني / موقع المتجر
          </label>
          <input
            type="text"
            value={settings.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="مثال: الرياض - طريق الملك فهد - حي العليا"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* العملة الافتراضية */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            رمز العملة الافتراضية
          </label>
          <input
            type="text"
            value={settings.currency || 'ر.س'}
            onChange={(e) => handleChange('currency', e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* نسبة الضريبة الافتراضية */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            نسبة ضريبة القيمة المضافة الافتراضية (%)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              value={settings.defaultTaxRate ?? 15}
              onChange={(e) =>
                handleChange('defaultTaxRate', parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs pointer-events-none">
              %
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
