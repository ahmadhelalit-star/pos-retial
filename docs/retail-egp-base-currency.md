# Egyptian pound base currency

The Finance tab at `/settings?tab=finance` shows currencies by name and code, including **جنيه مصري (EGP)**, with a base currency selector. The currency editor explains rates as `1 selected currency = N base currency`. The base currency rate is fixed at 1. Existing custom currency codes remain available; none are renamed or removed implicitly.

Changing the base after transactions is an accounting migration, not an ordinary company-field update. The API rejects that change when documents, stock movements, shifts, payments, partner openings or orders exist. Current-currency saves are harmless no-ops. Changing a genuinely empty company is serialized against financial writes, requires management permission, and rejects a conflicting configured FX rate.

## Approved Developer conversion

The user explicitly requested converting the existing SAR base and historical accounts to EGP **at 1:1**, preserving all numerical values. `developer/currency-rebase.mjs` supports only this explicit Developer operation and only `sham_retail_dev`. It refuses a running Retail server, another database, multiple companies, conflicting currency precision, a conflicting EGP rate or ambiguous currency-map collisions.

With Developer stopped, the tool locks the database tables against writes, creates a full PostgreSQL custom-format dump, verifies its restore catalog and SHA-256, then migrates currency metadata in a single transaction. Its `--check` mode executes and rolls back the entire operation and verifies that the original rows return unchanged; `--apply` commits only after the same checks pass.

The conversion updates SAR currency identifiers in products, posted documents and line snapshots, payments, cash entries, applicable order/shift snapshots and recovery responses. SQL numeric columns are never updated. A temporary PostgreSQL JSON function changes only currency strings/map keys and preserves numeric JSON values exactly; numeric JSON values are compared before/after. All public table contents are checked against the explicitly expected changes. IDs, amounts, quantities, rates, stock costs, users, activation, configuration and unrelated currencies remain unchanged, apart from registering EGP at rate 1 and selecting it as base.

Only the immutable-history triggers required for the specific currency metadata updates are suspended inside the locked transaction. They are restored and their original states verified before commit, including an actual check that an ordinary historical-document update is rejected. No trigger or permanent database function definition is changed. The operation adds an audit entry and preserves pre-conversion data in the private dump. Existing audit records, archived imports, old print jobs and previously exported PDFs are preserved as original archives. New invoice reprints use the converted document snapshots.

The Developer data epoch changes to protect pending requests created before the conversion; existing recovery requests retain their identity. Empty cashier drafts now use the current base currency. Nonempty carts and pending requests retain their original currency and are not silently rewritten.

Private backups and reports are stored in `.developer/backups/currency-rebase-*/`. These are ignored by Git; the saved Developer environment also remains private. Production services, installer settings, restaurant databases and signing keys were not changed. No new database, schema migration, reset, seed, automatic sale or automatic restore was performed.

Verification includes unit tests for currency metadata, numeric/identity preservation and configuration guards; browser tests for EGP selection and history protection; a complete transaction/rollback rehearsal against the existing data; and a read-only live quote comparison in EGP and SAR after the approved 1:1 conversion. The four existing documents and four payments now use EGP; the eight products, stock ledger and financial record counts were retained.
