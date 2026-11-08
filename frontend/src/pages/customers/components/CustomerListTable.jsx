import {
  UserIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  GiftIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentTextIcon,
} from '../../../components/common/Icons';

export function CustomerListTable({
  customers = [],
  onEditCustomer,
  onDeleteCustomer,
  onOpenStatement,
}) {
  if (customers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50/50">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mb-3">
          <UserIcon className="w-8 h-8" />
        </div>
        <p className="font-bold text-gray-800 text-sm">لا يوجد عملاء يطابقون خيارات البحث</p>
        <p className="text-xs text-gray-500 mt-1">جرّب تغيير عبارة البحث أو الفلتر المحدد</p>
      </div>
    );
  }

  return (
    <>
      {/* ── MOBILE CARD LIST (< md) ── */}
      <div className="block md:hidden space-y-0">
        {customers.map((c) => {
          const isWalkIn = c.id === 'walk-in';
          const isCompany = c.type === 'company';
          const hasDebt = (c.balance || 0) > 0;
          const creditPct = c.creditLimit > 0
            ? Math.min(100, Math.round(((c.balance || 0) / c.creditLimit) * 100))
            : 0;

          return (
            <div
              key={c.id}
              className="p-3 bg-white border border-gray-200 rounded-2xl mb-2 mx-4"
            >
              {/* Row 1: Customer name + type badge */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isWalkIn
                        ? 'bg-gray-100 text-gray-600'
                        : isCompany
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {isCompany ? (
                      <BuildingOfficeIcon className="w-4 h-4" />
                    ) : (
                      <UserIcon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{c.name}</span>
                </div>
                {isWalkIn ? (
                  <span className="text-[11px] bg-gray-100 text-gray-600 font-semibold px-1.5 py-0.5 rounded">
                    افتراضي
                  </span>
                ) : isCompany ? (
                  <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 font-bold px-1.5 py-0.5 rounded-md">
                    شركة B2B
                  </span>
                ) : (
                  <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-1.5 py-0.5 rounded-md">
                    فرد
                  </span>
                )}
              </div>

              {/* Row 2: Phone number */}
              <div className="mb-1.5">
                {c.phone ? (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-gray-700">
                    <PhoneIcon className="w-3.5 h-3.5 text-gray-500" />
                    <span dir="ltr">{c.phone}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">لا يوجد رقم تواصل</span>
                )}
              </div>

              {/* Row 3: Balance + loyalty points */}
              <div className="flex items-center justify-between mb-2.5">
                {/* Balance */}
                <div>
                  {isWalkIn ? (
                    <span className="text-xs text-gray-500">غير متاح للعام</span>
                  ) : hasDebt ? (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-amber-700 font-mono text-sm">
                          {c.balance.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-amber-800 font-bold">ر.س</span>
                      </div>
                      {c.creditLimit > 0 && (
                        <div className="w-24 bg-gray-200 h-1.5 rounded-full overflow-hidden mt-0.5">
                          <div
                            className={`h-full rounded-full ${
                              creditPct > 80 ? 'bg-red-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${creditPct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                      خالص الذمة (0.00)
                    </span>
                  )}
                </div>

                {/* Loyalty points */}
                {!isWalkIn && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <GiftIcon className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-bold text-purple-900 font-mono text-xs">
                      {c.points || 0}
                    </span>
                    <span className="text-[11px] text-purple-600">نقطة</span>
                  </div>
                )}
              </div>

              {/* Row 4: Action buttons */}
              {!isWalkIn && (
                <div className="flex items-center gap-1.5">
                  {/* Statement & Payment */}
                  <button
                    type="button"
                    onClick={() => onOpenStatement(c)}
                    title="كشف حساب وسداد دفعات"
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer border border-gray-200"
                  >
                    <DocumentTextIcon className="w-3.5 h-3.5" />
                    <span>كشف / سداد</span>
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => onEditCustomer(c)}
                    title="تعديل بيانات العميل"
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => {
                      if (c.balance > 0) {
                        alert(`لا يمكن حذف العميل لأن عليه رصيد آجل مستحق بقيمة ${c.balance} ر.س`);
                        return;
                      }
                      if (confirm(`هل أنت متأكد من حذف العميل "${c.name}"؟`)) {
                        onDeleteCustomer(c.id);
                      }
                    }}
                    title="حذف العميل"
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP TABLE (>= md) ── */}
      <div className="hidden md:flex flex-1 overflow-auto bg-gray-50/40">
        <div className="min-w-[900px] w-full">
          <table className="w-full text-right text-xs">
            <thead className="bg-gray-100/80 text-gray-600 font-bold border-b border-gray-200 sticky top-0 z-10 backdrop-blur-xs">
              <tr>
                <th className="py-3 px-4">العميل / المنشأة</th>
                <th className="py-3 px-4">رقم التواصل</th>
                <th className="py-3 px-4">الرقم الضريبي (B2B)</th>
                <th className="py-3 px-4">الرصيد الآجل (الذمم)</th>
                <th className="py-3 px-4">نقاط الولاء</th>
                <th className="py-3 px-4">إجمالي المشتريات</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/80 bg-white">
              {customers.map((c) => {
                const isWalkIn = c.id === 'walk-in';
                const isCompany = c.type === 'company';
                const hasDebt = (c.balance || 0) > 0;
                const creditPct = c.creditLimit > 0
                  ? Math.min(100, Math.round(((c.balance || 0) / c.creditLimit) * 100))
                  : 0;

                return (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Name & Type */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isWalkIn
                              ? 'bg-gray-100 text-gray-600'
                              : isCompany
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isCompany ? (
                            <BuildingOfficeIcon className="w-5 h-5" />
                          ) : (
                            <UserIcon className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 text-xs">{c.name}</span>
                            {isWalkIn ? (
                              <span className="text-[11px] bg-gray-100 text-gray-600 font-semibold px-1.5 py-0.5 rounded">
                                افتراضي
                              </span>
                            ) : isCompany ? (
                              <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 font-bold px-1.5 py-0.2 rounded-md">
                                شركة B2B
                              </span>
                            ) : (
                              <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-1.5 py-0.2 rounded-md">
                                فرد
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                            {c.address || c.email || (isWalkIn ? 'مبيعات الكاش المباشرة' : 'لا يوجد عنوان')}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 font-mono text-gray-700">
                      {c.phone ? (
                        <div className="flex items-center gap-1.5">
                          <PhoneIcon className="w-3.5 h-3.5 text-gray-500" />
                          <span dir="ltr">{c.phone}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 font-sans">-</span>
                      )}
                    </td>

                    {/* Tax Number */}
                    <td className="py-3 px-4 font-mono">
                      {c.taxNumber ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="text-gray-800 font-bold tracking-wider text-xs">
                            {c.taxNumber}
                          </span>
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.2 rounded font-sans">
                            ضريبة القيمة المضافة
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 font-sans">-</span>
                      )}
                    </td>

                    {/* Debt / Credit Balance */}
                    <td className="py-3 px-4">
                      {isWalkIn ? (
                        <span className="text-gray-500 font-sans">غير متاح للعام</span>
                      ) : hasDebt ? (
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-1">
                            <span className="font-bold text-amber-700 font-mono text-sm">
                              {c.balance.toFixed(2)}
                            </span>
                            <span className="text-[11px] text-amber-800 font-bold">ر.س</span>
                          </div>
                          {c.creditLimit > 0 && (
                            <div className="w-28 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  creditPct > 80 ? 'bg-red-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${creditPct}%` }}
                              />
                            </div>
                          )}
                          <p className="text-[11px] text-gray-500">
                            الحد: {c.creditLimit.toLocaleString('ar-SA')} ر.س
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                          خالص الذمة (0.00)
                        </span>
                      )}
                    </td>

                    {/* Loyalty Points */}
                    <td className="py-3 px-4">
                      {isWalkIn ? (
                        <span className="text-gray-500 font-sans">-</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                            <GiftIcon className="w-3.5 h-3.5" />
                          </span>
                          <span className="font-bold text-purple-900 font-mono text-xs">
                            {c.points || 0}
                          </span>
                          <span className="text-[11px] text-purple-600">نقطة</span>
                        </div>
                      )}
                    </td>

                    {/* Total Purchases */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-gray-900 font-semibold">
                        {(c.totalPurchases || 0).toLocaleString('ar-SA', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        <span className="text-[11px] font-sans text-gray-500 font-normal">ر.س</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {c.invoicesCount || 0} فاتورة سابقة
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Statement & Payment Button */}
                        {!isWalkIn && (
                          <button
                            type="button"
                            onClick={() => onOpenStatement(c)}
                            title="كشف حساب وسداد دفعات"
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer border border-gray-200"
                          >
                            <DocumentTextIcon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">كشف / سداد</span>
                          </button>
                        )}

                        {/* Edit Button */}
                        {!isWalkIn && (
                          <button
                            type="button"
                            onClick={() => onEditCustomer(c)}
                            title="تعديل بيانات العميل"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete Button */}
                        {!isWalkIn && (
                          <button
                            type="button"
                            onClick={() => {
                              if (c.balance > 0) {
                                alert(`لا يمكن حذف العميل لأن عليه رصيد آجل مستحق بقيمة ${c.balance} ر.س`);
                                return;
                              }
                              if (confirm(`هل أنت متأكد من حذف العميل "${c.name}"؟`)) {
                                onDeleteCustomer(c.id);
                              }
                            }}
                            title="حذف العميل"
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
