import { tracksInventory } from '../../../domain/products';
import { BarcodeIcon, PlusIcon } from '../../../components/common/Icons';
import { getStockMeta } from './productStock';

export function ProductListRow({ product, categoryIcon, onAddToCart }) {
  const stock = tracksInventory(product) ? getStockMeta(product.stock) : { label: 'لا يتتبع المخزون', className: 'border-gray-200 bg-gray-50 text-gray-500' };

  return (
    <button
      type="button"
      onClick={() => onAddToCart(product)}
      title={product.name}
      className="retail-sales-product group flex h-14 w-full items-center gap-3 overflow-hidden rounded-xl border border-[#c5c5d3]/70 bg-white px-3 text-right transition-all duration-150 hover:border-[#00236f]/40 hover:bg-[#f0f3ff]/50 hover:shadow-sm active:scale-[0.995] cursor-pointer select-none"
    >
      <span
        className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-base sm:flex ${product.color || 'border-gray-200 bg-gray-50'}`}
      >
        {categoryIcon || '🏪'}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-gray-800 transition-colors group-hover:text-[#00236f]">
          {product.name}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-500">
          <BarcodeIcon className="h-3 w-3 shrink-0" />
          <span className="font-mono">{product.barcode}</span>
          <span className="text-gray-300">•</span>
          <span>{product.unit}</span>
        </span>
      </span>

      <span
        className={`hidden w-[82px] shrink-0 justify-center rounded-full border px-2 py-0.5 text-center text-xs font-semibold sm:flex ${stock.className}`}
      >
        {stock.label}
      </span>

      <span className="w-[76px] shrink-0 text-left">
        <span className="font-mono text-base font-black text-[#00236f]">
          {product.price.toFixed(2)}
        </span>
        <span className="mr-1 font-sans text-xs font-bold text-gray-500">{product.currency || 'ر.س'}</span>
      </span>

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-[#00236f] transition-colors group-hover:bg-[#00236f] group-hover:text-white">
        <PlusIcon className="h-4 w-4" />
      </span>
    </button>
  );
}
