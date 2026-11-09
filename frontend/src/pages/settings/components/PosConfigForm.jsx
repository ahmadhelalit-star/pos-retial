import { LockClosedIcon } from '../../../components/common/Icons';

export function PosConfigForm({ settings, onChange,serverControlled=false }) {
  const handleChange = (field, value) => {
    onChange({ ...settings, [field]: value });
  };

  const handleToggle = (field) => {
    onChange({ ...settings, [field]: !settings[field] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
        <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
          <LockClosedIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-gray-900">
            إعدادات الكاشير والصندوق المالي (POS Hardware & Drawer)
          </h3>
          <p className="text-xs text-gray-500">
            سلوك الطابعة التلقائي، درج النقدية، وسياسات المخزون المالي
          </p>
        </div>
      </div>

      {/* عهدة الصندوق الافتراضية */}
      <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
        <label className="block text-xs font-bold text-gray-800 mb-1">
          عهدة الصندوق الافتراضية لافتتاح الوردية (Opening Float)
        </label>
        <p className="text-xs text-gray-500 mb-2">
          المبلغ الافتراضي للفكة والنقدية الذي يبدأ به الكاشير ورديته اليومية
        </p>
        <div className="relative max-w-xs">
          <input
            type="number"
            step="10"
            min="0"
            value={settings.defaultOpeningFloat ?? 300}
            onChange={(e) =>
              handleChange(
                'defaultOpeningFloat',
                parseFloat(e.target.value) || 0
              )
            }
            className="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs pointer-events-none">
            {settings.currency}
          </span>
        </div>
      </div>

      {serverControlled&&<p className="text-xs text-amber-700">الطباعة ودرج النقدية يُضبطان من إعدادات الجهاز. سياسة البيع بالسالب تُعرض من إعداد الشركة ولا تتغير من تخصيص الإيصال.</p>}
      {/* POS Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            field: 'autoPrintReceipt',
            label: 'الطباعة التلقائية فور إنهاء البيع',
            hint: 'إرسال أمر الطباعة إلى الطابعة مباشرة بعد الضغط على تم الدفع دون انتظار',
          },
          {
            field: 'openCashDrawerOnPrint',
            label: 'فتح درج الكاشير تلقائياً عند الطباعة',
            hint: 'إرسال إشارة النبضة الكهربائية (RJ11/RJ12) لفتح الدرج مع كل عملية دفع نقدية',
          },
          {
            field: 'allowNegativeStock',
            label: 'السماح بالبيع بالسالب (عند نفاد الكمية)',
            hint: 'تمكين الكاشير من إضافة المنتجات للسلة وإتمام البيع حتى لو كان المخزون صفر',
          },
        ].map((toggle) => {
          const isChecked = Boolean(settings[toggle.field]);
          return (
            <div
              key={toggle.field}
              aria-disabled={serverControlled} onClick={() => {if(!serverControlled)handleToggle(toggle.field);}}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 select-none ${
                isChecked
                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div>
                <div className="font-bold text-xs">{toggle.label}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {toggle.hint}
                </div>
              </div>

              {/* Switch */}
              <div
                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 mt-0.5 ${
                  isChecked ? 'bg-amber-600' : 'bg-gray-300'
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
  );
}
