import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowUturnLeftIcon,
  ArchiveBoxIcon,
  BarcodeIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentChartBarIcon,
  DocumentTextIcon,
  LockClosedIcon,
  StorefrontIcon,
  TruckIcon,
  UsersIcon,
  UserIcon,
} from '../common/Icons';

const SIDEBAR_OPEN_KEY = 'shamtouch:v1:sidebarOpen';
const AUTO_CLOSED_PATHS = ['/sales', '/shift'];
const EXPANDED_WIDTH = 216;

const MAIN_ITEMS = [
  {
    id: 'dashboard',
    label: 'لوحة التحكم',
    path: '/dashboard',
    icon: DocumentChartBarIcon,
    shortcut: 'F8',
  },
  {
    id: 'sales',
    label: 'نقطة البيع',
    path: '/sales',
    icon: StorefrontIcon,
    shortcut: 'F1',
  },
  {
    id: 'invoices',
    label: 'الفواتير',
    path: '/invoices',
    icon: DocumentTextIcon,
    shortcut: 'F2',
  },
  {
    id: 'inventory',
    label: 'المخزون',
    path: '/inventory',
    icon: ArchiveBoxIcon,
    shortcut: 'F3',
  },
  {
    id: 'purchases',
    label: 'المشتريات',
    path: '/purchases',
    icon: TruckIcon,
    shortcut: 'F5',
  },
  {
    id: 'customers',
    label: 'العملاء',
    path: '/customers',
    icon: UsersIcon,
    shortcut: 'F4',
  },
  {
    id: 'shift',
    label: 'الوردية والصندوق',
    path: '/shift',
    icon: LockClosedIcon,
  },
];

const QUICK_LINKS = [
  {
    id: 'returns',
    label: 'مرتجعات الفواتير',
    path: '/invoices?status=refunded',
    icon: ArrowUturnLeftIcon,
  },
  {
    id: 'labels',
    label: 'ملصقات الباركود',
    path: '/inventory?labels=1',
    icon: BarcodeIcon,
  },
  {
    id: 'suppliers',
    label: 'حسابات الموردين',
    path: '/purchases?view=suppliers',
    icon: BuildingOfficeIcon,
  },
  {
    id: 'companies',
    label: 'عملاء الشركات',
    path: '/customers?type=company',
    icon: BuildingOfficeIcon,
  },
];

function readSidebarOpen(pathname) {
  const stored = sessionStorage.getItem(SIDEBAR_OPEN_KEY);
  if (AUTO_CLOSED_PATHS.includes(pathname)) return false;
  if (stored === null) return true;
  return stored === 'true';
}

function isItemActive(item, pathname, search) {
  const [itemPath, itemQuery = ''] = item.path.split('?');
  if (pathname !== itemPath) return false;

  const current = new URLSearchParams(search);
  const expected = new URLSearchParams(itemQuery);

  if (!itemQuery) {
    if (current.toString() === '') return true;
    return !QUICK_LINKS.some((quick) => quick.path.startsWith(`${pathname}?`)
      && quick.path === `${pathname}${search}`);
  }

  if (current.toString() !== expected.toString()) return false;
  return true;
}

export function Sidebar({
  storeSettings = {},
  cashier = 'سامر النجار',
  shiftStatus = 'open',
  invoicesCount = 0,
}) {
  const location = useLocation();
  const [sidebarState, setSidebarState] = useState(() => ({
    open: readSidebarOpen(location.pathname),
    pathname: location.pathname,
  }));

  if (sidebarState.pathname !== location.pathname) {
    setSidebarState({
      open: readSidebarOpen(location.pathname),
      pathname: location.pathname,
    });
  }

  const isOpen = sidebarState.open;

  const toggle = () => {
    setSidebarState((state) => {
      const next = !state.open;
      sessionStorage.setItem(SIDEBAR_OPEN_KEY, String(next));
      return { ...state, open: next };
    });
  };

  const storeName = storeSettings?.storeName || 'شام تاتش';
  const logoEmoji = storeSettings?.logoEmoji || 'ش';
  const search = location.search || '';

  const renderLink = (item) => {
    const Icon = item.icon;
    const active = isItemActive(item, location.pathname, search);
    const isSales = item.id === 'sales' && invoicesCount > 0;

    return (
      <Link
        key={item.id}
        to={item.path}
        title={item.label}
        className={`group flex min-h-10 w-full shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
          active
            ? 'bg-[#00236f] text-white shadow-md'
            : 'text-[#444651] hover:bg-[#e2e8f8] hover:text-[#00236f]'
        }`}
      >
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${
            active ? 'text-white' : 'text-[#757682] group-hover:text-[#00236f]'
          }`}
        />
        <span className="flex-1 truncate text-right">{item.label}</span>

        {item.id === 'invoices' && invoicesCount > 0 && (
          <span
            className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
              active ? 'bg-white/20 text-white' : 'bg-[#dbe4ff] text-[#00236f]'
            }`}
          >
            {invoicesCount}
          </span>
        )}

        {isSales && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        )}

        {item.shortcut && (
          <kbd
            className={`hidden rounded border px-1 font-mono text-[9px] font-bold xl:block ${
              active
                ? 'border-white/30 text-white/70'
                : 'border-[#c5c5d3] text-[#9a9ba8]'
            }`}
          >
            {item.shortcut}
          </kbd>
        )}
      </Link>
    );
  };

  return (
    <div className="no-print relative z-20 h-full shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'إخفاء القائمة الجانبية' : 'إظهار القائمة الجانبية'}
        title={isOpen ? 'إخفاء القائمة' : 'إظهار القائمة'}
        className={`absolute top-3 z-0 flex h-10 w-7 items-center justify-center rounded-l-lg border border-r-0 border-[#c5c5d3] bg-white text-[#444651] shadow-md transition-colors hover:bg-[#f0f3ff] hover:text-[#00236f] ${
          isOpen ? '-left-5' : '-left-7'
        }`}
      >
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${
            isOpen ? '-rotate-90' : 'rotate-90'
          }`}
        />
      </button>

      <aside
        className={`relative z-10 flex h-full flex-col overflow-hidden border-[#c5c5d3] bg-[#eef3ff] transition-all duration-300 ${
          isOpen ? 'w-[216px] border-l' : 'w-0 border-l-0'
        }`}
        style={{ width: isOpen ? EXPANDED_WIDTH : 0 }}
      >
        <div className="flex h-full w-[216px] flex-col px-3 py-4">
          {/* Store identity */}
          <Link
            to="/dashboard"
            className="mb-4 flex shrink-0 items-center gap-3 rounded-xl border-b border-[#c5c5d3] px-1 pb-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#00236f] bg-white text-base font-black text-[#00236f] shadow-sm">
              {logoEmoji}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-[#00236f]">
                {storeName}
              </p>
              <p className="text-[10px] font-medium text-[#757682]">
                نظام نقاط البيع
              </p>
            </div>
          </Link>

          {/* Main navigation */}
          <nav className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain pb-2">
            <p className="px-3 pb-1 pt-1 text-[10px] font-bold text-[#9a9ba8]">
              القائمة الرئيسية
            </p>
            {MAIN_ITEMS.map(renderLink)}

            <div className="my-2 border-t border-[#c5c5d3]" />

            <p className="px-3 pb-1 text-[10px] font-bold text-[#9a9ba8]">
              اختصارات سريعة
            </p>
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item, location.pathname, search);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  title={item.label}
                  className={`group flex min-h-8 w-full shrink-0 items-center gap-3 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    active
                      ? 'bg-[#dbe4ff] text-[#00236f]'
                      : 'text-[#5c5e6b] hover:bg-[#e2e8f8] hover:text-[#00236f]'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? 'text-[#00236f]' : 'text-[#9a9ba8] group-hover:text-[#00236f]'
                    }`}
                  />
                  <span className="flex-1 truncate text-right">{item.label}</span>
                </Link>
              );
            })}

            <Link
              to="/settings"
              title="الإعدادات"
              className={`group mt-2 flex min-h-10 w-full shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
                location.pathname === '/settings'
                  ? 'bg-[#00236f] text-white shadow-md'
                  : 'text-[#444651] hover:bg-[#e2e8f8] hover:text-[#00236f]'
              }`}
            >
              <Cog6ToothIcon
                className={`h-[18px] w-[18px] shrink-0 ${
                  location.pathname === '/settings'
                    ? 'text-white'
                    : 'text-[#757682] group-hover:text-[#00236f]'
                }`}
              />
              <span className="flex-1 truncate text-right">الإعدادات</span>
              <kbd
                className={`hidden rounded border px-1 font-mono text-[9px] font-bold xl:block ${
                  location.pathname === '/settings'
                    ? 'border-white/30 text-white/70'
                    : 'border-[#c5c5d3] text-[#9a9ba8]'
                }`}
              >
                F6
              </kbd>
            </Link>
          </nav>

          {/* User + shift status */}
          <div className="mt-2 shrink-0 rounded-xl border border-[#c5c5d3] bg-white/70 p-2.5">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e2e8f8] text-[#00236f]">
                <UserIcon className="h-4 w-4" />
                <span
                  className={`absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                    shiftStatus === 'open' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold text-[#151c27]">
                  {cashier}
                </p>
                <p className="flex items-center gap-1 text-[10px] font-medium text-[#757682]">
                  <ClockIcon className="h-3 w-3" />
                  {shiftStatus === 'open' ? 'الوردية مفتوحة' : 'الوردية مغلقة'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
