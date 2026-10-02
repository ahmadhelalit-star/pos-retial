import { useState } from 'react';
import { Navbar } from './components/common/Navbar';
import { SalesPage } from './pages/sales/SalesPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { PurchasesPage } from './pages/purchases/PurchasesPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ShiftPage } from './pages/shift/ShiftPage';
import { INITIAL_INVOICES } from './data/mockInvoices';
import { MOCK_PRODUCTS } from './data/mockProducts';
import { INITIAL_CUSTOMERS } from './data/mockCustomers';
import { INITIAL_SUPPLIERS } from './data/mockSuppliers';
import { INITIAL_PURCHASE_INVOICES } from './data/mockPurchaseInvoices';
import { DEFAULT_STORE_SETTINGS } from './data/defaultSettings';

export default function App() {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'invoices' | 'inventory' | 'purchases' | 'customers' | 'shift' | 'settings'
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [suppliers, setSuppliers] = useState(INITIAL_SUPPLIERS);
  const [purchaseInvoices, setPurchaseInvoices] = useState(INITIAL_PURCHASE_INVOICES);
  const [storeSettings, setStoreSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('shamtouch_store_settings');
      return saved ? JSON.parse(saved) : DEFAULT_STORE_SETTINGS;
    } catch {
      return DEFAULT_STORE_SETTINGS;
    }
  });

  const handleSaveSettings = (newSettings) => {
    setStoreSettings(newSettings);
    try {
      localStorage.setItem('shamtouch_store_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  };

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

    // تحديث رصيد العميل الآجل ونقاط الولاء وسجل مشترياته
    if (newInvoice.customer && newInvoice.customer.id !== 'walk-in') {
      const custId = newInvoice.customer.id;
      const isCredit = newInvoice.payment?.method === 'credit';
      const earnedPoints = Math.floor((newInvoice.grandTotal || 0) / 10);

      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== custId) return c;
          return {
            ...c,
            balance: isCredit ? (c.balance || 0) + newInvoice.grandTotal : c.balance,
            points: (c.points || 0) + earnedPoints,
            totalPurchases: (c.totalPurchases || 0) + newInvoice.grandTotal,
            invoicesCount: (c.invoicesCount || 0) + 1,
          };
        })
      );
    }
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

  // ---- إدارة العملاء (Customers CRUD & Balance) ----
  const handleSaveCustomer = (customer) => {
    setCustomers((prev) => {
      const exists = prev.find((c) => c.id === customer.id);
      if (exists) return prev.map((c) => (c.id === customer.id ? customer : c));
      return [customer, ...prev];
    });
  };

  const handleDeleteCustomer = (id) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAdjustCustomerBalance = (customerId, delta) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? { ...c, balance: Math.max(0, (c.balance || 0) + delta) }
          : c
      )
    );
  };

  // ---- إدارة الموردين وفواتير الشراء (Purchases & Suppliers) ----
  const handleSaveSupplier = (supplier) => {
    setSuppliers((prev) => {
      const exists = prev.find((s) => s.id === supplier.id);
      if (exists) return prev.map((s) => (s.id === supplier.id ? supplier : s));
      return [supplier, ...prev];
    });
  };

  const handleDeleteSupplier = (id) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  };

  const handlePaySupplier = (supplierId, amount, paymentDetails) => {
    // 1. خصم الرصيد المستحق للمورد
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === supplierId
          ? { ...s, balance: Math.max(0, (s.balance || 0) - amount) }
          : s
      )
    );

    // 2. تحديث حالة الفواتير غير المسددة لهذا المورد
    setPurchaseInvoices((prev) => {
      let remainingToPay = amount;
      return prev.map((inv) => {
        if (
          inv.supplierId !== supplierId ||
          inv.paymentStatus === 'paid' ||
          remainingToPay <= 0
        ) {
          return inv;
        }
        const rem = inv.remainingAmount || 0;
        if (rem <= 0) return inv;

        const paymentForThis = Math.min(rem, remainingToPay);
        remainingToPay -= paymentForThis;
        const newRem = rem - paymentForThis;

        return {
          ...inv,
          paidAmount: (inv.paidAmount || 0) + paymentForThis,
          remainingAmount: newRem,
          paymentStatus: newRem <= 0.001 ? 'paid' : 'partial',
        };
      });
    });
  };

  const handleSavePurchaseInvoice = (newInvoice) => {
    // 1. إضافة الفاتورة لقائمة فواتير الشراء
    setPurchaseInvoices((prev) => [newInvoice, ...prev]);

    // 2. زيادة كميات المخزون وتحديث أسعار التكلفة للمنتجات
    setProducts((prev) => {
      let updated = [...prev];
      newInvoice.items.forEach((item) => {
        const existingIdx = updated.findIndex((p) => p.id === item.id);
        if (existingIdx >= 0) {
          const currentProd = updated[existingIdx];
          updated[existingIdx] = {
            ...currentProd,
            stock: (currentProd.stock ?? 0) + item.qty,
            costPrice: item.costPrice,
            price: item.sellingPrice || currentProd.price,
          };
        } else {
          // إذا كان صنفاً جديداً تمت إضافته عبر فاتورة الشراء
          updated.push({
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
        }
      });
      return updated;
    });

    // 3. تحديث حساب المورد (زيادة المشتريات وإضافة المتبقي الآجل للرصيد)
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id !== newInvoice.supplierId) return s;
        return {
          ...s,
          balance: (s.balance || 0) + (newInvoice.remainingAmount || 0),
          totalPurchases: (s.totalPurchases || 0) + (newInvoice.grandTotal || 0),
          invoicesCount: (s.invoicesCount || 0) + 1,
        };
      })
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
        storeSettings={storeSettings}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'sales' && (
          <SalesPage
            products={products}
            customers={customers}
            onQuickAddCustomer={handleSaveCustomer}
            onSaleCompleted={handleSaleCompleted}
            isShiftOpen={shift.status === 'open'}
            onNavigateToShift={() => setActiveTab('shift')}
            storeSettings={storeSettings}
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

        {activeTab === 'purchases' && (
          <PurchasesPage
            suppliers={suppliers}
            purchaseInvoices={purchaseInvoices}
            products={products}
            onSavePurchaseInvoice={handleSavePurchaseInvoice}
            onSaveSupplier={handleSaveSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onPaySupplier={handlePaySupplier}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersPage
            customers={customers}
            invoices={invoices}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onAdjustCustomerBalance={handleAdjustCustomerBalance}
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

        {activeTab === 'settings' && (
          <SettingsPage
            settings={storeSettings}
            onSaveSettings={handleSaveSettings}
          />
        )}
      </div>
    </div>
  );
}
