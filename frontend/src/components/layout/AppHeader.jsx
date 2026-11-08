import { translateUI as t,useLocale } from "../../runtime/i18n.js";
import { useCallback, useEffect, useState } from 'react';
import {
  ArchiveBoxIcon,
  ArrowsPointingOutIcon,
  ClockIcon,
  DocumentChartBarIcon,
  DocumentTextIcon,
  LockClosedIcon,
  StorefrontIcon,
  TruckIcon,
  UserIcon,
  UsersIcon,
} from '../common/Icons';

const PAGE_META = {
  operations: {title:'النسخ والاستعادة',subtitle:'تشغيل السيرفر والنسخ الآمن',icon:DocumentChartBarIcon},
  devices: {title:'الجهاز والطابعات',subtitle:'إعدادات هذه المحطة',icon:DocumentChartBarIcon},
  orders: {title:'أوامر البيع',subtitle:'عروض الأسعار والتسليم والفوترة',icon:DocumentTextIcon},
  payments: {title:'السندات',subtitle:'القبض والصرف والتخصيص',icon:DocumentTextIcon},
  'purchase-history': {title:'سجل الشراء',subtitle:'فواتير الشراء والمرتجعات',icon:TruckIcon},
  'admin/modules': { title: 'الوحدات الإضافية', subtitle: 'الترخيص وإعدادات النشاط', icon: DocumentChartBarIcon },
  'admin/users': { title: 'المستخدمون', subtitle: 'حسابات مستخدمي Retail', icon: UsersIcon },
  'admin/roles': { title: 'الأدوار والصلاحيات', subtitle: 'الصلاحيات المطبقة من الخادم', icon: UsersIcon },
  'admin/import': { title: 'استيراد نسخة', subtitle: 'فحص نسخة الكتالوج واستيرادها', icon: ArchiveBoxIcon },
  dashboard: {
    title: 'لوحة التحكم',
    subtitle: 'نظرة عامة على الأداء والمبيعات والأرباح',
    icon: DocumentChartBarIcon,
  },
  sales: {
    title: 'نقطة البيع',
    subtitle: 'شاشة الكاشير المباشرة',
    icon: StorefrontIcon,
  },
  invoices: {
    title: 'الفواتير والمرتجعات',
    subtitle: 'سجل فواتير المبيعات وإدارة المرتجعات',
    icon: DocumentTextIcon,
  },
  inventory: {
    title: 'المخزون والمنتجات',
    subtitle: 'الأصناف والأرصدة وملصقات الباركود',
    icon: ArchiveBoxIcon,
  },
  purchases: {
    title: 'المشتريات والموردين',
    subtitle: 'فواتير الشراء وحسابات الموردين',
    icon: TruckIcon,
  },
  customers: {
    title: 'العملاء والولاء',
    subtitle: 'دليل العملاء والأرصدة ونقاط الولاء',
    icon: UsersIcon,
  },
  shift: {
    title: 'الوردية والصندوق',
    subtitle: 'إدارة الوردية والإغلاق المالي',
    icon: LockClosedIcon,
  },
  settings: {
    title: 'إعدادات المتجر',
    subtitle: 'بيانات المتجر والفاتورة والضرائب',
    icon: DocumentChartBarIcon,
  },
};

const SHORTCUTS = {
  F1: 'sales',
  F2: 'invoices',
  F3: 'inventory',
  F4: 'customers',
  F5: 'purchases',
  F6: 'settings',
  F8: 'dashboard',
};

export function AppHeader({
  activeTab = 'sales',
  shift = {},
  cashier = 'سامر النجار',
  onTabChange,
  searchSlotRef,
}) {
  useLocale();
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isFullscreen, setIsFullscreen] = useState(
    () => Boolean(document.fullscreenElement || document.webkitFullscreenElement)
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateFullscreen = () =>
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));

    document.addEventListener('fullscreenchange', updateFullscreen);
    document.addEventListener('webkitfullscreenchange', updateFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreen);
      document.removeEventListener('webkitfullscreenchange', updateFullscreen);
    };
  }, []);

  useEffect(() => {
    const handleShortcuts = (event) => {
      const tab = SHORTCUTS[event.key];
      if (!tab) return;
      event.preventDefault();
      onTabChange?.(tab);
    };

    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [onTabChange]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) await exit.call(document);
        return;
      }
      const request = document.documentElement.requestFullscreen
        || document.documentElement.webkitRequestFullscreen;
      if (request) await request.call(document.documentElement);
    } catch {
      // Some browsers reject fullscreen requests; keep the UI unchanged.
    }
  }, []);

  const meta = PAGE_META[activeTab] || PAGE_META.sales;
  const PageIcon = meta.icon;
  const isShiftOpen = shift.status === 'open';

  const timeString = currentTime.toLocaleTimeString(document.documentElement.lang==='en'?'en-GB':'ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = currentTime.toLocaleDateString(document.documentElement.lang==='en'?'en-GB':'ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="no-print grid min-h-16 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#c5c5d3] bg-white px-3 py-2 sm:gap-3 lg:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0f3ff] text-[#00236f] sm:flex">
          <PageIcon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 max-w-[150px] lg:max-w-[230px]">
          <h1 className="truncate text-sm font-bold leading-5 text-[#00236f] sm:text-base sm:leading-6">
            {t(meta.title)}
          </h1>
          <p className="hidden truncate text-xs font-medium text-[#757682] xl:block">
            {t(meta.subtitle)}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-center px-1 sm:px-2">
        <div ref={searchSlotRef} className="w-full max-w-[540px]" />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => onTabChange?.('shift')}
          title={isShiftOpen ? 'إدارة الوردية الحالية' : 'فتح وردية جديدة'}
          className={`flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold transition-colors ${
            isShiftOpen
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isShiftOpen ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
          <span className="hidden sm:inline">
            {isShiftOpen ? `وردية #${shift.id || '—'}` : 'الوردية مغلقة'}
          </span>
          <LockClosedIcon className="h-3.5 w-3.5 sm:hidden" />
        </button>

        <div className="hidden items-center gap-1.5 rounded-full bg-[#f0f3ff] px-3 py-1.5 text-xs font-medium text-[#444651] md:flex">
          <ClockIcon className="h-3.5 w-3.5 text-[#00236f]" />
          <span className="hidden text-[#757682] xl:inline">{dateString}</span>
          <span className="font-mono font-bold tabular-nums text-[#00236f]">
            {timeString}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
          aria-label={isFullscreen ? 'الخروج من ملء الشاشة' : 'الدخول إلى ملء الشاشة'}
          className="hidden h-8 w-8 items-center justify-center rounded-full text-[#444651] transition-colors hover:bg-[#f0f3ff] hover:text-[#00236f] md:flex"
        >
          <ArrowsPointingOutIcon className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 rounded-full bg-[#f0f3ff] py-1 pl-3 pr-1">
          <div className="hidden text-left sm:block">
            <p className="text-xs font-bold leading-4 text-[#00236f]">{cashier}</p>
            <p className="text-[11px] font-medium leading-3 text-[#757682]">{t("كاشير")}</p>
          </div>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#00236f] shadow-sm">
            <UserIcon className="h-4 w-4" />
          </span>
        </div>
      </div>
    </header>
  );
}
