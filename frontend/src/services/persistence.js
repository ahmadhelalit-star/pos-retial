import { INITIAL_INVOICES } from '../data/mockInvoices';
import { MOCK_PRODUCTS } from '../data/mockProducts';
import { INITIAL_CUSTOMERS } from '../data/mockCustomers';
import { INITIAL_SUPPLIERS } from '../data/mockSuppliers';
import { INITIAL_PURCHASE_INVOICES } from '../data/mockPurchaseInvoices';
import { DEFAULT_STORE_SETTINGS } from '../data/defaultSettings';
import { DEFAULT_SHIFT } from '../data/defaultShift';
import { readJSON, readLegacyJSON, writeJSON, removeJSON } from './storage';

export const STORAGE_KEYS = {
  invoices: 'invoices',
  products: 'products',
  customers: 'customers',
  suppliers: 'suppliers',
  purchaseInvoices: 'purchaseInvoices',
  settings: 'storeSettings',
  shift: 'shift',
};

const LEGACY_SETTINGS_KEY = 'shamtouch_store_settings';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readList(key, fallback) {
  const value = readJSON(key, null);
  return Array.isArray(value) ? value : fallback;
}

function readObject(key, fallback) {
  const value = readJSON(key, null);
  return isPlainObject(value) ? value : fallback;
}

function loadSettings() {
  const saved = readJSON(STORAGE_KEYS.settings, null);
  if (isPlainObject(saved)) return saved;

  const legacy = readLegacyJSON(LEGACY_SETTINGS_KEY, null);
  return isPlainObject(legacy) ? legacy : DEFAULT_STORE_SETTINGS;
}

export function loadPersistedState() {
  return {
    invoices: readList(STORAGE_KEYS.invoices, INITIAL_INVOICES),
    products: readList(STORAGE_KEYS.products, MOCK_PRODUCTS),
    customers: readList(STORAGE_KEYS.customers, INITIAL_CUSTOMERS),
    suppliers: readList(STORAGE_KEYS.suppliers, INITIAL_SUPPLIERS),
    purchaseInvoices: readList(
      STORAGE_KEYS.purchaseInvoices,
      INITIAL_PURCHASE_INVOICES
    ),
    storeSettings: loadSettings(),
    shift: readObject(STORAGE_KEYS.shift, DEFAULT_SHIFT),
  };
}

export function persistState(state) {
  writeJSON(STORAGE_KEYS.invoices, state.invoices);
  writeJSON(STORAGE_KEYS.products, state.products);
  writeJSON(STORAGE_KEYS.customers, state.customers);
  writeJSON(STORAGE_KEYS.suppliers, state.suppliers);
  writeJSON(STORAGE_KEYS.purchaseInvoices, state.purchaseInvoices);
  writeJSON(STORAGE_KEYS.settings, state.storeSettings);
  writeJSON(STORAGE_KEYS.shift, state.shift);
}

export function clearPersistedState() {
  Object.values(STORAGE_KEYS).forEach(removeJSON);
}
