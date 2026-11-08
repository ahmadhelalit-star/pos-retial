import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProduct, validateProduct, validateCatalogProduct, createProductLine, toBaseQuantity, findBarcodeLine } from '../src/domain/products.js';
import { deductSoldItems, receivePurchasedItems, applyRestockedReturns, adjustProductStock } from '../src/domain/inventory.js';
import { assertSaleStock } from '../src/domain/cartStock.js';
import { canUseModule, OPTIONAL_MODULES } from '../src/domain/modules.js';

const legacy = { id: 1, name: 'مياه', barcode: '111', unit: 'حبة', price: 2, costPrice: 0, stock: 120, color: 'blue', custom: { retained: true } };
const multi = () => ({ ...normalizeProduct(legacy), units: [...normalizeProduct(legacy).units, { id: 'box', name: 'كرتونة', factor: 24, price: 40, barcode: '222', sell: true, purchase: true }] });
const variants = () => ({ ...multi(), stock: 12, attributes: [{ name: 'لون', values: ['أحمر', 'أزرق'] }], variants: [
  { id: 'red', sku: 'R', barcode: '333', values: { لون: 'أحمر' }, price: 3, stock: 5 },
  { id: 'blue', sku: 'B', barcode: '444', values: { لون: 'أزرق' }, price: 4, stock: 7 },
] });

test('legacy catalog remains valid, metadata and zero cost are preserved without mutation', () => {
  const before = structuredClone(legacy);
  const normalized = validateProduct(legacy);
  assert.equal(normalized.type, 'stock');
  assert.equal(normalized.costPrice, 0);
  assert.deepEqual(normalized.custom, legacy.custom);
  assert.deepEqual(legacy, before);
  assert.equal(deductSoldItems([legacy], [{ id: 1, qty: 2 }])[0].stock, 118);
});
test('five purchased cartons add 120 base units and retain the catalog metadata', () => {
  const product = multi();
  const line = { ...createProductLine(product, { unitId: 'box', qty: 5, operation: 'purchase' }), costPrice: 24, sellingPrice: 72 };
  const updated = receivePurchasedItems([product], [line])[0];
  assert.equal(updated.stock, 240);
  assert.equal(updated.costPrice, 0.5);
  assert.equal(updated.units[0].price, 3);
  assert.equal(updated.units[1].price, 72);
  assert.deepEqual(updated.custom, product.custom);
  assert.equal(product.stock, 120);
});
test('sale and partial return use the original conversion even after the catalog changes', () => {
  const product = multi();
  const line = createProductLine(product, { unitId: 'box', qty: 2 });
  const sold = deductSoldItems([product], [line]);
  assert.equal(sold[0].stock, 72);
  sold[0].units[1] = { ...sold[0].units[1], factor: 12 };
  const before = [{ id: 'I1', items: [{ ...line, restockedQty: 0 }] }];
  const after = [{ id: 'I1', items: [{ ...line, unitFactor: 999, restockedQty: 1 }] }];
  const returned = applyRestockedReturns(sold, before, after);
  assert.equal(returned[0].stock, 96);
  assert.equal(applyRestockedReturns(returned, after, after)[0].stock, 96);
});
for (const type of ['service', 'nonStock']) test(`${type} never changes inventory for sales, purchases, returns or adjustment`, () => {
  const product = { ...legacy, type, stock: 0 };
  const line = { ...createProductLine(product, { qty: 10 }), costPrice: 0 };
  assert.equal(deductSoldItems([product], [line])[0].stock, 0);
  assert.equal(receivePurchasedItems([product], [line])[0].stock, 0);
  assert.equal(adjustProductStock([product], 1, 10)[0].stock, 0);
  assert.equal(applyRestockedReturns([product], [{ id: 'i', items: [line] }], [{ id: 'i', items: [{ ...line, returnedQty: 5 }] }])[0].stock, 0);
  assert.doesNotThrow(() => assertSaleStock([product], [line]));
});
test('fractional quantities are explicit and conversion avoids floating residue', () => {
  assert.throws(() => toBaseQuantity(legacy, 0.5));
  const weighted = { ...multi(), allowFractional: true };
  assert.equal(toBaseQuantity(weighted, 0.5, 'box'), 12);
  assert.equal(deductSoldItems([weighted], [createProductLine(weighted, { qty: 0.1 })])[0].stock, 119.9);
});
test('variants have independent stock, prices, identifiers and totals', () => {
  const product = validateProduct(variants());
  const line = createProductLine(product, { variantId: 'red', qty: 2 });
  assert.equal(line.price, 3);
  assert.equal(line.barcode, '333');
  assert.equal(line.variants, undefined);
  const updated = deductSoldItems([product], [line])[0];
  assert.equal(updated.variants[0].stock, 3);
  assert.equal(updated.variants[1].stock, 7);
  assert.equal(updated.stock, 10);
  assert.throws(() => createProductLine(product));
  assert.throws(() => deductSoldItems([product], [{ id: 1, qty: 1 }]));
});
test('duplicate combinations, barcodes and invalid conversions are rejected', () => {
  const product = variants();
  product.variants[1].values = { لون: 'أحمر' };
  assert.throws(() => validateProduct(product));
  const units = multi(); units.units[1].barcode = '111';
  assert.throws(() => validateProduct(units));
  for (const factor of [0, -1, NaN, Infinity]) {
    const invalid = multi(); invalid.units[1].factor = factor;
    assert.throws(() => validateProduct(invalid));
  }
  assert.throws(() => validateCatalogProduct([legacy], { ...legacy, id: 2 }));
});
test('cannot convert existing balances to services or variants silently', () => {
  assert.throws(() => validateCatalogProduct([legacy], { ...legacy, type: 'service' }));
  assert.throws(() => validateCatalogProduct([legacy], variants()));
});
test('all cart units reserve from the same base stock; negative stock is explicit', () => {
  const product = multi();
  const box = createProductLine(product, { unitId: 'box', qty: 5 });
  const piece = createProductLine(product);
  assert.doesNotThrow(() => assertSaleStock([product], [box]));
  assert.throws(() => assertSaleStock([product], [box, piece]));
  assert.doesNotThrow(() => assertSaleStock([product], [box, piece], { allowNegativeStock: true }));
  assert.equal(deductSoldItems([product], [box, piece])[0].stock, -1);
});
test('advanced presentation policy needs activation, retail scope, entitlement, setting and permission', () => {
  for (const moduleId of OPTIONAL_MODULES) {
    const context = { activation: { status: 'ACTIVE', activated: true, product: 'retail', features: { [moduleId]: true } }, settings: { modules: { [moduleId]: true } }, permissions: [moduleId] };
    assert.equal(canUseModule(moduleId, context), true);
    for (const field of ['activation', 'settings', 'permissions']) assert.equal(canUseModule(moduleId, { ...context, [field]: undefined }), false);
    for (const status of ['EXPIRED', 'CLOCK_ROLLBACK', 'DEVICE_MISMATCH', 'INVALID_LICENSE']) assert.equal(canUseModule(moduleId, { ...context, activation: { ...context.activation, status } }), false);
    assert.equal(canUseModule(moduleId, { ...context, activation: { ...context.activation, product: 'restaurant' } }), false);
  }
});

test('scanning selects a unit or variant directly', () => {
  assert.equal(findBarcodeLine([multi()], '222').unitId, 'box');
  assert.equal(findBarcodeLine([variants()], '444').variantId, 'blue');
  assert.equal(findBarcodeLine([legacy], 'missing'), null);
});
