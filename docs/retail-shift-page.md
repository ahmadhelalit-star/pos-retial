# Shift page

The Retail shift page uses the restaurant shift page's visual structure: current-shift heading and actions, green open-state banner, compact colored financial cards, centered opening form, history, and a close dialog with review and confirmation. It uses Retail APIs and permissions throughout.

Opening, cashbox creation, close, reopen and report printing retain their existing endpoint contracts. The shared action hook was moved unchanged from `commercial/views.jsx` to `commercial/useAction.js`; uncertain requests keep their idempotency key when retried. Successful shift changes notify the shell to refresh its shift status.

Summary sales amounts come from the report's base-currency totals. Cash expectations and payment activity retain each original currency separately; the base-equivalent cash value is labeled explicitly. Noncash receipts are not added to drawer cash. The page does not add cash transfers, expense posting or restaurant financial protocols.

No database migration, production deployment or restaurant source modification is required. Existing balances, documents and closed-shift snapshots are preserved.

The fully mocked browser test checks opening payload, currency displays, closing review/cancellation, successful close, idempotent retry after a temporary error, report preview, manager reopening, read-only permissions, English/Arabic, dark mode and mobile layout. It blocks all unmatched API requests and writes no live business data. Screenshots are stored locally under `.developer/ui-review/shifts`.
