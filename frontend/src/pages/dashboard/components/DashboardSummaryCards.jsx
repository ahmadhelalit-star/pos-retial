import {
  BanknotesIcon,
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  ReceiptPercentIcon,
  SparklesIcon,
} from '../../../components/common/Icons';

export function DashboardSummaryCards({
  metrics,
  currency = 'ر.س',
  taxRatePercent = 15,
}) {
  const {
    totalRevenue = 0,
    netProfit = 0,
    profitMargin = 0,
    totalTransactions = 0,
    averageTicket = 0,
    totalVat = 0,
    growthRate = 0, // نسبة نمو مقارنة بالفترة السابقة
  } = metrics;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white border-b border-gray-200">
      {/* 1. إجمالي المبيعات */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 border border-emerald-200/80 rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-emerald-700 mb-1">
          <span className="text-xs font-bold">إجمالي المبيعات (Revenue)</span>
          <div className="p-1.5 bg-emerald-600 text-white rounded-xl shadow-xs">
            <BanknotesIcon className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-xl md:text-2xl font-black text-emerald-950 font-mono">
            {totalRevenue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-xs font-bold text-emerald-600">{currency}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-xs text-emerald-700 font-bold">
          <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span dir="ltr">{growthRate > 0 ? '+' : ''}{growthRate}%</span>
          <span className="text-gray-500 font-normal">مقارنة بالفترة السابقة</span>
        </div>
      </div>

      {/* 2. صافي الأرباح الفعلية */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 border border-indigo-200/80 rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-indigo-700 mb-1">
          <span className="text-xs font-bold">صافي الأرباح (Net Profit)</span>
          <div className="p-1.5 bg-indigo-600 text-white rounded-xl shadow-xs">
            <SparklesIcon className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-xl md:text-2xl font-black text-indigo-950 font-mono">
            {netProfit.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-xs font-bold text-indigo-600">{currency}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-indigo-700 font-bold">
          <span className="bg-indigo-100 px-1.5 py-0.5 rounded-md font-mono">
            هامش ربح: {profitMargin}%
          </span>
          <span className="text-gray-500 font-normal">بعد خصم التكلفة</span>
        </div>
      </div>

      {/* 3. متوسط الفاتورة وعدد العمليات */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100/40 border border-blue-200/80 rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-blue-700 mb-1">
          <span className="text-xs font-bold">متوسط الفاتورة (Basket Size)</span>
          <div className="p-1.5 bg-blue-600 text-white rounded-xl shadow-xs">
            <ShoppingBagIcon className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-xl md:text-2xl font-black text-blue-950 font-mono">
            {averageTicket.toFixed(2)}
          </span>
          <span className="text-xs font-bold text-blue-600">{currency}</span>
        </div>
        <div className="mt-1.5 text-xs text-blue-700 font-medium">
          عبر <span className="font-bold font-mono">{totalTransactions}</span> فاتورة ناجحة
        </div>
      </div>

      {/* 4. ضريبة القيمة المضافة المحصلة */}
      <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200/80 rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-amber-700 mb-1">
          <span className="text-xs font-bold">ضريبة القيمة المضافة (VAT)</span>
          <div className="p-1.5 bg-amber-600 text-white rounded-xl shadow-xs">
            <ReceiptPercentIcon className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-xl md:text-2xl font-black text-amber-950 font-mono">
            {totalVat.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-xs font-bold text-amber-600">{currency}</span>
        </div>
        <div className="mt-1.5 text-xs text-amber-700 font-medium">
          المحصلة لإقرار الهيئة ({taxRatePercent}%)
        </div>
      </div>
    </div>
  );
}
