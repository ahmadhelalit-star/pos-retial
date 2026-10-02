import { useState, useEffect, useRef } from 'react';
import {
  StorefrontIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ClockIcon,
  UserIcon,
  ArchiveBoxIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ArrowUturnLeftIcon,
  BarcodeIcon,
  CheckIcon,
  ChevronDownIcon,
  TruckIcon,
  Cog6ToothIcon,
  DocumentChartBarIcon,
} from './Icons';

export function Navbar({
  activeTab,
  onTabChange,
  invoicesCount = 0,
  shiftStatus = 'open',
  storeSettings = {},
}) {
  const [openMenu, setOpenMenu] = useState(null); // 'sales' | 'inventory' | 'purchases' | 'customers' | 'shift' | 'settings' | null
  const menuBarRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // تحديث الساعة الرقمية
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // إغلاق القوائم عند النقر بالخارج أو بالضغط على Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    }

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  // اختصارات لوحة المفاتيح
  useEffect(() => {
    function handleGlobalShortcuts(e) {
      if (e.key === 'F1') {
        e.preventDefault();
        onTabChange('sales');
        setOpenMenu(null);
      } else if (e.key === 'F2') {
        e.preventDefault();
        onTabChange('invoices');
        setOpenMenu(null);
      } else if (e.key === 'F3') {
        e.preventDefault();
        onTabChange('inventory');
        setOpenMenu(null);
      } else if (e.key === 'F4') {
        e.preventDefault();
        onTabChange('customers');
        setOpenMenu(null);
      } else if (e.key === 'F5') {
        e.preventDefault();
        onTabChange('purchases');
        setOpenMenu(null);
      } else if (e.key === 'F6') {
        e.preventDefault();
        onTabChange('settings');
        setOpenMenu(null);
      } else if (e.key === 'F8') {
        e.preventDefault();
        onTabChange('dashboard');
        setOpenMenu(null);
      }
    }
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [onTabChange]);

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

  // قوائم شريط القوائم
  const menus = [
    {
      id: 'dashboard',
      title: 'لوحة التحكم',
      primaryTab: 'dashboard',
      items: [
        {
          id: 'dash-analytics',
          label: 'مؤشرات الأداء والأرباح',
          icon: DocumentChartBarIcon,
          shortcut: 'F8',
          action: () => onTabChange('dashboard'),
          active: activeTab === 'dashboard',
        },
      ],
    },
    {
      id: 'sales',
      title: 'المبيعات',
      primaryTab: 'sales',
      items: [
        {
          id: 'sales-pos',
          label: 'شاشة الكاشير المباشرة',
          icon: StorefrontIcon,
          shortcut: 'F1',
          action: () => onTabChange('sales'),
          active: activeTab === 'sales',
        },
        {
          id: 'sales-list',
          label: 'سجل فواتير المبيعات',
          icon: DocumentTextIcon,
          shortcut: 'F2',
          badge: invoicesCount > 0 ? `${invoicesCount} فاتورة` : null,
          action: () => onTabChange('invoices'),
          active: activeTab === 'invoices',
        },
        {
          id: 'sales-returns',
          label: 'إدارة مرتجعات الفواتير',
          icon: ArrowUturnLeftIcon,
          action: () => onTabChange('invoices'),
          active: false,
        },
      ],
    },
    {
      id: 'inventory',
      title: 'المخزون',
      primaryTab: 'inventory',
      items: [
        {
          id: 'inv-list',
          label: 'قائمة الأصناف والأرصدة',
          icon: ArchiveBoxIcon,
          shortcut: 'F3',
          action: () => onTabChange('inventory'),
          active: activeTab === 'inventory',
        },
        {
          id: 'inv-labels',
          label: 'طباعة ملصقات الباركود',
          icon: BarcodeIcon,
          action: () => onTabChange('inventory'),
          active: false,
        },
      ],
    },
    {
      id: 'purchases',
      title: 'المشتريات والموردين',
      primaryTab: 'purchases',
      items: [
        {
          id: 'purchases-invoices',
          label: 'فواتير الشراء والتوريد',
          icon: TruckIcon,
          shortcut: 'F5',
          action: () => onTabChange('purchases'),
          active: activeTab === 'purchases',
        },
        {
          id: 'purchases-suppliers',
          label: 'دليل حسابات الموردين',
          icon: BuildingOfficeIcon,
          action: () => onTabChange('purchases'),
          active: false,
        },
      ],
    },
    {
      id: 'customers',
      title: 'العملاء',
      primaryTab: 'customers',
      items: [
        {
          id: 'cust-dir',
          label: 'دليل العملاء ونقاط الولاء',
          icon: UsersIcon,
          shortcut: 'F4',
          action: () => onTabChange('customers'),
          active: activeTab === 'customers',
        },
        {
          id: 'cust-b2b',
          label: 'حسابات المنشآت والشركات',
          icon: BuildingOfficeIcon,
          action: () => onTabChange('customers'),
          active: false,
        },
      ],
    },
    {
      id: 'shift',
      title: 'الوردية',
      primaryTab: 'shift',
      items: [
        {
          id: 'shift-panel',
          label: 'إدارة الوردية والصندوق المالي',
          icon: LockClosedIcon,
          action: () => onTabChange('shift'),
          active: activeTab === 'shift',
        },
        {
          id: 'shift-state',
          label: shiftStatus === 'open' ? 'حالة الوردية: مفتوحة' : 'حالة الوردية: مغلقة',
          icon: ClockIcon,
          badge: shiftStatus === 'open' ? 'نشطة' : 'مغلقة',
          action: () => onTabChange('shift'),
          active: false,
        },
      ],
    },
  ];

  // مسميات الصفحات باللغة العربية
  const activeTabLabels = {
    dashboard: 'لوحة التحكم والتحليلات',
    sales: 'نقطة البيع',
    invoices: 'الفواتير والمرتجعات',
    inventory: 'المخزون والمنتجات',
    purchases: 'المشتريات والموردين',
    customers: 'العملاء والولاء',
    shift: 'إغلاق الوردية',
    settings: 'إعدادات المتجر',
  };

  return (
    <nav className="bg-white border-b border-gray-200 select-none shadow-xs z-30">
      {/* شريط القوائم العلوي */}
      <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-100 bg-gray-50/70 text-xs">
        {/* الشعار وشريط القوائم */}
        <div className="flex items-center gap-2 sm:gap-4" ref={menuBarRef}>
          {/* شعار النظام - يعرض اسم/إيموجي المتجر من الإعدادات */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs overflow-hidden">
              {storeSettings?.logoEmoji || 'ش'}
            </div>
            <span className="font-black text-xs text-gray-900 tracking-tight hidden sm:inline">
              {storeSettings?.storeName || 'شام تاتش'}
            </span>
          </div>

          <div className="h-4 w-px bg-gray-300 mx-0.5 hidden sm:block shrink-0" />

          {/* أزرار القوائم المنسدلة: لوحة التحكم، المبيعات، المخزون، المشتريات، العملاء، الوردية */}
          <div className="flex items-center gap-1 shrink-0">
            {menus.map((menu) => {
              const isOpen = openMenu === menu.id;
              const isSectionActive =
                (menu.id === 'dashboard' && activeTab === 'dashboard') ||
                (menu.id === 'sales' && (activeTab === 'sales' || activeTab === 'invoices')) ||
                (menu.id === 'inventory' && activeTab === 'inventory') ||
                (menu.id === 'purchases' && activeTab === 'purchases') ||
                (menu.id === 'customers' && activeTab === 'customers') ||
                (menu.id === 'shift' && activeTab === 'shift');

              return (
                <div key={menu.id} className="relative">
                  <div
                    className={`flex items-center rounded-lg transition-all ${
                      isSectionActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200/80'
                    }`}
                  >
                    {/* النقر على اسم الصفحة ينتقل إليها فوراً */}
                    <button
                      type="button"
                      onClick={() => {
                        onTabChange(menu.primaryTab);
                        setOpenMenu(null);
                      }}
                      onMouseEnter={() => {
                        if (openMenu) {
                          setOpenMenu(menu.id);
                        }
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold cursor-pointer transition-colors"
                    >
                      {menu.title}
                    </button>

                    {/* زر السهم المنسدل يفتح الخيارات الفرعية */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(isOpen ? null : menu.id);
                      }}
                      title="الخيارات الفرعية"
                      className={`p-1.5 rounded-l-lg cursor-pointer transition-colors ${
                        isSectionActive
                          ? 'text-white/80 hover:text-white hover:bg-emerald-700'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <ChevronDownIcon
                        className={`w-3 h-3 transition-transform duration-150 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* نافذة القائمة المنسدلة */}
                  {isOpen && (
                    <div className="absolute top-full mt-1.5 right-0 min-w-[220px] bg-white rounded-xl shadow-2xl border border-gray-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-75">
                      {menu.items.map((item, idx) => {
                        if (item.divider) {
                          return (
                            <div
                              key={`div-${idx}`}
                              className="my-1 border-t border-gray-100"
                            />
                          );
                        }

                        const Icon = item.icon;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              item.action();
                              setOpenMenu(null);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-right ${
                              item.active
                                ? 'bg-emerald-50 text-emerald-900 font-bold'
                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {Icon && (
                                <Icon
                                  className={`w-4 h-4 ${
                                    item.active ? 'text-emerald-600' : 'text-gray-400'
                                  }`}
                                />
                              )}
                              <span>{item.label}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {item.badge && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-emerald-100 text-emerald-800 font-bold">
                                  {item.badge}
                                </span>
                              )}
                              {item.shortcut && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-gray-100 text-gray-500 border border-gray-200">
                                  {item.shortcut}
                                </span>
                              )}
                              {item.active && (
                                <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* الجانب الأيسر: شارة الصفحة الحالية والساعة والكاشير وزر الإعدادات */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* شارة توضيحية للصفحة النشطة حالياً */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{activeTabLabels[activeTab] || activeTab}</span>
          </div>

          {/* الساعة والتاريخ */}
          <div className="hidden lg:flex items-center gap-1.5 text-gray-500 font-mono text-[11px]">
            <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
            <span>{dateString}</span>
            <span>-</span>
            <span className="font-bold text-gray-800">{timeString}</span>
          </div>

          {/* زر الإعدادات السريع */}
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            title="إعدادات المتجر (F6)"
            className={`p-1.5 rounded-lg transition-colors cursor-pointer border text-[10px] font-bold flex items-center gap-1 ${
              activeTab === 'settings'
                ? 'bg-gray-700 text-white border-gray-700 shadow-xs'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Cog6ToothIcon className={`w-3.5 h-3.5 ${activeTab === 'settings' ? 'text-white' : 'text-gray-500'}`} />
            <span className="hidden sm:inline">إعدادات</span>
            <span className="hidden lg:inline text-[9px] opacity-60">F6</span>
          </button>

          {/* شارة الكاشير */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-2 py-1 rounded-lg text-xs">
            <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-bold text-gray-800">سامر النجار</span>
          </div>
        </div>
      </div>
    </nav>
  );
}