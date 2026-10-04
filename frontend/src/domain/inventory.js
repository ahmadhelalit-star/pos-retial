export function deductSoldItems(products, soldItems = []) {
  const soldQuantities = new Map();
  soldItems.forEach((item) => {
    soldQuantities.set(
      item.id,
      (soldQuantities.get(item.id) ?? 0) + (Number(item.qty) || 0)
    );
  });

  return products.map((product) => {
    const quantity = soldQuantities.get(product.id) ?? 0;
    if (!quantity) return product;
    return { ...product, stock: Math.max(0, (product.stock ?? 0) - quantity) };
  });
}

export function applyRestockedReturns(products, previousInvoices = [], nextInvoices = []) {
  const previousById = new Map(previousInvoices.map((invoice) => [invoice.id, invoice]));
  const stockDeltas = new Map();

  nextInvoices.forEach((invoice) => {
    const previousInvoice = previousById.get(invoice.id);
    if (!previousInvoice || !invoice.items) return;

    const previousItemsById = new Map(
      (previousInvoice.items ?? []).map((item) => [item.id, item])
    );
    invoice.items.forEach((item) => {
      const previousItem = previousItemsById.get(item.id);
      const previouslyRestocked = previousItem?.restockedQty ?? previousItem?.returnedQty ?? 0;
      const currentlyRestocked = item.restockedQty ?? item.returnedQty ?? 0;
      const delta = currentlyRestocked - previouslyRestocked;
      if (delta > 0) {
        stockDeltas.set(item.id, (stockDeltas.get(item.id) ?? 0) + delta);
      }
    });
  });

  if (stockDeltas.size === 0) return products;
  return products.map((product) => {
    const quantity = stockDeltas.get(product.id) ?? 0;
    return quantity ? { ...product, stock: (product.stock ?? 0) + quantity } : product;
  });
}

export function receivePurchasedItems(products, items = []) {
  const updatedProducts = [...products];

  items.forEach((item) => {
    const existingIndex = updatedProducts.findIndex((product) => product.id === item.id);
    if (existingIndex >= 0) {
      const product = updatedProducts[existingIndex];
      updatedProducts[existingIndex] = {
        ...product,
        stock: (product.stock ?? 0) + item.qty,
        costPrice: item.costPrice,
        price: item.sellingPrice || product.price,
      };
      return;
    }

    updatedProducts.push({
      id: item.id || Date.now(),
      name: item.name,
      barcode: item.barcode,
      category: 'canned',
      unit: item.unit || 'حبة',
      price: item.sellingPrice || item.costPrice * 1.3,
      costPrice: item.costPrice,
      stock: item.qty,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    });
  });

  return updatedProducts;
}

export function adjustProductStock(products, productId, delta) {
  return products.map((product) =>
    product.id === productId
      ? { ...product, stock: Math.max(0, (product.stock ?? 0) + delta) }
      : product
  );
}
