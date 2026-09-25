import {
  UsersIcon,
  WalletIcon,
  GiftIcon,
  BuildingOfficeIcon,
} from '../../../components/common/Icons';

export function CustomerSummaryCards({ customers = [] }) {
  // الحسابات الإحصائية
  const totalCustomers = customers.filter((c) => c.id !== 'walk-in').length;
  const corporateCount = customers.filter((c) => c.type === 'company').length;
  const totalReceivables = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + (c.points || 0), 0);
  const debtorsCount = customers.filter((c) => (c.balance || 0) > 0).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white border-b border-gray-200">
      {/* 1. إجمالي العملاء */}
      <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-emerald-800">العملاء المسجلون</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-950 font-mono">
              {totalCustomers}
            </span>
            <span className="text-xs text-emerald-700">عميل</span>
          </div>
          <p className="text-[11px] text-emerald-600 mt-0.5">
            منهم {corporateCount} منشآت وشركات B2B
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
          <UsersIcon className="w-5 h-5" />
        </div>
      </div>

      {/* 2. إجمالي الذمم المدينة (الآجل) */}
      <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
        totalReceivables > 0 
          ? 'bg-amber-50/70 border-amber-200' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div>
          <p className="text-xs font-semibold text-amber-800">الذمم والآجل المستحق</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-amber-950 font-mono">
              {totalReceivables.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-amber-700 font-bold">ر.س</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-0.5">
            على {debtorsCount} عملاء مدينين
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
          <WalletIcon className="w-5 h-5" />
        </div>
      </div>

      {/* 3. منشآت وشركات B2B */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-800">حسابات الشركات (B2B)</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-blue-950 font-mono">
              {corporateCount}
            </span>
            <span className="text-xs text-blue-700">شركة</span>
          </div>
          <p className="text-[11px] text-blue-600 mt-0.5">
            مفعلة بالفواتير الضريبية
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center">
          <BuildingOfficeIcon className="w-5 h-5" />
        </div>
      </div>

      {/* 4. رصيد نقاط الولاء */}
      <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-purple-800">إجمالي نقاط الولاء</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-purple-950 font-mono">
              {totalLoyaltyPoints.toLocaleString('ar-SA')}
            </span>
            <span className="text-xs text-purple-700">نقطة</span>
          </div>
          <p className="text-[11px] text-purple-600 mt-0.5">
            قابلة للاستبدال كخصومات بيع
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center">
          <GiftIcon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
