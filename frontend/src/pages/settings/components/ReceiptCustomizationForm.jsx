import { ReceiptPercentIcon, SparklesIcon } from '../../../components/common/Icons';

const LOGO_OPTIONS = ['🏪', '🛒', '🛍️', '🏬', '☕', '🥤', '🍞', '🥩', '💊', '🧴'];

export function ReceiptCustomizationForm({ settings, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...settings, [field]: value });
  };

  const handleToggle = (field) => {
    onChange({ ...settings, [field]: !settings[field] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
          <ReceiptPercentIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-gray-900">
            تخصيص وتصميم إيصال الكاشير (Receipt Template)
          </h3>
          <p className="text-[11px] text-gray-500">
            التحكم في المظهر والنصوص والعناصر المطبوعة على الطابعة الحرارية
          </p>
        </div>
      </div>

      {/* شعار المتجر والرمز التعبيري */}
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1.5">
          شعار / رمز الإيصال (Logo Icon)
        </label>
        <div className="flex items-center gap-2">
          {LOGO_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleChange('logoEmoji', emoji)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all cursor-pointer ${
                settings.logoEmoji === emoji
                  ? 'bg-indigo-600 text-white scale-110 shadow-xs border-2 border-indigo-400'
                  : 'bg-gray-100 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {emoji}
            </button>
          ))}
          <input
            type="text"
            maxLength={2}
            value={settings.logoEmoji || '🏪'}
            onChange={(e) => handleChange('logoEmoji', e.target.value)}
            className="w-12 h-9 text-center bg-gray-50 border border-gray-300 rounded-xl text-lg font-bold"
            title="أو أدخل رمزاً مخصصاً"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* عنوان الإيصال */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            عنوان الإيصال الرئيسي
          </label>
          <input
            type="text"
            value={settings.receiptTitle || ''}
            onChange={(e) => handleChange('receiptTitle', e.target.value)}
            placeholder="مثال: فاتورة ضريبية مبسطة"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* عرض الورق */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            عرض ورق الطابعة الحرارية
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: '80mm', label: '80 ملم (القياسي الشائع)' },
              { id: '57mm', label: '57 ملم (الصغير / المتنقل)' },
            ].map((paper) => (
              <button
                key={paper.id}
                type="button"
                onClick={() => handleChange('receiptPaperWidth', paper.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                  settings.receiptPaperWidth === paper.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {paper.label}
              </button>
            ))}
          </div>
        </div>

        {/* رسالة الترويسة العلوية */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            رسالة الترويسة العلوية (Header Message)
          </label>
          <input
            type="text"
            value={settings.headerMessage || ''}
            onChange={(e) => handleChange('headerMessage', e.target.value)}
            placeholder="مثال: أهلاً وسهلاً بكم، نسعد بخدمتكم دائماً"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
          />
        </div>

        {/* رسالة التذييل وسياسة الاسترجاع */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            رسالة التذييل وسياسة الاسترجاع (Footer Notes)
          </label>
          <textarea
            rows={2}
            value={settings.footerMessage || ''}
            onChange={(e) => handleChange('footerMessage', e.target.value)}
            placeholder="مثال: البضاعة المباعة ترد وتستبدل خلال 3 أيام بشرط وجود الفاتورة..."
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* خيارات وتخصيصات الظهور على الإيصال */}
      <div className="pt-2">
        <label className="block text-xs font-bold text-gray-800 mb-2">
          خيارات ظهور العناصر والبيانات على الإيصال:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[
            {
              field: 'showQrCode',
              label: 'رمز الاستجابة السريع للفوترة الإلكترونية (QR Code)',
              hint: 'متوافق مع متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA)',
            },
            {
              field: 'showTaxNumber',
              label: 'الرقم الضريبي للمتجر',
              hint: 'إظهار الرقم الضريبي المكون من 15 رقماً بأعلى الإيصال',
            },
            {
              field: 'showCashierName',
              label: 'اسم الكاشير ومسؤول الوردية',
              hint: 'توثيق اسم الموظف الذي أصدر الفاتورة',
            },
            {
              field: 'showCustomerInfo',
              label: 'بيانات العميل (الاسم والرقم الضريبي)',
              hint: 'خاصة بفواتير العملاء والمنشآت المسجلة',
            },
            {
              field: 'showLoyaltyPoints',
              label: 'رصيد نقاط الولاء للعميل',
              hint: 'إظهار النقاط المكتسبة والرصيد الإجمالي بأسفل الإيصال',
            },
            {
              field: 'showTaxBreakdown',
              label: 'تفصيل ضريبة القيمة المضافة (15%)',
              hint: 'عرض سطر منفصل لقيمة الضريبة والمجموع غير الشامل',
            },
          ].map((toggle) => {
            const isChecked = Boolean(settings[toggle.field]);
            return (
              <div
                key={toggle.field}
                onClick={() => handleToggle(toggle.field)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 select-none ${
                  isChecked
                    ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div>
                  <div className="font-bold text-xs">{toggle.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {toggle.hint}
                  </div>
                </div>

                {/* Switch indicator */}
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative shrink-0 mt-0.5 ${
                    isChecked ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform absolute top-0.5 ${
                      isChecked ? 'right-4.5' : 'right-0.5'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
