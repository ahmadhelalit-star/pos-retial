import { translateUI as t,useLocale } from "../../../runtime/i18n.js";
import { createPortal } from 'react-dom';
import { SearchIcon, XMarkIcon, PlusIcon, FunnelIcon } from '../../../components/common/Icons';
import { CATEGORIES } from '../../../data/mockProducts';

export function InventoryFilterBar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  stockFilter,
  onStockFilterChange,
  onOpenAddModal,
  onResetFilters,
  isFiltered,
  searchPortalTarget,
  canCreate = true,
}) {
  useLocale();
  const searchField = (
    <div className="relative flex-1 w-full">
      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-500">
        <SearchIcon className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t("ابحث باسم المادة أو الباركود SKU...")}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-10 py-2.5 text-xs md:text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => onSearchChange('')}
          className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 hover:text-gray-600 cursor-pointer"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-white p-4 mx-4 mb-3 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3 select-none">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        {searchPortalTarget ? createPortal(searchField, searchPortalTarget) : searchField}

        {/* Add Product Button & Reset */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-red-200"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              <span>{t("إلغاء التصفية")}</span>
            </button>
          )}

          <button
            type="button"
            disabled={!canCreate}
            onClick={onOpenAddModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{t("إضافة منتج جديد")}</span>
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs">
        {/* Category selector */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-bold flex items-center gap-1">
            <FunnelIcon className="w-3.5 h-3.5" />
            التصنيف:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stock status filter */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-bold">{t("حالة المخزون:")}</span>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'in_stock', label: 'متوفر' },
              { id: 'low_stock', label: 'منخفض (<=10)' },
              { id: 'out_of_stock', label: 'نفد (0)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onStockFilterChange(tab.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  stockFilter === tab.id
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
