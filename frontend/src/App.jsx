import { useState } from 'react';
import { Navbar } from './components/common/Navbar';
import { SalesPage } from './pages/sales/SalesPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { ShiftPage } from './pages/shift/ShiftPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { INITIAL_INVOICES } from './data/mockInvoices';
import { MOCK_PRODUCTS } from './data/mockProducts';

export default function App() {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'invoices' | 'inventory' | 'shift'
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [products, setProducts] = useState(MOCK_PRODUCTS);

  // إدارة حالة الوردية
  const [shift, setShift] = useState({
    id: '102',
    cashier: 'سامر النجار',
    openedAt: '08:00 ص',
    openingFloat: 300.00,
    status: 'open', // 'open' | 'closed'
  });

  // خصم المخزون عند إتمام بيع
  const deductStock = (items) => {
    setProducts((prev) =>
      prev.map((p) => {
        const soldItem = items.find((i) => i.id === p.id);
        if (!soldItem) return p;
        return { ...p, stock: Math.max(0, (p.stock ?? 0) - soldItem.qty) };
      })
    );
  };

  // إعادة المخزون عند مرتجع
  const restoreStock = (prevInvoices, nextInvoices) => {
    // احسب الفرق في الكميات المرتجعة بين القديم والجديد
    const deltas = {};
    nextInvoices.forEach((inv) => {
      const prevInv = prevInvoices.find((p) => p.id === inv.id);
      if (!prevInv || !inv.items) return;
      inv.items.forEach((item) => {
        const prevItem = prevInv.items?.find((pi) => pi.id === item.id);
        const prevReturned = prevItem?.returnedQty ?? 0;
        const currReturned = item.returnedQty ?? 0;
        const diff = currReturned - prevReturned;
        if (diff > 0) {
          deltas[item.id] = (deltas[item.id] ?? 0) + diff;
        }
      });
    });

    if (Object.keys(deltas).length === 0) return;

    setProducts((prev) =>
      prev.map((p) => {
        if (!deltas[p.id]) return p;
        return { ...p, stock: (p.stock ?? 0) + deltas[p.id] };
      })
    );
  };

  // عند إتمام بيع جديد في نقطة البيع
  const handleSaleCompleted = (newInvoice) => {
    setInvoices((prev) => [newInvoice, ...prev]);
    deductStock(newInvoice.items ?? []);
  };

  // تحديث الفواتير (بعد مرتجع) مع إعادة المخزون
  const handleUpdateInvoices = (nextInvoices) => {
    setInvoices((prev) => {
      restoreStock(prev, nextInvoices);
      return nextInvoices;
    });
  };

  // ---- إدارة المنتجات (Inventory CRUD) ----
  const handleSaveProduct = (prod) => {
    setProducts((prev) => {
      const exists = prev.find((p) => p.id === prod.id);
      if (exists) return prev.map((p) => (p.id === prod.id ? prod : p));
      return [...prev, prod];
    });
  };

  const handleDeleteProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAdjustStock = (id, delta) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, stock: Math.max(0, (p.stock ?? 0) + delta) } : p
      )
    );
  };

  // إغلاق الوردية
  const handleCloseShift = (zReport) => {
    setShift((prev) => ({
      ...prev,
      status: 'closed',
      closedAt: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      zReport,
    }));
  };

  // فتح وردية جديدة
  const handleOpenNewShift = () => {
    const nextId = (parseInt(shift.id, 10) + 1).toString();
    const nowTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    setShift({
      id: nextId,
      cashier: 'سامر النجار',
      openedAt: nowTime,
      openingFloat: 300.00,
      status: 'open',
    });

    setActiveTab('sales');
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-100 font-sans">
      {/* Global POS Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        invoicesCount={invoices.length}
        shiftStatus={shift.status}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'sales' && (
          <SalesPage
            products={products}
            onSaleCompleted={handleSaleCompleted}
            isShiftOpen={shift.status === 'open'}
            onNavigateToShift={() => setActiveTab('shift')}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesPage
            invoices={invoices}
            onUpdateInvoices={handleUpdateInvoices}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryPage
            products={products}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onAdjustStock={handleAdjustStock}
          />
        )}

        {activeTab === 'shift' && (
          <ShiftPage
            shift={shift}
            invoices={invoices}
            products={products}
            onUpdateShift={setShift}
            onCloseShift={handleCloseShift}
            onOpenNewShift={handleOpenNewShift}
          />
        )}
      </div>
    </div>
  );
}
