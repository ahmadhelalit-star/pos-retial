import { createPortal } from 'react-dom';
import {
  SearchIcon,
  PlusIcon,
  TruckIcon,
  UsersIcon,
  DocumentTextIcon,
} from '../../../components/common/Icons';

export function PurchaseFilterBar({
  activeView, // 'invoices' | 'suppliers'
  onViewChange,
  searchQuery,
  onSearchChange,
  paymentFilter, // 'all' | 'unpaid' | 'paid'
  onPaymentFilterChange,
  onAddNewInvoice,
  onAddNewSupplier,
  invoicesCount = 0,
  suppliersCount = 0,
  searchPortalTarget,
}) {
  const searchField = (
    <div className="relative flex-1">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={
          activeView === 'invoices'
            ? 'بحث برقم الفاتورة، اسم المورد، أو رقم فاتورة المورد...'
            : 'بحث باسم المورد، الشركة، رقم الهاتف، أو الرقم الضريبي...'
        }
        className="w-full pl-3 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-500"
      />
      <SearchIcon className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      {searchQuery && (
        <button
          type="button"
          onClick={() => onSearchChange('')}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600 text-xs px-1"
        >
          ×
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-white p-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* 1. التبديل بين فواتير الشراء ودليل الموردين */}
      <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-xl border border-gray-200/80">
        <button
          type="button"
          onClick={() => onViewChange('invoices')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeView === 'invoices'
              ? 'bg-white text-emerald-800 shadow-xs border border-gray-200/60'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <DocumentTextIcon className="w-4 h-4 text-emerald-600" />
          <span>فواتير الشراء والتوريد</span>
          <span className="bg-emerald-100 text-emerald-800 text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold">
            {invoicesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onViewChange('suppliers')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeView === 'suppliers'
              ? 'bg-white text-indigo-800 shadow-xs border border-gray-200/60'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UsersIcon className="w-4 h-4 text-indigo-600" />
          <span>دليل حسابات الموردين</span>
          <span className="bg-indigo-100 text-indigo-800 text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold">
            {suppliersCount}
          </span>
        </button>
      </div>

      {/* 2. شريط البحث والفلترة */}
      <div className="flex items-center gap-2 flex-1 max-w-xl">
        {searchPortalTarget ? createPortal(searchField, searchPortalTarget) : searchField}

        {/* فلترة السداد (تظهر في تبويب الفواتير) */}
        {activeView === 'invoices' && (
          <select
            value={paymentFilter}
            onChange={(e) => onPaymentFilterChange(e.target.value)}
            className="py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">جميع حالات السداد</option>
            <option value="unpaid">آجل بانتظار السداد</option>
            <option value="partial">مسدد جزئياً</option>
            <option value="paid">مسدد بالكامل</option>
          </select>
        )}
      </div>

      {/* 3. أزرار الإجراءات السريعة */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAddNewSupplier}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
        >
          <PlusIcon className="w-3.5 h-3.5 text-indigo-600" />
          <span>إضافة مورد</span>
        </button>

        <button
          type="button"
          onClick={onAddNewInvoice}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
        >
          <TruckIcon className="w-4 h-4 text-emerald-100" />
          <span>فاتورة شراء جديدة</span>
        </button>
      </div>
    </div>
  );
}
