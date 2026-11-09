import { tracksInventory, toBaseQuantity } from './products.js';

const rounded = (value) => Math.round(value * 1e9) / 1e9;
function lineQuantity(product, item, quantity = item.qty) {
  if (item.unitFactor !== undefined) {
    const factor = Number(item.unitFactor);
    const qty = Number(quantity);
    if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(qty) || qty < 0) throw new Error('كمية أو معامل تحويل غير صالح');
    return rounded(qty * factor);
  }
  return toBaseQuantity(product, quantity, item.unitId);
}
function changeStock(product, item, delta) {
  if (!tracksInventory(product) || item.type === 'service' || item.type === 'nonStock') return product;
  if (item.variantId !== undefined) {
    if (!product.variants?.some((variant) => variant.id === item.variantId)) throw new Error('متغير المخزون غير موجود');
    const variants = product.variants.map((variant) => variant.id === item.variantId
      ? { ...variant, stock: rounded(Number(variant.stock ?? 0) + delta) } : variant);
    return { ...product, variants, stock: rounded(variants.reduce((sum, variant) => sum + Number(variant.stock ?? 0), 0)) };
  }
  if (product.variants?.length) throw new Error('اختر متغيرًا قبل تعديل مخزون المنتج');
  return { ...product, stock: rounded(Number(product.stock ?? 0) + delta) };
}
export function deductSoldItems(products, soldItems = []) {
  return products.map((product) => soldItems.reduce((current, item) => {
    if ((item.productId ?? item.id) !== product.id || !tracksInventory(current)) return current;
    return changeStock(current, item, -lineQuantity(current, item));
  }, product));
}
export function applyRestockedReturns(products, previousInvoices = [], nextInvoices = []) {
  const previousById = new Map(previousInvoices.map((invoice) => [invoice.id, invoice]));
  const lines = [];
  nextInvoices.forEach((invoice) => {
    const previous = previousById.get(invoice.id);
    if (!previous) return;
    const previousItems = new Map((previous.items ?? []).map((item) => [item.id, item]));
    (invoice.items ?? []).forEach((item) => {
      const before = previousItems.get(item.id);
      if (!before) return;
      const delta = (item.restockedQty ?? item.returnedQty ?? 0) - (before.restockedQty ?? before.returnedQty ?? 0);
      if (delta > 0) lines.push({ ...before, qty: delta });
    });
  });
  return products.map((product) => lines.reduce((current, item) => {
    if ((item.productId ?? item.id) !== product.id || !tracksInventory(current)) return current;
    return changeStock(current, item, lineQuantity(current, item));
  }, product));
}
export function receivePurchasedItems(products, items = []) {
  const updated = [...products];
  items.forEach((item) => {
    const index = updated.findIndex((product) => product.id === (item.productId ?? item.id));
    if (index >= 0) {
      const product = updated[index];
      const received = tracksInventory(product) ? changeStock(product, item, lineQuantity(product, item)) : product;
      const factor = Number(item.unitFactor ?? 1);
      const costPrice = Number(item.costPrice) / factor;
      const price = item.sellingPrice === undefined ? product.price : Number(item.sellingPrice) / factor;
      const previousVariant = product.variants?.find((variant) => variant.id === item.variantId);
      const oldStock = Number(previousVariant?.stock ?? product.stock ?? 0);
      const receivedStock = tracksInventory(product) ? lineQuantity(product, item) : 0;
      const previousCost = Number(previousVariant?.costPrice ?? product.costPrice ?? 0);
      const averageCost = tracksInventory(product) && oldStock > 0 && receivedStock > 0
        ? rounded((oldStock * previousCost + receivedStock * costPrice) / (oldStock + receivedStock)) : costPrice;
      if (item.variantId !== undefined) {
        updated[index] = { ...received, variants: received.variants.map((variant) => variant.id === item.variantId ? { ...variant, costPrice: averageCost, price: item.sellingPrice === undefined ? variant.price : price } : variant) };
      } else {
        updated[index] = { ...received, costPrice: averageCost, price,
          units: received.units?.map((unit) => unit.id === received.baseUnitId ? { ...unit, price }
            : unit.id === item.unitId && item.sellingPrice !== undefined ? { ...unit, price: Number(item.sellingPrice) } : unit),
        };
      }
      return;
    }
    const product = {
      id: item.productId ?? item.id ?? Date.now(), name: item.name, barcode: item.barcode,
      category: 'canned', unit: item.unit || 'قطعة', type: item.type ?? 'stock',
      allowFractional: item.allowFractional ?? false,
      price: item.sellingPrice ?? item.costPrice * 1.3, costPrice: item.costPrice,
      stock: 0, color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    };
    updated.push(tracksInventory(product) ? changeStock(product, item, lineQuantity(product, item)) : product);
  });
  return updated;
}
export function adjustProductStock(products, productId, delta) {
  if (!Number.isFinite(delta)) throw new Error('تعديل المخزون غير صالح');
  return products.map((product) => product.id === productId && tracksInventory(product) && !product.variants?.length
    ? { ...product, stock: Math.max(0, rounded(Number(product.stock ?? 0) + delta)) } : product);
}
