import { translateUI as t,useLocale } from "../../../runtime/i18n.js";
const inputClass = 'w-full rounded-lg border border-gray-300 p-2 bg-white';

export function ProductOptionsEditor({ value, onChange, baseUnitId, allowFractional, type, stockReadOnly = false }) {
  useLocale();
  const updateUnit = (id, field, next) => onChange({ ...value, units: value.units.map((unit) => unit.id === id ? { ...unit, [field]: next } : unit) });
  const updateVariant = (id, field, next) => onChange({ ...value, variants: value.variants.map((variant) => variant.id === id ? { ...variant, [field]: next } : variant) });
  return <details className="rounded-xl border border-gray-200 p-3 space-y-3">
    <summary className="cursor-pointer font-bold">{t("الوحدات والمتغيرات (اختياري)")}</summary>
    <p className="text-gray-500">{t("الأسعار والرصيد بالوحدة الأساسية. لا تُنشأ التركيبات تلقائيًا.")}</p>
    <h3 className="font-bold">{t("وحدات البيع والشراء")}</h3>
    {value.units.filter((unit) => unit.id !== baseUnitId).map((unit) => <fieldset key={unit.id} className="grid grid-cols-2 gap-2 border rounded-xl p-2">
      <label>{t("اسم الوحدة")}<input aria-label={t("اسم الوحدة")} className={inputClass} value={unit.name} onChange={(event) => updateUnit(unit.id, 'name', event.target.value)} /></label>
      <label>{t("معامل التحويل")}<input className={inputClass} type="number" min="0.000000001" step="any" value={unit.factor} onChange={(event) => updateUnit(unit.id, 'factor', Number(event.target.value))} /></label>
      <label>{t("سعر البيع")}<input className={inputClass} type="number" min="0" step="any" value={unit.price} onChange={(event) => updateUnit(unit.id, 'price', Number(event.target.value))} /></label>
      <label>{t("باركود الوحدة")}<input className={inputClass} value={unit.barcode} onChange={(event) => updateUnit(unit.id, 'barcode', event.target.value)} /></label>
      <label><input type="checkbox" checked={unit.sell} onChange={(event) => updateUnit(unit.id, 'sell', event.target.checked)} />{t("بيع")}</label>
      <label><input type="checkbox" checked={unit.purchase} onChange={(event) => updateUnit(unit.id, 'purchase', event.target.checked)} />{t("شراء")}</label>
    </fieldset>)}
    <button type="button" className="text-emerald-700 font-bold" onClick={() => onChange({ ...value, units: [...value.units, { id: crypto.randomUUID(), name: '', factor: 1, price: 0, barcode: '', sell: true, purchase: true }] })}>{t("+ إضافة وحدة")}</button>
    <h3 className="font-bold">{t("الخصائص")}</h3>
    {value.attributes.map((attribute, index) => <div key={index} className="grid grid-cols-2 gap-2">
      <label>{t("اسم الخاصية")}<input className={inputClass} value={attribute.name} disabled={value.variants.length > 0} onChange={(event) => onChange({ ...value, attributes: value.attributes.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry) })} /></label>
      <label>{t("القيم (افصل بفاصلة)")}<input className={inputClass} value={attribute.values.join(',')} disabled={value.variants.length > 0} onChange={(event) => onChange({ ...value, attributes: value.attributes.map((entry, i) => i === index ? { ...entry, values: event.target.value.split(/[,،]/).map((text) => text.trim()) } : entry) })} /></label>
    </div>)}
    <button type="button" disabled={value.variants.length > 0} className="text-emerald-700 font-bold disabled:opacity-40" onClick={() => onChange({ ...value, attributes: [...value.attributes, { name: '', values: [] }] })}>{t("+ إضافة خاصية")}</button>
    {value.variants.map((variant) => <fieldset key={variant.id} className="grid grid-cols-2 gap-2 border rounded-xl p-2">
      {value.attributes.map((attribute) => <label key={attribute.name}>{attribute.name}<select className={inputClass} value={variant.values[attribute.name] || ''} onChange={(event) => updateVariant(variant.id, 'values', { ...variant.values, [attribute.name]: event.target.value })}><option value="">{t("اختر")}</option>{attribute.values.map((entry) => <option key={entry}>{entry}</option>)}</select></label>)}
      <label>SKU<input className={inputClass} value={variant.sku} onChange={(event) => updateVariant(variant.id, 'sku', event.target.value)} /></label>
      <label>{t("الباركود")}<input className={inputClass} value={variant.barcode} onChange={(event) => updateVariant(variant.id, 'barcode', event.target.value)} /></label>
      <label>{t("سعر الوحدة الأساسية")}<input className={inputClass} type="number" min="0" step="any" value={variant.price} onChange={(event) => updateVariant(variant.id, 'price', Number(event.target.value))} /></label>
      <label>{t("الرصيد")}<input className={inputClass} type="number" min="0" disabled={stockReadOnly || type !== 'stock'} step={allowFractional ? 'any' : '1'} value={variant.stock} onChange={(event) => updateVariant(variant.id, 'stock', Number(event.target.value))} /></label>
      {value.units.map(unit => <label key={unit.id}>{t('سعر مستقل')} — {unit.name || t('وحدة جديدة')}<input className={inputClass} type="number" min="0" step="any" placeholder={t("محسوب تلقائيًا")} value={variant.unitPrices?.[unit.id] ?? ''} onChange={event => {
        const unitPrices = { ...variant.unitPrices };
        if (event.target.value === '') delete unitPrices[unit.id]; else unitPrices[unit.id] = Number(event.target.value);
        updateVariant(variant.id, 'unitPrices', unitPrices);
      }} /></label>)}
    </fieldset>)}
    <button type="button" disabled={!value.attributes.length || value.attributes.some((attribute) => !attribute.name || !attribute.values.length)} className="text-emerald-700 font-bold disabled:opacity-40" onClick={() => onChange({ ...value, variants: [...value.variants, { id: crypto.randomUUID(), sku: '', barcode: '', values: {}, price: 0, stock: 0 }] })}>{t("+ إضافة تركيبة")}</button>
  </details>;
}
