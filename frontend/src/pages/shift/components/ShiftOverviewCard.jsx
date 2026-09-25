import { useState } from 'react';
import { ClockIcon, UserIcon, LockClosedIcon } from '../../../components/common/Icons';

export function ShiftOverviewCard({
  shift,
  onUpdateOpeningFloat,
  onOpenNewShift,
}) {
  const [isEditingFloat, setIsEditingFloat] = useState(false);
  const [floatInput, setFloatInput] = useState(shift.openingFloat.toString());

  const handleSaveFloat = () => {
    const val = parseFloat(floatInput) || 0;
    onUpdateOpeningFloat(val);
    setIsEditingFloat(false);
  };

  return (
    <div className="bg-white p-4 mx-4 mt-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none">
      {/* Shift Details */}
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-xs ${
            shift.status === 'open'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {shift.status === 'open' ? 'و' : <LockClosedIcon className="w-6 h-6" />}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-gray-900 leading-tight">
              وردية رقم #{shift.id}
            </h2>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                shift.status === 'open'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}
            >
              {shift.status === 'open' ? 'وردية مفتوحة ونشطة' : 'الوردية مغلقة'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium mt-1">
            <span className="flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5 text-gray-400" />
              <span>الكاشير:</span>
              <strong className="text-gray-700">{shift.cashier}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
              <span>بدأت في:</span>
              <strong className="text-gray-700 font-mono">{shift.openedAt}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Opening Float & Action */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
        {/* Opening Float */}
        <div className="bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl text-xs">
          <span className="text-gray-400 font-bold block text-[10px]">
            الرصيد الافتتاحي (الفكة الأولية)
          </span>
          {isEditingFloat && shift.status === 'open' ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                value={floatInput}
                onChange={(e) => setFloatInput(e.target.value)}
                className="w-20 bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-gray-800"
              />
              <button
                type="button"
                onClick={handleSaveFloat}
                className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-bold cursor-pointer"
              >
                حفظ
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-black font-mono text-gray-800">
                {shift.openingFloat.toFixed(2)} ر.س
              </span>
              {shift.status === 'open' && (
                <button
                  type="button"
                  onClick={() => setIsEditingFloat(true)}
                  className="text-[10px] text-emerald-700 hover:underline font-bold cursor-pointer"
                >
                  تعديل
                </button>
              )}
            </div>
          )}
        </div>

        {/* Start new shift button if closed */}
        {shift.status === 'closed' && (
          <button
            type="button"
            onClick={onOpenNewShift}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <span>فتح وردية جديدة</span>
          </button>
        )}
      </div>
    </div>
  );
}
