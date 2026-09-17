import {
  XMarkIcon,
  PrinterIcon,
  ArrowUturnLeftIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CreditCardIcon,
} from '../../../components/common/Icons';

export function InvoiceDetailsModal({
  isOpen,
  onClose,
  invoice,
  onReprint,
  onInitiateReturn,
}) {
  if (!isOpen || !invoice) return null;

  const isFullyRefunded = invoice.status === 'مسترجعة';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-800">
              تفاصيل الفاتورة <span className="font-mono text-emerald-700">#{invoice.invoiceNumber}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-gray-700">
          {/* Status & Payment Overview Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-gray-50 rounded-2xl border border-gray-200/80">
            <div>
              <span className="text-gray-400 font-bold block">التاريخ والوقت</span>
              <span className="font-semibold text-gray-800 font-mono mt-0.5 block">
                {invoice.date} {invoice.time}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-bold block">العميل</span>
              <span className="font-bold text-gray-800 mt-0.5 block">
                {invoice.customer?.name || 'عميل نقدي'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-bold block">طريقة الدفع</span>
              <div className="flex items-center gap-1 font-bold text-gray-800 mt-0.5">
                {invoice.paymentMethod === 'نقدي' ? (
                  <BanknotesIcon className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <CreditCardIcon className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>{invoice.paymentMethod}</span>
              </div>
            </div>
            <div>
              <span className="text-gray-400 font-bold block">حالة الفاتورة</span>
              <span className="font-bold mt-0.5 block">
                {invoice.status === 'مدفوعة' && (
                  <span className="text-emerald-700">مدفوعة ومكتملة</span>
                )}
                {invoice.status === 'مسترجع جزئي' && (
                  <span className="text-amber-700">مسترجع جزئي</span>
                )}
                {invoice.status === 'مسترجعة' && (
                  <span className="text-red-700">مسترجعة بالكامل</span>
                )}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="font-bold text-gray-800 mb-2">الأصناف المشتراة</h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-right">
                <thead className="bg-gray-100 text-[11px] font-bold text-gray-500">
                  <tr>
                    <th className="py-2 px-3">المادة</th>
                    <th className="py-2 px-3">الكمية</th>
                    <th className="py-2 px-3">المسترجع</th>
                    <th className="py-2 px-3">السعر</th>
                    <th className="py-2 px-3 text-left">المجموع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {invoice.items.map((item) => {
                    const lineTotal = (item.qty * item.price).toFixed(2);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-bold text-gray-800">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {item.qty} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-700">
                          {item.returnedQty > 0 ? `${item.returnedQty} ${item.unit}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {item.price.toFixed(2)} ر.س
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-gray-900">
                          {lineTotal} ر.س
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5 font-mono">
            <div className="flex justify-between font-sans text-gray-600">
              <span>المجموع الخاضع للضريبة:</span>
              <span className="font-mono">{invoice.taxableAmount.toFixed(2)} ر.س</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between font-sans text-red-600">
                <span>إجمالي الخصم المطبق:</span>
                <span className="font-mono">- {invoice.discountAmount.toFixed(2)} ر.س</span>
              </div>
            )}
            <div className="flex justify-between font-sans text-gray-600">
              <span>ضريبة القيمة المضافة (15%):</span>
              <span className="font-mono">{invoice.taxAmount.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-1 border-t border-gray-200 text-gray-900 font-sans">
              <span>الإجمالي النهائي:</span>
              <span className="font-mono text-emerald-700">{invoice.grandTotal.toFixed(2)} ر.س</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onReprint(invoice)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>إعادة طباعة الفاتورة</span>
            </button>

            {!isFullyRefunded && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onInitiateReturn(invoice);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <ArrowUturnLeftIcon className="w-4 h-4" />
                <span>إرجاع صنف / مرتجع</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
