import { useState } from 'react';
import { DocumentChartBarIcon } from '../../../components/common/Icons';

export function SalesTrendChart({
  dailyData = [],
  english = false,
  formatMoney,
  periodLabel,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const t = (ar, en) => english ? en : ar;
  const title = t("حركة المبيعات وإجمالي الربح", "Sales and gross profit");
  const salesLabel = t("صافي المبيعات", "Net sales");
  const profitLabel = t("إجمالي الربح", "Gross profit");

  // Scale negative amounts by magnitude and identify them in red.
  const maxVal = Math.max(
    ...dailyData.map((d) => Math.max(Math.abs(d.sales), Math.abs(d.profit))),
    100
  );

  return (
    <div className="dashboard-panel sales-trend-original p-5 rounded-2xl flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <DocumentChartBarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-900">
              {title}
            </h3>
            <p className="text-xs text-gray-500">
              {periodLabel && `${periodLabel} · `}{t('مقارنة المبيعات بإجمالي الربح بعد خصم تكلفة المنتجات', 'Compare sales and gross profit after product costs')}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500" />
            <span className="text-gray-600 font-bold">{salesLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-indigo-500" />
            <span className="text-gray-600 font-bold">{profitLabel}</span>
          </div>
        </div>
      </div>

      {!dailyData.length ? <p className="dashboard-empty">{t('لا توجد حركة في الفترة المحددة.', 'No activity in the selected period.')}</p> :
      <div className="sales-trend-scroll">
        <div className="h-64 flex items-end justify-between gap-2 pt-10 pb-2 px-2 relative select-none" style={{ minWidth: dailyData.length * 46 }}>
        {/* Background Grid Lines */}
        <div className="absolute inset-x-2 top-8 bottom-8 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-gray-400 border-dashed w-full" />
          <div className="border-b border-gray-400 border-dashed w-full" />
          <div className="border-b border-gray-400 border-dashed w-full" />
        </div>

        {dailyData.map((day, idx) => {
          const salesHeightPercent = Math.min(100, Math.max(0, (Math.abs(day.sales) / maxVal) * 100));
          const profitHeightPercent = Math.min(100, Math.max(0, (Math.abs(day.profit) / maxVal) * 100));
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={day.date}
              tabIndex={0}
              aria-label={`${day.dayName} · ${salesLabel} ${formatMoney(day.sales)} · ${profitLabel} ${formatMoney(day.profit)}`}
              onFocus={() => setHoveredIndex(idx)}
              onBlur={() => setHoveredIndex(null)}
              className="dashboard-trend-point flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute -top-9 z-20 bg-gray-900 text-white p-2 rounded-xl text-[11px] shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none">
                  <div className="font-bold text-center border-b border-gray-700 pb-1 mb-1">
                    {day.dayName} ({day.date})
                  </div>
                  <div className="flex justify-between gap-3 text-emerald-400 font-mono">
                    <span>{salesLabel}</span>
                    <span>{formatMoney(day.sales)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-indigo-300 font-mono">
                    <span>{profitLabel}</span>
                    <span>{formatMoney(day.profit)}</span>
                  </div>
                </div>
              )}

              {/* Bars container */}
              <div className="w-full max-w-[44px] flex items-end justify-center gap-1.5 h-full">
                {/* Sales Bar */}
                <div
                  style={{ height: `${salesHeightPercent}%` }}
                  className={`w-1/2 rounded-t-lg transition-all duration-300 ${
                    day.sales<0?'bg-red-500':isHovered
                      ? 'bg-emerald-600 shadow-md scale-y-105'
                      : 'bg-emerald-500 hover:bg-emerald-600'
                  }`}
                />

                {/* Profit Bar */}
                <div
                  style={{ height: `${profitHeightPercent}%` }}
                  className={`w-1/2 rounded-t-lg transition-all duration-300 ${
                    day.profit<0?'bg-red-500':isHovered
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
      </div>}
    </div>
  );
}
