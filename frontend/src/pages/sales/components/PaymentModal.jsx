import { useState, useEffect } from 'react';
import {
  BanknotesIcon,
  CreditCardIcon,
  CheckIcon,
  XMarkIcon,
} from '../../../components/common/Icons';

const FAST_CASH = [50, 100, 200, 500];

export function PaymentModal({
  isOpen,
  onClose,
  grandTotal,
  onCompleteSale,
}) {
  const [method, setMethod] = useState('cash'); // 'cash' | 'card'
  const [cashTendered, setCashTendered] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMethod('cash');
      setCashTendered(grandTotal.toFixed(2));
    }
  }, [isOpen, grandTotal]);

  if (!isOpen) return null;

  const numericCash = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, numericCash - grandTotal);
  const isCashSufficient = method === 'card' || numericCash >= grandTotal;

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
      amount: grandTotal,
      tendered: method === 'cash' ? numericCash : grandTotal,
      change: method === 'cash' ? changeDue : 0,
    });
  };

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
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-bold text-sm transition-all cursor-pointer ${
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
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-bold text-sm transition-all cursor-pointer ${
                  method === 'card'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CreditCardIcon className="w-5 h-5" />
                <span>شبكة / بطاقة</span>
              </button>
            </div>
          </div>

          {/* Cash Details */}
          {method === 'cash' ? (
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
          ) : (
            <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center space-y-2">
              <CreditCardIcon className="w-10 h-10 text-emerald-600 mx-auto animate-bounce" />
              <p className="text-sm font-bold text-gray-800">جاهز للدفع عبر جهاز نقاط البيع (POS)</p>
              <p className="text-xs text-gray-500">
                مرر البطاقة أو استخدم الدفع الذكي (Apple Pay / mada)
              </p>
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
            <span>تأكيد وطباعة</span>
          </button>
        </div>
      </div>
    </div>
  );
}
