import { useState } from 'react';
import { ProductGrid } from './components/ProductGrid';
import { CartPanel } from './components/CartPanel';
import { PaymentModal } from './components/PaymentModal';
import { HeldOrdersModal } from './components/HeldOrdersModal';
import { ReceiptModal } from './components/ReceiptModal';
import { useCart } from '../../hooks/useCart';
import { MOCK_PRODUCTS } from '../../data/mockProducts';
import { PauseIcon } from '../../components/common/Icons';

export function SalesPage({
  products = MOCK_PRODUCTS,
  onSaleCompleted,
  isShiftOpen = true,
  onNavigateToShift,
}) {
  const {
    items,
    customer,
    discountPercent,
    setDiscountPercent,
    heldOrders,
    addToCart,
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
  } = useCart();

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedSaleData, setCompletedSaleData] = useState(null);

  // إتمام عملية البيع وفتح الإيصال وتمرير الفاتورة للسجل العام
  const handleCompleteSale = (paymentDetails) => {
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const now = new Date();

    const saleRecord = {
      id: invoiceNumber,
      invoiceNumber,
      date: now.toLocaleDateString('ar-SA'),
      time: now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.getTime(),
      items: items.map((it) => ({ ...it, returnedQty: 0 })),
      customer,
      subtotal,
      discountAmount,
      taxableAmount,
      taxAmount,
      grandTotal,
      payment: paymentDetails,
      paymentMethod: paymentDetails.method === 'cash' ? 'نقدي' : 'شبكة',
      status: 'مدفوعة', // 'مدفوعة' | 'مسترجعة' | 'مسترجع جزئي'
      cashier: 'سامر النجار',
    };

    setCompletedSaleData(saleRecord);
    setIsPaymentOpen(false);
    setIsReceiptOpen(true);

    if (onSaleCompleted) {
      onSaleCompleted(saleRecord);
    }

    clearCart();
  };

  const handleNewSale = () => {
    setCompletedSaleData(null);
    setIsReceiptOpen(false);
    clearCart();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-100 font-sans">
      {/* Subheader bar for POS quick actions */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2 text-gray-600">
          <span className="font-bold text-gray-800">نقطة البيع #01</span>
          <span>•</span>
          {isShiftOpen ? (
            <span className="text-emerald-700 font-medium">الوردية الصباحية مفتوحة ومستعدة للبيع</span>
          ) : (
            <span className="text-red-600 font-bold">الوردية مغلقة حالياً</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsHeldOrdersOpen(true)}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors font-bold cursor-pointer"
        >
          <PauseIcon className="w-3.5 h-3.5" />
          <span>الفواتير المعلقة</span>
          {heldOrders.length > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black leading-none text-white bg-amber-600 rounded-full animate-pulse">
              {heldOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Closed Shift Alert Banner */}
      {!isShiftOpen && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs flex items-center justify-between text-amber-900 font-bold">
          <span>تنبيه: تم إغلاق الوردية الحالية. يرجى فتح وردية جديدة للتمكن من إتمام عمليات البيع.</span>
          {onNavigateToShift && (
            <button
              type="button"
              onClick={onNavigateToShift}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              الانتقال لإدارة الوردية
            </button>
          )}
        </div>
      )}

      {/* Main Screen: Split Products & Cart */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Products Area */}
        <main className="flex-1 h-full overflow-hidden order-2 lg:order-1">
          <ProductGrid
            products={products}
            onAddToCart={(prod) => {
              if (!isShiftOpen) return;
              addToCart(prod);
            }}
          />
        </main>

        {/* Cart & Billing Area */}
        <aside className="w-full lg:w-[400px] xl:w-[440px] h-full overflow-hidden order-1 lg:order-2 border-t lg:border-t-0 lg:border-r border-gray-200">
          <CartPanel
            items={items}
            customer={customer}
            onIncrement={incrementQty}
            onDecrement={decrementQty}
            onRemove={removeFromCart}
            onClearCart={clearCart}
            onHoldOrder={holdOrder}
            onOpenPayment={() => {
              if (!isShiftOpen) return;
              setIsPaymentOpen(true);
            }}
            discountPercent={discountPercent}
            setDiscountPercent={setDiscountPercent}
            subtotal={subtotal}
            discountAmount={discountAmount}
            taxAmount={taxAmount}
            grandTotal={grandTotal}
            totalItemsCount={totalItemsCount}
          />
        </aside>
      </div>

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        grandTotal={grandTotal}
        onCompleteSale={handleCompleteSale}
      />

      <HeldOrdersModal
        isOpen={isHeldOrdersOpen}
        onClose={() => setIsHeldOrdersOpen(false)}
        heldOrders={heldOrders}
        onRestoreOrder={restoreHeldOrder}
        onDeleteOrder={deleteHeldOrder}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        saleData={completedSaleData}
        onNewSale={handleNewSale}
      />
    </div>
  );
}

export default SalesPage;
