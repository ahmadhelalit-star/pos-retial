import { useState, useMemo } from 'react';
import {
  XMarkIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  TruckIcon,
  SearchIcon,
  BarcodeIcon,
} from '../../../components/common/Icons';

export function NewPurchaseInvoiceModal({
  isOpen,
  onClose,
  suppliers = [],
  products = [],
  onSavePurchaseInvoice,
  onQuickAddSupplier,
}) {
  // Invoice General Details
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toLocaleDateString('ar-SA')
  );
  const [paymentMethod, setPaymentMethod] = useState('credit'); // 'credit' | 'cash' | 'transfer' | 'partial'
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Item Selector State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [qty, setQty] = useState('10');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [unit, setUnit] = useState('حبة');

  // New Custom Item (إذا كان المنتج غير موجود بالمخزون)
  const [isCustomItem, setIsCustomItem] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');

  // Invoice Items List
  const [invoiceItems, setInvoiceItems] = useState([]);

  // Filtered Products for Autocomplete
  const filteredProducts = useMemo(() => {
    if (!itemSearchQuery.trim()) return products.slice(0, 10);
    const q = itemSearchQuery.toLowerCase().trim();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) || (p.barcode || '').includes(q)
      )
      .slice(0, 15);
  }, [products, itemSearchQuery]);

  // When a product is selected from dropdown
  const handleSelectProduct = (prod) => {
    if (!prod) return;
    setSelectedProductId(prod.id);
    setCostPrice(
      prod.costPrice
        ? prod.costPrice.toString()
        : (prod.price * 0.7).toFixed(2)
    );
    setSellingPrice(prod.price ? prod.price.toString() : '');
    setUnit(prod.unit || 'حبة');
    setIsCustomItem(false);
  };

  // Add Item to List
  const handleAddItem = (e) => {
    e.preventDefault();
    const numQty = parseFloat(qty);
    const numCost = parseFloat(costPrice);
    const numSell = parseFloat(sellingPrice) || numCost * 1.3;

    if (!numQty || numQty <= 0 || isNaN(numCost) || numCost < 0) return;

    let itemToAdd = null;

    if (isCustomItem) {
      if (!customName.trim()) return;
      itemToAdd = {
        id: `new-${Date.now()}`,
        name: customName.trim(),
        barcode:
          customBarcode.trim() ||
          '628' + Math.floor(1000000 + Math.random() * 9000000),
        qty: numQty,
        costPrice: numCost,
        sellingPrice: numSell,
        unit: unit || 'حبة',
        total: numQty * numCost,
        isNewProduct: true,
      };
      setCustomName('');
      setCustomBarcode('');
    } else {
      const existingProd = products.find((p) => p.id === selectedProductId);
      if (!existingProd) return;
      itemToAdd = {
        id: existingProd.id,
        name: existingProd.name,
        barcode: existingProd.barcode,
        qty: numQty,
        costPrice: numCost,
        sellingPrice: numSell,
        unit: existingProd.unit || unit,
        total: numQty * numCost,
        isNewProduct: false,
      };
    }

    setInvoiceItems((prev) => {
      // Check if already in invoice
      const existingIdx = prev.findIndex((i) => i.id === itemToAdd.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          qty: next[existingIdx].qty + itemToAdd.qty,
          costPrice: itemToAdd.costPrice,
          sellingPrice: itemToAdd.sellingPrice,
          total: (next[existingIdx].qty + itemToAdd.qty) * itemToAdd.costPrice,
        };
        return next;
      }
      return [...prev, itemToAdd];
    });

    // Reset item input
    setSelectedProductId('');
    setItemSearchQuery('');
    setCostPrice('');
    setSellingPrice('');
    setQty('10');
  };

  const handleRemoveItem = (index) => {
    setInvoiceItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Financial Calculations
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 15; // 15% VAT
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  // Determine Paid and Remaining amounts
  let calculatedPaid = 0;
  let paymentStatus = 'unpaid';

  if (paymentMethod === 'cash' || paymentMethod === 'transfer') {
    calculatedPaid = grandTotal;
    paymentStatus = 'paid';
  } else if (paymentMethod === 'credit') {
    calculatedPaid = 0;
    paymentStatus = 'unpaid';
  } else if (paymentMethod === 'partial') {
    const numPaid = parseFloat(paidAmount) || 0;
    calculatedPaid = Math.min(grandTotal, Math.max(0, numPaid));
    paymentStatus =
      calculatedPaid >= grandTotal
        ? 'paid'
        : calculatedPaid > 0
        ? 'partial'
        : 'unpaid';
  }

  const remainingAmount = Math.max(0, grandTotal - calculatedPaid);

  // Form Submission
  const handleSubmitInvoice = (e) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('الرجاء اختيار المورد');
      return;
    }
    if (invoiceItems.length === 0) {
      alert('الرجاء إضافة أصناف للفاتورة أولاً');
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);

    const newInvoice = {
      id: `PINV-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceNumber: `PINV-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: invoiceDate,
      time: new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp: Date.now(),
      paymentMethod:
        paymentMethod === 'credit'
          ? 'آجل'
          : paymentMethod === 'cash'
          ? 'نقدي'
          : paymentMethod === 'transfer'
          ? 'تحويل بنكي'
          : 'سداد جزئي',
      paymentStatus,
      paidAmount: calculatedPaid,
      remainingAmount,
      subtotal,
      taxRate,
      taxAmount,
      grandTotal,
      status: 'received',
      notes: notes.trim(),
      items: invoiceItems,
    };

    onSavePurchaseInvoice(newInvoice);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-emerald-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <TruckIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black">
                تسجيل فاتورة شراء وتوريد جديدة
              </h2>
              <p className="text-[11px] text-emerald-100">
                إدخال بضاعة للمخزون، تحديث أسعار التكلفة، وإدارة مستحقات المورد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Top Bar: Supplier, Supplier Inv No, Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
            {/* المورد */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                المورد <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">-- اختر المورد --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.balance > 0 ? `(مستحق: ${s.balance} ر.س)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* رقم فاتورة المورد المرجعي */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                رقم فاتورة المورد (المرجع)
              </label>
              <input
                type="text"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                placeholder="مثال: INV-98124"
                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* تاريخ الفاتورة */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                تاريخ التوريد
              </label>
              <input
                type="text"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Item Input Box */}
          <div className="bg-emerald-50/50 border border-emerald-200/80 p-3 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <BarcodeIcon className="w-4 h-4 text-emerald-600" />
                <span>إضافة صنف للفاتورة</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsCustomItem(!isCustomItem);
                  setSelectedProductId('');
                }}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
              >
                {isCustomItem
                  ? '← اختيار من المخزون الحالي'
                  : '+ صنف جديد غير مسجل بالمخزون'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              {/* Product Selection */}
              <div className="md:col-span-4">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  {isCustomItem ? 'اسم الصنف الجديد' : 'اختر الصنف من المخزون'}
                </label>
                {isCustomItem ? (
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="اسم المنتج الجديد..."
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      const prod = products.find(
                        (p) => p.id === parseInt(e.target.value, 10)
                      );
                      handleSelectProduct(prod);
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="">-- ابحث أو اختر الصنف --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (المتوفر: {p.stock ?? 0})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* الكمية */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  الكمية الموردة
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold pointer-events-none">
                    {unit}
                  </span>
                </div>
              </div>

              {/* سعر الشراء (التكلفة) */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  سعر الشراء (التكلفة)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold pointer-events-none">
                    ر.س
                  </span>
                </div>
              </div>

              {/* سعر البيع للجمهور */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  سعر البيع المقترح
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold pointer-events-none">
                    ر.س
                  </span>
                </div>
              </div>

              {/* زر إضافة البند */}
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs min-h-[140px] max-h-[220px] overflow-y-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">الصنف</th>
                  <th className="py-2 px-3">الباركود</th>
                  <th className="py-2 px-3 text-center">الكمية</th>
                  <th className="py-2 px-3">سعر التكلفة</th>
                  <th className="py-2 px-3">الإجمالي</th>
                  <th className="py-2 px-3 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoiceItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-gray-400 text-xs"
                    >
                      لم يتم إضافة أصناف إلى الفاتورة بعد
                    </td>
                  </tr>
                ) : (
                  invoiceItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-bold text-gray-900">
                        {item.name}
                        {item.isNewProduct && (
                          <span className="mr-1 text-[10px] bg-blue-100 text-blue-700 px-1 rounded-sm">
                            صنف جديد
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-gray-500">
                        {item.barcode}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-gray-900">
                        {item.qty} {item.unit}
                      </td>
                      <td className="py-2 px-3 font-mono text-gray-700">
                        {item.costPrice.toFixed(2)} ر.س
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                        {item.total.toFixed(2)} ر.س
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payment & Totals Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
            {/* طرق الدفع وشروط السداد */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-gray-800">
                طريقة وحالة السداد للمورد
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'credit', label: 'آجل بالكامل' },
                  { id: 'cash', label: 'نقدي (الصندوق)' },
                  { id: 'transfer', label: 'تحويل بنكي' },
                  { id: 'partial', label: 'سداد جزئي' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      paymentMethod === m.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* إذا تم اختيار سداد جزئي */}
              {paymentMethod === 'partial' && (
                <div className="p-2 bg-white rounded-lg border border-gray-200 space-y-1">
                  <label className="block text-[11px] font-bold text-gray-600">
                    المبلغ المسدد نقداً الآن (ر.س)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={grandTotal}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1 bg-gray-50 border border-gray-300 rounded text-xs font-mono font-bold"
                  />
                  <div className="text-[10px] text-amber-700 font-bold">
                    المتبقي الآجل:{' '}
                    {(grandTotal - (parseFloat(paidAmount) || 0)).toFixed(2)}{' '}
                    ر.س
                  </div>
                </div>
              )}

              {/* ملاحظات */}
              <div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات حول الفاتورة أو شروط التسليم..."
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* ملخص الحسابات والضرائب */}
            <div className="space-y-1.5 text-xs text-gray-700 font-medium bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center py-0.5">
                <span>المجموع الفرعي (قبل الضريبة):</span>
                <span className="font-mono font-bold">
                  {subtotal.toFixed(2)} ر.س
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span>ضريبة القيمة المضافة (15%):</span>
                <span className="font-mono font-bold">
                  {taxAmount.toFixed(2)} ر.س
                </span>
              </div>
              <div className="border-t border-gray-200 my-1 pt-1.5 flex justify-between items-center text-sm font-black text-emerald-900">
                <span>الإجمالي النهائي المستحق:</span>
                <span className="font-mono text-base text-emerald-700">
                  {grandTotal.toFixed(2)} ر.س
                </span>
              </div>

              {/* ملخص حالة الرصيد */}
              <div className="text-[11px] pt-1 border-t border-dashed border-gray-200 flex justify-between">
                <span>المسدد فوراً:</span>
                <span className="font-mono font-bold text-gray-800">
                  {calculatedPaid.toFixed(2)} ر.س
                </span>
              </div>
              <div className="text-[11px] flex justify-between">
                <span className="text-amber-700 font-bold">
                  المضاف لحساب المورد (آجل):
                </span>
                <span className="font-mono font-bold text-amber-700">
                  {remainingAmount.toFixed(2)} ر.س
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-[11px] text-gray-500">
            * سيتم زيادة كميات المخزون وتحديث أسعار التكلفة تلقائياً عند الحفظ.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-200 hover:bg-gray-300 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleSubmitInvoice}
              className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              <CheckIcon className="w-4 h-4" />
              <span>اعتماد التوريد وحفظ الفاتورة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
