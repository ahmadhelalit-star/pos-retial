# Inventory stock policy

The inventory toolbar contains a compact switch beside Add product (at the far left in Arabic) for the store-wide **Allow selling out-of-stock products** option. Users with `organization.manage` can save it through `PUT /api/organization/stock-settings` using a strict `{allowNegativeStock: boolean}` body. Other catalog users can view its current state.

The setting updates the existing `companies.allow_negative_stock` field for the authenticated company and records its previous and new values in the audit log within the same transaction. Existing stock enforcement and the cashier use this company field. Saving does not alter balances, post movements or create sales. No migration or default policy change is required.

The former cashbox/drawer Settings tab and its form have been removed. Printer and drawer configuration remain in Printing settings. Previously stored opening-float values are preserved for compatibility; there is no opening-float editor in Settings.

Validation: service tests cover validation, company scope, audit and rollback. The fully mocked browser test covers saving, reload persistence, failed saves, read-only permissions and the removed tab. Browser tests perform no writes to the Developer database.
