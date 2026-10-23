import { useState } from 'react';
import {
  XMarkIcon,
  SearchIcon,
  UserIcon,
  BuildingOfficeIcon,
  CheckIcon,
  PlusIcon,
  GiftIcon,
  WalletIcon,
} from '../../../components/common/Icons';

export function CustomerSelectModal({
  isOpen,
  onClose,
  customers = [],
  currentCustomer,
  onSelectCustomer,
  onQuickAddCustomer,
}) {
  const [search, setSearch] = useState('');
  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState('individual');
  const [newTaxNumber, setNewTaxNumber] = useState('');

  if (!isOpen) return null;

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.taxNumber && c.taxNumber.includes(q))
    );
  });

  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const newCust = {
      id: `c-${Date.now().toString().slice(-4)}`,
      name: newName.trim(),
      type: newType,
      phone: newPhone.trim(),
      taxNumber: newType === 'company' ? newTaxNumber.trim() : '',
      address: '',
      email: '',
      balance: 0,
      creditLimit: 1000,
      points: 0,
      totalPurchases: 0,
      invoicesCount: 0,
      notes: 'عميل مسجل عبر شاشة البيع',
    };

    onQuickAddCustomer(newCust);
    onSelectCustomer(newCust);
    setIsQuickAdd(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">
            {isQuickAdd ? 'إضافة عميل سريع' : 'اختيار عميل الفاتورة'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isQuickAdd ? (
          <>
            {/* Search Bar & Quick Add Toggle */}
            <div className="p-3 bg-white border-b border-gray-100 flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                  <SearchIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث بالاسم، الجوال، أو الرقم الضريبي..."
                  className="w-full pl-3 pr-9 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans"
                  autoFocus
                />
              </div>

              <button
                type="button"
                onClick={() => setIsQuickAdd(true)}
                className="flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                <PlusIcon className="w-4 h-4" />
                <span>عميل جديد</span>
              </button>
            </div>

            {/* Customers List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-gray-100">
              {filtered.map((c) => {
                const isSelected = currentCustomer?.id === c.id;
                const isCompany = c.type === 'company';
                const hasDebt = (c.balance || 0) > 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c);
                      onClose();
                    }}
                    className={`pt-2 first:pt-0 p-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-emerald-50/80 border border-emerald-300'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          c.id === 'walk-in'
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
                          {isCompany && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.2 rounded font-semibold">
                              B2B
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          {c.phone && <span dir="ltr">{c.phone}</span>}
                          {c.points > 0 && (
                            <span className="flex items-center gap-0.5 text-purple-700 font-bold">
                              <GiftIcon className="w-3 h-3" />
                              {c.points} نقطة
                            </span>
                          )}
                          {hasDebt && (
                            <span className="flex items-center gap-0.5 text-amber-700 font-bold">
                              <WalletIcon className="w-3 h-3" />
                              آجل: {c.balance.toFixed(2)} ر.س
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <CheckIcon className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 hover:text-emerald-700 font-semibold px-2 py-1 rounded-lg">
                          اختيار
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-xs">
                  لا يوجد عميل يطابق البحث
                </div>
              )}
            </div>
          </>
        ) : (
          /* Quick Add Form */
          <form onSubmit={handleQuickAdd} className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewType('individual')}
                className={`py-2 text-xs font-bold rounded-xl border cursor-pointer ${
                  newType === 'individual'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                عميل فرد
              </button>
              <button
                type="button"
                onClick={() => setNewType('company')}
                className={`py-2 text-xs font-bold rounded-xl border cursor-pointer ${
                  newType === 'company'
                    ? 'bg-blue-50 border-blue-500 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                شركة / مؤسسة B2B
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                اسم العميل أو المنشأة *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="الاسم الكامل"
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                رقم الجوال *
              </label>
              <input
                type="tel"
                dir="ltr"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="05XXXXXXXX"
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-right"
                required
              />
            </div>

            {newType === 'company' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  الرقم الضريبي (15 رقم)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={15}
                  value={newTaxNumber}
                  onChange={(e) => setNewTaxNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="300XXXXXXXX0003"
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-right"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsQuickAdd(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                رجوع للقائمة
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                إضافة واختيار
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
