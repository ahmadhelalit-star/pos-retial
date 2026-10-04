import { PlusIcon, MinusIcon, TrashIcon } from '../../../components/common/Icons';

export function CartItem({ item, onIncrement, onDecrement, onRemove, onDiscountChange }) {
  const discountPercent = item.discountPercent || 0;
  const discountedPrice = item.price * (1 - discountPercent / 100);
  const lineTotal = (discountedPrice * item.qty).toFixed(2);

  return (
    <div className="flex items-center justify-between p-3 bg-white hover:bg-gray-50/80 rounded-xl border border-gray-200/70 transition-all select-none gap-2">
      {/* Product info */}
      <div className="flex-1 min-w-0 pr-1">
        <h4 className="font-bold text-gray-800 text-xs md:text-sm truncate">
          {item.name}
        </h4>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 font-mono">
          <span className={discountPercent > 0 ? 'line-through text-gray-400' : ''}>{item.price.toFixed(2)} ر.س</span>
          {discountPercent > 0 && <span className="font-bold text-emerald-700">{discountedPrice.toFixed(2)}</span>}
          <span className="text-gray-300">×</span>
          <span className="text-emerald-700 font-bold font-sans">
            {item.qty} {item.unit}
          </span>
        </div>
        <label className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
          <span>خصم الصنف %</span>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={discountPercent}
            onChange={(event) => onDiscountChange(item.id, event.target.value)}
            className="w-12 rounded border border-gray-200 px-1 py-0.5 text-center font-mono text-gray-700"
            aria-label={`نسبة الخصم على ${item.name}`}
          />
        </label>
      </div>

      {/* Quantity Stepper */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => onDecrement(item.id)}
          className="w-7 h-7 rounded-md bg-white hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors shadow-2xs active:scale-90 cursor-pointer"
          title="إنقاص"
        >
          <MinusIcon className="w-3.5 h-3.5" />
        </button>

        <span className="w-8 text-center text-xs font-bold font-mono text-gray-800">
          {item.qty}
        </span>

        <button
          type="button"
          onClick={() => onIncrement(item.id)}
          className="w-7 h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shadow-2xs active:scale-90 cursor-pointer"
          title="زيادة"
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Line Total & Remove */}
      <div className="flex items-center gap-2 pl-1">
        <div className="text-left font-mono">
          <p className="font-black text-xs md:text-sm text-gray-900">{lineTotal}</p>
          <p className="text-[10px] text-gray-400 font-sans">ر.س</p>
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          title="حذف المادة"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
