import {VariantDistribution} from './VariantDistribution';
import { translateUI as t,useLocale } from "../../../runtime/i18n.js";
import { useState, useEffect,useRef } from 'react';
import { XMarkIcon, CheckIcon, SparklesIcon } from '../../../components/common/Icons';
import { useCategories } from '../../../domain/categories';
import { normalizeProduct, validateProduct } from '../../../domain/products';
import { ProductOptionsEditor } from './ProductOptionsEditor';

const UNITS = ['قطعة', 'كيس', 'علبة', 'حزمة', 'كجم', 'لتر', 'كرتون'];

export function ProductFormModal({
  isOpen,
  onClose,
  productToEdit,
  onSaveProduct,
  onLoadVariantBalances,
  canDistributeStock=false,
  stockReadOnly = false,
  financialOptions,
}) {
  useLocale();
  const categories=useCategories();
  const [name, setName] = useState('');
  const [newProductId,setNewProductId]=useState(()=>crypto.randomUUID());
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('قطعة');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [type, setType] = useState('stock');
  const [allowFractional, setAllowFractional] = useState(false);
  const [options, setOptions] = useState({ units: [], attributes: [], variants: [] });
  const [distribution,setDistribution]=useState(null);
  const [error, setError] = useState('');
  const errorRef=useRef(null);
  const [saving, setSaving] = useState(false);
  const [currency,setCurrency]=useState(''),[taxId,setTaxId]=useState(''),[scaleCode,setScaleCode]=useState('');
  const [taxPriceMode,setTaxPriceMode]=useState('inherit');

  useEffect(() => {
    const normalized = normalizeProduct(productToEdit || { unit: 'قطعة', price: 0 });
    setType(normalized.type);
    setAllowFractional(normalized.allowFractional);
    setOptions({ units: normalized.units, attributes: normalized.attributes, variants: normalized.variants });
    setError('');setDistribution(null);
    setCurrency(productToEdit?.currency??financialOptions?.company.base_currency??'');
    setTaxId(productToEdit?.taxId??'');
    setScaleCode(productToEdit?.scaleCode??'');
    setTaxPriceMode(productToEdit?.priceIncludesTax===true?'inclusive':productToEdit?.priceIncludesTax===false?'exclusive':'inherit');
    if (productToEdit) {
      setName(productToEdit.name || '');
      setBarcode(productToEdit.barcode || '');
      setCategory(productToEdit.category || '');
      setUnit(normalized.unit);
      setPrice(productToEdit.price?.toString() || '');
      setCostPrice(
        productToEdit.costPrice?.toString() ||
          '0'
      );
      setStock(productToEdit.stock?.toString() || '');
    } else {
      setNewProductId(crypto.randomUUID());
      // Reset for add
      setName('');
      setBarcode('');
      setCategory('');
      setUnit('قطعة');
      setPrice('');
      setCostPrice('');
      setStock('0');
    }
  }, [productToEdit, isOpen, financialOptions?.company.base_currency]);

  if (!isOpen) return null;

  const converting=Boolean(productToEdit&&!productToEdit.variants?.length&&options.variants.length&&type==='stock');
  // Generate random retail barcode (EAN style)
  const handleGenerateBarcode = () => {
    const randomCode = '628' + Math.floor(1000000 + Math.random() * 9000000);
    setBarcode(randomCode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || price === '') return;

    const numPrice = parseFloat(price) || 0;
    const numCost = costPrice === '' ? 0 : Number(costPrice);
    const numStock = stock === '' ? 0 : Number(stock);

    const savedProduct = {
      ...productToEdit,
      id: productToEdit ? productToEdit.id : newProductId,
      name: name.trim(),
      barcode: barcode.trim(),
      category,
      unit,
      price: numPrice,
      costPrice: numCost,
      stock: type === 'stock' ? numStock : (productToEdit?.stock ?? 0),
      type,
      allowFractional,
      ...options,
      attributes: productToEdit?.variants?.length ? options.attributes : options.attributes.map(row=>({...row,name:row.name.trim(),values:row.values.map(value=>value.trim()).filter(Boolean)})).filter(row=>row.name||row.values.length),
      baseUnitId: productToEdit?.baseUnitId ?? 'base',
      ...(financialOptions?{currency:currency||financialOptions.company.base_currency,taxId:taxId||null,scaleCode:scaleCode||null,priceIncludesTax:taxPriceMode==='inherit'?null:taxPriceMode==='inclusive'}:{}),
    };
    // Keep legacy fields synchronized with the base unit without dropping additional metadata.
    savedProduct.units = options.units.map((entry) => entry.id === savedProduct.baseUnitId
      ? { ...entry, name: unit, factor: 1, barcode: barcode.trim(), price: numPrice } : entry);
    if (options.variants.length) savedProduct.stock = options.variants.reduce((sum, variant) => sum + Number(variant.stock), 0);
    try {
      setSaving(true);
      validateProduct(savedProduct);
      if (productToEdit && type !== (productToEdit.type ?? 'stock') && Number(productToEdit.stock) !== 0) throw new Error('لا يمكن تغيير نوع منتج له رصيد. سوِّ الرصيد أولًا مع الحفاظ على سجل الحركات.');
      if(converting){if(distribution===null)throw new Error('وزّع الرصيد الحالي بالكامل على التركيبات أولًا.');savedProduct.variantDistribution=distribution;}
      savedProduct.units=savedProduct.units.map(row=>({...row,factor:Number(row.factor),price:Number(row.price)}));
      savedProduct.variants=savedProduct.variants.map(row=>({...row,price:Number(row.price),stock:Number(row.stock),unitPrices:Object.fromEntries(Object.entries(row.unitPrices??{}).map(([id,price])=>[id,Number(price)]))}));
      await onSaveProduct(savedProduct);
    } catch (failure) {
      setError(failure.message);
      requestAnimationFrame(()=>errorRef.current?.scrollIntoView({block:'nearest'}));
      return;
    } finally {
      setSaving(false);
    }
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={t(productToEdit ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد')} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">
            {t(productToEdit ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex flex-wrap gap-2 px-4 py-3 border-b border-gray-100 bg-white" aria-label={t('أقسام المنتج')}>
          {[['basic','البيانات الأساسية'],['units','الوحدات الإضافية'],['variants','الألوان والمقاسات']].map(([id,label])=><button type="button" key={id} className="rounded-xl px-3 py-2 text-xs font-bold bg-[#f0f3ff] text-[#00236f]" onClick={event=>event.currentTarget.closest('[role=dialog]').querySelector(`[data-product-section=${id}]`)?.[id==='basic'?'scrollTo':'scrollIntoView'](id==='basic'?{top:0,behavior:'smooth'}:{behavior:'smooth',block:'start'})}>{t(label)}</button>)}
        </nav>
        {/* Form Body */}
        <form onSubmit={handleSubmit} className="min-h-0 flex flex-col text-xs">
          <div className="p-5 overflow-y-auto space-y-4" data-product-section="basic">
          {error && <p ref={errorRef} role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
          <label className="block space-y-1 font-bold">نوع المنتج
            <select className="w-full border rounded-xl p-2" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="stock">{t("منتج مخزني")}</option><option value="service">{t("خدمة")}</option><option value="nonStock">{t("منتج غير مخزني")}</option>
            </select>
          </label>
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
              placeholder={t("مثال: حليب كامل الدسم 1 لتر")}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Barcode with auto-generate */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">
              الباركود (اختياري)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder={t("امسح الباركود أو ولّد كود جديد...")}
                className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="flex items-center gap-1 px-3 py-2.5 bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-300 rounded-xl font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <SparklesIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t("توليد آلي")}</span>
              </button>
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1">{t("التصنيف")}</label>
              <select
                aria-label={t('تصنيف المنتج')}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">{t('بدون تصنيف')}</option>
                {categories.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {t(c.name)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">{t("وحدة القياس")}</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(u)}
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
                aria-label={t('سعر البيع')}
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">{t("سعر التكلفة (ر.س)")}</label>
              <input
                type="number"
                step="any"
                min="0"
                aria-label={t('سعر التكلفة')}
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">{t("الرصيد الافتتاحي")}</label>
              <input
                type="number"
                min="0"
                step={allowFractional ? 'any' : '1'}
                aria-label={t('الرصيد الافتتاحي')}
                disabled={stockReadOnly || type !== 'stock' || options.variants.length > 0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2"><input type="checkbox" checked={allowFractional} onChange={(event) => setAllowFractional(event.target.checked)} />{t("السماح بالكميات الكسرية")}</label>
          {type !== 'stock' && <p className="text-gray-500">{t("هذا النوع لا ينشئ حركات مخزون.")}</p>}
          {stockReadOnly && <p className="text-gray-500">{t("الرصيد يُسجّل من حركة مخزون موثقة بعد حفظ المنتج.")}</p>}
          {financialOptions&&<details className="border rounded-xl p-3 space-y-3"><summary>{t("العملة والضريبة والميزان / Currency, tax and scale")}</summary><label className="block">{t("العملة / Currency")}<select className="w-full border rounded-lg p-2" value={currency} onChange={event=>setCurrency(event.target.value)}>{financialOptions.currencies.map(row=><option key={row.code}>{row.code}</option>)}</select></label><label className="block">{t("الضريبة / Tax")}<select className="w-full border rounded-lg p-2" value={taxId} onChange={event=>setTaxId(event.target.value)}><option value="">{t("دون ضريبة / No tax")}</option>{financialOptions.taxes.map(row=><option key={row.id} value={row.id}>{row.name} · {row.rate}%</option>)}</select></label><label className="block">{t("طريقة السعر / Tax price mode")}<select className="w-full border rounded-lg p-2" value={taxPriceMode} onChange={event=>setTaxPriceMode(event.target.value)}><option value="inherit">{t("حسب إعداد الضريبة / Inherit tax setting")}</option><option value="inclusive">{t("شامل / Inclusive")}</option><option value="exclusive">{t("غير شامل / Exclusive")}</option></select></label><label className="block">{t("رمز منتج الميزان (5 أرقام) / Scale PLU")}<input className="w-full border rounded-lg p-2" value={scaleCode} pattern="[0-9]{5}" maxLength={5} onChange={event=>setScaleCode(event.target.value)}/></label></details>}
          <ProductOptionsEditor distributing={converting} baseUnitName={unit} basePrice={price} persistedUnitIds={productToEdit?.units?.map(row=>row.id)??[]} persistedVariantIds={productToEdit?.variants?.map(row=>row.id)??[]} value={options} onChange={setOptions} baseUnitId={productToEdit?.baseUnitId ?? 'base'} allowFractional={allowFractional} type={type} stockReadOnly={stockReadOnly} />
          {converting&&onLoadVariantBalances&&<VariantDistribution productId={productToEdit.id} variants={options.variants} load={onLoadVariantBalances} onChange={setDistribution} allowFractional={allowFractional} canDistribute={canDistributeStock}/>}
          </div>
          {/* Actions */}
          <div className="p-4 shrink-0 border-t border-gray-200 bg-white flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl font-bold cursor-pointer transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={saving||(converting&&distribution===null)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <CheckIcon className="w-4 h-4" />
              <span>{t(productToEdit ? 'حفظ التعديلات' : 'إضافة المنتج')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
