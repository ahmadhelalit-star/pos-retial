import { Suspense, lazy, useCallback, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from './components/layout/AppHeader';
import { Sidebar } from './components/layout/Sidebar';
import { HeaderSearchSlotContext } from './components/layout/headerSearchSlot';
import { ACTIONS } from './store/appReducer';
import { validateCatalogProduct } from './domain/products';
import { useAppDispatch, useAppState } from './store/useAppStore';

const TAB_PATHS = {
  dashboard: '/dashboard',
  sales: '/sales',
  invoices: '/invoices',
  inventory: '/inventory',
  purchases: '/purchases',
  customers: '/customers',
  shift: '/shift',
  settings: '/settings',
};

const PATH_TABS = Object.fromEntries(
  Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab])
);

const DashboardPage = lazy(() =>
  import('./pages/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  }))
);
const SalesPage = lazy(() =>
  import('./pages/sales/SalesPage').then((module) => ({
    default: module.SalesPage,
  }))
);
const InvoicesPage = lazy(() =>
  import('./pages/invoices/InvoicesPage').then((module) => ({
    default: module.InvoicesPage,
  }))
);
const InventoryPage = lazy(() =>
  import('./pages/inventory/InventoryPage').then((module) => ({
    default: module.InventoryPage,
  }))
);
const PurchasesPage = lazy(() =>
  import('./pages/purchases/PurchasesPage').then((module) => ({
    default: module.PurchasesPage,
  }))
);
const CustomersPage = lazy(() =>
  import('./pages/customers/CustomersPage').then((module) => ({
    default: module.CustomersPage,
  }))
);
const ShiftPage = lazy(() =>
  import('./pages/shift/ShiftPage').then((module) => ({
    default: module.ShiftPage,
  }))
);
const SettingsPage = lazy(() =>
  import('./pages/settings/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  }))
);

function PageLoader() {
  return (
    <div className="h-full flex items-center justify-center text-sm font-bold text-gray-500">
      جارٍ التحميل…
    </div>
  );
}

export default function App() {
  const {
    invoices,
    products,
    customers,
    suppliers,
    purchaseInvoices,
    storeSettings,
    shift,
  } = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [headerSearchSlot, setHeaderSearchSlot] = useState(null);

  const activeTab = PATH_TABS[location.pathname] || 'sales';
  const searchParams = new URLSearchParams(location.search);
  const cashier = shift.cashier || 'سامر النجار';
  const taxRatePercent = Number(storeSettings.defaultTaxRate) || 0;
  const taxRate = taxRatePercent / 100;

  const handleTabChange = useCallback(
    (tab, query) => {
      const path = TAB_PATHS[tab] || TAB_PATHS.sales;
      const queryString = query ? new URLSearchParams(query).toString() : '';
      navigate(queryString ? `${path}?${queryString}` : path);
    },
    [navigate]
  );

  const handleSaleCompleted = useCallback(
    (invoice) => dispatch({ type: ACTIONS.SALE_COMPLETED, invoice }),
    [dispatch]
  );

  const handleUpdateInvoices = useCallback(
    (nextInvoices) =>
      dispatch({ type: ACTIONS.INVOICES_UPDATED, invoices: nextInvoices }),
    [dispatch]
  );

  const handleSaveProduct = useCallback(
    (product) => dispatch({ type: ACTIONS.PRODUCT_SAVED, product: validateCatalogProduct(products, product) }),
    [dispatch, products]
  );

  const handleDeleteProduct = useCallback(
    (id) => dispatch({ type: ACTIONS.PRODUCT_DELETED, id }),
    [dispatch]
  );

  const handleAdjustStock = useCallback(
    (id, delta) => dispatch({ type: ACTIONS.STOCK_ADJUSTED, id, delta }),
    [dispatch]
  );

  const handleSaveCustomer = useCallback(
    (customer) => dispatch({ type: ACTIONS.CUSTOMER_SAVED, customer }),
    [dispatch]
  );

  const handleDeleteCustomer = useCallback(
    (id) => dispatch({ type: ACTIONS.CUSTOMER_DELETED, id }),
    [dispatch]
  );

  const handleAdjustCustomerBalance = useCallback(
    (customerId, delta) =>
      dispatch({ type: ACTIONS.CUSTOMER_BALANCE_ADJUSTED, customerId, delta }),
    [dispatch]
  );

  const handleSaveSupplier = useCallback(
    (supplier) => dispatch({ type: ACTIONS.SUPPLIER_SAVED, supplier }),
    [dispatch]
  );

  const handleDeleteSupplier = useCallback(
    (id) => dispatch({ type: ACTIONS.SUPPLIER_DELETED, id }),
    [dispatch]
  );

  const handlePaySupplier = useCallback(
    (supplierId, amount) =>
      dispatch({ type: ACTIONS.SUPPLIER_PAID, supplierId, amount }),
    [dispatch]
  );

  const handleSavePurchaseInvoice = useCallback(
    (invoice) => dispatch({ type: ACTIONS.PURCHASE_INVOICE_SAVED, invoice }),
    [dispatch]
  );

  const handleUpdateShift = useCallback(
    (nextShift) => dispatch({ type: ACTIONS.SHIFT_UPDATED, shift: nextShift }),
    [dispatch]
  );

  const handleCloseShift = useCallback(
    (zReport) =>
      dispatch({
        type: ACTIONS.SHIFT_CLOSED,
        zReport,
        closedAt: new Date().toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }),
    [dispatch]
  );

  const handleOpenNewShift = useCallback(() => {
    const nextId = (parseInt(shift.id, 10) + 1).toString();
    const nowTime = new Date().toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    dispatch({
      type: ACTIONS.SHIFT_OPENED,
      shift: {
        id: nextId,
        cashier: shift.cashier,
        openedAt: nowTime,
        openingFloat: Number(storeSettings.defaultOpeningFloat) || 300,
        status: 'open',
      },
    });

    navigate(TAB_PATHS.sales);
  }, [dispatch, navigate, shift.cashier, shift.id, storeSettings.defaultOpeningFloat]);

  const handleSaveSettings = useCallback(
    (settings) => dispatch({ type: ACTIONS.SETTINGS_SAVED, settings }),
    [dispatch]
  );

  return (
    <HeaderSearchSlotContext.Provider value={headerSearchSlot}>
      <div className="flex h-screen w-screen overflow-hidden bg-gray-100 font-sans">
        <Sidebar
          storeSettings={storeSettings}
          cashier={cashier}
          shiftStatus={shift.status}
          invoicesCount={invoices.length}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            activeTab={activeTab}
            shift={shift}
            cashier={cashier}
            onTabChange={handleTabChange}
            searchSlotRef={setHeaderSearchSlot}
          />

        <main className="min-h-0 flex-1 overflow-hidden">
          <Suspense fallback={<PageLoader />}>
            <Routes>
            <Route path="/" element={<Navigate to={TAB_PATHS.sales} replace />} />

            <Route
              path={TAB_PATHS.dashboard}
              element={
                <DashboardPage
                  invoices={invoices}
                  products={products}
                  storeSettings={storeSettings}
                  onNavigateToPurchases={() => handleTabChange('purchases')}
                />
              }
            />

            <Route
              path={TAB_PATHS.sales}
              element={
                <SalesPage
                  products={products}
                  customers={customers}
                  onQuickAddCustomer={handleSaveCustomer}
                  onSaleCompleted={handleSaleCompleted}
                  isShiftOpen={shift.status === 'open'}
                  onNavigateToShift={() => handleTabChange('shift')}
                  storeSettings={storeSettings}
                  cashier={cashier}
                  invoices={invoices}
                />
              }
            />

            <Route
              path={TAB_PATHS.invoices}
              element={
                <InvoicesPage
                  key={location.search}
                  invoices={invoices}
                  onUpdateInvoices={handleUpdateInvoices}
                  initialStatusFilter={searchParams.get('status') || 'all'}
                  taxRate={taxRate}
                  storeSettings={storeSettings}
                  cashier={cashier}
                />
              }
            />

            <Route
              path={TAB_PATHS.inventory}
              element={
                <InventoryPage
                  key={location.search}
                  products={products}
                  initialLabelsOpen={searchParams.get('labels') === '1'}
                  taxRatePercent={taxRatePercent}
                  onSaveProduct={handleSaveProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onAdjustStock={handleAdjustStock}
                />
              }
            />

            <Route
              path={TAB_PATHS.purchases}
              element={
                <PurchasesPage
                  key={location.search}
                  suppliers={suppliers}
                  purchaseInvoices={purchaseInvoices}
                  products={products}
                  initialView={searchParams.get('view') || 'invoices'}
                  taxRatePercent={taxRatePercent}
                  onSavePurchaseInvoice={handleSavePurchaseInvoice}
                  onSaveSupplier={handleSaveSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                  onPaySupplier={handlePaySupplier}
                />
              }
            />

            <Route
              path={TAB_PATHS.customers}
              element={
                <CustomersPage
                  key={location.search}
                  customers={customers}
                  invoices={invoices}
                  initialTypeFilter={searchParams.get('type') || 'all'}
                  onSaveCustomer={handleSaveCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                  onAdjustCustomerBalance={handleAdjustCustomerBalance}
                />
              }
            />

            <Route
              path={TAB_PATHS.shift}
              element={
                <ShiftPage
                  shift={shift}
                  invoices={invoices}
                  onUpdateShift={handleUpdateShift}
                  onCloseShift={handleCloseShift}
                  onOpenNewShift={handleOpenNewShift}
                  taxRate={taxRate}
                  storeSettings={storeSettings}
                />
              }
            />

            <Route
              path={TAB_PATHS.settings}
              element={
                <SettingsPage
                  settings={storeSettings}
                  onSaveSettings={handleSaveSettings}
                />
              }
            />

            <Route
              path="*"
              element={<Navigate to={TAB_PATHS.sales} replace />}
            />
            </Routes>
          </Suspense>
        </main>
      </div>
      </div>
    </HeaderSearchSlotContext.Provider>
  );
}
