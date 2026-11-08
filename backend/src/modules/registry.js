import { OPTIONAL_MODULES } from '../../../shared/features.js';
export { OPTIONAL_MODULES };
export const PERMISSIONS = Object.freeze([
  'catalog.read','catalog.create','catalog.update','catalog.archive','stock.read','stock.post',
  'users.read','users.manage','roles.read','roles.manage','modules.read','modules.configure',
  'imports.preview','imports.commit','audit.read','organization.read','organization.manage',
  'partners.read','partners.manage','sales.read','sales.post','sales.discount','sales.price','sales.return','sales.cancel',
  'purchases.read','purchases.post','purchases.return','payments.read','payments.post','shifts.read','shifts.open','shifts.close','shifts.manage','reports.read','printing.read','printing.create','printing.ack',
  ...OPTIONAL_MODULES.map((name) => `modules.${name}`),
]);
export const DEFAULT_ROLES = Object.freeze({
  Admin: PERMISSIONS,
  Manager: PERMISSIONS.filter((permission) => !['users.manage','roles.manage','imports.commit'].includes(permission)),
  Cashier: ['catalog.read','organization.read','modules.read','partners.read','sales.read','sales.post','sales.return','shifts.read','shifts.open','shifts.close','payments.read','payments.post','printing.read','printing.create'],
  Inventory: ['catalog.read','catalog.create','catalog.update','stock.read','stock.post','organization.read','modules.read'],
  Purchasing: ['catalog.read','stock.read','organization.read','modules.read','partners.read','partners.manage','purchases.read','purchases.post','purchases.return','shifts.read','shifts.open','shifts.close','payments.read','payments.post','printing.read','printing.create'],
  Accountant: ['catalog.read','stock.read','audit.read','organization.read','modules.read','partners.read','payments.read','payments.post','sales.read','purchases.read','reports.read','shifts.read','shifts.open','shifts.close','printing.read','printing.create'],
});

// No env var, browser setting, database feature row or restaurant license can grant entitlements.
// A trusted Retail verifier must be integrated in a later increment of the shared portable issuer.
export const unconfiguredLicense = async () => ({ status: 'NOT_CONFIGURED', activated: false, product: 'retail', features: {} });
export function moduleAccess(id, license, enabled, permissions) {
  return OPTIONAL_MODULES.includes(id) && license?.status === 'ACTIVE' && license?.activated === true && license?.product === 'retail' && license?.features?.[id] === true && enabled === true && permissions.includes(`modules.${id}`);
}
