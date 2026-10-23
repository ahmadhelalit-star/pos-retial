import { CreditCardIcon, BanknotesIcon, UsersIcon } from '../../../components/common/Icons';

export function PaymentMethodsChart({
  paymentBreakdown = {},
  totalSales = 0,
  currency = 'ر.س',
}) {
  const methods = [
    {
      id: 'card',
      label: 'شبكة / مدى وبطاقات',
      amount: paymentBreakdown.card?.amount || 0,
      count: paymentBreakdown.card?.count || 0,
      icon: CreditCardIcon,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
    },
    {
      id: 'cash',
      label: 'نقدي (كاش)',
      amount: paymentBreakdown.cash?.amount || 0,
      count: paymentBreakdown.cash?.count || 0,
      icon: BanknotesIcon,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
    },
    {
      id: 'credit',
      label: 'آجل / حسابات عملاء',
      amount: paymentBreakdown.credit?.amount || 0,
      count: paymentBreakdown.credit?.count || 0,
      icon: UsersIcon,
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
      <div className="mb-4">
        <h3 className="text-xs font-black text-gray-900 mb-0.5">
          توزيع المبيعات حسب طرق الدفع
        </h3>
        <p className="text-xs text-gray-500">
          نسبة المبيعات النقدية والإلكترونية والآجلة
        </p>
      </div>

      {/* Combined Horizontal Multi-bar */}
      <div className="w-full h-3 rounded-full bg-gray-100 flex overflow-hidden mb-5">
        {methods.map((m) => {
          const pct = totalSales > 0 ? (m.amount / totalSales) * 100 : 0;
          if (pct <= 0) return null;
          return (
            <div
              key={m.id}
              style={{ width: `${pct}%` }}
              title={`${m.label}: ${pct.toFixed(1)}%`}
              className={`${m.color} transition-all duration-300 hover:opacity-90`}
            />
          );
        })}
      </div>

      {/* Detailed Items List */}
      <div className="space-y-3">
        {methods.map((m) => {
          const pct = totalSales > 0 ? (m.amount / totalSales) * 100 : 0;
          const Icon = m.icon;

          return (
            <div
              key={m.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${m.bgColor} ${m.textColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-800">{m.label}</div>
                  <div className="text-[11px] text-gray-500">
                    {m.count} عملية بيع
                  </div>
                </div>
              </div>

              <div className="text-left">
                <div className="text-xs font-black font-mono text-gray-900">
                  {m.amount.toFixed(2)} {currency}
                </div>
                <div className={`text-[11px] font-bold font-mono ${m.textColor}`}>
                  {pct.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
