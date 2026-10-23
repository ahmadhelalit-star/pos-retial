import { useState, useMemo } from 'react';
import { DashboardSummaryCards } from './components/DashboardSummaryCards';
import { SalesTrendChart } from './components/SalesTrendChart';
import { PaymentMethodsChart } from './components/PaymentMethodsChart';
import { CategoryBreakdownChart } from './components/CategoryBreakdownChart';
import { TopProductsTable } from './components/TopProductsTable';
import { LowStockAlertCard } from './components/LowStockAlertCard';
import { CATEGORIES } from '../../data/mockProducts';
import { DocumentChartBarIcon, PrinterIcon } from '../../components/common/Icons';

const DAY_MS = 24 * 60 * 60 * 1000;
const LOW_STOCK_THRESHOLD = 10;
const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function getInvoiceTime(invoice) {
  if (invoice?.timestamp == null) return null;
  const time = new Date(invoice.timestamp).getTime();
  return Number.isFinite(time) ? time : null;
}

function getInvoiceDiscountRate(invoice) {
  if (Number.isFinite(invoice.invoiceDiscountPercent)) {
    return Math.min(1, Math.max(0, invoice.invoiceDiscountPercent / 100));
  }

  const gross = (invoice.items || []).reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemDiscounts = (invoice.items || []).reduce((sum, item) => {
    const lineGross = item.price * item.qty;
    return sum + (item.productDiscountAmount ?? lineGross * (item.discountPercent || 0) / 100);
  }, 0);
  const invoiceDiscount = invoice.invoiceDiscountAmount ?? Math.max(0, (invoice.discountAmount || 0) - itemDiscounts);
  return gross > itemDiscounts ? Math.min(1, Math.max(0, invoiceDiscount / (gross - itemDiscounts))) : 0;
}

function getDiscountedUnitPrice(invoice, item) {
  const itemDiscountRate = Math.min(1, Math.max(0, (item.discountPercent || 0) / 100));
  return item.price * (1 - itemDiscountRate) * (1 - getInvoiceDiscountRate(invoice));
}

export function DashboardPage({
  invoices = [],
  products = [],
  storeSettings = {},
  onNavigateToPurchases,
}) {
  const [timeRange, setTimeRange] = useState('all'); // 'today' | 'week' | 'month' | 'all'

  const currency = storeSettings?.currency || 'ر.س';
  const taxRatePercent = Number(storeSettings?.defaultTaxRate) || 0;

  const analyticsData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let periodStart = null;
    if (timeRange === 'today') periodStart = startOfToday;
    if (timeRange === 'week') periodStart = startOfToday - 6 * DAY_MS;
    if (timeRange === 'month') periodStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const activeInvoices = invoices.filter((inv) => inv.status !== 'ملغاة');
    const periodInvoices = activeInvoices.filter((inv) => {
      if (periodStart === null) return true;
      const time = getInvoiceTime(inv);
      return time !== null && time >= periodStart;
    });

    const productById = new Map(products.map((product) => [product.id, product]));
    const getUnitCost = (item) => {
      const product = productById.get(item.id);
      return item.costPrice ?? product?.costPrice ?? item.price * 0.7;
    };
    const getNetQty = (item) => (item.qty || 0) - (item.returnedQty || 0);

    const totalRevenue = periodInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const totalVat = periodInvoices.reduce((sum, inv) => sum + (inv.taxAmount || 0), 0);
    const totalTransactions = periodInvoices.length;
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    let totalCost = 0;
    periodInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const netQty = getNetQty(item);
        if (netQty <= 0) return;
        totalCost += netQty * getUnitCost(item);
      });
    });

    const netProfit = totalRevenue - totalVat - totalCost;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

    // حركة الأيام السبعة الأخيرة (Daily Trend) من بيانات فعلية فقط
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStart = day.getTime();
      const dayEnd = dayStart + DAY_MS;

      const dayInvoices = activeInvoices.filter((inv) => {
        const time = getInvoiceTime(inv);
        return time !== null && time >= dayStart && time < dayEnd;
      });

      const sales = dayInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      const tax = dayInvoices.reduce((sum, inv) => sum + (inv.taxAmount || 0), 0);
      let cost = 0;
      dayInvoices.forEach((inv) => {
        (inv.items || []).forEach((item) => {
          const netQty = getNetQty(item);
          if (netQty > 0) cost += netQty * getUnitCost(item);
        });
      });

      dailyData.push({
        dayName: ARABIC_DAYS[day.getDay()],
        date: day.toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit' }),
        sales,
        profit: sales - tax - cost,
      });
    }

    // نمو المبيعات: آخر 7 أيام مقابل الـ 7 أيام السابقة
    const lastWeekStart = startOfToday - 6 * DAY_MS;
    const previousWeekStart = startOfToday - 13 * DAY_MS;
    const previousWeekEnd = lastWeekStart;
    const sumRange = (from, to) =>
      activeInvoices.reduce((sum, inv) => {
        const time = getInvoiceTime(inv);
        if (time === null || time < from || time >= to) return sum;
        return sum + (inv.grandTotal || 0);
      }, 0);
    const lastWeekRevenue = sumRange(lastWeekStart, startOfToday + DAY_MS);
    const previousWeekRevenue = sumRange(previousWeekStart, previousWeekEnd);
    const growthRate =
      previousWeekRevenue > 0
        ? Number((((lastWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100).toFixed(1))
        : 0;

    // تحليل طرق الدفع
    const paymentBreakdown = {
      card: { amount: 0, count: 0 },
      cash: { amount: 0, count: 0 },
      credit: { amount: 0, count: 0 },
    };

    periodInvoices.forEach((inv) => {
      const method = inv.payment?.method || (inv.paymentMethod === 'شبكة' ? 'card' : inv.paymentMethod === 'آجل' ? 'credit' : 'cash');
      if (method === 'split') {
        const cashAmount = inv.payment?.cashAmount || 0;
        const cardAmount = inv.payment?.cardAmount || 0;
        if (cashAmount > 0) {
          paymentBreakdown.cash.amount += cashAmount;
          paymentBreakdown.cash.count += 1;
        }
        if (cardAmount > 0) {
          paymentBreakdown.card.amount += cardAmount;
          paymentBreakdown.card.count += 1;
        }
        return;
      }
      const key = method === 'card' ? 'card' : method === 'credit' ? 'credit' : 'cash';
      paymentBreakdown[key].amount += inv.grandTotal || 0;
      paymentBreakdown[key].count += 1;
    });

    // المبيعات حسب التصنيفات
    const categoryTotals = {};
    periodInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const category = productById.get(item.id)?.category || 'other';
        const netQty = Math.max(0, getNetQty(item));
        if (netQty === 0) return;
        const lineTotal = netQty * getDiscountedUnitPrice(inv, item);
        categoryTotals[category] = (categoryTotals[category] || 0) + lineTotal;
      });
    });

    const categorySales = CATEGORIES.filter((category) => category.id !== 'all')
      .map((category) => ({
        id: category.id,
        name: category.name,
        icon: category.icon,
        amount: categoryTotals[category.id] || 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // أفضل 5 منتجات مبيعاً
    const productStats = {};
    periodInvoices.forEach((inv) => {
      (inv.items || []).forEach((item) => {
        const netQty = getNetQty(item);
        if (netQty <= 0) return;

        const product = productById.get(item.id);
        const unitCost = getUnitCost(item);
        const netPrice = getDiscountedUnitPrice(inv, item);

        if (!productStats[item.id]) {
          productStats[item.id] = {
            id: item.id,
            name: item.name,
            barcode: product?.barcode || item.barcode || '---',
            qtySold: 0,
            revenue: 0,
            profit: 0,
            unit: product?.unit || item.unit || 'حبة',
          };
        }

        productStats[item.id].qtySold += netQty;
        productStats[item.id].revenue += netQty * netPrice;
        productStats[item.id].profit += netQty * (netPrice - unitCost);
      });
    });

    const topProducts = Object.values(productStats)
      .map((product) => ({
        ...product,
        margin: product.revenue > 0 ? ((product.profit / product.revenue) * 100).toFixed(0) : '0',
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const lowStockProducts = products
      .filter((product) => (product.stock ?? 0) <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
      .slice(0, 6);

    return {
      metrics: {
        totalRevenue,
        netProfit,
        profitMargin,
        totalTransactions,
        averageTicket,
        totalVat,
        growthRate,
      },
      dailyData,
      paymentBreakdown,
      categorySales,
      topProducts,
      lowStockProducts,
    };
  }, [invoices, products, timeRange]);

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="bg-white px-5 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
            <DocumentChartBarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900">
              لوحة المؤشرات والتحليلات الذكية
            </h1>
            <p className="text-xs text-gray-500">
              متابعة الإيرادات المباشرة، صافي الأرباح، ساعات الذروة، ونواقص المخزون
            </p>
          </div>
        </div>

        {/* Filter & Actions */}
        <div className="flex items-center gap-2">
          {/* Time Range Filters */}
          <div className="flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200 text-xs">
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'week', label: 'آخر 7 أيام' },
              { id: 'month', label: 'هذا الشهر' },
              { id: 'all', label: 'جميع الفترات' },
            ].map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => setTimeRange(range.id)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timeRange === range.id
                    ? 'bg-white text-emerald-800 shadow-xs border border-gray-200/60'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* زر طباعة التقرير */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <PrinterIcon className="w-4 h-4 text-gray-500" />
            <span className="hidden sm:inline">طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* 1. Executive Summary Cards */}
        <DashboardSummaryCards
          metrics={analyticsData.metrics}
          currency={currency}
          taxRatePercent={taxRatePercent}
        />

        {/* 2. Charts Section (Sales Trend + Payment Breakdown) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-4">
          <div className="lg:col-span-8">
            <SalesTrendChart
              dailyData={analyticsData.dailyData}
              currency={currency}
            />
          </div>

          <div className="lg:col-span-4">
            <PaymentMethodsChart
              paymentBreakdown={analyticsData.paymentBreakdown}
              totalSales={analyticsData.metrics.totalRevenue}
              currency={currency}
            />
          </div>
        </div>

        {/* 3. Deep Dive Section (Top Products + Category Sales + Low Stock Alerts) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 px-4 pb-6">
          <div className="md:col-span-2 xl:col-span-6">
            <TopProductsTable
              topProducts={analyticsData.topProducts}
              currency={currency}
            />
          </div>

          <div className="md:col-span-1 xl:col-span-3">
            <CategoryBreakdownChart
              categorySales={analyticsData.categorySales}
              totalSales={analyticsData.metrics.totalRevenue}
              currency={currency}
            />
          </div>

          <div className="md:col-span-1 xl:col-span-3">
            <LowStockAlertCard
              lowStockProducts={analyticsData.lowStockProducts}
              onNavigateToPurchases={onNavigateToPurchases}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
