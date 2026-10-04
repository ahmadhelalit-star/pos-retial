import { useState } from 'react';
import {
  ShoppingBagIcon,
  TrashIcon,
  PauseIcon,
  UserIcon,
  TagIcon,
  CreditCardIcon,
  BuildingOfficeIcon,
  GiftIcon,
  ArrowsUpDownIcon,
} from '../../../components/common/Icons';
import { CartItem } from './CartItem';
import { CustomerSelectModal } from './CustomerSelectModal';

export function CartPanel({
  items,
  customer,
  setCustomer,
  customers = [],
  onQuickAddCustomer,
  onIncrement,
  onDecrement,
  onRemove,
  onDiscountChange,
  onClearCart,
  onHoldOrder,
  onOpenPayment,
  discountPercent,
  setDiscountPercent,
  subtotal,
  itemDiscountAmount,
  invoiceDiscountAmount,
  taxAmount,
  grandTotal,
  totalItemsCount,
}) {
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const isCompany = customer?.type === 'company';

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-xs">
      {/* Customer Bar */}
      <div className="p-2.5 bg-gray-50/90 border-b border-gray-200 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsCustomerModalOpen(true)}
          className="flex items-center gap-2 hover:bg-white p-1 rounded-xl transition-all cursor-pointer group text-right"
          title="انقر لتغيير عميل الفاتورة"
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isCompany
                ? 'bg-blue-100 text-blue-700'
                : customer?.id !== 'walk-in'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {isCompany ? (
              <BuildingOfficeIcon className="w-4 h-4" />
            ) : (
              <UserIcon className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-gray-800 group-hover:text-emerald-700 transition-colors">
                {customer?.name || 'عميل نقدي (عام)'}
              </p>
              <span className="text-[10px] text-gray-400 group-hover:text-emerald-600">
                [تغيير]
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span>{isCompany ? 'فاتورة ضريبية B2B' : 'فاتورة مبسطة B2C'}</span>
              {customer?.points > 0 && (
                <span className="text-purple-700 font-bold flex items-center gap-0.5">
                  <GiftIcon className="w-3 h-3" />
                  {customer.points}
                </span>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <span className="text-xs bg-gray-200/70 text-gray-700 font-bold px-2 py-0.5 rounded-md">
            {totalItemsCount} قطعة
          </span>
        </div>
      </div>

      {/* Customer Select Modal */}
      <CustomerSelectModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customers={customers}
        currentCustomer={customer}
        onSelectCustomer={setCustomer}
        onQuickAddCustomer={onQuickAddCustomer}
      />

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onRemove={onRemove}
              onDiscountChange={onDiscountChange}
            />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-gray-300">
              <ShoppingBagIcon className="w-8 h-8" />
            </div>
            <p className="font-bold text-gray-700 text-sm">السلة فارغة حالياً</p>
            <p className="text-xs text-gray-400 mt-1">
              اختر المواد من القائمة أو امسح الباركود لإضافتها مباشرة
            </p>
          </div>
        )}
      </div>

      {/* Discount & Totals Section */}
      <div className="p-3.5 bg-gray-50 border-t border-gray-200 space-y-2">
        {/* Discount Toggle */}
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setShowDiscountInput(!showDiscountInput)}
            className="flex items-center gap-1.5 text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            <TagIcon className="w-3.5 h-3.5" />
            <span>{discountPercent > 0 ? `خصم (${discountPercent}%)` : '+ إضافة خصم'}</span>
          </button>

          {showDiscountInput && (
            <div className="flex items-center gap-1">
              <label className="flex items-center gap-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] text-gray-600">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={discountPercent}
                  onChange={(event) => setDiscountPercent(event.target.value)}
                  className="w-10 text-center font-mono text-gray-800 outline-none"
                  aria-label="نسبة خصم الفاتورة"
                />
                % مخصص
              </label>
              {[5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDiscountPercent(pct)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                    discountPercent === pct
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700'
                  }`}
                >
                  {pct}%
                </button>
              ))}
              {discountPercent > 0 && (
                <button
                  type="button"
                  onClick={() => setDiscountPercent(0)}
                  className="px-1.5 py-0.5 rounded text-[11px] text-red-600 hover:bg-red-50 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              )}
            </div>
          )}
        </div>

        {/* Calculation Lines */}
        <div className="space-y-1 text-xs text-gray-600 pt-1 border-t border-gray-200/80 font-mono">
          <div className="flex justify-between">
            <span className="font-sans">المجموع الفرعي:</span>
            <span>{subtotal.toFixed(2)} ر.س</span>
          </div>

          {itemDiscountAmount > 0 && (
            <div className="flex justify-between text-red-600 font-medium">
              <span className="font-sans">خصم الأصناف:</span>
              <span>- {itemDiscountAmount.toFixed(2)} ر.س</span>
            </div>
          )}
          {invoiceDiscountAmount > 0 && (
            <div className="flex justify-between text-red-600 font-medium">
              <span className="font-sans">خصم الفاتورة:</span>
              <span>- {invoiceDiscountAmount.toFixed(2)} ر.س</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="font-sans">ضريبة القيمة المضافة (15%):</span>
            <span>{taxAmount.toFixed(2)} ر.س</span>
          </div>
        </div>

        {/* Grand Total */}
        <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 mt-1">
          <div>
            <span className="text-xs text-emerald-800 font-bold block">المبلغ الإجمالي</span>
            <span className="text-[11px] text-emerald-600">شامل الضريبة</span>
          </div>
          <div className="text-left font-mono">
            <span className="text-2xl font-black text-emerald-700">
              {grandTotal.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-emerald-900 mr-1 font-sans">ر.س</span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {/* Clear Cart */}
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onClearCart}
            className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            title="إلغاء وتفريغ السلة"
          >
            <TrashIcon className="w-4 h-4 mb-0.5" />
            <span>إلغاء</span>
          </button>

          {/* Hold Order */}
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onHoldOrder}
            className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            title="تعليق الفاتورة الحالية"
          >
            <PauseIcon className="w-4 h-4 mb-0.5" />
            <span>تعليق</span>
          </button>

          {/* Checkout / Pay Button (Col span 2) */}
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onOpenPayment}
            className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-98"
          >
            <CreditCardIcon className="w-5 h-5" />
            <span>دفع الفاتورة</span>
          </button>
        </div>
      </div>
    </div>
  );
}
