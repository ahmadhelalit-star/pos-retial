import { useState } from 'react';
import { ProductGrid } from './components/ProductGrid';
import { CartPanel } from './components/CartPanel';
import { PaymentModal } from './components/PaymentModal';
import { HeldOrdersModal } from './components/HeldOrdersModal';
import { ReceiptModal } from './components/ReceiptModal';
import { useCart } from '../../hooks/useCart';
import { MOCK_PRODUCTS } from '../../data/mockProducts';
import { nextDocumentNumber } from '../../domain/numbering';
import { PauseIcon, ShoppingBagIcon, StorefrontIcon } from '../../components/common/Icons';

export function SalesPage({
  products = MOCK_PRODUCTS,
  customers = [],
  invoices = [],
  onQuickAddCustomer,
  onSaleCompleted,
  isShiftOpen = true,
  onNavigateToShift,
  storeSettings = {},
  cashier = 'سامر النجار',
}) {
  const taxRate = (Number(storeSettings.defaultTaxRate) || 0) / 100;
  const allowNegativeStock = Boolean(storeSettings.allowNegativeStock);

  const {
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
  } = useCart({ taxRate, allowNegativeStock });

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedSaleData, setCompletedSaleData] = useState(null);
  const [mobileTab, setMobileTab] = useState('products'); // 'products' | 'cart'
  const [stockNotice, setStockNotice] = useState('');

  const handleAddToCart = (product) => {
    if (!isShiftOpen) return;
    const added = addToCart(product);
    if (!added) {
      setStockNotice(`لا توجد كمية متاحة إضافية من ${product.name}`);
      window.clearTimeout(handleAddToCart.noticeTimer);
      handleAddToCart.noticeTimer = window.setTimeout(() => setStockNotice(''), 2800);
    }
  };

  const handleIncrementQty = (productId) => {
    const incremented = incrementQty(productId);
    if (!incremented) {
      const product = products.find((item) => item.id === productId);
      setStockNotice(product ? `وصلت للحد المتاح من ${product.name}` : 'وصلت للحد المتاح من هذا المنتج');
      window.clearTimeout(handleIncrementQty.noticeTimer);
      handleIncrementQty.noticeTimer = window.setTimeout(() => setStockNotice(''), 2800);
    }
  };

  const handleRestoreHeldOrder = (orderId) => {
    const result = restoreHeldOrder(orderId, products);
    if (result?.adjusted) {
      setStockNotice('تم تعديل كميات الفاتورة المعلقة حسب المخزون المتاح حاليًا');
      window.clearTimeout(handleRestoreHeldOrder.noticeTimer);
      handleRestoreHeldOrder.noticeTimer = window.setTimeout(() => setStockNotice(''), 3500);
    }
  };

  // إتمام عملية البيع وفتح الإيصال وتمرير الفاتورة للسجل العام
  const handleCompleteSale = (paymentDetails) => {
    const invoiceNumber = nextDocumentNumber(invoices, 'INV', 6);
    const now = new Date();

    const saleRecord = {
      id: invoiceNumber,
      invoiceNumber,
      date: now.toLocaleDateString('ar-SA'),
      time: now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.getTime(),
      items: items.map((it) => ({
        ...it,
        productDiscountAmount: it.price * it.qty * (it.discountPercent || 0) / 100,
        returnedQty: 0,
      })),
      customer,
      subtotal,
      discountAmount,
      itemDiscountAmount,
      invoiceDiscountAmount,
      invoiceDiscountPercent: discountPercent,
      taxableAmount,
      taxAmount,
      grandTotal,
      payment: paymentDetails,
      paymentMethod:
        paymentDetails.paymentMethod ||
        (paymentDetails.method === 'cash'
          ? 'نقدي'
          : paymentDetails.method === 'credit'
          ? 'آجل'
          : 'شبكة'),
      status: paymentDetails.method === 'credit' ? 'آجل' : 'مدفوعة', // 'مدفوعة' | 'آجل' | 'مسترجعة' | 'مسترجع جزئي'
      cashier,
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

      {/* Main Screen: Split Products & Cart on desktop, Tabbed on mobile */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pb-14 lg:pb-0 relative">
        {/* Products Area */}
        <main
          className={`flex-1 h-full overflow-hidden ${
            mobileTab === 'products' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          <ProductGrid
            products={products}
            onAddToCart={handleAddToCart}
          />
        </main>

        {/* Cart & Billing Area */}
        <aside
          className={`w-full lg:w-[400px] xl:w-[440px] h-full overflow-hidden border-t lg:border-t-0 lg:border-r border-gray-200 ${
            mobileTab === 'cart' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          <CartPanel
            items={items}
            customer={customer}
            setCustomer={setCustomer}
            customers={customers}
            onQuickAddCustomer={onQuickAddCustomer}
            onIncrement={handleIncrementQty}
            onDecrement={decrementQty}
            onRemove={removeFromCart}
            onDiscountChange={setItemDiscountPercent}
            onClearCart={clearCart}
            onHoldOrder={holdOrder}
            onOpenPayment={() => {
              if (!isShiftOpen) return;
              setIsPaymentOpen(true);
            }}
            discountPercent={discountPercent}
            setDiscountPercent={setDiscountPercent}
            subtotal={subtotal}
            itemDiscountAmount={itemDiscountAmount}
            invoiceDiscountAmount={invoiceDiscountAmount}
            taxAmount={taxAmount}
            taxRate={taxRate}
            grandTotal={grandTotal}
            totalItemsCount={totalItemsCount}
          />
        </aside>

        {/* Mobile Sticky Bottom Tab Bar (< lg) */}
        <div className="lg:hidden absolute bottom-0 inset-x-0 bg-white border-t border-gray-200 px-3 py-2 flex items-center justify-around z-20 shadow-lg">
          <button
            type="button"
            onClick={() => setMobileTab('products')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mobileTab === 'products'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <StorefrontIcon className="w-4 h-4" />
            <span>المنتجات</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              mobileTab === 'cart'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ShoppingBagIcon className="w-4 h-4" />
            <span>السلة</span>
            {totalItemsCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  mobileTab === 'cart'
                    ? 'bg-white text-emerald-800'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {totalItemsCount}
              </span>
            )}
            {grandTotal > 0 && (
              <span className="text-[11px] font-mono font-bold">
                ({grandTotal.toFixed(2)} ر.س)
              </span>
            )}
          </button>
        </div>
      </div>

      {stockNotice && (
        <div role="status" className="fixed bottom-20 lg:bottom-5 left-5 z-40 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 shadow-lg">
          {stockNotice}
        </div>
      )}

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        grandTotal={grandTotal}
        customer={customer}
        onCompleteSale={handleCompleteSale}
      />

      <HeldOrdersModal
        isOpen={isHeldOrdersOpen}
        onClose={() => setIsHeldOrdersOpen(false)}
        heldOrders={heldOrders}
        onRestoreOrder={handleRestoreHeldOrder}
        onDeleteOrder={deleteHeldOrder}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        saleData={completedSaleData}
        onNewSale={handleNewSale}
        storeSettings={storeSettings}
      />
    </div>
  );
}

export default SalesPage;
