import {
  ArchiveBoxIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '../../../components/common/Icons';

export function InventorySummaryCards({ products = [] }) {
  const totalProducts = products.length;

  const totalValuation = products.reduce((acc, p) => {
    return acc + (p.price || 0) * (p.stock || 0);
  }, 0);

  const lowStockCount = products.filter(
    (p) => p.stock > 0 && p.stock <= 10
  ).length;

  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 p-3 sm:p-4 pb-2 select-none">
      {/* 1. Total Products */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-semibold">إجمالي الأصناف</p>
          <p className="text-lg md:text-xl font-black text-gray-800 font-mono mt-0.5">
            {totalProducts} <span className="text-xs font-sans text-gray-400">صنف</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <ArchiveBoxIcon className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Inventory Valuation */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-semibold">قيمة المخزون التقديرية</p>
          <p className="text-lg md:text-xl font-black text-emerald-600 font-mono mt-0.5">
            {totalValuation.toFixed(2)}{' '}
            <span className="text-xs font-sans text-gray-400">ر.س</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <BanknotesIcon className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Low Stock */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-semibold">أوشكت على النفاد</p>
          <p className="text-lg md:text-xl font-black text-amber-600 font-mono mt-0.5">
            {lowStockCount}{' '}
            <span className="text-xs font-sans text-gray-400">مواد حرجة</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <ExclamationTriangleIcon className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Out of Stock */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-semibold">نفدت من المخزون</p>
          <p className="text-lg md:text-xl font-black text-red-600 font-mono mt-0.5">
            {outOfStockCount}{' '}
            <span className="text-xs font-sans text-gray-400">بحاجة لطلب</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
          <XMarkIcon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
