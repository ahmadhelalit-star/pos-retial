import { useState, useMemo } from 'react';
import { SearchIcon, BarcodeIcon, XMarkIcon } from '../../../components/common/Icons';
import { CategoryBar } from './CategoryBar';
import { ProductCard } from './ProductCard';
import { CATEGORIES } from '../../../data/mockProducts';

export function ProductGrid({ products, onAddToCart }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // فلترة المنتجات حسب التصنيف ونص البحث / الباركود
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.barcode.includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // دعم قارئ الباركود عند الضغط على Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const trimmed = searchQuery.trim();
      const exactMatch = products.find(
        (p) => p.barcode === trimmed || p.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (exactMatch) {
        onAddToCart(exactMatch);
        setSearchQuery('');
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/50 p-4">
      {/* Search & Barcode Scan Bar */}
      <div className="mb-3.5 flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
            <SearchIcon className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ابحث بالاسم أو امسح الباركود مباشرة... (Enter للإضافة)"
            className="w-full bg-white border border-gray-200 rounded-xl pr-11 pl-10 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Categories Bar */}
      <CategoryBar
        categories={CATEGORIES}
        activeCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto mt-2 pr-0.5">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-dashed border-gray-300 my-4">
            <BarcodeIcon className="w-12 h-12 text-gray-300 mb-2" />
            <p className="font-bold text-gray-600">لا توجد مواد مطابقة للبحث</p>
            <p className="text-xs text-gray-400 mt-1">
              تأكد من كتابة الاسم أو رقم الباركود بشكل صحيح
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
