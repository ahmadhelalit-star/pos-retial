import { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon, SparklesIcon } from '../../../components/common/Icons';
import { CATEGORIES } from '../../../data/mockProducts';

const UNITS = ['حبة', 'كيس', 'علبة', 'حزمة', 'كجم', 'لتر', 'كرتون'];

export function ProductFormModal({
  isOpen,
  onClose,
  productToEdit,
  onSaveProduct,
}) {
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('beverages');
  const [unit, setUnit] = useState('حبة');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || '');
      setBarcode(productToEdit.barcode || '');
      setCategory(productToEdit.category || 'beverages');
      setUnit(productToEdit.unit || 'حبة');
      setPrice(productToEdit.price?.toString() || '');
      setCostPrice(
        productToEdit.costPrice?.toString() ||
          (productToEdit.price ? (productToEdit.price * 0.7).toFixed(2) : '')
      );
      setStock(productToEdit.stock?.toString() || '');
    } else {
      // Reset for add
      setName('');
      setBarcode('');
      setCategory('beverages');
      setUnit('حبة');
      setPrice('');
      setCostPrice('');
      setStock('50');
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  // Generate random retail barcode (EAN style)
  const handleGenerateBarcode = () => {
    const randomCode = '628' + Math.floor(1000000 + Math.random() * 9000000);
    setBarcode(randomCode);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !price || !barcode.trim()) return;

    const numPrice = parseFloat(price) || 0;
    const numCost = parseFloat(costPrice) || numPrice * 0.7;
    const numStock = parseInt(stock, 10) || 0;

    const savedProduct = {
      id: productToEdit ? productToEdit.id : Date.now(),
      name: name.trim(),
      barcode: barcode.trim(),
      category,
      unit,
      price: numPrice,
      costPrice: numCost,
      stock: numStock,
    };

    onSaveProduct(savedProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">
            {productToEdit ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد للكتالوج'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Name */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">
              اسم المنتج <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: حليب كامل الدسم 1 لتر"
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Barcode with auto-generate */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">
              الباركود (SKU) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="امسح الباركود أو ولّد كود جديد..."
                className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="flex items-center gap-1 px-3 py-2.5 bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-300 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <SparklesIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>توليد آلي</span>
              </button>
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1">التصنيف</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">وحدة القياس</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prices & Stock */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1">
                سعر البيع (ر.س) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">سعر التكلفة (ر.س)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">الرصيد الافتتاحي</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl font-bold cursor-pointer transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <CheckIcon className="w-4 h-4" />
              <span>{productToEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
