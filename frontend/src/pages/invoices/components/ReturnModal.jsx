import { useState, useEffect, useMemo } from 'react';
import {
  XMarkIcon,
  CheckIcon,
  PlusIcon,
  MinusIcon,
  ArrowUturnLeftIcon,
  BanknotesIcon,
  CreditCardIcon,
} from '../../../components/common/Icons';

export function ReturnModal({
  isOpen,
  onClose,
  invoice,
  onConfirmReturn,
}) {
  const [returnQuantities, setReturnQuantities] = useState({});
  const [restockSelections, setRestockSelections] = useState({});
  const [refundMethod, setRefundMethod] = useState('cash');
  const [reason, setReason] = useState('رغبة العميل');

  useEffect(() => {
    if (invoice && invoice.items) {
      // Initialize return quantities to 0
      const initial = {};
      invoice.items.forEach((it) => {
        initial[it.id] = 0;
      });
      setReturnQuantities(initial);
      setRestockSelections(Object.fromEntries(invoice.items.map((it) => [it.id, true])));
      setRefundMethod(invoice.payment?.method === 'card' ? 'card' : 'cash');
    }
  }, [invoice]);

  // Available quantities
  const availableItems = useMemo(() => {
    if (!invoice || !invoice.items) return [];
    return invoice.items.map((it) => {
      const remaining = it.qty - (it.returnedQty || 0);
      return {
        ...it,
        availableQty: Math.max(0, remaining),
      };
    });
  }, [invoice]);

  const handleQtyChange = (itemId, max, delta) => {
    setReturnQuantities((prev) => {
      const current = prev[itemId] || 0;
      const updated = Math.min(max, Math.max(0, current + delta));
      return { ...prev, [itemId]: updated };
    });
  };

  // Calculations for return
  const { refundSubtotal, refundTax, totalRefundAmount, totalReturnUnits } = useMemo(() => {
    let returnedGross = 0;
    let returnedProductDiscount = 0;
    let units = 0;

    availableItems.forEach((it) => {
      const qtyToReturn = returnQuantities[it.id] || 0;
      if (qtyToReturn > 0) {
        returnedGross += qtyToReturn * it.price;
        const itemGross = it.price * it.qty;
        const itemDiscountRate = Number.isFinite(it.discountPercent)
          ? it.discountPercent / 100
          : itemGross > 0
          ? (it.productDiscountAmount || 0) / itemGross
          : 0;
        returnedProductDiscount += qtyToReturn * it.price * itemDiscountRate;
        units += qtyToReturn;
      }
    });

    const originalGross = invoice?.items?.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    ) ?? 0;
    const originalProductDiscount = invoice?.items?.reduce((sum, item) => {
      const itemGross = item.price * item.qty;
      return sum + (item.productDiscountAmount ?? itemGross * (item.discountPercent || 0) / 100);
    }, 0) ?? 0;
    const originalAfterItemDiscount = Math.max(0, originalGross - originalProductDiscount);
    const invoiceDiscountAmount = invoice?.invoiceDiscountAmount ?? Math.max(
      0,
      (invoice?.discountAmount || 0) - originalProductDiscount
    );
    const discountRatio = originalAfterItemDiscount > 0
      ? Math.min(1, Math.max(0, invoiceDiscountAmount / originalAfterItemDiscount))
      : 0;
    const sub = Math.max(0, returnedGross - returnedProductDiscount) * (1 - discountRatio);
    const taxRate = invoice?.taxableAmount > 0
      ? (invoice.taxAmount || 0) / invoice.taxableAmount
      : 0.15;
    const tax = sub * taxRate;
    const total = sub + tax;

    return {
      refundSubtotal: sub,
      refundTax: tax,
      totalRefundAmount: total,
      totalReturnUnits: units,
    };
  }, [availableItems, returnQuantities, invoice]);

  if (!isOpen || !invoice) return null;

  const handleConfirm = () => {
    if (totalReturnUnits === 0) return;

    const returnedItemsPayload = availableItems
      .filter((it) => (returnQuantities[it.id] || 0) > 0)
      .map((it) => ({
        id: it.id,
        name: it.name,
        price: it.price,
        unit: it.unit,
        qtyToReturn: returnQuantities[it.id],
        restockQty: restockSelections[it.id] ? returnQuantities[it.id] : 0,
      }));

    onConfirmReturn({
      invoiceId: invoice.id,
      returnedItems: returnedItemsPayload,
      refundSubtotal,
      refundTax,
      totalRefundAmount,
      refundMethod,
      reason,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <ArrowUturnLeftIcon className="w-5 h-5 text-amber-700" />
            <h2 className="text-base">
              معالج إرجاع الأصناف (مرتجع مبيعات)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-amber-100 text-amber-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-gray-400 font-bold">رقم الفاتورة الأصلية:</span>
              <span className="font-mono font-bold text-gray-800 mr-1">#{invoice.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-gray-400 font-bold">العميل:</span>
              <span className="font-bold text-gray-800 mr-1">{invoice.customer?.name || 'عميل نقدي'}</span>
            </div>
          </div>

          {/* Select Items to Return */}
          <div>
            <h3 className="font-bold text-gray-800 mb-2">اختر الكميات المراد إرجاعها:</h3>
            <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
              {availableItems.map((item) => {
                const currentReturnQty = returnQuantities[item.id] || 0;
                const isItemAvailable = item.availableQty > 0;

                return (
                  <div
                    key={item.id}
                    className={`p-3 flex items-center justify-between gap-3 ${
                      !isItemAvailable ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{item.name}</h4>
                      <div className="flex items-center gap-2 text-gray-500 font-mono mt-0.5">
                        <span>السعر: {item.price.toFixed(2)} ر.س</span>
                        <span>•</span>
                        <span>الكمية الأصلية: {item.qty}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">
                          المتاح للإرجاع: {item.availableQty}
                        </span>
                      </div>
                      {currentReturnQty > 0 && (
                        <label className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={restockSelections[item.id] ?? true}
                            onChange={(event) => setRestockSelections((prev) => ({
                              ...prev,
                              [item.id]: event.target.checked,
                            }))}
                            className="h-4 w-4 accent-emerald-600"
                          />
                          <span>الصنف صالح للبيع وإعادته للمخزون</span>
                        </label>
                      )}
                    </div>

                    {/* Quantity Selector */}
                    {isItemAvailable ? (
                      <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.id, item.availableQty, -1)}
                          disabled={currentReturnQty <= 0}
                          className="w-7 h-7 rounded-lg bg-white disabled:opacity-40 text-gray-700 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <MinusIcon className="w-3.5 h-3.5" />
                        </button>

                        <span className="w-8 text-center font-black font-mono text-sm text-gray-900">
                          {currentReturnQty}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.id, item.availableQty, 1)}
                          disabled={currentReturnQty >= item.availableQty}
                          className="w-7 h-7 rounded-lg bg-amber-600 disabled:opacity-40 text-white hover:bg-amber-700 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                        تم استرجاعه بالكامل
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Refund Details Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Reason */}
            <div>
              <label className="block text-gray-700 font-bold mb-1">سبب الإرجاع</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="رغبة العميل">رغبة العميل</option>
                <option value="صنف تالف / منتهي الصلاحية">صنف تالف / منتهي الصلاحية</option>
                <option value="صنف غير مطابق للطلب">صنف غير مطابق للطلب</option>
                <option value="خطأ في تسجيل الفاتورة">خطأ في تسجيل الفاتورة</option>
              </select>
            </div>

            {/* Refund Method */}
            <div>
              <label className="block text-gray-700 font-bold mb-1">طريقة رد المبلغ</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRefundMethod('cash')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    refundMethod === 'cash'
                      ? 'border-amber-600 bg-amber-50 text-amber-800'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  <BanknotesIcon className="w-4 h-4" />
                  <span>نقدي (كاش)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRefundMethod('card')}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    refundMethod === 'card'
                      ? 'border-amber-600 bg-amber-50 text-amber-800'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  <CreditCardIcon className="w-4 h-4" />
                  <span>إرجاع شبكة</span>
                </button>
              </div>
            </div>
          </div>

          {/* Refund Calculation Summary */}
          <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1.5 font-mono">
            <div className="flex justify-between font-sans text-amber-900">
              <span>المبلغ المسترد (بدون الضريبة):</span>
              <span>{refundSubtotal.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between font-sans text-amber-900">
              <span>الضريبة المستردة (15%):</span>
              <span>{refundTax.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between text-base font-black pt-1 border-t border-amber-200 text-amber-950 font-sans">
              <span>إجمالي المبلغ الواجب رده للعميل:</span>
              <span className="font-mono text-red-600 text-lg">
                {totalRefundAmount.toFixed(2)} ر.س
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={totalReturnUnits === 0}
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95"
          >
            <CheckIcon className="w-4 h-4" />
            <span>تأكيد الإرجاع وطباعة إشعار الدائن</span>
          </button>
        </div>
      </div>
    </div>
  );
}
