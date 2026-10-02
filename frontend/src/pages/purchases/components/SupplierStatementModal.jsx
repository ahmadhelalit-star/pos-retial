import { useState } from 'react';
import {
  XMarkIcon,
  PrinterIcon,
  BanknotesIcon,
  CheckIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  PhoneIcon,
} from '../../../components/common/Icons';

export function SupplierStatementModal({
  isOpen,
  onClose,
  supplier,
  invoices = [],
  onMakePayment,
}) {
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash'); // 'cash' | 'transfer'
  const [payNotes, setPayNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');

  if (!isOpen || !supplier) return null;

  // فواتير هذا المورد فقط
  const supplierInvoices = invoices.filter(
    (inv) => inv.supplierId === supplier.id
  );

  const currentBalance = supplier.balance || 0;

  const handlePaySubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;

    setIsSubmitting(true);
    onMakePayment(supplier.id, amount, {
      method: payMethod,
      notes: payNotes,
      date: new Date().toLocaleDateString('ar-SA'),
    });

    setPaymentSuccessMsg(`تم تسجيل سداد ${amount.toFixed(2)} ر.س بنجاح`);
    setPayAmount('');
    setPayNotes('');
    setIsSubmitting(false);

    setTimeout(() => {
      setPaymentSuccessMsg('');
    }, 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <DocumentTextIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900">
                كشف حساب المورد: {supplier.name}
              </h2>
              <p className="text-[11px] text-gray-500">
                سجل الفواتير والمستحقات والمدفوعات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              title="طباعة كشف الحساب"
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Supplier Info & Balance Banner */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-xl shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-indigo-200 block">
                  الرصيد المستحق الحالي للمورد
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black font-mono">
                    {currentBalance.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-xs font-bold text-indigo-300">ر.س</span>
                </div>
                {supplier.taxNumber && (
                  <div className="text-[11px] text-gray-300 mt-1 font-mono">
                    الرقم الضريبي: {supplier.taxNumber}
                  </div>
                )}
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-lg border border-white/10 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <PhoneIcon className="w-3.5 h-3.5 text-indigo-300" />
                  <span dir="ltr">{supplier.phone || 'غير مسجل'}</span>
                </div>
                {supplier.bankDetails && (
                  <div className="text-[11px] text-indigo-200 font-mono">
                    {supplier.bankDetails}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Section (سداد دفعة للمورد) */}
          {currentBalance > 0 && (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-2 text-emerald-800 font-bold text-xs">
                <BanknotesIcon className="w-4 h-4 text-emerald-600" />
                <span>تسجيل دفعة سداد للمورد</span>
              </div>

              {paymentSuccessMsg && (
                <div className="mb-3 p-2 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" />
                  <span>{paymentSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handlePaySubmit} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      المبلغ المدفوع (ر.س)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      max={currentBalance}
                      min="0.01"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      طريقة السداد
                    </label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="cash">نقداً من الصندوق</option>
                      <option value="transfer">تحويل بنكي</option>
                      <option value="card">بطاقة / مدى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      ملاحظة / مرجع السداد
                    </label>
                    <input
                      type="text"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="رقم الحوالة أو السند..."
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>تأكيد السداد وتحديث الرصيد</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Invoices List for this Supplier */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-800">
                فواتير التوريد المسجلة ({supplierInvoices.length})
              </h3>
              <span className="text-[11px] text-gray-500 font-mono">
                إجمالي التوريدات:{' '}
                {(supplier.totalPurchases || 0).toLocaleString()} ر.س
              </span>
            </div>

            {supplierInvoices.length === 0 ? (
              <div className="p-6 bg-gray-50 rounded-xl text-center text-xs text-gray-500 border border-gray-200">
                لا توجد فواتير شراء سابقة مسجلة لهذا المورد
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-2 px-3">رقم الفاتورة</th>
                      <th className="py-2 px-3">التاريخ</th>
                      <th className="py-2 px-3">الأصناف</th>
                      <th className="py-2 px-3">الإجمالي</th>
                      <th className="py-2 px-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {supplierInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50/60">
                        <td className="py-2 px-3 font-mono font-bold text-gray-900">
                          {inv.invoiceNumber}
                          {inv.supplierInvoiceNo && (
                            <span className="text-[10px] text-gray-400 block">
                              مورد: {inv.supplierInvoiceNo}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-600 font-mono">
                          {inv.date}
                        </td>
                        <td className="py-2 px-3 font-mono text-gray-700">
                          {inv.items?.length || 0} صنف
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                          {(inv.grandTotal || 0).toFixed(2)} ر.س
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.paymentStatus === 'partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.paymentStatus === 'paid'
                              ? 'مسدد'
                              : inv.paymentStatus === 'partial'
                              ? 'سداد جزئي'
                              : 'آجل غير مسدد'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/70 flex justify-end">
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
