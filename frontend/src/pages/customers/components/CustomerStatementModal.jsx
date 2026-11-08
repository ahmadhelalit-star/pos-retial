import { useState } from 'react';
import {
  XMarkIcon,
  PrinterIcon,
  WalletIcon,
  CheckIcon,
  UserIcon,
  BuildingOfficeIcon,
  GiftIcon,
} from '../../../components/common/Icons';

export function CustomerStatementModal({
  isOpen,
  onClose,
  customer,
  invoices = [],
  onMakePayment,
}) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'card'
  const [paymentNote, setPaymentNote] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !customer) return null;

  const currentBalance = customer.balance || 0;
  // Filter invoices for this customer
  const customerInvoices = invoices.filter(
    (inv) => inv.customer?.id === customer.id || inv.customer?.name === customer.name
  );

  const handlePay = (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;

    if (amount > currentBalance) {
      alert(`المبلغ المدخل (${amount} ر.س) أكبر من الرصيد المستحق على العميل (${currentBalance} ر.س)`);
      return;
    }

    onMakePayment(customer.id, amount, {
      method: paymentMethod,
      note: paymentNote,
      date: new Date().toLocaleDateString('ar-SA'),
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    });

    setSuccessMsg(`تم تسجيل دفعة سداد بقيمة ${amount.toFixed(2)} ر.س بنجاح!`);
    setPaymentAmount('');
    setPaymentNote('');
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                customer.type === 'company'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {customer.type === 'company' ? (
                <BuildingOfficeIcon className="w-5 h-5" />
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{customer.name}</h2>
              <p className="text-[11px] text-gray-500">
                كشف الحساب والذمم المالية وسجل الفواتير
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>طباعة كشف</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Success Banner */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckIcon className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Customer Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. الرصيد الحالي */}
            <div
              className={`p-3.5 rounded-2xl border ${
                currentBalance > 0
                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              }`}
            >
              <p className="text-[11px] font-bold text-gray-500">الرصيد الآجل المستحق</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black font-mono">
                  {currentBalance.toFixed(2)}
                </span>
                <span className="text-xs font-bold">ر.س</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                الحد الائتماني: {(customer.creditLimit || 0).toLocaleString('ar-SA')} ر.س
              </p>
            </div>

            {/* 2. بيانات الاتصال والضريبة */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>الجوال:</span>
                <span className="font-mono font-bold text-gray-800" dir="ltr">
                  {customer.phone || 'غير مسجل'}
                </span>
              </div>
              {customer.taxNumber && (
                <div className="flex justify-between text-gray-600">
                  <span>الرقم الضريبي:</span>
                  <span className="font-mono font-bold text-blue-700">
                    {customer.taxNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>العنوان:</span>
                <span className="text-gray-800 truncate max-w-[140px]">
                  {customer.address || 'الرياض'}
                </span>
              </div>
            </div>

            {/* 3. الولاء والمشتريات */}
            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-1 text-xs">
              <div className="flex justify-between items-center text-purple-900">
                <span className="flex items-center gap-1 font-semibold">
                  <GiftIcon className="w-3.5 h-3.5 text-purple-600" />
                  نقاط الولاء:
                </span>
                <span className="font-mono font-bold text-base text-purple-950">
                  {customer.points || 0}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 pt-1 border-t border-purple-100">
                <span>إجمالي المشتريات:</span>
                <span className="font-mono font-bold text-gray-800">
                  {(customer.totalPurchases || 0).toFixed(2)} ر.س
                </span>
              </div>
            </div>
          </div>

          {/* Quick Payment Form (سند قبض / سداد دفعة) */}
          {currentBalance > 0 && (
            <div className="p-4 bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-200 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <WalletIcon className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-black text-emerald-950">
                  تسجيل سند قبض / سداد دفعة من الرصيد الآجل
                </h3>
              </div>

              <form onSubmit={handlePay} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    مبلغ السداد (ر.س) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.5"
                    max={currentBalance}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`أقصى: ${currentBalance.toFixed(2)}`}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    طريقة الدفع
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="cash">نقدي (كاش)</option>
                    <option value="card">شبكة / مدى</option>
                    <option value="bank">تحويل بنكي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    رقم الإيصال / بيان
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="سداد دفعة تحت الحساب..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    تأكيد السند وتخفيض الدين
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Invoices History Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-800">
                سجل فواتير العميل الأخيرة ({customerInvoices.length})
              </h3>
            </div>

            {customerInvoices.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">رقم الفاتورة</th>
                      <th className="py-2.5 px-3">التاريخ والوقت</th>
                      <th className="py-2.5 px-3">طريقة الدفع</th>
                      <th className="py-2.5 px-3">الحالة</th>
                      <th className="py-2.5 px-3 font-mono">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {customerInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50/60">
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">
                          {inv.date} {inv.time}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {inv.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.status === 'مدفوعة'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                          {inv.grandTotal?.toFixed(2)} ر.س
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
                لا توجد فواتير سابقة مسجلة لهذا العميل في الجلسة الحالية
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
