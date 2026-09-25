import { useState, useEffect, useRef } from 'react';
import {
  StorefrontIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ClockIcon,
  UserIcon,
  ArchiveBoxIcon,
  UsersIcon,
  ChevronDownIcon,
  Bars3Icon,
  CheckIcon,
} from './Icons';

export function Navbar({
  activeTab,
  onTabChange,
  invoicesCount = 0,
  shiftStatus = 'open',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // إغلاق القائمة المنسدلة عند النقر خارجها أو الضغط على Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

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

  const navItems = [
    {
      id: 'sales',
      title: 'نقطة البيع (POS)',
      description: 'شاشة تسجيل المبيعات والسلة السريعة',
      icon: StorefrontIcon,
      badge: null,
    },
    {
      id: 'invoices',
      title: 'الفواتير والمرتجعات',
      description: 'سجل المبيعات، الاسترجاع، والطباعة',
      icon: DocumentTextIcon,
      badge: invoicesCount > 0 ? `${invoicesCount} فاتورة` : null,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'inventory',
      title: 'المخزون والمنتجات',
      description: 'الكميات، الأسعار، وتوليد الباركود',
      icon: ArchiveBoxIcon,
      badge: null,
    },
    {
      id: 'customers',
      title: 'العملاء والولاء',
      description: 'حسابات الآجل، نقاط المكافآت، وشركات B2B',
      icon: UsersIcon,
      badge: null,
    },
    {
      id: 'shift',
      title: 'إغلاق الوردية (Z)',
      description: 'جرد الصندوق المالي والتقرير النهائي',
      icon: LockClosedIcon,
      badge: shiftStatus === 'open' ? 'مفتوحة' : 'مغلقة',
      badgeColor:
        shiftStatus === 'open'
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-gray-100 text-gray-700',
    },
  ];

  const currentItem = navItems.find((item) => item.id === activeTab) || navItems[0];
  const CurrentIcon = currentItem.icon;

  const handleSelectItem = (id) => {
    onTabChange(id);
    setIsOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between select-none shadow-xs z-30">
      {/* Brand & Dropdown Navigation Menu */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* Brand Logo */}
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

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        {/* Dropdown Navigation Menu Component */}
        <div className="relative" ref={dropdownRef}>
          {/* Dropdown Trigger Button */}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isOpen
                ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs ring-2 ring-emerald-500/10'
                : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800'
            }`}
          >
            <div className="flex items-center gap-1.5 text-gray-500">
              <Bars3Icon className="w-4 h-4 text-emerald-600" />
              <span className="hidden md:inline text-[11px] text-gray-400 font-normal">
                القائمة:
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-bold text-gray-900">
              <CurrentIcon className="w-4 h-4 text-emerald-600" />
              <span>{currentItem.title}</span>
            </div>

            {/* Badge on button if applicable */}
            {currentItem.badge && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${currentItem.badgeColor || 'bg-gray-200 text-gray-800'}`}>
                {currentItem.badge}
              </span>
            )}

            <ChevronDownIcon
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-emerald-600' : ''
              }`}
            />
          </button>

          {/* Floating Dropdown Menu Panel */}
          {isOpen && (
            <div className="absolute top-full mt-2 right-0 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200/90 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-gray-100 mb-1">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  أقسام النظام
                </p>
              </div>

              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectItem(item.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-right ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/80 shadow-xs'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 leading-tight">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-gray-400 font-normal mt-0.5 line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                              item.badgeColor || 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {isSelected && (
                          <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-gray-100 px-3 py-1 flex items-center justify-between text-[11px] text-gray-400">
                <span>اضغط Esc أو انقر بالخارج للإغلاق</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Back to POS Button (when not currently in POS) */}
        {activeTab !== 'sales' && (
          <button
            type="button"
            onClick={() => onTabChange('sales')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="العودة السريعة لشاشة البيع"
          >
            <StorefrontIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">نقطة البيع</span>
          </button>
        )}
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
