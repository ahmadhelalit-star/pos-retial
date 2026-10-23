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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <table className="w-full text-right text-xs">
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
  );
}
