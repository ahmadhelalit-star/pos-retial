import {
  XMarkIcon,
  PrinterIcon,
  TruckIcon,
  CheckIcon,
  BanknotesIcon,
} from '../../../components/common/Icons';

export function PurchaseInvoiceDetailsModal({
  isOpen,
  onClose,
  invoice,
  onRecordPayment,
}) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const isPaid = invoice.paymentStatus === 'paid';
  const isPartial = invoice.paymentStatus === 'partial';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900">
                فاتورة شراء وتوريد مخزني
              </h2>
              <p className="text-[11px] text-gray-500 font-mono">
                رقم الفاتورة: {invoice.invoiceNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              title="طباعة الفاتورة"
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
            >
              <PrinterIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Top metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
            <div>
              <span className="text-[11px] text-gray-500 block">المورد</span>
              <span className="font-bold text-gray-900 block">
                {invoice.supplierName}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-gray-500 block">
                فاتورة المورد
              </span>
              <span className="font-mono font-bold text-gray-800 block">
                {invoice.supplierInvoiceNo || 'غير محدد'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-gray-500 block">
                التاريخ والوقت
              </span>
              <span className="font-mono text-gray-800 block">
                {invoice.date} {invoice.time}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-gray-500 block">
                حالة السداد
              </span>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                  isPaid
                    ? 'bg-emerald-100 text-emerald-800'
                    : isPartial
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isPaid
                  ? 'مدفوع'
                  : isPartial
                  ? 'سداد جزئي'
                  : 'آجل غير مسدد'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">اسم الصنف</th>
                  <th className="py-2.5 px-3">الباركود</th>
                  <th className="py-2.5 px-3 text-center">الكمية</th>
                  <th className="py-2.5 px-3">سعر الشراء</th>
                  <th className="py-2.5 px-3">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-gray-400">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-bold text-gray-900">
                      {item.name}
                    </td>
                    <td className="py-2 px-3 font-mono text-gray-500">
                      {item.barcode}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-gray-900">
                      {item.qty} {item.unit || 'حبة'}
                    </td>
                    <td className="py-2 px-3 font-mono text-gray-700">
                      {(item.costPrice || 0).toFixed(2)} ر.س
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                      {(item.total || item.qty * item.costPrice || 0).toFixed(2)}{' '}
                      ر.س
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
            <div className="text-gray-600 text-[11px] space-y-1">
              {invoice.notes && (
                <div>
                  <span className="font-bold text-gray-700">ملاحظات:</span>{' '}
                  {invoice.notes}
                </div>
              )}
              <div>
                <span className="font-bold text-gray-700">طريقة الدفع:</span>{' '}
                {invoice.paymentMethod || 'آجل'}
              </div>
            </div>

            <div className="w-full sm:w-64 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي:</span>
                <span className="font-mono font-bold">
                  {(invoice.subtotal || 0).toFixed(2)} ر.س
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>ضريبة القيمة المضافة ({invoice.taxRate ?? 0}%):</span>
                <span className="font-mono font-bold">
                  {(invoice.taxAmount || 0).toFixed(2)} ر.س
                </span>
              </div>
              <div className="border-t border-gray-200 pt-1 flex justify-between font-black text-gray-900 text-sm">
                <span>الإجمالي الشامل:</span>
                <span className="font-mono text-emerald-700">
                  {(invoice.grandTotal || 0).toFixed(2)} ر.س
                </span>
              </div>
              {invoice.remainingAmount > 0 && (
                <div className="flex justify-between text-amber-700 font-bold pt-1 border-t border-dashed border-gray-200">
                  <span>المتبقي الآجل:</span>
                  <span className="font-mono">
                    {invoice.remainingAmount.toFixed(2)} ر.س
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/70 flex items-center justify-between">
          <div>
            {!isPaid && onRecordPayment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRecordPayment(invoice);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <BanknotesIcon className="w-4 h-4" />
                <span>سداد متبقي الفاتورة</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
