import { useState, useMemo } from 'react';
import { PurchasesSummaryCards } from './components/PurchasesSummaryCards';
import { PurchaseFilterBar } from './components/PurchaseFilterBar';
import { PurchaseInvoicesList } from './components/PurchaseInvoicesList';
import { SuppliersTable } from './components/SuppliersTable';
import { NewPurchaseInvoiceModal } from './components/NewPurchaseInvoiceModal';
import { PurchaseInvoiceDetailsModal } from './components/PurchaseInvoiceDetailsModal';
import { SupplierFormModal } from './components/SupplierFormModal';
import { SupplierStatementModal } from './components/SupplierStatementModal';

export function PurchasesPage({
  suppliers = [],
  purchaseInvoices = [],
  products = [],
  onSavePurchaseInvoice,
  onSaveSupplier,
  onDeleteSupplier,
  onPaySupplier,
}) {
  const [activeView, setActiveView] = useState('invoices'); // 'invoices' | 'suppliers'
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'unpaid' | 'paid' | 'partial'

  // Modals state
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState(null);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState(null);

  // Filtered Purchase Invoices
  const filteredInvoices = useMemo(() => {
    return purchaseInvoices.filter((inv) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesInvNum = (inv.invoiceNumber || '').toLowerCase().includes(q);
        const matchesSupInv = (inv.supplierInvoiceNo || '').toLowerCase().includes(q);
        const matchesSupplier = (inv.supplierName || '').toLowerCase().includes(q);
        if (!matchesInvNum && !matchesSupInv && !matchesSupplier) {
          return false;
        }
      }

      // 2. Payment Filter
      if (paymentFilter !== 'all') {
        if (paymentFilter === 'unpaid' && inv.paymentStatus !== 'unpaid') return false;
        if (paymentFilter === 'paid' && inv.paymentStatus !== 'paid') return false;
        if (paymentFilter === 'partial' && inv.paymentStatus !== 'partial') return false;
      }

      return true;
    });
  }, [purchaseInvoices, searchQuery, paymentFilter]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (sup.name || '').toLowerCase().includes(q);
        const matchesCompany = (sup.companyName || '').toLowerCase().includes(q);
        const matchesPhone = (sup.phone || '').includes(q);
        const matchesTax = (sup.taxNumber || '').includes(q);
        if (!matchesName && !matchesCompany && !matchesPhone && !matchesTax) {
          return false;
        }
      }
      return true;
    });
  }, [suppliers, searchQuery]);

  // Action handlers
  const handleOpenAddSupplier = () => {
    setSupplierToEdit(null);
    setIsSupplierFormOpen(true);
  };

  const handleOpenEditSupplier = (sup) => {
    setSupplierToEdit(sup);
    setIsSupplierFormOpen(true);
  };

  const handleOpenStatement = (sup) => {
    setSelectedSupplierForStatement(sup);
    setIsStatementOpen(true);
  };

  const handlePaySupplierDirect = (sup) => {
    setSelectedSupplierForStatement(sup);
    setIsStatementOpen(true);
  };

  const handleRecordPaymentForInvoice = (inv) => {
    const sup = suppliers.find((s) => s.id === inv.supplierId);
    if (sup) {
      setSelectedSupplierForStatement(sup);
      setIsStatementOpen(true);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* 1. Summary Cards */}
      <PurchasesSummaryCards
        suppliers={suppliers}
        purchaseInvoices={purchaseInvoices}
      />

      {/* 2. Filter & Actions Bar */}
      <PurchaseFilterBar
        activeView={activeView}
        onViewChange={setActiveView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        onAddNewInvoice={() => setIsNewInvoiceOpen(true)}
        onAddNewSupplier={handleOpenAddSupplier}
        invoicesCount={purchaseInvoices.length}
        suppliersCount={suppliers.length}
      />

      {/* 3. Main List Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeView === 'invoices' ? (
          <PurchaseInvoicesList
            invoices={filteredInvoices}
            onViewInvoice={(inv) => setSelectedInvoiceForDetails(inv)}
            onRecordPayment={handleRecordPaymentForInvoice}
          />
        ) : (
          <SuppliersTable
            suppliers={filteredSuppliers}
            onEditSupplier={handleOpenEditSupplier}
            onDeleteSupplier={onDeleteSupplier}
            onOpenStatement={handleOpenStatement}
            onPaySupplier={handlePaySupplierDirect}
          />
        )}
      </div>

      {/* New Purchase Invoice Modal */}
      <NewPurchaseInvoiceModal
        isOpen={isNewInvoiceOpen}
        onClose={() => setIsNewInvoiceOpen(false)}
        suppliers={suppliers}
        products={products}
        onSavePurchaseInvoice={onSavePurchaseInvoice}
        onQuickAddSupplier={handleOpenAddSupplier}
      />

      {/* Purchase Invoice Details Modal */}
      <PurchaseInvoiceDetailsModal
        isOpen={Boolean(selectedInvoiceForDetails)}
        onClose={() => setSelectedInvoiceForDetails(null)}
        invoice={selectedInvoiceForDetails}
        onRecordPayment={handleRecordPaymentForInvoice}
      />

      {/* Supplier Form Modal (Add / Edit) */}
      <SupplierFormModal
        isOpen={isSupplierFormOpen}
        onClose={() => setIsSupplierFormOpen(false)}
        supplierToEdit={supplierToEdit}
        onSaveSupplier={onSaveSupplier}
      />

      {/* Supplier Statement Modal & Payment */}
      <SupplierStatementModal
        isOpen={isStatementOpen}
        onClose={() => {
          setIsStatementOpen(false);
          setSelectedSupplierForStatement(null);
        }}
        supplier={selectedSupplierForStatement}
        invoices={purchaseInvoices}
        onMakePayment={onPaySupplier}
      />
    </div>
  );
}
