import { translateUI as t,useLocale } from "../../../runtime/i18n.js";
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
  taxRate = 0.15,
  grandTotal,
  totalItemsCount,
  heldOrdersCount = 0,
  onOpenHeldOrders,
}) {
  useLocale();
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const isCompany = customer?.type === 'company';

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Customer Bar */}
      <div className="p-2.5 bg-white border-b border-[#c5c5d3]/60 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsCustomerModalOpen(true)}
          className="flex min-w-0 items-center gap-2 hover:bg-[#f0f3ff] p-1 rounded-xl transition-all cursor-pointer group text-right"
          title={t("انقر لتغيير عميل الفاتورة")}
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
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-bold text-gray-800 transition-colors group-hover:text-[#00236f]">
                {customer?.name || 'عميل نقدي (عام)'}
              </p>
              <span className="shrink-0 text-xs text-gray-500 group-hover:text-[#00236f]">
                [تغيير]
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{isCompany ? 'فاتورة ضريبية B2B' : 'فاتورة مبسطة B2C'}</span>
              {customer?.points > 0 && (
                <span className="flex items-center gap-0.5 font-bold text-purple-700">
                  <GiftIcon className="w-3 h-3" />
                  {customer.points}
                </span>
              )}
            </div>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {onOpenHeldOrders && (
            <button
              type="button"
              onClick={onOpenHeldOrders}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition-colors hover:bg-amber-100 cursor-pointer"
              title={t("الفواتير المعلقة")}
              aria-label={t("الفواتير المعلقة")}
            >
              <PauseIcon className="h-4 w-4" />
              {heldOrdersCount > 0 && (
                <span className="absolute -left-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[11px] font-black leading-none text-white">
                  {heldOrdersCount}
                </span>
              )}
            </button>
          )}
          <span className="rounded-md bg-[#eef3ff] px-2 py-1 text-xs font-bold text-[#00236f]">
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
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-gray-500">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3ff] text-[#00236f]/40">
              <ShoppingBagIcon className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-gray-700">{t("السلة فارغة حالياً")}</p>
            <p className="mt-1 text-xs text-gray-500">
              اختر المواد من القائمة أو امسح الباركود لإضافتها مباشرة
            </p>
          </div>
        )}
      </div>

      {/* Discount & Totals Section */}
      <div className="border-t border-[#c5c5d3]/60 bg-[#f9f9ff] p-3">
        {/* Discount Toggle */}
        <div className="mb-2 flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowDiscountInput(!showDiscountInput)}
            className="flex shrink-0 items-center gap-1.5 font-bold text-[#00236f] hover:underline cursor-pointer"
          >
            <TagIcon className="w-3.5 h-3.5" />
            <span>{discountPercent > 0 ? `خصم (${discountPercent}%)` : '+ إضافة خصم'}</span>
          </button>

          {showDiscountInput && (
            <div className="flex flex-wrap items-center justify-end gap-1">
              <label className="flex h-7 items-center gap-1 rounded-md border border-[#c5c5d3] bg-white px-1.5 text-xs text-gray-600">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={discountPercent}
                  onChange={(event) => setDiscountPercent(event.target.value)}
                  className="w-9 text-center font-mono text-gray-800 outline-none"
                  aria-label={t("نسبة خصم الفاتورة")}
                />
                % مخصص
              </label>
              {[5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDiscountPercent(pct)}
                  className={`h-7 rounded-md px-2 text-xs font-bold cursor-pointer ${
                    discountPercent === pct
                      ? 'bg-[#00236f] text-white'
                      : 'border border-[#c5c5d3] bg-white text-gray-700'
                  }`}
                >
                  {pct}%
                </button>
              ))}
              {discountPercent > 0 && (
                <button
                  type="button"
                  onClick={() => setDiscountPercent(0)}
                  className="h-7 rounded-md px-1.5 text-xs font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  إلغاء
                </button>
              )}
            </div>
          )}
        </div>

        {/* Calculation Lines */}
        <div className="space-y-1 border-t border-[#c5c5d3]/50 pt-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>{t("المجموع الفرعي")}</span>
            <span className="font-mono">{subtotal.toFixed(2)} ر.س</span>
          </div>

          {itemDiscountAmount > 0 && (
            <div className="flex justify-between font-medium text-red-600">
              <span>{t("خصم الأصناف")}</span>
              <span className="font-mono">- {itemDiscountAmount.toFixed(2)} ر.س</span>
            </div>
          )}
          {invoiceDiscountAmount > 0 && (
            <div className="flex justify-between font-medium text-red-600">
              <span>{t("خصم الفاتورة")}</span>
              <span className="font-mono">- {invoiceDiscountAmount.toFixed(2)} ر.س</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>ضريبة القيمة المضافة ({Math.round(taxRate * 100)}%)</span>
            <span className="font-mono">{taxAmount.toFixed(2)} ر.س</span>
          </div>
        </div>

        {/* Grand Total */}
        <div className="mt-2 flex items-end justify-between border-t border-[#c5c5d3]/60 pt-2">
          <div>
            <span className="block text-xs font-medium text-gray-500">{t("المبلغ الإجمالي")}</span>
            <span className="text-xs text-gray-500">{t("شامل الضريبة")}</span>
          </div>
          <div className="text-left font-mono">
            <span className="text-2xl font-black text-[#00236f]">{grandTotal.toFixed(2)}</span>
            <span className="mr-1 font-sans text-xs font-bold text-[#00236f]/70">{t("ر.س")}</span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {/* Clear Cart */}
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onClearCart}
            className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-white py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer active:scale-95"
            title={t("إلغاء وتفريغ السلة")}
          >
            <TrashIcon className="mb-0.5 w-4 h-4" />
            <span>{t("إلغاء")}</span>
          </button>

          {/* Hold Order */}
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onHoldOrder}
            className="flex flex-col items-center justify-center rounded-lg border border-amber-200 bg-white py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer active:scale-95"
            title={t("تعليق الفاتورة الحالية")}
          >
            <PauseIcon className="mb-0.5 w-4 h-4" />
            <span>{t("تعليق")}</span>
          </button>

          {/* Checkout / Pay Button (Col span 2) */}
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onOpenPayment}
            className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-black text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer active:scale-98"
          >
            <CreditCardIcon className="w-5 h-5" />
            <span>{t("دفع الفاتورة")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
