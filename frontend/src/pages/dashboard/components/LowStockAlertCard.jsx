import { ExclamationTriangleIcon, TruckIcon } from '../../../components/common/Icons';

export function LowStockAlertCard({
  lowStockProducts = [],
  onNavigateToPurchases,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col justify-between">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
            <ExclamationTriangleIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-900">
              تنبيهات نواقص المخزون (تحتاج توريد)
            </h3>
            <p className="text-xs text-gray-500">
              أصناف شارف رصيدها على النفاد في المتجر
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateToPurchases}
          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
        >
          <TruckIcon className="w-3.5 h-3.5" />
          <span>فاتورة توريد</span>
        </button>
      </div>

      <div className="p-3 space-y-2 overflow-y-auto max-h-60">
        {lowStockProducts.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">
            جميع الأصناف متوفرة بكميات كافية في المخزون ✨
          </div>
        ) : (
          lowStockProducts.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:bg-rose-50/40 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-gray-900">{p.name}</div>
                <div className="text-[11px] text-gray-500 font-mono">
                  باركود: {p.barcode}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-rose-100 text-rose-800 border border-rose-200">
                  متبقي {p.stock ?? 0} {p.unit || 'قطعة'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
