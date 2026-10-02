import { PrinterIcon, CheckIcon, XMarkIcon } from '../../../components/common/Icons';

export function ReceiptModal({
  isOpen,
  onClose,
  saleData,
  onNewSale,
  storeSettings = {},
}) {
  if (!isOpen || !saleData) return null;

  const invoiceNumber = saleData.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
  const now = new Date();
  const dateStr = saleData.date || now.toLocaleDateString('ar-SA');
  const timeStr = saleData.time || now.toLocaleTimeString('ar-SA');

  const storeName = storeSettings.storeName || 'Sham Touch Retail POS';
  const companyName = storeSettings.companyName || 'مؤسسة شام تاتش للتجارة والتجزئة';
  const taxNumber = storeSettings.taxNumber || '310123456700003';
  const currency = storeSettings.currency || 'ر.س';
  const logoEmoji = storeSettings.logoEmoji || '🏪';
  const headerMessage = storeSettings.headerMessage || '';
  const footerMessage = storeSettings.footerMessage || 'البضاعة المباعة ترد وتستبدل خلال 3 أيام بموجب هذا الإشعار';
  const is57mm = storeSettings.receiptPaperWidth === '57mm';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className={`bg-white w-full ${is57mm ? 'max-w-[290px]' : 'max-w-sm'} rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="p-3 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-sm">
            <CheckIcon className="w-5 h-5" />
            <span>تمت عملية البيع بنجاح</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-emerald-700 text-emerald-100 flex items-center justify-center cursor-pointer"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Body (Thermal print style) */}
        <div className="p-5 overflow-y-auto font-mono text-xs text-gray-800 space-y-3 bg-white">
          {/* Store Info */}
          <div className="text-center pb-2 border-b border-dashed border-gray-300">
            <div className="text-xl mb-0.5">{logoEmoji}</div>
            <h3 className="text-base font-black font-sans text-gray-900">
              {storeName}
            </h3>
            {companyName && (
              <p className="text-[11px] text-gray-500 font-sans mt-0.5">
                {companyName}
              </p>
            )}
            {storeSettings.showTaxNumber !== false && taxNumber && (
              <p className="text-[10px] text-gray-600 font-mono mt-0.5">
                الرقم الضريبي: {taxNumber}
              </p>
            )}
            <p className="text-[10px] bg-gray-100 inline-block px-2 py-0.5 rounded mt-1 font-sans font-bold">
              {saleData.customer?.type === 'company'
                ? 'فاتورة ضريبية (B2B)'
                : (storeSettings.receiptTitle || 'فاتورة ضريبية مبسطة (B2C)')}
            </p>
            {headerMessage && (
              <p className="text-[10px] text-emerald-800 font-sans font-medium mt-1">
                {headerMessage}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-gray-300 pb-2">
            <div className="flex justify-between">
              <span>رقم الفاتورة:</span>
              <span className="font-bold">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>التاريخ والوقت:</span>
              <span>{dateStr} {timeStr}</span>
            </div>
            <div className="flex justify-between">
              <span>الكاشير:</span>
              <span className="font-sans">سامر النجار</span>
            </div>
            <div className="flex justify-between">
              <span>العميل:</span>
              <span className="font-sans font-bold">{saleData.customer?.name || 'عميل نقدي'}</span>
            </div>
            {saleData.customer?.taxNumber && (
              <div className="flex justify-between">
                <span>الرقم الضريبي للعميل:</span>
                <span className="font-mono font-bold">{saleData.customer.taxNumber}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="border-b border-dashed border-gray-300 pb-2">
            <div className="flex justify-between font-bold text-gray-900 mb-1 border-b border-gray-200 pb-1 font-sans text-[11px]">
              <span>الصنف</span>
              <span>الكمية × السعر</span>
              <span>المجموع</span>
            </div>
            <div className="space-y-1.5">
              {saleData.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-[11px]">
                  <span className="font-sans font-semibold max-w-[120px] truncate">
                    {item.name}
                  </span>
                  <span className="text-gray-600">
                    {item.qty} × {item.price.toFixed(2)}
                  </span>
                  <span className="font-bold">{(item.qty * item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-gray-300 pb-2">
            <div className="flex justify-between">
              <span className="font-sans">المجموع الخاضع للضريبة:</span>
              <span>{saleData.taxableAmount.toFixed(2)} ر.س</span>
            </div>
            {saleData.discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span className="font-sans">إجمالي الخصم:</span>
                <span>- {saleData.discountAmount.toFixed(2)} ر.س</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-sans">ضريبة القيمة المضافة (15%):</span>
              <span>{saleData.taxAmount.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-1 border-t border-gray-200 text-gray-900">
              <span className="font-sans">الإجمالي النهائي:</span>
              <span>{saleData.grandTotal.toFixed(2)} ر.س</span>
            </div>
          </div>

          {/* Payment & Change */}
          <div className="space-y-1 text-[11px] bg-gray-50 p-2 rounded-lg font-sans">
            <div className="flex justify-between">
              <span>طريقة السداد:</span>
              <span className="font-bold">
                {saleData.payment.method === 'cash'
                  ? 'نقدي (كاش)'
                  : saleData.payment.method === 'credit'
                  ? 'آجل / على الحساب'
                  : 'بطاقة / مدى'}
              </span>
            </div>
            {saleData.payment.method === 'cash' && (
              <>
                <div className="flex justify-between">
                  <span>المبلغ المدفوع:</span>
                  <span className="font-mono">{saleData.payment.tendered.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>المبلغ المتبقي:</span>
                  <span className="font-mono">{saleData.payment.change.toFixed(2)} ر.س</span>
                </div>
              </>
            )}
          </div>

          {/* QR Code */}
          {storeSettings.showQrCode !== false && (
            <div className="py-2 flex flex-col items-center justify-center border-b border-dashed border-gray-300">
              <div className="w-16 h-16 bg-gray-900 p-1 rounded flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" className="w-14 h-14 fill-current">
                  <path d="M2 2h7v7H2V2zm2 2v3h3V4H4zm9-2h7v7h-7V2zm2 2v3h3V4h-3zM2 15h7v7H2v-7zm2 2v3h3v-3H4zm11 1h2v2h-2v-2zm-2-4h2v2h-2v-2zm6 0h2v4h-2v-4zm-4 4h2v2h-2v-2zm4 2h2v2h-2v-2zm-6-2h2v2h-2v-2zm2-2h2v2h-2v-2zm2-2h2v2h-2v-2zM4 11h3v2H4v-2zm6-7h2v3h-2V4zm-2 7h3v2H8v-2zm8 0h3v2h-3v-2zm-5 0h2v2h-2v-2z" />
                </svg>
              </div>
              <span className="text-[8px] text-gray-400 mt-1 font-sans">
                فاتورة إلكترونية معتمدة (ZATCA)
              </span>
            </div>
          )}

          {/* Receipt Footer note */}
          <div className="text-center pt-1 font-sans">
            <p className="text-[10px] font-bold text-gray-700 leading-tight">
              {footerMessage}
            </p>
            {storeSettings.phone && (
              <p className="text-[9px] text-gray-400 mt-0.5">
                للتواصل: {storeSettings.phone}
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs cursor-pointer shadow-2xs transition-colors"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>طباعة الإيصال</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onNewSale();
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
          >
            <span>طلب جديد</span>
          </button>
        </div>
      </div>
    </div>
  );
}
