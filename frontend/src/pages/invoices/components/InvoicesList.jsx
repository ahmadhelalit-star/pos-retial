import {
  DocumentTextIcon,
  EyeIcon,
  PrinterIcon,
  ArrowUturnLeftIcon,
  BanknotesIcon,
  CreditCardIcon,
} from '../../../components/common/Icons';

export function InvoicesList({
  invoices,
  onViewDetails,
  onReprint,
  onInitiateReturn,
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'مدفوعة':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            مدفوعة
          </span>
        );
      case 'مسترجع جزئي':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            مسترجع جزئي
          </span>
        );
      case 'مسترجعة':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            مسترجعة بالكامل
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  if (invoices.length === 0) {
    return (
      <div className="bg-white mx-4 p-12 rounded-2xl border border-gray-200 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mb-3">
          <DocumentTextIcon className="w-8 h-8" />
        </div>
        <p className="font-bold text-gray-700 text-sm">لا توجد فواتير مطابقة لمعايير البحث</p>
        <p className="text-xs text-gray-500 mt-1">جرّب تغيير كلمات البحث أو مسح خيارات الفلترة</p>
      </div>
    );
  }

  return (
    <>
      {/* ── MOBILE CARD LIST (< md) ── */}
      <div className="block md:hidden space-y-0">
        {invoices.map((inv) => {
          const totalItems = (inv.items || []).reduce((acc, it) => acc + (it.qty || 0), 0);
          const isFullyRefunded = inv.status === 'مسترجعة';

          return (
            <div
              key={inv.id}
              className="p-3 bg-white border border-gray-200 rounded-2xl mb-2 mx-4"
            >
              {/* Row 1: Invoice number + status badge */}
              <div className="flex items-center justify-between mb-1.5">
                <button
                  type="button"
                  onClick={() => onViewDetails(inv)}
                  className="font-mono font-bold text-gray-900 hover:text-emerald-700 flex items-center gap-1.5 text-sm"
                >
                  <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                  <span>{inv.invoiceNumber}</span>
                </button>
                {getStatusBadge(inv.status)}
              </div>

              {/* Row 2: Customer name + payment method badge */}
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="font-bold text-gray-800 text-xs">
                    {inv.customer?.name || 'عميل نقدي'}
                  </span>
                  {inv.customer?.phone && (
                    <span className="block text-[11px] text-gray-500 font-mono">
                      {inv.customer.phone}
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                  {inv.paymentMethod === 'نقدي' ? (
                    <BanknotesIcon className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <CreditCardIcon className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span>{inv.paymentMethod}</span>
                </span>
              </div>

              {/* Row 3: Date and time */}
              <div className="text-gray-500 text-xs mb-2">
                <span>{inv.date}</span>
                <span className="mx-1 text-gray-300">•</span>
                <span className="font-mono text-gray-600">{inv.time}</span>
                <span className="mx-1 text-gray-300">•</span>
                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">{totalItems} مواد</span>
              </div>

              {/* Row 4: Grand total + action buttons */}
              <div className="flex items-center justify-between">
                <span className="text-emerald-700 font-black text-lg font-mono">
                  {inv.grandTotal.toFixed(2)}{' '}
                  <span className="text-xs font-sans text-gray-500">ر.س</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {/* View details */}
                  <button
                    type="button"
                    onClick={() => onViewDetails(inv)}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition-colors cursor-pointer"
                    title="عرض التفاصيل"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>

                  {/* Reprint */}
                  <button
                    type="button"
                    onClick={() => onReprint(inv)}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors cursor-pointer"
                    title="إعادة طباعة الإيصال"
                  >
                    <PrinterIcon className="w-4 h-4" />
                  </button>

                  {/* Return / Refund */}
                  <button
                    type="button"
                    disabled={isFullyRefunded}
                    onClick={() => onInitiateReturn(inv)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isFullyRefunded
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-amber-50 text-gray-600 hover:text-amber-700'
                    }`}
                    title={isFullyRefunded ? 'تم إرجاع الفاتورة بالكامل' : 'إرجاع أو استبدال صنف'}
                  >
                    <ArrowUturnLeftIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP TABLE (>= md) ── */}
      <div className="hidden md:block bg-white mx-4 rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 select-none">
                <th className="py-3.5 px-2.5">رقم الفاتورة</th>
                <th className="py-3.5 px-2.5">التاريخ والوقت</th>
                <th className="py-3.5 px-2.5">العميل</th>
                <th className="py-3.5 px-2.5">الأصناف</th>
                <th className="py-3.5 px-2.5">طريقة الدفع</th>
                <th className="py-3.5 px-2.5">الحالة</th>
                <th className="py-3.5 px-2.5 text-left">الإجمالي</th>
                <th className="py-3.5 px-2.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
              {invoices.map((inv) => {
                const totalItems = (inv.items || []).reduce((acc, it) => acc + (it.qty || 0), 0);
                const isFullyRefunded = inv.status === 'مسترجعة';

                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50/80 transition-colors group select-none"
                  >
                    {/* Invoice # */}
                    <td className="py-3.5 px-2.5">
                      <button
                        type="button"
                        onClick={() => onViewDetails(inv)}
                        className="flex items-center gap-1.5 whitespace-nowrap font-mono font-bold text-gray-900 hover:text-emerald-700 hover:underline cursor-pointer"
                      >
                        <DocumentTextIcon className="hidden w-4 h-4 text-gray-500 group-hover:text-emerald-600 xl:block" />
                        <span>{inv.invoiceNumber}</span>
                      </button>
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-2.5 text-gray-500 whitespace-nowrap">
                      <span>{inv.date}</span>
                      <span className="mx-1 text-gray-300">•</span>
                      <span className="font-mono text-gray-600">{inv.time}</span>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-2.5">
                      <span className="font-bold text-gray-800">
                        {inv.customer?.name || 'عميل نقدي'}
                      </span>
                      {inv.customer?.phone && (
                        <span className="block text-[11px] text-gray-500 font-mono">
                          {inv.customer.phone}
                        </span>
                      )}
                    </td>

                    {/* Items count */}
                    <td className="py-3.5 px-2.5">
                      <span className="whitespace-nowrap rounded bg-gray-100 px-2 py-0.5 font-mono text-gray-700">
                        {totalItems} مواد
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-2.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-700">
                        {inv.paymentMethod === 'نقدي' ? (
                          <BanknotesIcon className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <CreditCardIcon className="w-4 h-4 text-blue-600" />
                        )}
                        <span>{inv.paymentMethod}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-2.5 whitespace-nowrap">
                      {getStatusBadge(inv.status)}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3.5 px-2.5 text-left font-mono font-black text-sm text-gray-900 whitespace-nowrap">
                      {inv.grandTotal.toFixed(2)}{' '}
                      <span className="text-[11px] font-sans text-gray-500">ر.س</span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View details */}
                        <button
                          type="button"
                          onClick={() => onViewDetails(inv)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition-colors cursor-pointer"
                          title="عرض التفاصيل"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>

                        {/* Reprint */}
                        <button
                          type="button"
                          onClick={() => onReprint(inv)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors cursor-pointer"
                          title="إعادة طباعة الإيصال"
                        >
                          <PrinterIcon className="w-4 h-4" />
                        </button>

                        {/* Return / Refund */}
                        <button
                          type="button"
                          disabled={isFullyRefunded}
                          onClick={() => onInitiateReturn(inv)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isFullyRefunded
                              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                              : 'bg-gray-100 hover:bg-amber-50 text-gray-600 hover:text-amber-700'
                          }`}
                          title={isFullyRefunded ? 'تم إرجاع الفاتورة بالكامل' : 'إرجاع أو استبدال صنف'}
                        >
                          <ArrowUturnLeftIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
