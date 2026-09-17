import { BarcodeIcon, PlusIcon } from '../../../components/common/Icons';

export function ProductCard({ product, onAddToCart }) {
  return (
    <button
      type="button"
      onClick={() => onAddToCart(product)}
      className="group relative flex flex-col justify-between p-3.5 bg-white rounded-2xl border border-gray-200/90 hover:border-emerald-500 hover:shadow-md transition-all duration-150 text-right cursor-pointer select-none active:scale-[0.98] overflow-hidden"
    >
      {/* Top section: badge & stock */}
      <div className="flex items-start justify-between w-full mb-2">
        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
          <BarcodeIcon className="w-3 h-3 text-gray-400" />
          {product.barcode}
        </span>
        <span className="text-[10px] text-emerald-700 bg-emerald-50 font-semibold px-2 py-0.5 rounded-full border border-emerald-100">
          متوفر ({product.stock})
        </span>
      </div>

      {/* Middle section: Name */}
      <div className="my-auto py-2">
        <h3 className="font-bold text-gray-800 text-sm md:text-base leading-snug group-hover:text-emerald-700 transition-colors line-clamp-2">
          {product.name}
        </h3>
        <p className="text-xs text-gray-400 mt-1">الوحدة: {product.unit}</p>
      </div>

      {/* Bottom section: Price & Action */}
      <div className="flex items-center justify-between w-full pt-2.5 mt-1 border-t border-gray-100">
        <div>
          <span className="text-base md:text-lg font-black text-emerald-600 font-mono">
            {product.price.toFixed(2)}
          </span>
          <span className="text-xs text-gray-500 font-bold mr-1">ر.س</span>
        </div>

        <div className="w-8 h-8 rounded-xl bg-gray-100 group-hover:bg-emerald-600 group-hover:text-white text-gray-700 flex items-center justify-center transition-colors">
          <PlusIcon className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
}
