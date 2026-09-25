import { useState, useEffect } from 'react';
import {
  StorefrontIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ClockIcon,
  UserIcon,
  ArchiveBoxIcon,
} from './Icons';

export function Navbar({
  activeTab,
  onTabChange,
  invoicesCount = 0,
  shiftStatus = 'open',
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = currentTime.toLocaleDateString('ar-SA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between select-none shadow-xs z-30">
      {/* Brand & Tabs */}
      <div className="flex items-center gap-4 lg:gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-xs">
            ش
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-black text-gray-900 tracking-tight leading-tight">
              Sham Touch POS
            </h1>
            <p className="text-[10px] text-gray-400 font-bold">نقاط البيع والتجزئة</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200/80">
          {/* 1. POS */}
          <button
            type="button"
            onClick={() => onTabChange('sales')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <StorefrontIcon className="w-4 h-4" />
            <span>نقطة البيع (POS)</span>
          </button>

          {/* 2. Invoices & Returns */}
          <button
            type="button"
            onClick={() => onTabChange('invoices')}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>الفواتير والمرتجعات</span>
            {invoicesCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'invoices'
                    ? 'bg-white text-emerald-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {invoicesCount}
              </span>
            )}
          </button>

          {/* 3. Products & Inventory */}
          <button
            type="button"
            onClick={() => onTabChange('inventory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <ArchiveBoxIcon className="w-4 h-4" />
            <span>المخزون والمنتجات</span>
          </button>

          {/* 4. Shift Closing */}
          <button
            type="button"
            onClick={() => onTabChange('shift')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'shift'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <LockClosedIcon className="w-4 h-4" />
            <span>إغلاق الوردية (Z)</span>
          </button>
        </div>
      </div>

      {/* Right Side: Clock & Cashier Info */}
      <div className="flex items-center gap-3">
        {/* Live Clock */}
        <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700">
          <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
          <span>{dateString}</span>
          <span className="text-gray-300">|</span>
          <span className="font-mono text-emerald-700 font-bold">{timeString}</span>
        </div>

        {/* Cashier Badge */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1 rounded-xl">
          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-800 leading-tight">سامر النجار</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  shiftStatus === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                }`}
              ></span>
              <p className="text-[10px] text-gray-500">
                {shiftStatus === 'open' ? 'الوردية #102' : 'وردية مغلقة'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
