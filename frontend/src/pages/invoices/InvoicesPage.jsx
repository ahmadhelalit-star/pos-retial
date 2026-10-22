import { useState, useMemo } from 'react';
import { useHeaderSearchSlot } from '../../components/layout/headerSearchSlot';
import { InvoicesSummaryCards } from './components/InvoicesSummaryCards';
import { InvoicesFilterBar } from './components/InvoicesFilterBar';
import { InvoicesList } from './components/InvoicesList';
import { InvoiceDetailsModal } from './components/InvoiceDetailsModal';
import { ReturnModal } from './components/ReturnModal';
import { ReturnReceiptModal } from './components/ReturnReceiptModal';
import { ReceiptModal } from '../sales/components/ReceiptModal';

export function InvoicesPage({
  invoices = [],
  onUpdateInvoices,
  initialStatusFilter = 'all',
  taxRate = 0.15,
  storeSettings = {},
  cashier = 'سامر النجار',
}) {
  const validStatusFilters = ['all', 'paid', 'refunded'];
  const headerSearchSlot = useHeaderSearchSlot();

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'cash' | 'card'
  const [statusFilter, setStatusFilter] = useState(
    validStatusFilters.includes(initialStatusFilter) ? initialStatusFilter : 'all'
  ); // 'all' | 'paid' | 'refunded'

  // Modals state
  const [detailsInvoice, setDetailsInvoice] = useState(null);
  const [returnInvoice, setReturnInvoice] = useState(null);
  const [reprintData, setReprintData] = useState(null);
  const [latestReturnData, setLatestReturnData] = useState(null);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Search query
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.customer?.name && inv.customer.name.toLowerCase().includes(q)) ||
        (inv.customer?.phone && inv.customer.phone.includes(q));

      // Payment filter
      let matchesPayment = true;
      if (paymentFilter === 'cash') matchesPayment = inv.paymentMethod === 'نقدي';
      if (paymentFilter === 'card') matchesPayment = inv.paymentMethod === 'شبكة';
      if (paymentFilter === 'split') matchesPayment = inv.paymentMethod === 'مختلط' || inv.payment?.method === 'split';

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'paid') matchesStatus = inv.status === 'مدفوعة';
      if (statusFilter === 'refunded') {
        matchesStatus = inv.status === 'مسترجعة' || inv.status === 'مسترجع جزئي';
      }

      return matchesSearch && matchesPayment && matchesStatus;
    });
  }, [invoices, searchQuery, paymentFilter, statusFilter]);

  const isFiltered =
    Boolean(searchQuery.trim()) || paymentFilter !== 'all' || statusFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setPaymentFilter('all');
    setStatusFilter('all');
  };

  // Handle return submission
  const handleConfirmReturn = (returnPayload) => {
    const { invoiceId, returnedItems } = returnPayload;

    const updatedList = invoices.map((inv) => {
      if (inv.id !== invoiceId) return inv;

      // Update items returned quantities
      const updatedItems = inv.items.map((it) => {
        const foundReturn = returnedItems.find((r) => r.id === it.id);
        if (foundReturn) {
          return {
            ...it,
            returnedQty: (it.returnedQty || 0) + foundReturn.qtyToReturn,
            restockedQty:
              (it.restockedQty ?? it.returnedQty ?? 0) + (foundReturn.restockQty ?? foundReturn.qtyToReturn),
          };
        }
        return it;
      });

      // Check if all items are fully returned
      const totalOriginalQty = updatedItems.reduce((sum, it) => sum + it.qty, 0);
      const totalReturnedQty = updatedItems.reduce((sum, it) => sum + (it.returnedQty || 0), 0);

      let newStatus = 'مسترجع جزئي';
      if (totalReturnedQty >= totalOriginalQty) {
        newStatus = 'مسترجعة';
      }

      return {
        ...inv,
        items: updatedItems,
        status: newStatus,
      };
    });

    if (onUpdateInvoices) {
      onUpdateInvoices(updatedList);
    }

    setReturnInvoice(null);
    setLatestReturnData({
      ...returnPayload,
      creditNoteNumber: `CR-${Date.now().toString().slice(-6)}`,
      cashier,
    });
  };

  // Format reprint data to match ReceiptModal contract
  const handleOpenReprint = (inv) => {
    setReprintData({
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      time: inv.time,
      cashier: inv.cashier || cashier,
      customer: inv.customer,
      items: inv.items,
      subtotal: inv.subtotal,
      discountAmount: inv.discountAmount,
      taxableAmount: inv.taxableAmount,
      taxAmount: inv.taxAmount,
      grandTotal: inv.grandTotal,
      payment: inv.payment || {
        method: inv.paymentMethod === 'نقدي' ? 'cash' : inv.paymentMethod === 'مختلط' ? 'split' : 'card',
        tendered: inv.grandTotal,
        change: 0,
      },
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 overflow-y-auto font-sans pb-8">
      {/* Top Summary Stats */}
      <InvoicesSummaryCards invoices={invoices} taxRate={taxRate} />

      {/* Filter Bar */}
      <InvoicesFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={setPaymentFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
        searchPortalTarget={headerSearchSlot}
      />

      {/* Invoices List */}
      <div className="flex-1">
        <InvoicesList
          invoices={filteredInvoices}
          onViewDetails={(inv) => setDetailsInvoice(inv)}
          onReprint={handleOpenReprint}
          onInitiateReturn={(inv) => setReturnInvoice(inv)}
        />
      </div>

      {/* Modals */}
      <InvoiceDetailsModal
        isOpen={Boolean(detailsInvoice)}
        onClose={() => setDetailsInvoice(null)}
        invoice={detailsInvoice}
        onReprint={(inv) => {
          setDetailsInvoice(null);
          handleOpenReprint(inv);
        }}
        onInitiateReturn={(inv) => {
          setDetailsInvoice(null);
          setReturnInvoice(inv);
        }}
      />

      <ReturnModal
        isOpen={Boolean(returnInvoice)}
        onClose={() => setReturnInvoice(null)}
        invoice={returnInvoice}
        taxRate={taxRate}
        onConfirmReturn={handleConfirmReturn}
      />

      <ReturnReceiptModal
        isOpen={Boolean(latestReturnData)}
        onClose={() => setLatestReturnData(null)}
        returnData={latestReturnData}
        storeSettings={storeSettings}
      />

      <ReceiptModal
        isOpen={Boolean(reprintData)}
        onClose={() => setReprintData(null)}
        saleData={reprintData}
        storeSettings={storeSettings}
        onNewSale={() => setReprintData(null)}
      />
    </div>
  );
}

export default InvoicesPage;
