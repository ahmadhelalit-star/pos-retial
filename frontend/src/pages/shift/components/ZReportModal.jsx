import { createPortal } from 'react-dom';
import { PrinterIcon, CheckIcon, XMarkIcon } from '../../../components/common/Icons';

export function ZReportModal({
  isOpen,
  onClose,
  reportData,
  storeSettings = {},
}) {
  if (!isOpen || !reportData) return null;

  const zReportNumber = reportData.reportNumber || '—';
  const generatedAt = new Date(reportData.generatedAt);
  const closeDateStr = generatedAt.toLocaleDateString('ar-SA');
  const closeTimeStr = generatedAt.toLocaleTimeString('ar-SA');
  const storeName = storeSettings.storeName || 'Sham Touch Retail POS';
  const companyName = storeSettings.companyName || 'مؤسسة شام تاتش للتجارة والتجزئة';
  const taxNumber = storeSettings.taxNumber || '310123456700003';
  const taxRatePercent = reportData.taxRatePercent ?? 15;

  const handlePrint = () => {
    window.print();
  };

  const diff = reportData.actualCash - reportData.expectedCash;

  return createPortal(
    <div className="print-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="no-print p-3 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-sm">
            <CheckIcon className="w-5 h-5" />
            <span>تقرير إغلاق الوردية (Z-Report)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-emerald-800 text-emerald-100 flex items-center justify-center cursor-pointer"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Report Body */}
        <div className="print-area p-5 overflow-y-auto font-mono text-xs text-gray-800 space-y-3 bg-white">
          {/* Store Info */}
          <div className="text-center pb-2 border-b border-dashed border-gray-300">
            <h3 className="text-base font-black font-sans text-gray-900">
              {storeName}
            </h3>
            <p className="text-[11px] text-gray-500 font-sans mt-0.5">
              {companyName}
            </p>
            <p className="text-[10px] text-gray-400">الرقم الضريبي: {taxNumber}</p>
            <p className="text-[10px] bg-gray-100 font-bold inline-block px-2 py-0.5 rounded mt-1 font-sans">
              تقرير الإغلاق المالي اليومي (Z - REPORT)
            </p>
          </div>

          {/* Shift Metadata */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-gray-300 pb-2">
            <div className="flex justify-between">
              <span>رقم التقرير:</span>
              <span className="font-bold">{zReportNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>رقم الوردية:</span>
              <span className="font-bold">#{reportData.shiftId}</span>
            </div>
            <div className="flex justify-between">
              <span>الكاشير:</span>
              <span className="font-sans font-bold">{reportData.cashier}</span>
            </div>
            <div className="flex justify-between">
              <span>وقت الفتح:</span>
              <span>{reportData.openedAt}</span>
            </div>
            <div className="flex justify-between">
              <span>وقت الإغلاق:</span>
              <span>{closeDateStr} {closeTimeStr}</span>
            </div>
          </div>

          {/* Sales Breakdown */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-gray-300 pb-2">
            <p className="font-bold font-sans text-gray-900 mb-1">تفاصيل المبيعات:</p>
            <div className="flex justify-between">
              <span className="font-sans">مبيعات الكاش (نقدي):</span>
              <span>{reportData.cashSales.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">مبيعات الشبكة (بطاقة / مدى):</span>
              <span>{reportData.cardSales.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span className="font-sans">إجمالي المرتجعات:</span>
              <span>- {(reportData.cashRefunds + reportData.cardRefunds).toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-gray-200 text-gray-900">
              <span className="font-sans">صافي المبيعات:</span>
              <span>{reportData.netSales.toFixed(2)} ر.س</span>
            </div>
          </div>

          {/* Tax Breakdown */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-gray-300 pb-2">
            <p className="font-bold font-sans text-gray-900 mb-1">الضريبة المضافة ({taxRatePercent}%):</p>
            <div className="flex justify-between">
              <span className="font-sans">ضريبة المبيعات المحصلة:</span>
              <span>{reportData.taxCollected.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span className="font-sans">ضريبة المرتجعات المستردة:</span>
              <span>- {reportData.taxRefunded.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
              <span className="font-sans">صافي ضريبة الوردية:</span>
              <span>{(reportData.taxCollected - reportData.taxRefunded).toFixed(2)} ر.س</span>
            </div>
          </div>

          {/* Drawer Reconciliation */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-gray-300 pb-2">
            <p className="font-bold font-sans text-gray-900 mb-1">مطابقة النقد بالدرج:</p>
            <div className="flex justify-between">
              <span className="font-sans">الرصيد الافتتاحي (الفكة):</span>
              <span>{reportData.openingFloat.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">النقد المتوقع في الدرج:</span>
              <span className="font-bold">{reportData.expectedCash.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">النقد الفعلي المحسوب:</span>
              <span className="font-bold">{reportData.actualCash.toFixed(2)} ر.س</span>
            </div>
            <div
              className={`flex justify-between font-black pt-1 border-t border-gray-200 ${
                Math.abs(diff) < 0.01
                  ? 'text-emerald-700'
                  : diff > 0
                  ? 'text-blue-700'
                  : 'text-red-700'
              }`}
            >
              <span className="font-sans">
                {Math.abs(diff) < 0.01
                  ? 'الفرق (متطابق):'
                  : diff > 0
                  ? 'فائض نقدي:'
                  : 'عجز نقدي:'}
              </span>
              <span>{diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} ر.س</span>
            </div>
            {reportData.notes && (
              <p className="font-sans text-[10px] text-gray-500 pt-1">
                ملاحظة: {reportData.notes}
              </p>
            )}
          </div>

          {/* Signatures */}
          <div className="pt-2 font-sans grid grid-cols-2 gap-4 text-center text-[10px]">
            <div className="border-t border-gray-300 pt-1 text-gray-600">
              <p>توقيع الكاشير</p>
              <p className="mt-4 font-bold">{reportData.cashier}</p>
            </div>
            <div className="border-t border-gray-300 pt-1 text-gray-600">
              <p>اعتماد المشرف</p>
              <p className="mt-4 font-bold">.......................</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="no-print p-3 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs cursor-pointer shadow-2xs transition-colors"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>طباعة تقرير Z</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
          >
            <span>تم واعتماد الإغلاق</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
