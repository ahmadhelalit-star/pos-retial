import {
  TruckIcon,
  BanknotesIcon,
  DocumentTextIcon,
  UsersIcon,
  ExclamationTriangleIcon,
} from '../../../components/common/Icons';

export function PurchasesSummaryCards({
  suppliers = [],
  purchaseInvoices = [],
}) {
  // إجمالي المشتريات
  const totalPurchases = purchaseInvoices.reduce(
    (sum, inv) => sum + (inv.grandTotal || 0),
    0
  );

  // إجمالي المستحقات للموردين (الديون)
  const totalPayables = suppliers.reduce(
    (sum, sup) => sum + (sup.balance || 0),
    0
  );

  // عدد الفواتير غير المسددة
  const unpaidInvoicesCount = purchaseInvoices.filter(
    (inv) => inv.paymentStatus === 'unpaid' || inv.paymentStatus === 'partial'
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-white border-b border-gray-200">
      {/* 1. إجمالي المشتريات */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 border border-indigo-200/80 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between text-indigo-700 mb-1">
          <span className="text-xs font-bold">إجمالي المشتريات والتوريدات</span>
          <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs">
            <TruckIcon className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-indigo-950 font-mono">
            {totalPurchases.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-xs font-bold text-indigo-600">ر.س</span>
        </div>
        <div className="mt-1 text-[11px] text-indigo-600 font-medium">
          عبر {purchaseInvoices.length} فاتورة توريد
        </div>
      </div>

      {/* 2. مستحقات الموردين (الآجل المطلوب سداده) */}
      <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200/80 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between text-amber-700 mb-1">
          <span className="text-xs font-bold">مستحقات الموردين (آجل)</span>
          <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-xs">
            <BanknotesIcon className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-amber-950 font-mono">
            {totalPayables.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-xs font-bold text-amber-600">ر.س</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 font-medium">
          {totalPayables > 0 ? (
            <>
              <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>مطلوب سدادها للموردين</span>
            </>
          ) : (
            <span className="text-emerald-600 font-bold">جميع المستحقات مسددة</span>
          )}
        </div>
      </div>

      {/* 3. فواتير بانتظار السداد */}
      <div className="bg-gradient-to-br from-rose-50 to-rose-100/40 border border-rose-200/80 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between text-rose-700 mb-1">
          <span className="text-xs font-bold">فواتير آجلة غير مسددة</span>
          <div className="p-1.5 bg-rose-500 text-white rounded-lg shadow-xs">
            <DocumentTextIcon className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-rose-950 font-mono">
            {unpaidInvoicesCount}
          </span>
          <span className="text-xs font-bold text-rose-600">فاتورة</span>
        </div>
        <div className="mt-1 text-[11px] text-rose-600 font-medium">
          تحتاج متابعة مع المورد
        </div>
      </div>

      {/* 4. عدد الموردين المعتمدين */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 border border-emerald-200/80 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between text-emerald-700 mb-1">
          <span className="text-xs font-bold">شبكة الموردين المعتمدين</span>
          <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-xs">
            <UsersIcon className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-emerald-950 font-mono">
            {suppliers.length}
          </span>
          <span className="text-xs font-bold text-emerald-600">مورد نشط</span>
        </div>
        <div className="mt-1 text-[11px] text-emerald-600 font-medium">
          شركات ومؤسسات توزيع
        </div>
      </div>
    </div>
  );
}
