import { PlusIcon } from '../../../components/common/Icons';
import { getStockMeta } from './productStock';

export function ProductCard({ product, onAddToCart }) {
  const stock = getStockMeta(product.stock);
  const needsStockAttention = product.stock < 10;

  return (
    <button
      type="button"
      onClick={() => onAddToCart(product)}
      className="group relative flex h-[112px] w-full flex-col overflow-hidden rounded-xl border border-[#c5c5d3]/70 bg-white p-2.5 text-right transition-all duration-150 hover:border-[#00236f]/40 hover:bg-[#f0f3ff]/40 hover:shadow-sm active:scale-[0.98] cursor-pointer select-none"
    >
      <div className="flex w-full items-start justify-between gap-1.5">
        <h3 className="line-clamp-2 min-w-0 text-sm font-semibold leading-snug text-gray-800 transition-colors group-hover:text-[#00236f]">
          {product.name}
        </h3>
        {needsStockAttention && (
          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-xs font-semibold ${stock.className}`}>
            {stock.label}
          </span>
        )}
      </div>

      <p className="mt-0.5 truncate text-xs text-gray-500">{product.unit}</p>

      <div className="mt-auto flex w-full items-center justify-between border-t border-[#c5c5d3]/40 pt-2">
        <div className="min-w-0">
          <span className="font-mono text-base font-black text-[#00236f]">
            {product.price.toFixed(2)}
          </span>
          <span className="mr-1 font-sans text-xs font-bold text-gray-500">ر.س</span>
        </div>

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-[#00236f] transition-colors group-hover:bg-[#00236f] group-hover:text-white">
          <PlusIcon className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  );
}
