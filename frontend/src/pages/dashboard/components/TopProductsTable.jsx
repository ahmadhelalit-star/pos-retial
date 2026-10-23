import { SparklesIcon, TagIcon } from '../../../components/common/Icons';

export function TopProductsTable({
  topProducts = [],
  currency = 'ر.س',
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
            <SparklesIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-900">
              أفضل 5 أصناف مبيعاً وتحقيقاً للأرباح
            </h3>
            <p className="text-xs text-gray-500">
              المنتجات الأكثر طلباً في المتجر خلال هذه الفترة
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100">
            <tr>
              <th className="py-2.5 px-3.5">#</th>
              <th className="py-2.5 px-3.5">اسم الصنف</th>
              <th className="py-2.5 px-3.5 text-center">الكمية المباعة</th>
              <th className="py-2.5 px-3.5">إجمالي الإيراد</th>
              <th className="py-2.5 px-3.5">صافي الربح</th>
              <th className="py-2.5 px-3.5 text-center">هامش الربح</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-gray-500 font-bold">
                  لا توجد مبيعات مسجلة في الفترة المحددة
                </td>
              </tr>
            )}
            {topProducts.map((p, idx) => {
              const rankColor =
                idx === 0
                  ? 'bg-amber-100 text-amber-800'
                  : idx === 1
                  ? 'bg-slate-200 text-slate-800'
                  : idx === 2
                  ? 'bg-amber-700/20 text-amber-900'
                  : 'bg-gray-100 text-gray-600';

              return (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-2.5 px-3.5">
                    <span
                      className={`w-5 h-5 rounded-full inline-flex items-center justify-center font-mono font-black text-[11px] ${rankColor}`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="font-bold text-gray-900">{p.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono">
                      {p.barcode}
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-center font-mono font-bold text-gray-800 whitespace-nowrap">
                    {p.qtySold} {p.unit || 'حبة'}
                  </td>
                  <td className="py-2.5 px-3.5 font-mono font-bold text-emerald-700 whitespace-nowrap">
                    {p.revenue.toFixed(2)} {currency}
                  </td>
                  <td className="py-2.5 px-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">
                    {p.profit.toFixed(2)} {currency}
                  </td>
                  <td className="py-2.5 px-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border ${Number(p.margin) < 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {p.margin}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
