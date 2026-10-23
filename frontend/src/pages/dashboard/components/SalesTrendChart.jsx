import { useState } from 'react';
import { DocumentChartBarIcon } from '../../../components/common/Icons';

export function SalesTrendChart({
  dailyData = [],
  currency = 'ر.س',
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Maximum value for scaling the chart
  const maxVal = Math.max(
    ...dailyData.map((d) => Math.max(d.sales || 0, d.profit || 0)),
    100
  );

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <DocumentChartBarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-900">
              حركة المبيعات وصافي الأرباح اليومية
            </h3>
            <p className="text-xs text-gray-500">
              مقارنة الإيرادات اليومية بهامش الربح الفعلي بعد خصم تكلفة الشراء
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500" />
            <span className="text-gray-600 font-bold">المبيعات الإجمالية</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-indigo-500" />
            <span className="text-gray-600 font-bold">صافي الربح</span>
          </div>
        </div>
      </div>

      {/* Chart Bars Area */}
      <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-2 px-2 relative select-none">
        {/* Background Grid Lines */}
        <div className="absolute inset-x-2 top-8 bottom-8 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-gray-400 border-dashed w-full" />
          <div className="border-b border-gray-400 border-dashed w-full" />
          <div className="border-b border-gray-400 border-dashed w-full" />
        </div>

        {dailyData.map((day, idx) => {
          const salesHeightPercent = Math.min(100, Math.max(10, (day.sales / maxVal) * 100));
          const profitHeightPercent = Math.min(100, Math.max(8, (day.profit / maxVal) * 100));
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute -top-14 z-20 bg-gray-900 text-white p-2 rounded-xl text-[11px] shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                  <div className="font-bold text-center border-b border-gray-700 pb-1 mb-1">
                    {day.dayName} ({day.date})
                  </div>
                  <div className="flex justify-between gap-3 text-emerald-400 font-mono">
                    <span>مبيعات:</span>
                    <span>{day.sales.toFixed(2)} {currency}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-indigo-300 font-mono">
                    <span>أرباح:</span>
                    <span>{day.profit.toFixed(2)} {currency}</span>
                  </div>
                </div>
              )}

              {/* Bars container */}
              <div className="w-full max-w-[44px] flex items-end justify-center gap-1.5 h-full">
                {/* Sales Bar */}
                <div
                  style={{ height: `${salesHeightPercent}%` }}
                  className={`w-1/2 rounded-t-lg transition-all duration-300 ${
                    isHovered
                      ? 'bg-emerald-600 shadow-md scale-y-105'
                      : 'bg-emerald-500 hover:bg-emerald-600'
                  }`}
                />

                {/* Profit Bar */}
                <div
                  style={{ height: `${profitHeightPercent}%` }}
                  className={`w-1/2 rounded-t-lg transition-all duration-300 ${
                    isHovered
                      ? 'bg-indigo-600 shadow-md scale-y-105'
                      : 'bg-indigo-400 hover:bg-indigo-500'
                  }`}
                />
              </div>

              {/* Day Label */}
              <span className={`text-xs font-bold mt-2 transition-colors ${
                isHovered ? 'text-emerald-700 font-black' : 'text-gray-500'
              }`}>
                {day.dayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
