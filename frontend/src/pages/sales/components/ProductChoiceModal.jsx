import { translateUI as t,useLocale } from "../../../runtime/i18n.js";
import { useState } from 'react';
import { createProductLine, normalizeProduct } from '../../../domain/products';

export function ProductChoiceModal({ product: input, onClose, onSelect }) {
  useLocale();
  const product = normalizeProduct(input);
  const [unitId, setUnitId] = useState(product.units.find((unit) => unit.sell)?.id ?? product.baseUnitId);
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState('1');
  const [error, setError] = useState('');
  return <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><form className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-4" onSubmit={(event) => {
    event.preventDefault();
    try { onSelect(createProductLine(product, { unitId, variantId: variantId || undefined, qty: Number(qty) })); onClose(); }
    catch (failure) { setError(failure.message); }
  }}>
    <h2 className="font-bold">{product.name}</h2>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {product.variants.length > 0 && <label className="block">{t("المتغير")}<select required value={variantId} onChange={(event) => setVariantId(event.target.value)} className="w-full p-2 border rounded-lg"><option value="">{t("اختر")}</option>{product.variants.map((variant) => <option key={variant.id} value={variant.id}>{Object.values(variant.values).join(' / ')} — {variant.sku}</option>)}</select></label>}
    <label className="block">{t("وحدة البيع")}<select value={unitId} onChange={(event) => setUnitId(event.target.value)} className="w-full p-2 border rounded-lg">{product.units.filter((unit) => unit.sell).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
    <label className="block">{t("الكمية")}<input required type="number" min={product.allowFractional ? '0.001' : '1'} step={product.allowFractional ? 'any' : '1'} value={qty} onChange={(event) => setQty(event.target.value)} className="w-full p-2 border rounded-lg" /></label>
    <div className="flex justify-between"><button type="button" onClick={onClose}>{t("إلغاء")}</button><button type="submit" className="rounded-lg bg-emerald-600 text-white px-4 py-2">{t("إضافة للسلة")}</button></div>
  </form></div>;
}
