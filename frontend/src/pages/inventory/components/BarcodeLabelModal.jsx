import { createPortal } from 'react-dom';
import { PrinterIcon, XMarkIcon, BarcodeIcon } from '../../../components/common/Icons';

export function BarcodeLabelModal({
  isOpen,
  onClose,
  product,
  taxRatePercent = 15,
}) {
  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="print-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="no-print p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarcodeIcon className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-800">معاينة ملصق الباركود والرف</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Shelf Label Preview */}
        <div className="print-area p-6 bg-gray-100 flex items-center justify-center">
          <div className="bg-white p-4 w-72 rounded-xl border-2 border-dashed border-gray-400 shadow-sm text-center font-sans space-y-2 select-text">
            {/* Store title */}
            <p className="text-[10px] font-bold text-gray-400 tracking-wider">
              SHAM TOUCH RETAIL POS
            </p>

            {/* Product Name */}
            <h3 className="text-sm font-black text-gray-900 leading-snug line-clamp-2">
              {product.name}
            </h3>

            {/* Simulated Barcode Graphic */}
            <div className="py-1 flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-[2px] h-10 w-48 bg-white px-2">
                <div className="w-[3px] h-full bg-black"></div>
                <div className="w-[1px] h-full bg-black"></div>
                <div className="w-[4px] h-full bg-black"></div>
                <div className="w-[2px] h-full bg-black"></div>
                <div className="w-[1px] h-full bg-black"></div>
                <div className="w-[3px] h-full bg-black"></div>
                <div className="w-[2px] h-full bg-black"></div>
                <div className="w-[4px] h-full bg-black"></div>
                <div className="w-[1px] h-full bg-black"></div>
                <div className="w-[3px] h-full bg-black"></div>
                <div className="w-[2px] h-full bg-black"></div>
                <div className="w-[4px] h-full bg-black"></div>
                <div className="w-[1px] h-full bg-black"></div>
                <div className="w-[3px] h-full bg-black"></div>
                <div className="w-[2px] h-full bg-black"></div>
                <div className="w-[1px] h-full bg-black"></div>
                <div className="w-[3px] h-full bg-black"></div>
                <div className="w-[4px] h-full bg-black"></div>
              </div>
              <p className="font-mono text-xs font-bold text-gray-800 tracking-widest mt-1">
                {product.barcode}
              </p>
            </div>

            {/* Price section */}
            <div className="pt-2 border-t border-gray-200 flex items-baseline justify-center gap-1">
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {product.price.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-gray-700">ر.س</span>
            </div>
            <p className="text-[9px] text-gray-400 font-medium">السعر شامل ضريبة القيمة المضافة {taxRatePercent}%</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="no-print p-3 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs cursor-pointer shadow-2xs transition-colors"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>طباعة الملصق</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
          >
            <span>إغلاق</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
