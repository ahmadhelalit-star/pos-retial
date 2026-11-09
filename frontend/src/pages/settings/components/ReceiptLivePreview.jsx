import { PrinterIcon } from '../../../components/common/Icons';

export function ReceiptLivePreview({ settings }) {
  const is57mm = settings.receiptPaperWidth === '57mm';

  const handleTestPrint = () => {
    window.print();
  };

  return (
    <div className="bg-gray-100 p-4 rounded-2xl border border-gray-200 flex flex-col items-center select-none sticky top-4">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-gray-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>معاينة تصميم الإيصال · بيانات توضيحية</span>
        </div>
        <button
          type="button"
          onClick={handleTestPrint}
          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-[11px] font-bold text-gray-700 shadow-xs cursor-pointer transition-colors"
        >
          <PrinterIcon className="w-3.5 h-3.5 text-gray-600" />
          <span>طباعة تجريبية</span>
        </button>
      </div>

      {/* Realistic Receipt Paper Simulation */}
      <div
        className={`bg-white text-gray-900 rounded-lg shadow-lg border border-gray-300 p-4 font-mono text-xs transition-all duration-200 relative ${
          is57mm ? 'w-[240px] text-[10px]' : 'w-[290px] text-[11px]'
        }`}
        style={{
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Paper Top Decorative Edge */}
        <div className="text-center pb-2 border-b border-dashed border-gray-300 space-y-1">
          {/* Logo Emoji */}
          <div className="text-2xl">{settings.logoEmoji || '🏪'}</div>
          {/* Store Name */}
          <h3 className="text-sm font-black font-sans text-gray-900 leading-tight">
            {settings.storeName || 'اسم المتجر'}
          </h3>
          {/* Company Name */}
          {settings.companyName && (
            <p className="text-[10px] text-gray-500 font-sans">
              {settings.companyName}
            </p>
          )}
          {/* Branch */}
          {settings.branchName && (
            <p className="text-[10px] text-gray-400 font-sans">
              {settings.branchName}
            </p>
          )}
          {/* Tax Number */}
          {settings.showTaxNumber && settings.taxNumber && (
            <p className="text-[10px] text-gray-600">
              الرقم الضريبي: {settings.taxNumber}
            </p>
          )}
          {/* Receipt Title Badge */}
          <div className="pt-1">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold font-sans bg-gray-100 text-gray-800 border border-gray-200">
              {settings.receiptTitle || 'فاتورة ضريبية مبسطة'}
            </span>
          </div>
          {/* Header Custom Message */}
          {settings.headerMessage && (
            <p className="text-[10px] text-emerald-800 font-sans font-medium pt-1">
              {settings.headerMessage}
            </p>
          )}
        </div>

        {/* Invoice Metadata */}
        <div className="py-2 border-b border-dashed border-gray-300 space-y-1 text-[10px] text-gray-600">
          <div className="flex justify-between">
            <span>رقم الفاتورة:</span>
            <span className="font-bold text-gray-800">INV-849105</span>
          </div>
          <div className="flex justify-between">
            <span>التاريخ والوقت:</span>
            <span>02/10/2026 19:15</span>
          </div>
          {settings.showCashierName && (
            <div className="flex justify-between">
              <span>الكاشير:</span>
              <span className="font-sans font-bold text-gray-800">سامر النجار</span>
            </div>
          )}
          {settings.showCustomerInfo && (
            <div className="flex justify-between">
              <span>العميل:</span>
              <span className="font-sans font-bold text-gray-800">أحمد الحمصي</span>
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="py-2 border-b border-dashed border-gray-300">
          <div className="flex justify-between font-bold text-gray-900 border-b border-gray-200 pb-1 mb-1 font-sans text-[10px]">
            <span>الصنف</span>
            <span>الكمية × السعر</span>
            <span>المجموع</span>
          </div>
          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between items-start">
              <span className="font-sans font-semibold truncate max-w-[100px]">
                حليب كامل الدسم 1 لتر
              </span>
              <span className="text-gray-500">2 × 6.50</span>
              <span className="font-bold">13.00</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="font-sans font-semibold truncate max-w-[100px]">
                مياه طبيعية 500 مل
              </span>
              <span className="text-gray-500">4 × 1.50</span>
              <span className="font-bold">6.00</span>
            </div>
          </div>
        </div>

        {/* Financial Totals */}
        <div className="py-2 border-b border-dashed border-gray-300 space-y-1 text-[10px]">
          <div className="flex justify-between text-gray-600">
            <span>المجموع الفرعي:</span>
            <span>16.52 {settings.currency}</span>
          </div>
          {settings.showTaxBreakdown && (
            <div className="flex justify-between text-gray-600">
              <span>ضريبة القيمة المضافة ({settings.defaultTaxRate}%):</span>
              <span>2.48 {settings.currency}</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-black text-gray-900 pt-1 border-t border-gray-200">
            <span>الإجمالي النهائي:</span>
            <span>19.00 {settings.currency}</span>
          </div>
          <div className="flex justify-between text-gray-500 text-[10px]">
            <span>طريقة الدفع (مدى):</span>
            <span>19.00 {settings.currency}</span>
          </div>
        </div>

        {/* Loyalty Points */}
        {settings.showLoyaltyPoints && (
          <div className="py-1.5 border-b border-dashed border-gray-300 text-center text-[10px] text-indigo-700 bg-indigo-50/60 rounded my-1">
            <span className="font-bold font-sans">
              ⭐ رصيد نقاط الولاء: 342 نقطة (+1 نقطة جديدة)
            </span>
          </div>
        )}

        {/* ZATCA QR Code Simulation */}
        {settings.showQrCode && (
          <div className="py-2.5 flex flex-col items-center justify-center border-b border-dashed border-gray-300">
            <div className="w-20 h-20 bg-gray-900 p-1 rounded flex items-center justify-center text-white">
              {/* Simplified SVG QR Code Pattern */}
              <svg viewBox="0 0 24 24" className="w-16 h-16 fill-current">
                <path d="M2 2h7v7H2V2zm2 2v3h3V4H4zm9-2h7v7h-7V2zm2 2v3h3V4h-3zM2 15h7v7H2v-7zm2 2v3h3v-3H4zm11 1h2v2h-2v-2zm-2-4h2v2h-2v-2zm6 0h2v4h-2v-4zm-4 4h2v2h-2v-2zm4 2h2v2h-2v-2zm-6-2h2v2h-2v-2zm2-2h2v2h-2v-2zm2-2h2v2h-2v-2zM4 11h3v2H4v-2zm6-7h2v3h-2V4zm-2 7h3v2H8v-2zm8 0h3v2h-3v-2zm-5 0h2v2h-2v-2z" />
              </svg>
            </div>
            <span className="text-[9px] text-gray-400 mt-1 font-sans">
              رمز الاستجابة السريع للفوترة الإلكترونية (ZATCA)
            </span>
          </div>
        )}

        {/* Store Contacts & Address */}
        <div className="text-center pt-2 space-y-0.5 text-[9px] text-gray-500 font-sans">
          {settings.phone && <div>هاتف: {settings.phone}</div>}
          {settings.address && <div>{settings.address}</div>}
        </div>

        {/* Footer Message */}
        {settings.footerMessage && (
          <div className="text-center pt-2 text-[10px] font-sans font-medium text-gray-700 leading-tight">
            {settings.footerMessage}
          </div>
        )}

        {/* Paper bottom cut effect */}
        <div className="mt-3 border-t-2 border-dotted border-gray-300 pt-1 text-center text-[9px] text-gray-400 font-mono">
          *** نهاية الإيصال ***
        </div>
      </div>
    </div>
  );
}
