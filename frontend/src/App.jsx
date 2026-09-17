import { useState } from 'react';
import { Navbar } from './components/common/Navbar';
import { SalesPage } from './pages/sales/SalesPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { INITIAL_INVOICES } from './data/mockInvoices';

export default function App() {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'invoices'
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);

  // عند إتمام بيع جديد في نقطة البيع، يتم تسجيل الفاتورة في السجل العام تلقائياً
  const handleSaleCompleted = (newInvoice) => {
    setInvoices((prev) => [newInvoice, ...prev]);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-100 font-sans">
      {/* Global POS Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        invoicesCount={invoices.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'sales' && (
          <SalesPage onSaleCompleted={handleSaleCompleted} />
        )}

        {activeTab === 'invoices' && (
          <InvoicesPage
            invoices={invoices}
            onUpdateInvoices={setInvoices}
          />
        )}
      </div>
    </div>
  );
}
