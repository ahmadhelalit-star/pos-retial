import { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon, BuildingOfficeIcon } from '../../../components/common/Icons';

const SUPPLIER_CATEGORIES = [
  'الألبان والمشروبات',
  'المشروبات والمياه',
  'المعلبات والمواد الغذائية',
  'اللحوم والدواجن والأسماك',
  'الخضار والفواكه',
  'المخبوزات والحلويات',
  'المنظفات والعناية',
  'أخرى / توريد عام',
];

export function SupplierFormModal({
  isOpen,
  onClose,
  supplierToEdit,
  onSaveSupplier,
}) {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState(SUPPLIER_CATEGORIES[0]);
  const [balance, setBalance] = useState('0');
  const [bankDetails, setBankDetails] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name || '');
      setCompanyName(supplierToEdit.companyName || '');
      setContactPerson(supplierToEdit.contactPerson || '');
      setPhone(supplierToEdit.phone || '');
      setEmail(supplierToEdit.email || '');
      setTaxNumber(supplierToEdit.taxNumber || '');
      setAddress(supplierToEdit.address || '');
      setCategory(supplierToEdit.category || SUPPLIER_CATEGORIES[0]);
      setBalance(supplierToEdit.balance?.toString() || '0');
      setBankDetails(supplierToEdit.bankDetails || '');
      setNotes(supplierToEdit.notes || '');
    } else {
      setName('');
      setCompanyName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setTaxNumber('');
      setAddress('');
      setCategory(SUPPLIER_CATEGORIES[0]);
      setBalance('0');
      setBankDetails('');
      setNotes('');
    }
  }, [supplierToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const supplierData = {
      id: supplierToEdit ? supplierToEdit.id : `sup-${Date.now()}`,
      name: name.trim(),
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      taxNumber: taxNumber.trim(),
      address: address.trim(),
      category,
      balance: parseFloat(balance) || 0,
      bankDetails: bankDetails.trim(),
      notes: notes.trim(),
      totalPurchases: supplierToEdit ? supplierToEdit.totalPurchases || 0 : 0,
      invoicesCount: supplierToEdit ? supplierToEdit.invoicesCount || 0 : 0,
    };

    onSaveSupplier(supplierData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <BuildingOfficeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900">
                {supplierToEdit ? 'تعديل بيانات المورد' : 'إضافة مورد / شركة توريد'}
              </h2>
              <p className="text-xs text-gray-500">
                تسجيل بيانات التواصل والحسابات البنكية للمورد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* اسم المورد */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                اسم المورد أو الشهرة التجارية <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: شركة المراعي للتوزيع"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
              />
            </div>

            {/* الاسم الرسمي للشركة */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                الاسم القانوني للشركة / المؤسسة
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="مثال: شركة المراعي للتجارة المحدودة"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* تصنيف المورد */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                تصنيف التوريد
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-bold"
              >
                {SUPPLIER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* اسم مسؤول التواصل */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                اسم مندوب / مسؤول المبيعات
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="مثال: فهد الدوسري"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* رقم الهاتف */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                رقم الجوال / الهاتف
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 0501234567"
                dir="ltr"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
              />
            </div>

            {/* البريد الإلكتروني */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="orders@supplier.com"
                dir="ltr"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
              />
            </div>

            {/* الرقم الضريبي */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                الرقم الضريبي للمنشأة (15 رقماً)
              </label>
              <input
                type="text"
                maxLength={15}
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="300XXXXXXXXXXXX"
                dir="ltr"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
              />
            </div>

            {/* العنوان وموقع المستودع */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                العنوان ومقر المستودع
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="مثال: الرياض - المدينة الصناعية الثانية - شارع 15"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* الحساب البنكي / الآيبان */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                البيانات البنكية (البنك ورقم الآيبان IBAN للتحويل)
              </label>
              <input
                type="text"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                placeholder="مثال: مصرف الراجحي - SA4480000..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* رصيد افتتاحي مستحق */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                رصيد مستحق للمورد (دائن)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-bold"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold pointer-events-none">
                  ر.س
                </span>
              </div>
            </div>

            {/* ملاحظات */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ملاحظات ومواعيد التوريد
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: يورد كل يوم ثلاثاء صباحاً، شروط الدفع آجل 30 يوم..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              <CheckIcon className="w-4 h-4" />
              <span>{supplierToEdit ? 'تحديث البيانات' : 'حفظ المورد'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
