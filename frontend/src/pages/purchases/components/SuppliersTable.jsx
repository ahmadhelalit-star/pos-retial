import {
  DocumentTextIcon,
  BanknotesIcon,
  PencilSquareIcon,
  TrashIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  UserIcon,
} from '../../../components/common/Icons';

export function SuppliersTable({
  suppliers = [],
  onEditSupplier,
  onDeleteSupplier,
  onOpenStatement,
  onPaySupplier,
}) {
  if (suppliers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white m-3 rounded-2xl border border-gray-200">
        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
          <BuildingOfficeIcon className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-black text-gray-800 mb-1">
          لم يتم العثور على موردين
        </h3>
        <p className="text-xs text-gray-500 max-w-sm">
          أضف مورديك وشركات التوزيع للبدء في تتبع فواتير التوريد والمديونيات.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:hidden">
        {suppliers.map((sup) => {
          const hasBalance = (sup.balance || 0) > 0;

          return (
            <div
              key={sup.id}
              className="rounded-2xl border border-gray-200 bg-white p-3 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-700">
                    {sup.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {sup.name}
                    </p>
                    {sup.companyName && (
                      <p className="truncate text-xs text-gray-500">
                        {sup.companyName}
                      </p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                  {sup.category || 'عام'}
                </span>
              </div>

              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {sup.contactPerson && (
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5 text-gray-500" />
                      <span>{sup.contactPerson}</span>
                    </span>
                  )}
                  {sup.phone && (
                    <span className="inline-flex items-center gap-1">
                      <PhoneIcon className="h-3.5 w-3.5 text-emerald-600" />
                      <span dir="ltr" className="font-mono">
                        {sup.phone}
                      </span>
                    </span>
                  )}
                  {sup.taxNumber && (
                    <span className="font-mono">
                      ضريبي: {sup.taxNumber}
                    </span>
                  )}
                </div>
                {sup.email && (
                  <p className="max-w-full truncate text-gray-500">
                    {sup.email}
                  </p>
                )}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-500">
                    الرصيد المستحق
                  </p>
                  <p className="whitespace-nowrap">
                    <span
                      className={`font-mono text-sm font-bold ${
                        hasBalance ? 'text-amber-700' : 'text-gray-600'
                      }`}
                    >
                      {(sup.balance || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="mr-1 text-xs font-bold text-gray-500">
                      ر.س
                    </span>
                  </p>
                  <p
                    className={`text-[11px] font-bold ${
                      hasBalance ? 'text-amber-600' : 'text-gray-500'
                    }`}
                  >
                    {hasBalance ? 'مستحق للمورد' : 'لا يوجد مستحق'}
                  </p>
                </div>
                <div className="min-w-0 border-r border-gray-200 pr-2">
                  <p className="text-[11px] font-bold text-gray-500">
                    إجمالي التوريدات
                  </p>
                  <p className="whitespace-nowrap">
                    <span className="font-mono text-sm font-bold text-gray-900">
                      {(sup.totalPurchases || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="mr-1 text-xs font-bold text-gray-500">
                      ر.س
                    </span>
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {sup.invoicesCount || 0} فاتورة
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-gray-100 pt-2">
                <button
                  type="button"
                  onClick={() => onOpenStatement(sup)}
                  title="كشف حساب المورد"
                  className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  <span>كشف</span>
                </button>

                {hasBalance && (
                  <button
                    type="button"
                    onClick={() => onPaySupplier(sup)}
                    title="سداد دفعة للمورد"
                    className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 cursor-pointer"
                  >
                    <BanknotesIcon className="h-3.5 w-3.5" />
                    <span>سداد</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onEditSupplier(sup)}
                  title="تعديل بيانات المورد"
                  className="rounded-lg bg-gray-100 p-1.5 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 cursor-pointer"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `هل أنت متأكد من حذف المورد "${sup.name}"؟`
                      )
                    ) {
                      onDeleteSupplier(sup.id);
                    }
                  }}
                  title="حذف المورد"
                  className="rounded-lg bg-gray-100 p-1.5 text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden xl:block bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-right text-xs">
          <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 select-none">
            <tr>
              <th className="py-3 px-3.5">المورد والشركة</th>
              <th className="py-3 px-3.5">مسؤول التواصل</th>
              <th className="py-3 px-3.5">الهاتف والتواصل</th>
              <th className="py-3 px-3.5">الرقم الضريبي</th>
              <th className="py-3 px-3.5">التصنيف</th>
              <th className="py-3 px-3.5">الرصيد المستحق (دائن)</th>
              <th className="py-3 px-3.5">إجمالي التوريدات</th>
              <th className="py-3 px-3.5 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers.map((sup) => {
              const hasBalance = (sup.balance || 0) > 0;

              return (
                <tr
                  key={sup.id}
                  className="hover:bg-gray-50/80 transition-colors group"
                >
                  {/* المورد والشركة */}
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {sup.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-xs">
                          {sup.name}
                        </div>
                        {sup.companyName && (
                          <div className="text-xs text-gray-500">
                            {sup.companyName}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* مسؤول التواصل */}
                  <td className="py-3 px-3.5">
                    {sup.contactPerson ? (
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <UserIcon className="w-3.5 h-3.5 text-gray-500" />
                        <span>{sup.contactPerson}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>

                  {/* الهاتف */}
                  <td className="py-3 px-3.5">
                    <div className="flex flex-col gap-0.5 font-mono text-gray-700">
                      {sup.phone ? (
                        <div className="flex items-center gap-1">
                          <PhoneIcon className="w-3 h-3 text-emerald-600" />
                          <span dir="ltr">{sup.phone}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                      {sup.email && (
                        <div className="text-xs text-gray-500 font-sans truncate max-w-[140px]">
                          {sup.email}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* الرقم الضريبي */}
                  <td className="py-3 px-3.5 font-mono text-gray-600">
                    {sup.taxNumber || (
                      <span className="text-gray-500 font-sans">غير مسجل</span>
                    )}
                  </td>

                  {/* التصنيف */}
                  <td className="py-3 px-3.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {sup.category || 'عام'}
                    </span>
                  </td>

                  {/* الرصيد المستحق للمورد */}
                  <td className="py-3 px-3.5">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`font-mono font-bold text-sm ${
                          hasBalance ? 'text-amber-700' : 'text-gray-600'
                        }`}
                      >
                        {(sup.balance || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-xs text-gray-500 font-bold">
                        ر.س
                      </span>
                    </div>
                    {hasBalance && (
                      <span className="text-[11px] text-amber-600 font-bold">
                        مستحق للمورد
                      </span>
                    )}
                  </td>

                  {/* إجمالي المشتريات */}
                  <td className="py-3 px-3.5">
                    <div className="font-mono font-bold text-gray-900">
                      {(sup.totalPurchases || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      ر.س
                    </div>
                    <div className="text-xs text-gray-500">
                      {sup.invoicesCount || 0} فاتورة
                    </div>
                  </td>

                  {/* إجراءات */}
                  <td className="py-3 px-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* كشف الحساب */}
                      <button
                        type="button"
                        onClick={() => onOpenStatement(sup)}
                        title="كشف حساب المورد"
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 transition-colors cursor-pointer"
                      >
                        <DocumentTextIcon className="w-4 h-4" />
                      </button>

                      {/* سداد دفعة للمورد */}
                      {hasBalance && (
                        <button
                          type="button"
                          onClick={() => onPaySupplier(sup)}
                          title="سداد دفعة للمورد"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-colors cursor-pointer text-xs"
                        >
                          <BanknotesIcon className="w-3.5 h-3.5" />
                          <span>سداد</span>
                        </button>
                      )}

                      {/* تعديل */}
                      <button
                        type="button"
                        onClick={() => onEditSupplier(sup)}
                        title="تعديل بيانات المورد"
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>

                      {/* حذف */}
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `هل أنت متأكد من حذف المورد "${sup.name}"؟`
                            )
                          ) {
                            onDeleteSupplier(sup.id);
                          }
                        }}
                        title="حذف المورد"
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
