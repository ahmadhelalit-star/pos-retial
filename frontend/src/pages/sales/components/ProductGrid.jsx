import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { SearchIcon, BarcodeIcon, XMarkIcon } from '../../../components/common/Icons';
import { useHeaderSearchSlot } from '../../../components/layout/headerSearchSlot';
import { getVirtualRange, useVirtualScroll } from '../../../hooks/useVirtualRows';
import { CategoryBar } from './CategoryBar';
import { ProductCard } from './ProductCard';
import { ProductListRow } from './ProductListRow';
import { CATEGORIES } from '../../../data/mockProducts';

const VIEW_STORAGE_KEY = 'shamtouch:v1:salesView';
const GRID_ROW_HEIGHT = 124;
const LIST_ROW_HEIGHT = 60;
const CATEGORY_ICONS = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category.icon])
);

function getInitialViewMode(productsCount) {
  let stored = null;
  try {
    stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
  } catch {
    stored = null;
  }

  if (stored === 'grid' || stored === 'list') return stored;
  return productsCount > 300 || window.innerWidth < 1024 ? 'list' : 'grid';
}

function getGridColumns(width) {
  if (width < 480) return 2;
  if (width < 700) return 3;
  if (width < 900) return 4;
  if (width < 1150) return 5;
  if (width < 1400) return 6;
  return 7;
}

export function ProductGrid({ products, onAddToCart }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState(() => getInitialViewMode(products.length));
  const searchSlot = useHeaderSearchSlot();
  const { scrollRef, scrollTop, viewportWidth, viewportHeight, onScroll, scrollToTop } =
    useVirtualScroll();

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

  const isGrid = viewMode === 'grid';
  const columns = isGrid ? getGridColumns(viewportWidth) : 1;
  const rowCount = isGrid
    ? Math.ceil(filteredProducts.length / columns)
    : filteredProducts.length;
  const rowHeight = isGrid ? GRID_ROW_HEIGHT : LIST_ROW_HEIGHT;
  const { start, end, totalHeight } = getVirtualRange({
    rowCount,
    rowHeight,
    scrollTop,
    viewportHeight,
    overscan: isGrid ? 2 : 4,
  });

  useEffect(() => {
    scrollToTop();
  }, [searchQuery, selectedCategory, viewMode, scrollToTop]);

  const changeViewMode = (mode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch {
      // Ignore storage failures; the current session still works.
    }
  };

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

  const searchField = (
    <div className="relative flex-1">
      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-500">
        <SearchIcon className="w-5 h-5" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="ابحث بالاسم أو امسح الباركود... (Enter للإضافة)"
        className="w-full rounded-xl border border-[#c5c5d3]/70 bg-white py-2.5 pr-11 pl-10 text-sm text-gray-800 placeholder-gray-500 shadow-2xs transition-all focus:border-[#00236f] focus:outline-none focus:ring-2 focus:ring-[#00236f]/15"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => setSearchQuery('')}
          className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 hover:text-gray-600 cursor-pointer"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f9f9ff] p-3">
      {searchSlot ? (
        createPortal(searchField, searchSlot)
      ) : (
        <div className="mb-3.5 flex items-center gap-2">{searchField}</div>
      )}

      <CategoryBar
        categories={CATEGORIES}
        activeCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        viewMode={viewMode}
        onViewModeChange={changeViewMode}
      />

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto mt-2 pr-0.5"
      >
        {filteredProducts.length === 0 ? (
          <div className="my-4 flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[#c5c5d3] bg-white p-6 text-center">
            <BarcodeIcon className="mb-2 h-12 w-12 text-gray-300" />
            <p className="text-sm font-bold text-gray-600">لا توجد مواد مطابقة للبحث</p>
            <p className="mt-1 text-xs text-gray-500">
              تأكد من كتابة الاسم أو رقم الباركود بشكل صحيح
            </p>
          </div>
        ) : (
          <div className="relative" style={{ height: totalHeight }}>
            {isGrid
              ? Array.from({ length: Math.max(0, end - start) }, (_, offset) => {
                  const rowIndex = start + offset;
                  const rowProducts = filteredProducts.slice(
                    rowIndex * columns,
                    rowIndex * columns + columns
                  );
                  return (
                    <div
                      key={rowIndex}
                      className="absolute inset-x-0 grid gap-3"
                      style={{
                        top: rowIndex * GRID_ROW_HEIGHT,
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      }}
                    >
                      {rowProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onAddToCart={onAddToCart}
                        />
                      ))}
                    </div>
                  );
                })
              : Array.from({ length: Math.max(0, end - start) }, (_, offset) => {
                  const index = start + offset;
                  const product = filteredProducts[index];
                  return (
                    <div
                      key={product.id}
                      className="absolute inset-x-0"
                      style={{ top: index * LIST_ROW_HEIGHT }}
                    >
                      <ProductListRow
                        product={product}
                        categoryIcon={CATEGORY_ICONS[product.category]}
                        onAddToCart={onAddToCart}
                      />
                    </div>
                  );
                })}
          </div>
        )}
      </div>
    </div>
  );
}
