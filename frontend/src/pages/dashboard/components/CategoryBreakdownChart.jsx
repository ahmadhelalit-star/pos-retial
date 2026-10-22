import { ArchiveBoxIcon } from '../../../components/common/Icons';

export function CategoryBreakdownChart({
  categorySales = [],
  totalSales = 0,
  currency = 'ر.س',
}) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
      <div className="mb-3">
        <h3 className="text-xs font-black text-gray-900 mb-0.5">
          أداء المبيعات حسب الأقسام والتصنيفات
        </h3>
        <p className="text-[11px] text-gray-500">
          توزيع الإيرادات والكميات المباعة لكل قسم
        </p>
      </div>

      <div className="space-y-2.5 overflow-y-auto max-h-60 pr-1">
        {totalSales <= 0 && (
          <div className="py-8 text-center text-xs text-gray-400 font-bold">
            لا توجد مبيعات مسجلة في الفترة المحددة
          </div>
        )}
        {categorySales.map((cat, idx) => {
          const pct = totalSales > 0 ? (cat.amount / totalSales) * 100 : 0;

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-800">
                  <span className="text-sm">{cat.icon || '📦'}</span>
                  <span>{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-gray-900">
                    {cat.amount.toFixed(2)} {currency}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    ({pct.toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  style={{ width: `${Math.max(4, pct)}%` }}
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
