# Sham Touch Retail — first implementation increment

Reviewed 7 November 2026. Source of decisions: referenced chat `6aee6d3e-4648-83e8-a3a6-16d27d28f8b6`.

## Repository and preservation

The active implementation is `Desktop/retial/frontend` (React/Vite, browser-local persistence).
`Desktop/pos-retail` is an older, separate frontend repository. No Retail Backend exists in the active repository.
Existing changes in PurchaseInvoicesList.jsx, SuppliersTable.jsx, memory/2026-10-23.md, .agents and config were left intact.
No customer database, browser storage, keys, activation records, running installation or restaurant source was modified.
No installer, deployment, data purge or Git commit/push was performed.

## Implemented

- Shared catalog rules in `frontend/src/domain/products.js`: legacy-compatible stock products, services and non-stock products; base unit; multiple sale/purchase units; factors, unit price/barcode; fractional quantities; named attributes and explicitly created variants.
- Existing catalog metadata is retained when editing. Old rows remain readable without a destructive migration or storage-key change. New opening balance defaults to zero instead of inventing 50 units.
- Product options remain collapsed by default. Basic product creation does not require units or variants. Barcode is optional, including for services.
- Sales choose units/variants only when needed. Unit/variant barcodes can select a line directly. Lines retain product/variant/unit identifiers and a conversion snapshot.
- Purchasing selects units and variants, converts stock to base quantity and calculates weighted average cost for positive existing stock. Negative/zero existing stock uses the incoming cost; full valuation and adjustments remain a later ledger concern.
- Variant stock is independent; parent stock is its sum. Direct parent stock adjustments are disabled for variant products.
- Sales and partial restocked returns use original invoice conversion factors. Services/non-stock items never generate quantity changes, including during purchasing or returns.
- Inventory totals, stock warnings and adjustment buttons exclude services/non-stock items. Editing product type with an existing balance, or silently splitting an existing balance into variants, is rejected.
- Sale validation sums reservations across units for the same product/variant and checks again before completion. Negative stock follows the existing setting. Arithmetic is rounded to nine quantity decimals.
- Optional module identifiers and a fail-closed *presentation policy* separate license entitlement, business setting and user permission. This is scaffolding, not a functioning license security boundary. No local license toggle or license bypass was added.

## Restaurant activation and updates review

Reviewed the existing files, without changing them:

| Concern | Existing source in pos-offline |
| --- | --- |
| Offline request format | offline-activation/src/requestCode.js, activationRequest.js |
| Signed license and feature validation | offline-activation/src/activationCode.js |
| Portable issuer and records | offline-activation/tool/public/app.js, tool/activationRecords.js, package.json |
| Device binding, expiry, clock rollback, state integrity | Backend/src/services/offlineActivation.service.js |
| Server enforcement | Backend/src/middleware/requireActivation.js, requireFeature.js |
| Activation API | Backend/src/routes/offlineActivation.routes.js |
| Activation UI and service | Frontend/src/pages/auth/RegisterPage.jsx, services/offlineActivationService.js |
| Upgrade lifecycle | release-lifecycle-policy.json, RELEASE.md, pro/scripts/verify-pro-package.js, scripts/build-pro-installers.ps1, installer/pro/*.iss |

The current protocol uses POSREQ1 requests and Ed25519-signed POSACT1 licenses. Its feature validator knows restaurant features and requires tables/delivery. It has no Retail product discriminator. Reusing it unchanged would not separate Restaurant and Retail licenses.

The next activation increment must extend the same portable issuer and protocol with a signed product scope and Retail features, preserve existing restaurant verification, and reject restaurant licenses in Retail. Do not map restaurant `inventory` to Retail advanced inventory. Reuse device binding, state integrity, expiry/clock checks and the request/activate/status flow. Private signing keys stay in the existing issuer; none belong in Retail frontend or its package. Port the existing activation page once the Retail API and auth/setup contracts exist, rather than shipping an imitation page that cannot activate anything.

The restaurant upgrade policy replaces installed application files while preserving ProgramData, requires backup before migrations, and preserves activation. Retail must reuse this lifecycle with independent install/runtime paths, service/ports, AppIds and database identity so upgrading Retail cannot replace a restaurant installation. No Retail updater/installer has been built yet.

## Remaining increments

1. Add a modular local Backend with PostgreSQL, authoritative catalog validation, transactions, stock movements, idempotent document posting and audit history. Import browser data explicitly, preview mapping and back up before applying; never seed over customer data.
2. Extend the shared offline protocol/portable tool compatibly, add Retail verification/guards and port the existing activation page. Test expiry, wrong product/device, altered signature, clock rollback, feature revocation and restaurant backward compatibility. Integrate Cloud Admin separately.
3. Apply real RBAC and licensed module guards to server routes and matching UI. Keep advanced data when a module is disabled. Multi-UOM and variants remain core capabilities with optional presentation detail, not invented paid modules.
4. Implement the rest of the approved scope: operational accounts, optional full accounting, multi-currency, product taxes, advanced pricing/sales/reports/inventory/branches, batches/expiry and transfer flows. Backup policy is every six hours with two days retention. Complete shared installer/update/restore integration before a release.

Current limitations: localStorage remains the persistence mechanism; no multi-terminal concurrency or server-enforced licensing/RBAC exists. No stock ledger or complete accounting valuation exists yet. Variant/unit combined pricing uses variant base price multiplied by the unit factor; arbitrary variant-by-unit price matrices and combined barcode matrices are not implemented. Label printing still uses the existing base product flow. No browser visual/end-to-end or installed-upgrade test was performed in this increment.

## Validation

Run from `frontend`: `npm test`, `npm run build`, `npm run lint`.
The domain suite covers legacy data/metadata, 5 × 24 conversion, historical returns, services/non-stock rules, fractional quantities, variant isolation, invalid data/duplicate barcodes, preservation guards, combined stock reservations, optional-module presentation policy, and unit/variant scanning.
The linter completes with warnings in existing component patterns (unused imports and state-in-effect/purity warnings). It is not warning-free.
