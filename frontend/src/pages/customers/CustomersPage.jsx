import { useState, useMemo } from 'react';
import { useHeaderSearchSlot } from '../../components/layout/headerSearchSlot';
import { CustomerSummaryCards } from './components/CustomerSummaryCards';
import { CustomerFilterBar } from './components/CustomerFilterBar';
import { CustomerListTable } from './components/CustomerListTable';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomerStatementModal } from './components/CustomerStatementModal';

export function CustomersPage({
  customers = [],
  invoices = [],
  initialTypeFilter = 'all',
  onSaveCustomer,
  onDeleteCustomer,
  onAdjustCustomerBalance,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const headerSearchSlot = useHeaderSearchSlot();
  const [typeFilter, setTypeFilter] = useState(
    initialTypeFilter === 'individual' || initialTypeFilter === 'company'
      ? initialTypeFilter
      : 'all'
  ); // 'all' | 'individual' | 'company'
  const [balanceFilter, setBalanceFilter] = useState('all'); // 'all' | 'debtors'

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [customerForStatement, setCustomerForStatement] = useState(null);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Search matching (name, phone, taxNumber)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = (c.name || '').toLowerCase().includes(query);
        const matchesPhone = (c.phone || '').includes(query);
        const matchesTax = (c.taxNumber || '').includes(query);
        if (!matchesName && !matchesPhone && !matchesTax) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && c.type !== typeFilter) {
        return false;
      }

      // Debtors filter
      if (balanceFilter === 'debtors' && (c.balance || 0) <= 0) {
        return false;
      }

      return true;
    });
  }, [customers, searchQuery, typeFilter, balanceFilter]);

  const handleOpenAdd = () => {
    setCustomerToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c) => {
    setCustomerToEdit(c);
    setIsFormOpen(true);
  };

  const handleOpenStatement = (c) => {
    setCustomerForStatement(c);
    setIsStatementOpen(true);
  };

  const handleMakePayment = (customerId, amount, paymentDetails) => {
    onAdjustCustomerBalance(customerId, -amount);
    // Update local selected customer statement state if open
    setCustomerForStatement((prev) =>
      prev && prev.id === customerId
        ? { ...prev, balance: Math.max(0, (prev.balance || 0) - amount) }
        : prev
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* 1. Summary Cards */}
      <CustomerSummaryCards customers={customers} />

      {/* 2. Filter & Search Bar */}
      <CustomerFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        balanceFilter={balanceFilter}
        onBalanceFilterChange={setBalanceFilter}
        onAddNewCustomer={handleOpenAdd}
        searchPortalTarget={headerSearchSlot}
      />

      {/* 3. Customers Table */}
      <CustomerListTable
        customers={filteredCustomers}
        onEditCustomer={handleOpenEdit}
        onDeleteCustomer={onDeleteCustomer}
        onOpenStatement={handleOpenStatement}
      />

      {/* 4. Modals */}
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setCustomerToEdit(null);
        }}
        customerToEdit={customerToEdit}
        onSaveCustomer={onSaveCustomer}
      />

      <CustomerStatementModal
        isOpen={isStatementOpen}
        onClose={() => {
          setIsStatementOpen(false);
          setCustomerForStatement(null);
        }}
        customer={customerForStatement}
        invoices={invoices}
        onMakePayment={handleMakePayment}
      />
    </div>
  );
}
