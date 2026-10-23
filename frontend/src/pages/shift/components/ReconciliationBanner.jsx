import { CheckIcon, LockClosedIcon } from '../../../components/common/Icons';

export function ReconciliationBanner({
  expectedCash,
  actualCash,
  notes,
  onNotesChange,
  onInitiateCloseShift,
  isShiftOpen,
}) {
  const diff = actualCash - expectedCash;
  const isBalanced = Math.abs(diff) < 0.01;
  const isSurplus = diff > 0.01;
  const isShortage = diff < -0.01;

  return (
    <div className="mx-4 my-4 p-5 bg-white rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 select-none">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs ${
              isBalanced
                ? 'bg-emerald-500 text-white'
                : isSurplus
                ? 'bg-blue-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {isBalanced ? <CheckIcon className="w-6 h-6" /> : '!'}
          </div>

          <div>
            <h4 className="text-base font-black text-gray-900 leading-tight">
              {isBalanced && 'الصندوق متطابق تماماً بدون أي فروقات'}
              {isSurplus && `يوجد فائض نقدي بالدرج بقيمة (+${diff.toFixed(2)} ر.س)`}
              {isShortage && `يوجد عجز نقدي بالدرج بقيمة (${diff.toFixed(2)} ر.س)`}
            </h4>
            <div className="flex items-center gap-3 text-xs text-gray-500 font-mono mt-1">
              <span>المتوقع: {expectedCash.toFixed(2)} ر.س</span>
              <span>•</span>
              <span>الفعلي: {actualCash.toFixed(2)} ر.س</span>
              <span>•</span>
              <span
                className={`font-bold ${
                  isBalanced
                    ? 'text-emerald-600'
                    : isSurplus
                    ? 'text-blue-600'
                    : 'text-red-600'
                }`}
              >
                الفرق: {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} ر.س
              </span>
            </div>
          </div>
        </div>

        {/* Close Shift Action Button */}
        {isShiftOpen && (
          <button
            type="button"
            onClick={onInitiateCloseShift}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-sm text-white shadow-md transition-all cursor-pointer active:scale-95 ${
              isShortage
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
            }`}
          >
            <LockClosedIcon className="w-4 h-4" />
            <span>إغلاق الوردية وطباعة تقرير Z</span>
          </button>
        )}
      </div>

      {/* Notes on Discrepancy */}
      {isShiftOpen && !isBalanced && (
        <div className="pt-3 border-t border-gray-100">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {isShortage ? 'تبرير سبب العجز (مطلوب):' : 'ملاحظات الفائض النقدي:'}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="اكتب توضيح سبب الفرق في الصندوق لاعتماده في تقرير الوردية..."
            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>
      )}
    </div>
  );
}
