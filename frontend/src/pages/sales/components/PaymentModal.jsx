import { useState, useEffect } from 'react';
import {
  BanknotesIcon,
  CreditCardIcon,
  CheckIcon,
  XMarkIcon,
  WalletIcon,
  ExclamationTriangleIcon,
} from '../../../components/common/Icons';

const FAST_CASH = [50, 100, 200, 500];

export function PaymentModal({
  isOpen,
  onClose,
  grandTotal,
  customer,
  onCompleteSale,
}) {
  const [method, setMethod] = useState('cash'); // 'cash' | 'card' | 'credit'
  const [cashTendered, setCashTendered] = useState('');

  const isWalkIn = !customer || customer.id === 'walk-in';

  useEffect(() => {
    if (isOpen) {
      setMethod('cash');
      setCashTendered(grandTotal.toFixed(2));
    }
  }, [isOpen, grandTotal]);

  if (!isOpen) return null;

  const numericCash = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, numericCash - grandTotal);
  
  let isCashSufficient = true;
  if (method === 'cash') {
    isCashSufficient = numericCash >= grandTotal;
  } else if (method === 'credit') {
    isCashSufficient = !isWalkIn;
  }

  const handleExactCash = () => {
    setCashTendered(grandTotal.toFixed(2));
  };

  const handleFastCash = (amount) => {
    setCashTendered(amount.toString());
  };

  const handleConfirm = () => {
    if (!isCashSufficient) return;
    onCompleteSale({
      method,
      paymentMethod: method === 'cash' ? 'نقدي' : method === 'card' ? 'شبكة' : 'آجل',
      amount: grandTotal,
      tendered: method === 'cash' ? numericCash : method === 'card' ? grandTotal : 0,
      change: method === 'cash' ? changeDue : 0,
    });
  };

  const currentBalance = customer?.balance || 0;
  const creditLimit = customer?.creditLimit || 0;
  const projectedBalance = currentBalance + grandTotal;
  const isOverLimit = creditLimit > 0 && projectedBalance > creditLimit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">إتمام عملية الدفع</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Total Display */}
        <div className="p-6 text-center bg-emerald-600 text-white">
          <p className="text-xs font-semibold text-emerald-100 mb-1">المبلغ المطلوب سداده</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl md:text-5xl font-black font-mono tracking-tight">
              {grandTotal.toFixed(2)}
            </span>
            <span className="text-sm font-bold text-emerald-200">ر.س</span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">طريقة الدفع</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 font-bold text-xs transition-all cursor-pointer ${
                  method === 'cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BanknotesIcon className="w-5 h-5" />
                <span>نقدي (كاش)</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 font-bold text-xs transition-all cursor-pointer ${
                  method === 'card'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CreditCardIcon className="w-5 h-5" />
                <span>شبكة / مدى</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('credit')}
                className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 font-bold text-xs transition-all cursor-pointer ${
                  method === 'credit'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-xs'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <WalletIcon className="w-5 h-5" />
                <span>آجل (ذمم)</span>
              </button>
            </div>
          </div>

          {/* Cash Details */}
          {method === 'cash' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  المبلغ المستلم من العميل
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full text-2xl font-black font-mono text-gray-800 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                    ر.س
                  </span>
                </div>
              </div>

              {/* Fast Cash Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={handleExactCash}
                  className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  المبلغ بالضبط
                </button>
                {FAST_CASH.map((cash) => (
                  <button
                    key={cash}
                    type="button"
                    onClick={() => handleFastCash(cash)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 text-xs font-bold font-mono whitespace-nowrap cursor-pointer"
                  >
                    {cash} ر.س
                  </button>
                ))}
              </div>

              {/* Change Calculation */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">المبلغ المتبقي (الباقي):</span>
                <span
                  className={`text-xl font-black font-mono ${
                    changeDue > 0 ? 'text-emerald-600' : 'text-gray-800'
                  }`}
                >
                  {changeDue.toFixed(2)} ر.س
                </span>
              </div>

              {!isCashSufficient && (
                <p className="text-xs font-bold text-red-600 text-center">
                  المبلغ المستلم أقل من قيمة الفاتورة المطلوبة!
                </p>
              )}
            </div>
          )}

          {/* Card Details */}
          {method === 'card' && (
            <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center space-y-2">
              <CreditCardIcon className="w-10 h-10 text-emerald-600 mx-auto animate-bounce" />
              <p className="text-sm font-bold text-gray-800">جاهز للدفع عبر جهاز نقاط البيع (POS)</p>
              <p className="text-xs text-gray-500">
                مرر البطاقة أو استخدم الدفع الذكي (Apple Pay / mada)
              </p>
            </div>
          )}

          {/* Credit Details */}
          {method === 'credit' && (
            <div className="space-y-3">
              {isWalkIn ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
                    <span>غير متاح للعميل النقدي العام</span>
                  </div>
                  <p className="text-gray-600">
                    يرجى أولاً إسناد الفاتورة إلى عميل مسجل أو شركة B2B لتتمكن من ترحيل المبلغ إلى حسابه الآجل.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-amber-200/80">
                    <span className="font-bold text-amber-900">العميل:</span>
                    <span className="font-bold text-gray-900">{customer.name}</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>الرصيد السابق المستحق:</span>
                    <span className="font-mono font-bold">{currentBalance.toFixed(2)} ر.س</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>قيمة الفاتورة الحالية:</span>
                    <span className="font-mono font-bold text-amber-800">+{grandTotal.toFixed(2)} ر.س</span>
                  </div>

                  <div className="flex justify-between text-amber-950 font-bold pt-1.5 border-t border-amber-200/80">
                    <span>الرصيد الجديد بعد البيع:</span>
                    <span className="font-mono text-sm">{projectedBalance.toFixed(2)} ر.س</span>
                  </div>

                  {isOverLimit && (
                    <div className="p-2 bg-red-100/80 border border-red-200 rounded-xl text-red-800 text-[11px] font-bold flex items-center gap-1.5">
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-600 shrink-0" />
                      <span>تنبيه: سيتجاوز العميل الحد الائتماني المسموح ({creditLimit} ر.س)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-bold text-sm cursor-pointer transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={!isCashSufficient}
            onClick={handleConfirm}
            className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <CheckIcon className="w-5 h-5" />
            <span>{method === 'credit' ? 'تأكيد التسجيل الآجل' : 'تأكيد وطباعة'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
