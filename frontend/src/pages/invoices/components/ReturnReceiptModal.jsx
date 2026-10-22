import { createPortal } from 'react-dom';
import { PrinterIcon, CheckIcon, XMarkIcon } from '../../../components/common/Icons';

export function ReturnReceiptModal({
  isOpen,
  onClose,
  returnData,
  storeSettings = {},
}) {
  if (!isOpen || !returnData) return null;

  const creditNoteNumber = returnData.creditNoteNumber || '—';
  const createdAt = new Date(returnData.timestamp);
  const dateStr = createdAt.toLocaleDateString('ar-SA');
  const timeStr = createdAt.toLocaleTimeString('ar-SA');
  const taxRatePercent =
    returnData.refundSubtotal > 0
      ? Math.round((returnData.refundTax / returnData.refundSubtotal) * 100)
      : 0;
  const storeName = storeSettings.storeName || 'Sham Touch Retail POS';
  const companyName = storeSettings.companyName || 'مؤسسة شام تاتش للتجارة والتجزئة';
  const taxNumber = storeSettings.taxNumber || '310123456700003';

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="print-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="no-print p-3 bg-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-sm">
            <CheckIcon className="w-5 h-5" />
            <span>تمت معالجة المرتجع بنجاح</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-amber-700 text-amber-100 flex items-center justify-center cursor-pointer"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Body */}
        <div className="print-area p-5 overflow-y-auto font-mono text-xs text-gray-800 space-y-3 bg-white">
          {/* Store info */}
          <div className="text-center pb-2 border-b border-dashed border-gray-300">
            <h3 className="text-base font-black font-sans text-gray-900">
              {storeName}
            </h3>
            <p className="text-[11px] text-gray-500 font-sans mt-0.5">
              {companyName}
            </p>
            <p className="text-[10px] text-gray-400">الرقم الضريبي: {taxNumber}</p>
            <p className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 inline-block px-2 py-0.5 rounded mt-1 font-sans font-bold">
              إشعار دائن ضريبي مبسط (مرتجع)
            </p>
          </div>

          {/* Metadata */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-gray-300 pb-2">
            <div className="flex justify-between">
              <span>رقم الإشعار:</span>
              <span className="font-bold text-amber-800">{creditNoteNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>مرجع الفاتورة الأصلية:</span>
              <span className="font-bold font-sans">#{returnData.invoiceId}</span>
            </div>
            <div className="flex justify-between">
              <span>التاريخ والوقت:</span>
              <span>{dateStr} {timeStr}</span>
            </div>
            <div className="flex justify-between">
              <span>الكاشير:</span>
              <span className="font-sans">{returnData.cashier || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>سبب الإرجاع:</span>
              <span className="font-sans text-gray-600">{returnData.reason}</span>
            </div>
          </div>

          {/* Returned Items */}
          <div className="border-b border-dashed border-gray-300 pb-2">
            <div className="flex justify-between font-bold text-gray-900 mb-1 border-b border-gray-200 pb-1 font-sans text-[11px]">
              <span>الصنف المسترجع</span>
              <span>الكمية × السعر</span>
              <span>المجموع</span>
            </div>
            <div className="space-y-1.5">
              {returnData.returnedItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-[11px]">
                  <span className="font-sans font-semibold max-w-[120px] truncate">
                    {item.name}
                  </span>
                  <span className="text-gray-600">
                    {item.qtyToReturn} × {item.price.toFixed(2)}
                  </span>
                  <span className="font-bold">
                    {(item.qtyToReturn * item.price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Refund Totals */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-gray-300 pb-2">
            <div className="flex justify-between">
              <span className="font-sans">قيمة المواد المسترجعة:</span>
              <span>{returnData.refundSubtotal.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">الضريبة المستردة ({taxRatePercent}%):</span>
              <span>{returnData.refundTax.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-1 border-t border-gray-200 text-red-600">
              <span className="font-sans">إجمالي المبلغ المسترد:</span>
              <span>{returnData.totalRefundAmount.toFixed(2)} ر.س</span>
            </div>
          </div>

          {/* Method */}
          <div className="p-2 bg-gray-50 rounded-lg text-[11px] flex justify-between font-sans">
            <span>طريقة الرد:</span>
            <span className="font-bold">
              {returnData.refundMethod === 'cash' ? 'نقدي (كاش)' : 'إرجاع على البطاقة'}
            </span>
          </div>

          {/* Footer note */}
          <div className="text-center pt-1 font-sans text-[10px] text-gray-400">
            تم تسجيل إشعار الدائن بنجاح وتحديث حركة المخزون آلياً
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
            <span>طباعة الإشعار</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
          >
            <span>تم وإغلاق</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
