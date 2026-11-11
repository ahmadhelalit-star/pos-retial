import { translateUI as t,useLocale } from "../../../runtime/i18n.js";
import { useState } from 'react';
import { PlusIcon, MinusIcon, TrashIcon, TagIcon } from '../../../components/common/Icons';

export function CartItem({ item, onIncrement, onDecrement, onRemove, onDiscountChange, currency = 'ر.س', canDiscount = true, quotedTotal }) {
  useLocale();
  const discountPercent = item.discountPercent || 0;
  const discountedPrice = item.price * (1 - discountPercent / 100);
  const lineTotal = quotedTotal ?? (discountedPrice * item.qty).toFixed(2);
  const [showDiscount, setShowDiscount] = useState(discountPercent > 0);

  return (
    <article className="retail-cart-item rounded-xl border border-transparent px-2 py-1.5 transition-colors select-none hover:border-[#c5c5d3] hover:bg-[#f0f3ff]/60">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
        <h4 className="min-w-0 truncate text-sm font-semibold text-gray-800">
          {item.name}
          <span className="mr-1 text-xs text-gray-500">({t(item.unit)})</span>
        </h4>

        <div className="flex items-center overflow-hidden rounded-full bg-[#e2e8f8]">
          <button
            type="button"
            onClick={() => onDecrement(item.id)}
            className="flex h-7 w-7 items-center justify-center text-gray-700 transition-colors hover:bg-[#c5c5d3] cursor-pointer"
            title={t("إنقاص")}
          >
            <MinusIcon className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 font-mono text-xs font-bold text-gray-800">{item.qty}</span>
          <button
            type="button"
            onClick={() => onIncrement(item.id)}
            className="flex h-7 w-7 items-center justify-center text-gray-700 transition-colors hover:bg-[#c5c5d3] cursor-pointer"
            title={t("زيادة")}
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="whitespace-nowrap font-mono text-sm font-bold text-[#00236f]">
          {lineTotal}
          <span className="mr-1 font-sans text-xs font-semibold text-gray-500">{currency}</span>
        </p>
      </div>

      <div className="mt-0.5 flex min-h-5 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
          {discountPercent > 0 ? (
            <>
              <span className="line-through">{item.price.toFixed(2)}</span>
              <span className="font-bold text-[#00236f]">{discountedPrice.toFixed(2)}</span>
            </>
          ) : (
            <span>السعر: {item.price.toFixed(2)}</span>
          )}
          <span className="truncate">/ {t(item.unit)}</span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            disabled={!canDiscount}
            onClick={() => setShowDiscount((open) => !open)}
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold transition-colors cursor-pointer ${
              discountPercent > 0
                ? 'bg-[#eef3ff] text-[#00236f]'
                : 'text-gray-500 hover:bg-gray-100 hover:text-[#00236f]'
            }`}
            title={t("خصم الصنف")}
          >
            <TagIcon className="w-3 h-3" />
            <span>{discountPercent > 0 ? `${discountPercent}%` : 'خصم'}</span>
          </button>

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="rounded-md p-1 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
            title={t("حذف المادة")}
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showDiscount && canDiscount && (
        <div className="mt-1 flex items-center justify-end gap-1 text-xs text-gray-500">
          <label className="flex items-center gap-1">
            خصم الصنف %
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={discountPercent}
              onChange={(event) => onDiscountChange(item.id, event.target.value)}
              className="h-6 w-12 rounded-md border border-[#c5c5d3] px-1 text-center font-mono text-gray-700 outline-none focus:border-[#00236f]"
              aria-label={`نسبة الخصم على ${item.name}`}
            />
          </label>
        </div>
      )}
    </article>
  );
}
