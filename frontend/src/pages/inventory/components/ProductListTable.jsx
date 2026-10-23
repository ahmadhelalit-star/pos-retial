import {
  BarcodeIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  PrinterIcon,
} from '../../../components/common/Icons';

export function ProductListTable({
  products,
  onEditProduct,
  onDeleteProduct,
  onAdjustStock,
  onOpenBarcodeModal,
}) {
  const getStockBadge = (stock) => {
    if (stock <= 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          نفد من المخزون
        </span>
      );
    }
    if (stock <= 10) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          كمية منخفضة ({stock})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        متوفر ({stock})
      </span>
    );
  };

  if (products.length === 0) {
    return (
      <div className="bg-white mx-4 p-12 rounded-2xl border border-gray-200 text-center flex flex-col items-center justify-center">
        <BarcodeIcon className="w-12 h-12 text-gray-300 mb-2" />
        <p className="font-bold text-gray-700 text-sm">لا توجد منتجات مطابقة لمعايير البحث</p>
        <p className="text-xs text-gray-500 mt-1">
          جرّب تغيير التصنيف أو كلمة البحث أو أضف منتجاً جديداً
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ── MOBILE CARD LIST (< md) ── */}
      <div className="block md:hidden space-y-0 select-none">
        {products.map((prod) => {
          const cost = prod.costPrice || prod.price * 0.7;

          return (
            <div
              key={prod.id}
              className="p-3 bg-white border border-gray-200 rounded-2xl mb-2 mx-4"
            >
              {/* Row 1: Product name + stock badge */}
              <div className="flex items-start justify-between mb-1.5">
                <span className="font-bold text-gray-900 text-sm leading-snug flex-1 ml-2">
                  {prod.name}
                </span>
                {getStockBadge(prod.stock)}
              </div>

              {/* Row 2: Barcode + category badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-bold">
                  {prod.barcode}
                </span>
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium">
                  {prod.unit || 'حبة'}
                </span>
              </div>

              {/* Row 3: Cost price | Sell price */}
              <div className="flex items-center gap-0 mb-3 bg-gray-50 rounded-xl divide-x divide-gray-200 border border-gray-200 overflow-hidden" dir="ltr">
                <div className="flex-1 px-3 py-2 text-center">
                  <p className="text-[11px] text-gray-500 mb-0.5">سعر التكلفة</p>
                  <p className="font-mono text-xs text-gray-600 font-semibold">
                    {cost.toFixed(2)} <span className="font-sans text-[10px] text-gray-500">ر.س</span>
                  </p>
                </div>
                <div className="flex-1 px-3 py-2 text-center">
                  <p className="text-[11px] text-gray-500 mb-0.5">سعر البيع</p>
                  <p className="font-mono text-sm text-emerald-700 font-black">
                    {prod.price.toFixed(2)} <span className="font-sans text-[10px] text-gray-500">ر.س</span>
                  </p>
                </div>
              </div>

              {/* Row 4: Stock stepper + action buttons */}
              <div className="flex items-center justify-between">
                {/* Stepper */}
                <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    disabled={prod.stock <= 0}
                    onClick={() => onAdjustStock(prod.id, -1)}
                    className="w-6 h-6 rounded-lg bg-white disabled:opacity-30 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                    title="إنقاص المخزون بمقدار 1"
                  >
                    <MinusIcon className="w-3 h-3" />
                  </button>

                  <span className="w-8 text-center font-mono font-black text-xs text-gray-900">
                    {prod.stock}
                  </span>

                  <button
                    type="button"
                    onClick={() => onAdjustStock(prod.id, 1)}
                    className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                    title="زيادة المخزون بمقدار 1"
                  >
                    <PlusIcon className="w-3 h-3" />
                  </button>
                </div>

                {/* Action icon buttons */}
                <div className="flex items-center gap-1.5">
                  {/* Barcode */}
                  <button
                    type="button"
                    onClick={() => onOpenBarcodeModal(prod)}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition-colors cursor-pointer"
                    title="طباعة ملصق الباركود والرف"
                  >
                    <BarcodeIcon className="w-4 h-4" />
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => onEditProduct(prod)}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors cursor-pointer"
                    title="تعديل بيانات المنتج"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => onDeleteProduct(prod.id)}
                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-700 transition-colors cursor-pointer"
                    title="حذف المنتج من الكتالوج"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP TABLE (>= md) ── */}
      <div className="hidden md:block bg-white mx-4 rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden flex flex-col select-none">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 select-none">
                <th className="py-3.5 px-4">الباركود (SKU)</th>
                <th className="py-3.5 px-4">اسم المنتج</th>
                <th className="py-3.5 px-4">الوحدة</th>
                <th className="py-3.5 px-4">سعر التكلفة</th>
                <th className="py-3.5 px-4">سعر البيع</th>
                <th className="py-3.5 px-4">الرصيد الحالي</th>
                <th className="py-3.5 px-4 text-center">تعديل سريع للمخزون</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700 font-medium">
              {products.map((prod) => {
                const cost = prod.costPrice || prod.price * 0.7; // default 70% if not set

                return (
                  <tr
                    key={prod.id}
                    className="hover:bg-gray-50/80 transition-colors group"
                  >
                    {/* Barcode */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs font-bold">
                        {prod.barcode}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-gray-900 text-xs md:text-sm block">
                        {prod.name}
                      </span>
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-4 text-gray-500">{prod.unit || 'حبة'}</td>

                    {/* Cost Price */}
                    <td className="py-3 px-4 font-mono text-gray-500">
                      {cost.toFixed(2)} ر.س
                    </td>

                    {/* Selling Price */}
                    <td className="py-3 px-4 font-mono font-black text-sm text-emerald-700">
                      {prod.price.toFixed(2)}{' '}
                      <span className="text-[11px] font-sans text-gray-500">ر.س</span>
                    </td>

                    {/* Stock Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStockBadge(prod.stock)}
                    </td>

                    {/* Quick Stepper on row for touch screens */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5 bg-gray-100 p-1 rounded-xl w-28 mx-auto border border-gray-200">
                        <button
                          type="button"
                          disabled={prod.stock <= 0}
                          onClick={() => onAdjustStock(prod.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white disabled:opacity-30 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                          title="إنقاص المخزون بمقدار 1"
                        >
                          <MinusIcon className="w-3 h-3" />
                        </button>

                        <span className="w-8 text-center font-mono font-black text-xs text-gray-900">
                          {prod.stock}
                        </span>

                        <button
                          type="button"
                          onClick={() => onAdjustStock(prod.id, 1)}
                          className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                          title="زيادة المخزون بمقدار 1"
                        >
                          <PlusIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Barcode label print */}
                        <button
                          type="button"
                          onClick={() => onOpenBarcodeModal(prod)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 transition-colors cursor-pointer"
                          title="طباعة ملصق الباركود والرف"
                        >
                          <BarcodeIcon className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => onEditProduct(prod)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors cursor-pointer"
                          title="تعديل بيانات المنتج"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(prod.id)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-700 transition-colors cursor-pointer"
                          title="حذف المنتج من الكتالوج"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
