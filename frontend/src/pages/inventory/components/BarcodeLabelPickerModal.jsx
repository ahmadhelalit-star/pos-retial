import { useMemo, useState } from 'react';
import { BarcodeIcon, SearchIcon, XMarkIcon } from '../../../components/common/Icons';

export function BarcodeLabelPickerModal({
  isOpen,
  onClose,
  products = [],
  onSelectProduct,
}) {
  const [query, setQuery] = useState('');

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        (product.barcode || '').includes(q)
    );
  }, [products, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-150 max-h-[80vh]">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarcodeIcon className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-800">اختر منتجاً لطباعة ملصق الباركود</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث بالاسم أو الباركود..."
              className="w-full pr-9 pl-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredProducts.length === 0 && (
            <div className="py-10 text-center text-xs text-gray-400 font-bold">
              لا توجد منتجات مطابقة
            </div>
          )}
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelectProduct(product)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-emerald-50/60 text-right transition-colors cursor-pointer"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{product.name}</p>
                <p className="font-mono text-[11px] text-gray-400 mt-0.5">{product.barcode}</p>
              </div>
              <div className="text-left shrink-0">
                <p className="font-mono text-xs font-black text-emerald-700">
                  {product.price?.toFixed(2)} ر.س
                </p>
                <p className="text-[10px] text-gray-400">المخزون: {product.stock ?? 0}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
