import { PlusIcon, MinusIcon, TrashIcon, CalculatorIcon } from '../../../components/common/Icons';

export const DENOMINATIONS = [
  { value: 500, label: '500 ر.س (ورقي)', type: 'note' },
  { value: 200, label: '200 ر.س (ورقي)', type: 'note' },
  { value: 100, label: '100 ر.س (ورقي)', type: 'note' },
  { value: 50, label: '50 ر.س (ورقي)', type: 'note' },
  { value: 20, label: '20 ر.س (ورقي)', type: 'note' },
  { value: 10, label: '10 ر.س (ورقي)', type: 'note' },
  { value: 5, label: '5 ر.س (ورقي)', type: 'note' },
  { value: 2, label: '2 ر.س (معدني)', type: 'coin' },
  { value: 1, label: '1 ر.س (معدني)', type: 'coin' },
  { value: 0.5, label: '0.50 ر.س (معدني)', type: 'coin' },
];

export function CashDenominationTable({
  counts,
  onCountChange,
  onResetCounts,
  onAutofillExpected,
  actualCountedTotal,
  expectedTotal,
  isShiftOpen,
}) {
  const handleStep = (value, delta) => {
    if (!isShiftOpen) return;
    const current = counts[value] || 0;
    const next = Math.max(0, current + delta);
    onCountChange(value, next);
  };

  const handleInputChange = (value, strVal) => {
    if (!isShiftOpen) return;
    const val = parseInt(strVal, 10);
    onCountChange(value, isNaN(val) ? 0 : Math.max(0, val));
  };

  return (
    <div className="bg-white mx-4 rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 bg-gray-50/90 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CalculatorIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              حاسبة جرد النقد الفعلي بالدرج (Cash Denominations)
            </h3>
            <p className="text-[11px] text-gray-500">
              احسب عدد الفئات النقدية والمعدنية الموجودة في الصندوق يدوياً
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        {isShiftOpen && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={onAutofillExpected}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold transition-colors cursor-pointer"
            >
              مطابقة تلقائية بالمتوقع
            </button>
            <button
              type="button"
              onClick={onResetCounts}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-700 border border-gray-200 font-bold transition-colors cursor-pointer"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              <span>تصفير</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid of denominations */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {DENOMINATIONS.map((denom) => {
          const count = counts[denom.value] || 0;
          const lineTotal = count * denom.value;

          return (
            <div
              key={denom.value}
              className="p-3 bg-gray-50/70 hover:bg-gray-100/70 border border-gray-200/80 rounded-xl flex flex-col justify-between transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700">{denom.label}</span>
                <span className="font-mono text-xs font-black text-emerald-700">
                  {lineTotal.toFixed(2)} ر.س
                </span>
              </div>

              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200">
                <button
                  type="button"
                  disabled={!isShiftOpen || count <= 0}
                  onClick={() => handleStep(denom.value, -1)}
                  className="w-7 h-7 rounded bg-gray-100 disabled:opacity-30 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors cursor-pointer active:scale-90"
                >
                  <MinusIcon className="w-3 h-3" />
                </button>

                <input
                  type="number"
                  min="0"
                  disabled={!isShiftOpen}
                  value={count === 0 ? '' : count}
                  placeholder="0"
                  onChange={(e) => handleInputChange(denom.value, e.target.value)}
                  className="flex-1 text-center font-mono font-bold text-xs text-gray-800 bg-transparent focus:outline-none"
                />

                <button
                  type="button"
                  disabled={!isShiftOpen}
                  onClick={() => handleStep(denom.value, 1)}
                  className="w-7 h-7 rounded bg-emerald-600 disabled:opacity-30 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-90"
                >
                  <PlusIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtotal of counted cash */}
      <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between px-5 font-mono text-xs">
        <span className="font-sans font-bold text-gray-600">
          إجمالي النقد الفعلي المحسوب:
        </span>
        <span className="text-lg font-black text-gray-900 font-mono">
          {actualCountedTotal.toFixed(2)}{' '}
          <span className="text-xs font-sans text-gray-400">ر.س</span>
        </span>
      </div>
    </div>
  );
}
