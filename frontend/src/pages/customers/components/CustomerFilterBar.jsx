import {
  SearchIcon,
  PlusIcon,
  UsersIcon,
  BuildingOfficeIcon,
  WalletIcon,
  GiftIcon,
} from '../../../components/common/Icons';

export function CustomerFilterBar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  balanceFilter,
  onBalanceFilterChange,
  onAddNewCustomer,
}) {
  return (
    <div className="p-4 bg-white border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative w-full md:w-80">
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
          <SearchIcon className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ابحث بالاسم، الجوال، أو الرقم الضريبي..."
          className="w-full pl-3 pr-10 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-sans"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Tabs & Add Button */}
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
        {/* Type Filter */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onTypeFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            الكل
          </button>

          <button
            type="button"
            onClick={() => onTypeFilterChange('individual')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              typeFilter === 'individual'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <UsersIcon className="w-3.5 h-3.5" />
            <span>أفراد</span>
          </button>

          <button
            type="button"
            onClick={() => onTypeFilterChange('company')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              typeFilter === 'company'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <BuildingOfficeIcon className="w-3.5 h-3.5" />
            <span>شركات B2B</span>
          </button>
        </div>

        {/* Balance (Debtors) Toggle Button */}
        <button
          type="button"
          onClick={() => onBalanceFilterChange(balanceFilter === 'debtors' ? 'all' : 'debtors')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            balanceFilter === 'debtors'
              ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <WalletIcon className="w-3.5 h-3.5 text-amber-600" />
          <span>عليهم ذمم (آجل)</span>
        </button>

        {/* Add Customer Button */}
        <button
          type="button"
          onClick={onAddNewCustomer}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>عميل جديد</span>
        </button>
      </div>
    </div>
  );
}
