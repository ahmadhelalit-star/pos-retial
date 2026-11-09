import {unitName} from './unitNames.js';
// Catalog rules shared by editors and inventory operations. Legacy rows remain valid.
export const PRODUCT_TYPES = Object.freeze({ STOCK: 'stock', SERVICE: 'service', NON_STOCK: 'nonStock' });

export function tracksInventory(product) {
  return (product.type ?? PRODUCT_TYPES.STOCK) === PRODUCT_TYPES.STOCK;
}

function number(value, label, { positive = false } = {}) {
  const parsed = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(parsed) || (positive ? parsed <= 0 : parsed < 0)) {
    throw new Error(`${label}: أدخل رقمًا ${positive ? 'أكبر من صفر' : 'غير سالب'}`);
  }
  return parsed;
}

export function normalizeProduct(product) {
  const unit = unitName(product.unit || 'قطعة');
  return {
    ...product,
    unit,
    type: product.type ?? PRODUCT_TYPES.STOCK,
    allowFractional: product.allowFractional ?? false,
    baseUnitId: product.baseUnitId ?? 'base',
    units: (product.units ?? [{ id: 'base', name: unit, factor: 1, barcode: product.barcode || '', price: product.price ?? 0, sell: true, purchase: true }]).map(row=>({...row,name:unitName(row.name)})),
    attributes: product.attributes ?? [],
    variants: product.variants ?? [],
  };
}

export function validateProduct(input) {
  const product = normalizeProduct(input);
  if (!Object.values(PRODUCT_TYPES).includes(product.type)) throw new Error('نوع المنتج غير صالح');
  if (!product.name?.trim()) throw new Error('اسم المنتج مطلوب');
  number(product.price, 'سعر البيع');
  number(product.costPrice ?? 0, 'التكلفة');
  number(product.stock ?? 0, 'الرصيد');
  const ids = new Set();
  const barcodes = new Set();
  const barcode = (value) => {
    if (!value) return;
    if (barcodes.has(value)) throw new Error('الباركود مكرر بين الوحدات أو المتغيرات');
    barcodes.add(value);
  };
  for (const unit of product.units) {
    if (!unit.id || ids.has(unit.id) || !unit.name?.trim()) throw new Error('الوحدات تحتاج أسماء ومعرّفات فريدة');
    ids.add(unit.id);
    number(unit.factor, 'معامل التحويل', { positive: true });
    number(unit.price, 'سعر الوحدة');
    barcode(unit.barcode);
  }
  const base = product.units.find((unit) => unit.id === product.baseUnitId);
  if (!base || Number(base.factor) !== 1) throw new Error('معامل الوحدة الأساسية يجب أن يساوي 1');
  if (!product.units.some((unit) => unit.sell) || !product.units.some((unit) => unit.purchase)) throw new Error('اختر وحدة بيع ووحدة شراء على الأقل');
  const attributes = new Map();
  for (const attribute of product.attributes) {
    if (!attribute.name?.trim() || attributes.has(attribute.name) || !attribute.values?.length || new Set(attribute.values).size !== attribute.values.length || attribute.values.some((value) => !value?.trim())) throw new Error('خصائص المتغيرات تحتاج أسماء وقيمًا فريدة');
    attributes.set(attribute.name, attribute.values);
  }
  const variantIds = new Set();
  const skus = new Set();
  const combinations = new Set();
  for (const variant of product.variants) {
    if (!variant.id || variantIds.has(variant.id) || !variant.sku?.trim()) throw new Error('كل متغير يحتاج معرّفًا وSKU');
    variantIds.add(variant.id);
    if (skus.has(variant.sku)) throw new Error('SKU المتغير مكرر');
    skus.add(variant.sku);
    if (Object.keys(variant.values ?? {}).length !== attributes.size || !attributes.size) throw new Error('اختر قيمة لكل خاصية في المتغير');
    for (const [name, values] of attributes) if (!values.includes(variant.values[name])) throw new Error('قيمة المتغير غير موجودة ضمن الخصائص');
    const combination = JSON.stringify([...attributes.keys()].sort().map((name) => [name, variant.values[name]]));
    if (combinations.has(combination)) throw new Error('تركيبة المتغير مكررة');
    combinations.add(combination);
    barcode(variant.barcode);
    number(variant.price, 'سعر المتغير');
    for (const [unitId, price] of Object.entries(variant.unitPrices ?? {})) {
      if (!ids.has(unitId)) throw new Error('سعر مرتبط بوحدة غير موجودة');
      number(price, 'سعر وحدة المتغير');
    }
    number(variant.stock, 'رصيد المتغير');
    if (!product.allowFractional && !Number.isInteger(Number(variant.stock))) throw new Error('هذا المنتج لا يقبل رصيدًا كسريًا');
  }
  if (!product.allowFractional && !Number.isInteger(Number(product.stock ?? 0))) throw new Error('فعّل الكميات الكسرية لهذا الرصيد');
  return product;
}

export function validateCatalogProduct(products, input) {
  const previous = products.find((product) => product.id === input.id);
  const product = validateProduct({ ...previous, ...input });
  if (previous && product.type !== (previous.type ?? 'stock') && Number(previous.stock) !== 0) throw new Error('لا يمكن تغيير نوع منتج له رصيد');
  if (previous && !previous.variants?.length && product.variants.length && Number(previous.stock) !== 0) throw new Error('توزيع الرصيد على المتغيرات يحتاج ترحيلًا مستقلًا');
  const barcodes = new Set([...product.units, ...product.variants].map((entry) => entry.barcode).filter(Boolean));
  const duplicate = products.some((entry) => entry.id !== product.id && [entry.barcode, ...(entry.units ?? []).map((unit) => unit.barcode), ...(entry.variants ?? []).map((variant) => variant.barcode)].some((barcode) => barcode && barcodes.has(barcode)));
  if (duplicate) throw new Error('الباركود مستخدم لمنتج آخر');
  return product;
}

export function toBaseQuantity(product, quantity, unitId) {
  const normalized = normalizeProduct(product);
  const unit = normalized.units.find((entry) => entry.id === (unitId ?? normalized.baseUnitId));
  if (!unit) throw new Error('وحدة غير معتمدة لهذا المنتج');
  const qty = number(quantity, 'الكمية');
  if (!normalized.allowFractional && !Number.isInteger(qty)) throw new Error('هذا المنتج لا يقبل كميات كسرية');
  return Math.round(qty * number(unit.factor, 'معامل التحويل', { positive: true }) * 1e9) / 1e9;
}

// Snapshot the conversion on each document line so later catalog edits cannot change history.
export function createProductLine(input, { unitId, variantId, qty = 1, operation = 'sell' } = {}) {
  const product = normalizeProduct(input);
  const unit = product.units.find((entry) => entry.id === (unitId ?? product.baseUnitId));
  if (!unit || unit[operation] !== true) throw new Error('هذه الوحدة غير متاحة للعملية');
  const variant = product.variants.find((entry) => entry.id === variantId);
  if (product.variants.length && !variant) throw new Error('اختر متغير المنتج');
  const baseQuantity = toBaseQuantity(product, qty, unit.id);
  // Keep document snapshots small; do not duplicate the entire catalog/variant tree per line.
  const { units: _units, attributes: _attributes, variants: _variants, ...snapshot } = product;
  return {
    ...snapshot,
    id: variant || unit.id !== product.baseUnitId ? JSON.stringify([product.id, variantId ?? null, unit.id]) : product.id,
    productId: product.id,
    variantId: variant?.id,
    unitId: unit.id,
    unit: unit.name,
    unitFactor: Number(unit.factor),
    name: variant ? `${product.name} — ${Object.values(variant.values).join(' / ')}` : product.name,
    barcode: variant?.barcode || unit.barcode || product.barcode,
    price: variant ? Number(variant.unitPrices?.[unit.id] ?? Number(variant.price) * Number(unit.factor)) : Number(unit.price),
    stock: (variant?.stock ?? product.stock ?? 0) / Number(unit.factor),
    qty,
    baseQuantity,
  };
}

export function findBarcodeLine(products, barcode) {
  for (const input of products) {
    const product = normalizeProduct(input);
    const variant = product.variants.find((entry) => entry.barcode && entry.barcode === barcode);
    if (variant) return createProductLine(product, { variantId: variant.id });
    const unit = product.units.find((entry) => entry.barcode && entry.barcode === barcode && entry.sell);
    if (unit && !product.variants.length) return createProductLine(product, { unitId: unit.id });
  }
  return null;
}
