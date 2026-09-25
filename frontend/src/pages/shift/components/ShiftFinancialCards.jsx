import {
  BanknotesIcon,
  CreditCardIcon,
  ArrowPathIcon,
  DocumentChartBarIcon,
} from '../../../components/common/Icons';

export function ShiftFinancialCards({
  openingFloat,
  cashSales,
  cardSales,
  cashRefunds,
  cardRefunds,
  expectedCashInDrawer,
  netSales,
  invoicesCount,
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 select-none">
      {/* 1. Cash in Drawer Expected */}
      <div className="bg-white p-4 rounded-2xl border-2 border-emerald-500/80 shadow-2xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-600">النقد المتوقع بالدرج</span>
          <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <BanknotesIcon className="w-4 h-4" />
          </span>
        </div>
        <p className="text-xl md:text-2xl font-black text-emerald-700 font-mono mt-2">
          {expectedCashInDrawer.toFixed(2)}{' '}
          <span className="text-xs font-sans text-gray-500">ر.س</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          يشمل الفكة ({openingFloat.toFixed(0)}) + الكاش ({cashSales.toFixed(0)}) - المرتجع ({cashRefunds.toFixed(0)})
        </p>
      </div>

      {/* 2. Total Net Sales */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-600">صافي المبيعات</span>
          <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <DocumentChartBarIcon className="w-4 h-4" />
          </span>
        </div>
        <p className="text-xl md:text-2xl font-black text-gray-900 font-mono mt-2">
          {netSales.toFixed(2)}{' '}
          <span className="text-xs font-sans text-gray-400">ر.س</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          إجمالي {invoicesCount} عمليات بيع مسجلة
        </p>
      </div>

      {/* 3. Card Sales */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-600">مبيعات الشبكة / مدى</span>
          <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CreditCardIcon className="w-4 h-4" />
          </span>
        </div>
        <p className="text-xl md:text-2xl font-black text-indigo-700 font-mono mt-2">
          {(cardSales - cardRefunds).toFixed(2)}{' '}
          <span className="text-xs font-sans text-gray-400">ر.س</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          مطابقة مباشرة مع أجهزة الـ POS
        </p>
      </div>

      {/* 4. Total Refunds */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-600">إجمالي المرتجعات</span>
          <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <ArrowPathIcon className="w-4 h-4" />
          </span>
        </div>
        <p className="text-xl md:text-2xl font-black text-red-600 font-mono mt-2">
          {(cashRefunds + cardRefunds).toFixed(2)}{' '}
          <span className="text-xs font-sans text-gray-400">ر.س</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          كاش: {cashRefunds.toFixed(2)} | شبكة: {cardRefunds.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
