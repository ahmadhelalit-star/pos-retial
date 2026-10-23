import { createPortal } from 'react-dom';
import { SearchIcon, XMarkIcon, FunnelIcon } from '../../../components/common/Icons';

export function InvoicesFilterBar({
  searchQuery,
  onSearchChange,
  paymentFilter,
  onPaymentFilterChange,
  statusFilter,
  onStatusFilterChange,
  onResetFilters,
  isFiltered,
  searchPortalTarget,
}) {
  const searchField = (
    <div className="relative flex-1 w-full">
      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-500">
        <SearchIcon className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="ابحث برقم الفاتورة (مثال: INV-849) أو اسم العميل أو هاتفه..."
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
    <div className="bg-white p-4 mx-4 mb-3 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        {searchPortalTarget ? createPortal(searchField, searchPortalTarget) : searchField}

        {/* Reset button if filtered */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-red-200"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
            <span>إلغاء التصفية</span>
          </button>
        )}
      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs">
        {/* Payment filter */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-bold flex items-center gap-1">
            <FunnelIcon className="w-3.5 h-3.5" />
            طريقة الدفع:
          </span>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'cash', label: 'نقدي' },
              { id: 'card', label: 'شبكة' },
              { id: 'split', label: 'مختلط' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onPaymentFilterChange(tab.id)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  paymentFilter === tab.id
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-bold">الحالة:</span>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'جميع الحالات' },
              { id: 'paid', label: 'مدفوعة' },
              { id: 'refunded', label: 'مسترجعة' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onStatusFilterChange(tab.id)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
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
