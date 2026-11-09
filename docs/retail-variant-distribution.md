# Converting existing stock to variants

Editing a simple stocked product and adding its first variants now opens step 3: allocate current stock. The form reads balances for all warehouses with nonzero stock, displays each warehouse's current quantity and remaining allocation, and enables Save only when each total matches. Quantities are entered in the unchanged base unit. New-product opening balances and editing existing variants continue through their existing paths.

`GET /api/products/:id/variant-balances` requires catalog.update and stock.post, and checks warehouse scope. `PUT /api/products/:id` accepts a separate `variantDistribution` array with warehouse IDs, expected quantities and per-variant allocations. It is not stored as product metadata.

Inside the existing catalog/product transaction lock, the backend verifies product version, stock permission, all warehouse scopes, unchanged product type/base unit/fraction policy, complete warehouse coverage, unique valid variant IDs, precision and exact totals. Quantities changed since preview are rejected. Negative stock must be resolved first. Unfulfilled sales orders must be delivered before conversion. Older quotations with incompatible variants cannot silently become delivery orders; they require an updated quotation.

The transaction records outgoing adjustments against the old base variant before adding new variants, then incoming adjustments to the allocated variants at each warehouse's original average cost. PostgreSQL receives the original numeric cost string to preserve its precision. Original ledger entries, document snapshots and the historical base-variant row remain intact. Product stock aggregation uses decimal addition. Failure rolls back product changes and every movement. A stale retry cannot repeat the migration because the product version changes.

For invoices created before conversion, returns and cancellation now explicitly select which current variant receives/removes stock. The server validates that selection against the current product. Original invoices and their financial amounts remain unchanged. `GET /api/products/:id/return-variants` uses return/cancellation permissions and warehouse scope, without requiring extra catalog-read permission.

No migration, seed, reset or conversion of the user's existing products was performed. All writes used for verification were fixture transactions that were rolled back. Developer remains on its existing ports.

Validation:

- Backend guard tests cover exact decimal totals, stale quantities, duplicate variants, permissions and missing warehouses.
- PostgreSQL integration covers multiple warehouses, quantity/value conservation, immutable history, rollback after an injected credit failure, retry protection, pending deliveries, historical purchase/sale returns, fractional allocation and high-precision average costs. Existing table counts stayed unchanged after rollback.
- Mocked browser tests cover the allocation step, blocked mismatched totals, saving the explicit allocation and selecting a stock variant on historical returns. Existing product-options/opening-stock regressions, 17 frontend unit tests, build and lint passed. Existing unrelated warnings remain.

Private integration results: `.developer/ui-review/variant-distribution-integration.json`. No live sales or purchases were created.
