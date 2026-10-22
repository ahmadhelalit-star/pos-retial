import { BanknotesIcon, DocumentTextIcon, ArrowPathIcon, CheckIcon } from '../../../components/common/Icons';

export function InvoicesSummaryCards({ invoices = [], taxRate = 0.15 }) {
  const totalInvoices = invoices.length;

  const totalSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

  // حساب المرتجعات التقديرية
  const totalRefunded = invoices.reduce((sum, inv) => {
    if (!inv.items) return sum;
    const itemRefunds = inv.items.reduce((itemSum, it) => {
      const returned = it.returnedQty || 0;
      return itemSum + returned * it.price * (1 + taxRate); // مع الضريبة
    }, 0);
    return sum + itemRefunds;
  }, 0);

  const netSales = Math.max(0, totalSales - totalRefunded);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 p-3 sm:p-4 pb-2">
      {/* Total Sales */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-semibold">إجمالي المبيعات</p>
          <p className="text-lg md:text-xl font-black text-gray-800 font-mono mt-0.5">
            {totalSales.toFixed(2)} <span className="text-xs font-sans text-gray-400">ر.س</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <BanknotesIcon className="w-5 h-5" />
        </div>
      </div>

      {/* Net Sales */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-semibold">صافي الوردية</p>
          <p className="text-lg md:text-xl font-black text-emerald-600 font-mono mt-0.5">
            {netSales.toFixed(2)} <span className="text-xs font-sans text-gray-400">ر.س</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
          <CheckIcon className="w-5 h-5" />
        </div>
      </div>

      {/* Total Invoices */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-semibold">عدد الفواتير</p>
          <p className="text-lg md:text-xl font-black text-gray-800 font-mono mt-0.5">
            {totalInvoices} <span className="text-xs font-sans text-gray-400">فاتورة</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <DocumentTextIcon className="w-5 h-5" />
        </div>
      </div>

      {/* Total Returns */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-semibold">إجمالي المرتجعات</p>
          <p className="text-lg md:text-xl font-black text-red-600 font-mono mt-0.5">
            {totalRefunded.toFixed(2)} <span className="text-xs font-sans text-gray-400">ر.س</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
          <ArrowPathIcon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
