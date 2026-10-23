import { PauseIcon, XMarkIcon, TrashIcon, ArrowsUpDownIcon } from '../../../components/common/Icons';

export function HeldOrdersModal({
  isOpen,
  onClose,
  heldOrders,
  onRestoreOrder,
  onDeleteOrder,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <PauseIcon className="w-5 h-5 text-amber-700" />
            <span>الفواتير المعلقة ({heldOrders.length})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-amber-100 text-amber-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-4 max-h-96 overflow-y-auto space-y-3">
          {heldOrders.length > 0 ? (
            heldOrders.map((order) => (
              <div
                key={order.id}
                className="p-3.5 bg-gray-50 hover:bg-gray-100/80 rounded-2xl border border-gray-200 transition-all flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-800 font-mono">
                      #{order.id}
                    </span>
                    <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-md">
                      {order.createdAt}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {order.customer.name} • {order.items.length} أصناف
                  </p>
                  <p className="text-sm font-black text-emerald-700 font-mono mt-0.5">
                    {order.grandTotal.toFixed(2)} ر.س
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreOrder(order.id);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <ArrowsUpDownIcon className="w-3.5 h-3.5" />
                    <span>استرجاع</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteOrder(order.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="حذف الفاتورة المعلقة"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p className="font-bold text-gray-600">لا توجد فواتير معلقة حالياً</p>
              <p className="text-xs text-gray-500 mt-1">
                يمكنك تعليق أي فاتورة جارية بالضغط على زر "تعليق" في شاشة السلة
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-gray-50 border-t border-gray-200 text-left">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
