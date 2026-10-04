import { useState, useMemo } from 'react';
import { ShiftOverviewCard } from './components/ShiftOverviewCard';
import { ShiftFinancialCards } from './components/ShiftFinancialCards';
import { CashDenominationTable, DENOMINATIONS } from './components/CashDenominationTable';
import { ReconciliationBanner } from './components/ReconciliationBanner';
import { ZReportModal } from './components/ZReportModal';

export function ShiftPage({
  shift,
  invoices = [],
  onUpdateShift,
  onCloseShift,
  onOpenNewShift,
}) {
  // Counts of each currency denomination in drawer
  const [counts, setCounts] = useState(() => {
    const init = {};
    DENOMINATIONS.forEach((d) => {
      init[d.value] = 0;
    });
    return init;
  });

  const [notes, setNotes] = useState('');
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  const [zReportData, setZReportData] = useState(null);

  // Financial calculations from current shift's invoices
  const {
    cashSales,
    cardSales,
    cashRefunds,
    cardRefunds,
    taxCollected,
    taxRefunded,
    expectedCashInDrawer,
    netSales,
  } = useMemo(() => {
    let cash = 0;
    let card = 0;
    let refundCash = 0;
    let refundCard = 0;
    let taxCol = 0;
    let taxRef = 0;

    invoices.forEach((inv) => {
      const paymentMethod = inv.payment?.method;
      const isCash = paymentMethod === 'cash' || (!paymentMethod && inv.paymentMethod === 'نقدي');

      if (paymentMethod === 'split') {
        cash += inv.payment.cashAmount || 0;
        card += inv.payment.cardAmount || 0;
      } else if (isCash) {
        cash += inv.grandTotal;
      } else {
        card += inv.grandTotal;
      }

      taxCol += inv.taxAmount || 0;

      // Check item returns
      if (inv.items) {
        inv.items.forEach((it) => {
          const ret = it.returnedQty || 0;
          if (ret > 0) {
            const itemGross = ret * it.price * 1.15; // مع الضريبة
            const itemTax = ret * it.price * 0.15;
            taxRef += itemTax;

            if (isCash) {
              refundCash += itemGross;
            } else {
              refundCard += itemGross;
            }
          }
        });
      }
    });

    const expectedCash = shift.openingFloat + cash - refundCash;
    const net = cash + card - (refundCash + refundCard);

    return {
      cashSales: cash,
      cardSales: card,
      cashRefunds: refundCash,
      cardRefunds: refundCard,
      taxCollected: taxCol,
      taxRefunded: taxRef,
      expectedCashInDrawer: expectedCash,
      netSales: net,
    };
  }, [invoices, shift.openingFloat]);

  // Actual cash physically counted
  const actualCountedTotal = useMemo(() => {
    return Object.entries(counts).reduce((sum, [denom, qty]) => {
      return sum + parseFloat(denom) * (qty || 0);
    }, 0);
  }, [counts]);

  // Handle stepping/setting count of denomination
  const handleCountChange = (denom, newQty) => {
    setCounts((prev) => ({
      ...prev,
      [denom]: newQty,
    }));
  };

  const handleResetCounts = () => {
    const cleared = {};
    DENOMINATIONS.forEach((d) => {
      cleared[d.value] = 0;
    });
    setCounts(cleared);
  };

  // Autofill expected cash into denominations for fast balancing
  const handleAutofillExpected = () => {
    let remaining = Math.round(expectedCashInDrawer * 100) / 100;
    const autofilled = {};

    DENOMINATIONS.forEach((d) => {
      if (remaining >= d.value) {
        const count = Math.floor(remaining / d.value);
        autofilled[d.value] = count;
        remaining = Math.round((remaining - count * d.value) * 100) / 100;
      } else {
        autofilled[d.value] = 0;
      }
    });

    setCounts(autofilled);
  };

  // Close Shift & Produce Z-Report
  const handleInitiateCloseShift = () => {
    const report = {
      shiftId: shift.id,
      cashier: shift.cashier,
      openedAt: shift.openedAt,
      openingFloat: shift.openingFloat,
      cashSales,
      cardSales,
      cashRefunds,
      cardRefunds,
      taxCollected,
      taxRefunded,
      expectedCash: expectedCashInDrawer,
      actualCash: actualCountedTotal,
      netSales,
      notes,
    };

    setZReportData(report);
    setIsZReportOpen(true);

    if (onCloseShift) {
      onCloseShift(report);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 overflow-y-auto font-sans pb-10">
      {/* 1. Shift Overview */}
      <ShiftOverviewCard
        shift={shift}
        onUpdateOpeningFloat={(newFloat) =>
          onUpdateShift({ ...shift, openingFloat: newFloat })
        }
        onOpenNewShift={onOpenNewShift}
      />

      {/* 2. Financial System Cards */}
      <ShiftFinancialCards
        openingFloat={shift.openingFloat}
        cashSales={cashSales}
        cardSales={cardSales}
        cashRefunds={cashRefunds}
        cardRefunds={cardRefunds}
        expectedCashInDrawer={expectedCashInDrawer}
        netSales={netSales}
        invoicesCount={invoices.length}
      />

      {/* 3. Denomination Counter */}
      <CashDenominationTable
        counts={counts}
        onCountChange={handleCountChange}
        onResetCounts={handleResetCounts}
        onAutofillExpected={handleAutofillExpected}
        actualCountedTotal={actualCountedTotal}
        expectedTotal={expectedCashInDrawer}
        isShiftOpen={shift.status === 'open'}
      />

      {/* 4. Discrepancy & Close Shift Banner */}
      <ReconciliationBanner
        expectedCash={expectedCashInDrawer}
        actualCash={actualCountedTotal}
        notes={notes}
        onNotesChange={setNotes}
        onInitiateCloseShift={handleInitiateCloseShift}
        isShiftOpen={shift.status === 'open'}
      />

      {/* 5. Z-Report Modal */}
      <ZReportModal
        isOpen={isZReportOpen}
        onClose={() => setIsZReportOpen(false)}
        reportData={zReportData}
      />
    </div>
  );
}

export default ShiftPage;
