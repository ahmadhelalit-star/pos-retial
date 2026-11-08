import {
  EyeIcon,
  BanknotesIcon,
  DocumentTextIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '../../../components/common/Icons';

export function PurchaseInvoicesList({
  invoices = [],
  onViewInvoice,
  onRecordPayment,
}) {
  const renderPaymentStatus = (inv) => {
    if (inv.paymentStatus === 'paid') {
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
          <CheckIcon className="w-3 h-3 text-emerald-600" />
          <span>مدفوع</span>
        </span>
      );
    }

    if (inv.paymentStatus === 'partial') {
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
          <span>مسدد جزئياً</span>
          <span className="font-mono text-[11px]">
            ({(inv.remainingAmount || 0).toFixed(0)} متبقي)
          </span>
        </span>
      );
    }

    if (inv.paymentStatus === 'unpaid') {
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">
          <ExclamationTriangleIcon className="w-3 h-3 text-rose-600" />
          <span>غير مدفوع (آجل)</span>
        </span>
      );
    }

    return null;
  };

  if (invoices.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white m-3 rounded-2xl border border-gray-200">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
          <DocumentTextIcon className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-black text-gray-800 mb-1">
          لا توجد فواتير شراء تطابق البحث
        </h3>
        <p className="text-xs text-gray-500 max-w-sm">
          يمكنك تسجيل فاتورة شراء وتوريد جديدة لتزويد المخزون وحفظ حسابات الموردين.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="block md:hidden space-y-2">
        {invoices.map((inv) => {
          const isPaid = inv.paymentStatus === 'paid';

          return (
            <div
              key={inv.id}
              className="rounded-2xl border border-gray-200 bg-white p-3 shadow-xs"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onViewInvoice(inv)}
                  className="flex min-w-0 items-center gap-1.5 font-mono text-sm font-bold text-gray-900 transition-colors hover:text-emerald-700 cursor-pointer"
                >
                  <DocumentTextIcon className="h-4 w-4 shrink-0 text-gray-500" />
                  <span className="truncate">{inv.invoiceNumber}</span>
                </button>
                {renderPaymentStatus(inv)}
              </div>

              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-gray-900">
                    {inv.supplierName}
                  </p>
                  {inv.supplierInvoiceNo && (
                    <p className="truncate font-mono text-[11px] text-gray-500">
                      مورد: {inv.supplierInvoiceNo}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                  {inv.paymentMethod || 'آجل'}
                </span>
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                <span>{inv.date}</span>
                <span className="text-gray-300">•</span>
                <span className="font-mono text-gray-600">{inv.time}</span>
                <span className="text-gray-300">•</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-600">
                  {inv.items?.length || 0} صنف
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                <div className="whitespace-nowrap">
                  <span className="font-mono text-lg font-black text-emerald-700">
                    {(inv.grandTotal || 0).toFixed(2)}
                  </span>
                  <span className="mr-1 text-xs font-bold text-gray-500">ر.س</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onViewInvoice(inv)}
                    title="عرض الفاتورة والطباعة"
                    className="rounded-lg bg-gray-100 p-1.5 text-gray-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>

                  {!isPaid && (
                    <button
                      type="button"
                      onClick={() => onRecordPayment(inv)}
                      title="تسجيل دفعة سداد"
                      className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 cursor-pointer"
                    >
                      <BanknotesIcon className="h-3.5 w-3.5" />
                      <span>سداد</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-right text-xs">
          <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 select-none">
            <tr>
              <th className="py-3 px-3.5">رقم الفاتورة</th>
              <th className="py-3 px-3.5">التاريخ والوقت</th>
              <th className="py-3 px-3.5">المورد</th>
              <th className="py-3 px-3.5 text-center">الأصناف</th>
              <th className="py-3 px-3.5">المجموع الفرعي</th>
              <th className="py-3 px-3.5">الضريبة</th>
              <th className="py-3 px-3.5">الإجمالي الشامل</th>
              <th className="py-3 px-3.5 text-center">طريقة الدفع</th>
              <th className="py-3 px-3.5 text-center">حالة السداد</th>
              <th className="py-3 px-3.5 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv) => {
              const isPaid = inv.paymentStatus === 'paid';

              return (
                <tr
                  key={inv.id}
                  className="hover:bg-gray-50/80 transition-colors group"
                >
                  {/* رقم الفاتورة */}
                  <td className="py-3 px-3.5">
                    <div className="font-mono font-bold text-gray-900">
                      {inv.invoiceNumber}
                    </div>
                    {inv.supplierInvoiceNo && (
                      <div className="text-xs text-gray-500 font-mono">
                        مورد: {inv.supplierInvoiceNo}
                      </div>
                    )}
                  </td>

                  {/* التاريخ */}
                  <td className="py-3 px-3.5 text-gray-600 font-mono">
                    <div>{inv.date}</div>
                    <div className="text-xs text-gray-500">{inv.time}</div>
                  </td>

                  {/* المورد */}
                  <td className="py-3 px-3.5">
                    <div className="font-bold text-gray-900">
                      {inv.supplierName}
                    </div>
                    {inv.notes && (
                      <div className="text-xs text-gray-500 truncate max-w-[180px]">
                        {inv.notes}
                      </div>
                    )}
                  </td>

                  {/* عدد الأصناف */}
                  <td className="py-3 px-3.5 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 font-mono">
                      {inv.items?.length || 0} صنف
                    </span>
                  </td>

                  {/* المجموع قبل الضريبة */}
                  <td className="py-3 px-3.5 font-mono text-gray-700">
                    {(inv.subtotal || 0).toFixed(2)} ر.س
                  </td>

                  {/* الضريبة */}
                  <td className="py-3 px-3.5 font-mono text-gray-500">
                    {(inv.taxAmount || 0).toFixed(2)} ر.س
                  </td>

                  {/* الإجمالي */}
                  <td className="py-3 px-3.5">
                    <span className="font-mono font-black text-emerald-700 text-sm">
                      {(inv.grandTotal || 0).toFixed(2)}
                    </span>
                    <span className="text-xs text-emerald-600 mr-1 font-bold">
                      ر.س
                    </span>
                  </td>

                  {/* طريقة الدفع */}
                  <td className="py-3 px-3.5 text-center">
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {inv.paymentMethod || 'آجل'}
                    </span>
                  </td>

                  {/* حالة السداد */}
                  <td className="py-3 px-3.5 text-center">
                    {renderPaymentStatus(inv)}
                  </td>

                  {/* إجراءات */}
                  <td className="py-3 px-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewInvoice(inv)}
                        title="عرض الفاتورة والطباعة"
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>

                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => onRecordPayment(inv)}
                          title="تسجيل دفعة سداد"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-colors cursor-pointer text-xs"
                        >
                          <BanknotesIcon className="w-3.5 h-3.5" />
                          <span>سداد</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
