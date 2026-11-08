import {
  adjustProductStock,
  applyRestockedReturns,
  deductSoldItems,
  receivePurchasedItems,
} from '../domain/inventory';
import { loadPersistedState } from '../services/persistence';
import { validateCatalogProduct } from '../domain/products';
import { assertSaleStock } from '../domain/cartStock';

export const ACTIONS = {
  SALE_COMPLETED: 'SALE_COMPLETED',
  INVOICES_UPDATED: 'INVOICES_UPDATED',
  PRODUCT_SAVED: 'PRODUCT_SAVED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  STOCK_ADJUSTED: 'STOCK_ADJUSTED',
  CUSTOMER_SAVED: 'CUSTOMER_SAVED',
  CUSTOMER_DELETED: 'CUSTOMER_DELETED',
  CUSTOMER_BALANCE_ADJUSTED: 'CUSTOMER_BALANCE_ADJUSTED',
  SUPPLIER_SAVED: 'SUPPLIER_SAVED',
  SUPPLIER_DELETED: 'SUPPLIER_DELETED',
  SUPPLIER_PAID: 'SUPPLIER_PAID',
  PURCHASE_INVOICE_SAVED: 'PURCHASE_INVOICE_SAVED',
  SHIFT_UPDATED: 'SHIFT_UPDATED',
  SHIFT_CLOSED: 'SHIFT_CLOSED',
  SHIFT_OPENED: 'SHIFT_OPENED',
  SETTINGS_SAVED: 'SETTINGS_SAVED',
};

export function createInitialState() {
  return loadPersistedState();
}

function applySaleToCustomers(customers, invoice) {
  if (!invoice.customer || invoice.customer.id === 'walk-in') return customers;

  const customerId = invoice.customer.id;
  const isCredit = invoice.payment?.method === 'credit';
  const earnedPoints = Math.floor((invoice.grandTotal || 0) / 10);

  return customers.map((customer) => {
    if (customer.id !== customerId) return customer;
    return {
      ...customer,
      balance: isCredit
        ? (customer.balance || 0) + (invoice.grandTotal || 0)
        : customer.balance,
      points: (customer.points || 0) + earnedPoints,
      totalPurchases: (customer.totalPurchases || 0) + (invoice.grandTotal || 0),
      invoicesCount: (customer.invoicesCount || 0) + 1,
    };
  });
}

function upsert(list, item, { prepend = false } = {}) {
  const exists = list.some((entry) => entry.id === item.id);
  if (exists) return list.map((entry) => (entry.id === item.id ? item : entry));
  return prepend ? [item, ...list] : [...list, item];
}

function applySupplierPayment(state, supplierId, amount) {
  const suppliers = state.suppliers.map((supplier) =>
    supplier.id === supplierId
      ? {
          ...supplier,
          balance: Math.max(0, (supplier.balance || 0) - amount),
        }
      : supplier
  );

  let remainingToPay = amount;
  const purchaseInvoices = state.purchaseInvoices.map((invoice) => {
    if (
      invoice.supplierId !== supplierId ||
      invoice.paymentStatus === 'paid' ||
      remainingToPay <= 0
    ) {
      return invoice;
    }

    const remaining = invoice.remainingAmount || 0;
    if (remaining <= 0) return invoice;

    const paymentForInvoice = Math.min(remaining, remainingToPay);
    remainingToPay -= paymentForInvoice;
    const nextRemaining = remaining - paymentForInvoice;

    return {
      ...invoice,
      paidAmount: (invoice.paidAmount || 0) + paymentForInvoice,
      remainingAmount: nextRemaining,
      paymentStatus: nextRemaining <= 0.001 ? 'paid' : 'partial',
    };
  });

  return { ...state, suppliers, purchaseInvoices };
}

function applyPurchaseInvoice(state, invoice) {
  return {
    ...state,
    purchaseInvoices: [invoice, ...state.purchaseInvoices],
    products: receivePurchasedItems(state.products, invoice.items),
    suppliers: state.suppliers.map((supplier) =>
      supplier.id !== invoice.supplierId
        ? supplier
        : {
            ...supplier,
            balance: (supplier.balance || 0) + (invoice.remainingAmount || 0),
            totalPurchases: (supplier.totalPurchases || 0) + (invoice.grandTotal || 0),
            invoicesCount: (supplier.invoicesCount || 0) + 1,
          }
    ),
  };
}

export function appReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SALE_COMPLETED: {
      const invoice = action.invoice;
      assertSaleStock(state.products, invoice.items, { allowNegativeStock: Boolean(state.storeSettings.allowNegativeStock) });
      return {
        ...state,
        invoices: [invoice, ...state.invoices],
        products: deductSoldItems(state.products, invoice.items),
        customers: applySaleToCustomers(state.customers, invoice),
      };
    }

    case ACTIONS.INVOICES_UPDATED: {
      return {
        ...state,
        products: applyRestockedReturns(
          state.products,
          state.invoices,
          action.invoices
        ),
        invoices: action.invoices,
      };
    }

    case ACTIONS.PRODUCT_SAVED: {
      const product = validateCatalogProduct(state.products, action.product);
      return { ...state, products: upsert(state.products, product) };
    }

    case ACTIONS.PRODUCT_DELETED:
      return {
        ...state,
        products: state.products.filter((product) => product.id !== action.id),
      };

    case ACTIONS.STOCK_ADJUSTED:
      return {
        ...state,
        products: adjustProductStock(state.products, action.id, action.delta),
      };

    case ACTIONS.CUSTOMER_SAVED:
      return {
        ...state,
        customers: upsert(state.customers, action.customer, { prepend: true }),
      };

    case ACTIONS.CUSTOMER_DELETED:
      return {
        ...state,
        customers: state.customers.filter(
          (customer) => customer.id !== action.id
        ),
      };

    case ACTIONS.CUSTOMER_BALANCE_ADJUSTED:
      return {
        ...state,
        customers: state.customers.map((customer) =>
          customer.id === action.customerId
            ? {
                ...customer,
                balance: Math.max(0, (customer.balance || 0) + action.delta),
              }
            : customer
        ),
      };

    case ACTIONS.SUPPLIER_SAVED:
      return {
        ...state,
        suppliers: upsert(state.suppliers, action.supplier, { prepend: true }),
      };

    case ACTIONS.SUPPLIER_DELETED:
      return {
        ...state,
        suppliers: state.suppliers.filter(
          (supplier) => supplier.id !== action.id
        ),
      };

    case ACTIONS.SUPPLIER_PAID:
      return applySupplierPayment(state, action.supplierId, action.amount);

    case ACTIONS.PURCHASE_INVOICE_SAVED:
      return applyPurchaseInvoice(state, action.invoice);

    case ACTIONS.SHIFT_UPDATED:
      return { ...state, shift: { ...state.shift, ...action.shift } };

    case ACTIONS.SHIFT_CLOSED:
      return {
        ...state,
        shift: {
          ...state.shift,
          status: 'closed',
          closedAt: action.closedAt,
          zReport: action.zReport,
        },
      };

    case ACTIONS.SHIFT_OPENED:
      return { ...state, shift: action.shift };

    case ACTIONS.SETTINGS_SAVED:
      return { ...state, storeSettings: action.settings };

    default:
      return state;
  }
}
