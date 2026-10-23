import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckIcon,
  UserIcon,
  BuildingOfficeIcon,
} from '../../../components/common/Icons';

export function CustomerFormModal({
  isOpen,
  onClose,
  customerToEdit = null,
  onSaveCustomer,
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'individual',
    phone: '',
    taxNumber: '',
    email: '',
    address: '',
    creditLimit: 1000,
    notes: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        name: customerToEdit.name || '',
        type: customerToEdit.type || 'individual',
        phone: customerToEdit.phone || '',
        taxNumber: customerToEdit.taxNumber || '',
        email: customerToEdit.email || '',
        address: customerToEdit.address || '',
        creditLimit: customerToEdit.creditLimit ?? 1000,
        notes: customerToEdit.notes || '',
      });
    } else {
      setFormData({
        name: '',
        type: 'individual',
        phone: '',
        taxNumber: '',
        email: '',
        address: '',
        creditLimit: 1000,
        notes: '',
      });
    }
    setErrors({});
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'اسم العميل أو المنشأة مطلوب';
    }
    if (!formData.phone.trim()) {
      errs.phone = 'رقم الجوال مطلوب للتواصل';
    }
    if (formData.type === 'company') {
      if (!formData.taxNumber.trim()) {
        errs.taxNumber = 'الرقم الضريبي مطلوب لشركات B2B';
      } else if (!/^\d{15}$/.test(formData.taxNumber.trim())) {
        errs.taxNumber = 'الرقم الضريبي يجب أن يتكون من 15 رقماً بالضبط';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      id: customerToEdit ? customerToEdit.id : `c-${Date.now().toString().slice(-4)}`,
      name: formData.name.trim(),
      type: formData.type,
      phone: formData.phone.trim(),
      taxNumber: formData.taxNumber.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      creditLimit: parseFloat(formData.creditLimit) || 0,
      balance: customerToEdit ? customerToEdit.balance : 0,
      points: customerToEdit ? customerToEdit.points : 0,
      totalPurchases: customerToEdit ? customerToEdit.totalPurchases : 0,
      invoicesCount: customerToEdit ? customerToEdit.invoicesCount : 0,
      notes: formData.notes.trim(),
    };

    onSaveCustomer(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              {formData.type === 'company' ? (
                <BuildingOfficeIcon className="w-4 h-4" />
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
            </div>
            <h2 className="text-sm font-bold text-gray-800">
              {customerToEdit ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Customer Type Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              نوع الحساب
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'individual' })}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  formData.type === 'individual'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>عميل فرد (تجزئة)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'company' })}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  formData.type === 'company'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BuildingOfficeIcon className="w-4 h-4" />
                <span>منشأة / شركة (B2B)</span>
              </button>
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {formData.type === 'company' ? 'اسم الشركة أو المؤسسة *' : 'اسم العميل بالكامل *'}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={formData.type === 'company' ? 'مثال: شركة الأفق للتجارة' : 'مثال: محمد عبد الله'}
              className={`w-full px-3 py-2 text-xs bg-gray-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition-all font-sans ${
                errors.name
                  ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500'
                  : 'border-gray-200 focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1 font-semibold">{errors.name}</p>
            )}
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              رقم الجوال / الهاتف *
            </label>
            <input
              type="tel"
              dir="ltr"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="05XXXXXXXX"
              className={`w-full px-3 py-2 text-xs bg-gray-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition-all font-mono text-right ${
                errors.phone
                  ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500'
                  : 'border-gray-200 focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
            />
            {errors.phone && (
              <p className="text-xs text-red-600 mt-1 font-semibold">{errors.phone}</p>
            )}
          </div>

          {/* Tax Number Field (B2B) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700">
                الرقم الضريبي (15 رقماً) {formData.type === 'company' ? '*' : '(اختياري)'}
              </label>
              <span className="text-[11px] text-gray-500">هيئة الزكاة والضريبة ZATCA</span>
            </div>
            <input
              type="text"
              dir="ltr"
              maxLength={15}
              value={formData.taxNumber}
              onChange={(e) =>
                setFormData({ ...formData, taxNumber: e.target.value.replace(/\D/g, '') })
              }
              placeholder="3XXXXXXXXXXXX03"
              className={`w-full px-3 py-2 text-xs bg-gray-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition-all font-mono tracking-wider text-right ${
                errors.taxNumber
                  ? 'border-red-400 focus:ring-red-400/20 focus:border-red-500'
                  : 'border-gray-200 focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
            />
            {errors.taxNumber && (
              <p className="text-xs text-red-600 mt-1 font-semibold">{errors.taxNumber}</p>
            )}
          </div>

          {/* Credit Limit & Address (Grid) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                سقف الائتمان (الآجل ر.س)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                dir="ltr"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@domain.com"
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-right"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              العنوان / المدينة والحي
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="مثال: الرياض - حي الملز، شارع الجامعة"
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              ملاحظات إضافية
            </label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="شروط التسليم، مواعيد السداد، أو تفضيلات العميل..."
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <CheckIcon className="w-4 h-4" />
              <span>{customerToEdit ? 'حفظ التعديلات' : 'إضافة العميل'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
