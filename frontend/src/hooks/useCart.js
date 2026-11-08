import { useState, useMemo, useCallback } from 'react';
import { tracksInventory } from '../domain/products';

export function useCart({ taxRate = 0.15, allowNegativeStock = false, initialDraft } = {}) {
  const [items, setItems] = useState(()=>initialDraft?.items??[]);
  const [discountPercent, setDiscountPercentState] = useState(()=>initialDraft?.discountPercent??0);
  const [customer, setCustomer] = useState({
    id: 'walk-in',
    name: 'عميل نقدي (عام)',
    phone: '',
  });
  const [heldOrders, setHeldOrders] = useState([]);

  const setDiscountPercent = useCallback((value) => {
    const parsed = Number(value);
    setDiscountPercentState(Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0);
  }, []);

  // إضافة منتج إلى السلة
  const addToCart = useCallback((product) => {
    const current = items.find((item) => item.id === product.id);
    const quantity = Number(product.qty ?? 1);
    const maxQty = allowNegativeStock || !tracksInventory(product) ? Infinity : Math.max(0, Number(product.stock ?? 0));
    if (!Number.isFinite(quantity) || quantity <= 0 || (current?.qty ?? 0) + quantity > maxQty) return false;
    setItems((previous) => {
      const existing = previous.find((item) => item.id === product.id);
      if (existing) return previous.map((item) => item.id === product.id ? { ...item, qty: item.qty + quantity } : item);
      return [...previous, { ...product, qty: quantity, discountPercent: 0 }];
    });
    return true;
  }, [items, allowNegativeStock]);

  const setItemDiscountPercent = useCallback((productId, value) => {
    const parsed = Number(value);
    const discountPercent = Number.isFinite(parsed)
      ? Math.min(100, Math.max(0, parsed))
      : 0;
    setItems((prevItems) => prevItems.map((item) =>
      item.id === productId ? { ...item, discountPercent } : item
    ));
  }, []);

  // تعديل كمية مادة معينة
  const updateQty = useCallback((productId, newQty) => {
    setItems((prevItems) => {
      if (newQty <= 0) {
        return prevItems.filter((item) => item.id !== productId);
      }
      return prevItems.map((item) =>
        item.id === productId ? { ...item, qty: newQty } : item
      );
    });
  }, []);

  // زيادة بمقدار 1
  const incrementQty = useCallback((productId) => {
    const current = items.find((item) => item.id === productId);
    if (!current) return false;
    const maxQty = allowNegativeStock || !tracksInventory(current) ? Infinity : Math.max(0, Number(current.stock ?? 0));
    if (current.qty + 1 > maxQty) return false;
    setItems((previous) => previous.map((item) => item.id === productId ? { ...item, qty: item.qty + 1 } : item));
    return true;
  }, [items, allowNegativeStock]);

  // إنقاص بمقدار 1
  const decrementQty = useCallback((productId) => {
    setItems((prevItems) =>
      prevItems
        .map((item) => {
          if (item.id === productId) {
            return { ...item, qty: item.qty - 1 };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  }, []);

  // حذف مادة من السلة
  const removeFromCart = useCallback((productId) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  }, []);

  // إفراغ السلة
  const clearCart = useCallback(() => {
    setItems([]);
    setDiscountPercent(0);
  }, [setDiscountPercent]);

  // الحسابات المالية
  const {
    subtotal,
    itemDiscountAmount,
    invoiceDiscountAmount,
    discountAmount,
    taxableAmount,
    taxAmount,
    grandTotal,
    totalItemsCount,
  } =
    useMemo(() => {
      const sub = items.reduce((acc, item) => acc + item.price * item.qty, 0);
      const itemDiscount = items.reduce(
        (acc, item) => acc + item.price * item.qty * (item.discountPercent || 0) / 100,
        0
      );
      const invoiceDiscount = ((sub - itemDiscount) * (discountPercent || 0)) / 100;
      const disc = itemDiscount + invoiceDiscount;
      const taxable = Math.max(0, sub - disc);
      const tax = taxable * taxRate;
      const total = taxable + tax;
      const count = items.reduce((acc, item) => acc + item.qty, 0);

      return {
        subtotal: sub,
        itemDiscountAmount: itemDiscount,
        invoiceDiscountAmount: invoiceDiscount,
        discountAmount: disc,
        taxableAmount: taxable,
        taxAmount: tax,
        grandTotal: total,
        totalItemsCount: count,
      };
    }, [items, discountPercent, taxRate]);

  // تعليق الفاتورة الحالية
  const holdOrder = useCallback(() => {
    if (items.length === 0) return false;

    const newHeldOrder = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      items: [...items],
      customer: { ...customer },
      discountPercent,
      itemDiscountAmount,
      invoiceDiscountAmount,
      grandTotal,
      createdAt: new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setHeldOrders((prev) => [newHeldOrder, ...prev]);
    clearCart();
    return true;
  }, [items, customer, discountPercent, itemDiscountAmount, invoiceDiscountAmount, grandTotal, clearCart]);

  // استرجاع فاتورة معلقة
  const restoreHeldOrder = useCallback((orderId, currentProducts = []) => {
    const order = heldOrders.find((o) => o.id === orderId);
    if (!order) return null;

    let adjusted = false;
    const restoredItems = order.items.reduce((restored, item) => {
      const currentProduct = currentProducts.find((product) => product.id === (item.productId ?? item.id));
      const currentVariant = currentProduct?.variants?.find((variant) => variant.id === item.variantId);
      const maxQty = allowNegativeStock || !tracksInventory(item) ? Infinity
        : currentProduct && Number.isFinite(Number(currentVariant?.stock ?? currentProduct.stock))
        ? Math.max(0, Number(currentVariant?.stock ?? currentProduct.stock)) / (item.unitFactor ?? 1)
        : item.qty;
      const qty = Math.min(item.qty, maxQty);
      if (qty < item.qty) adjusted = true;
      if (qty > 0) {
        restored.push({ ...item, stock: maxQty, qty });
      }
      return restored;
    }, []);

    setItems(restoredItems);
    setCustomer(order.customer);
    setDiscountPercent(order.discountPercent);
    setHeldOrders((prev) => prev.filter((o) => o.id !== orderId));
    return { adjusted, restoredCount: restoredItems.length };
  }, [heldOrders, setDiscountPercent, allowNegativeStock]);

  // حذف فاتورة معلقة
  const deleteHeldOrder = useCallback((orderId) => {
    setHeldOrders((prev) => prev.filter((o) => o.id !== orderId));
  }, []);

  return {
    items,
    customer,
    setCustomer,
    discountPercent,
    setDiscountPercent,
    setItemDiscountPercent,
    itemDiscountAmount,
    invoiceDiscountAmount,
    heldOrders,
    addToCart,
    updateQty,
    incrementQty,
    decrementQty,
    removeFromCart,
    clearCart,
    holdOrder,
    restoreHeldOrder,
    deleteHeldOrder,
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    grandTotal,
    totalItemsCount,
  };
}
