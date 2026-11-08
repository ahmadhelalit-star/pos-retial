import { tracksInventory } from './products.js';

export function assertSaleStock(products, items, { allowNegativeStock = false } = {}) {
  const reserved = new Map();
  for (const item of items) {
    const productId = item.productId ?? item.id;
    const product = products.find((entry) => entry.id === productId);
    if (!product) throw new Error('منتج الفاتورة لم يعد موجودًا');
    const qty = Number(item.qty);
    const factor = Number(item.unitFactor ?? 1);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(factor) || factor <= 0) throw new Error('كمية الفاتورة غير صالحة');
    if (!(product.allowFractional ?? false) && !Number.isInteger(qty)) throw new Error('المنتج لا يقبل كميات كسرية');
    if (!tracksInventory(product)) continue;
    const variant = product.variants?.find((entry) => entry.id === item.variantId);
    if (product.variants?.length && !variant) throw new Error('اختر متغير المنتج');
    const key = JSON.stringify([productId, item.variantId ?? null]);
    const total = (reserved.get(key) ?? 0) + qty * factor;
    reserved.set(key, total);
    if (!allowNegativeStock && total > Number(variant?.stock ?? product.stock ?? 0) + 1e-9) throw new Error(`الكمية المطلوبة تتجاوز رصيد ${product.name}`);
  }
}
