import { useState, useMemo, useCallback } from 'react';

const TAX_RATE = 0.15; // 15% ضريبة القيمة المضافة

export function useCart() {
  const [items, setItems] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [customer, setCustomer] = useState({
    id: 'walk-in',
    name: 'عميل نقدي (عام)',
    phone: '',
  });
  const [heldOrders, setHeldOrders] = useState([]);

  // إضافة منتج إلى السلة
  const addToCart = useCallback((product) => {
    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + 1,
        };
        return updated;
      }
      return [...prevItems, { ...product, qty: 1 }];
    });
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
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, qty: item.qty + 1 } : item
      )
    );
  }, []);

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
  }, []);

  // الحسابات المالية
  const { subtotal, discountAmount, taxableAmount, taxAmount, grandTotal, totalItemsCount } =
    useMemo(() => {
      const sub = items.reduce((acc, item) => acc + item.price * item.qty, 0);
      const disc = (sub * (discountPercent || 0)) / 100;
      const taxable = Math.max(0, sub - disc);
      const tax = taxable * TAX_RATE;
      const total = taxable + tax;
      const count = items.reduce((acc, item) => acc + item.qty, 0);

      return {
        subtotal: sub,
        discountAmount: disc,
        taxableAmount: taxable,
        taxAmount: tax,
        grandTotal: total,
        totalItemsCount: count,
      };
    }, [items, discountPercent]);

  // تعليق الفاتورة الحالية
  const holdOrder = useCallback(() => {
    if (items.length === 0) return false;

    const newHeldOrder = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      items: [...items],
      customer: { ...customer },
      discountPercent,
      grandTotal,
      createdAt: new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setHeldOrders((prev) => [newHeldOrder, ...prev]);
    clearCart();
    return true;
  }, [items, customer, discountPercent, grandTotal, clearCart]);

  // استرجاع فاتورة معلقة
  const restoreHeldOrder = useCallback((orderId) => {
    const order = heldOrders.find((o) => o.id === orderId);
    if (!order) return;

    setItems(order.items);
    setCustomer(order.customer);
    setDiscountPercent(order.discountPercent);
    setHeldOrders((prev) => prev.filter((o) => o.id !== orderId));
  }, [heldOrders]);

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
