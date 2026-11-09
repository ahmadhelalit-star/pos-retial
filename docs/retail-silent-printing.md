# Silent thermal receipts

Retail uses the same approach as the restaurant system: prepare the Arabic receipt as an image and send it through the Windows driver using `StandardPrintController`, without a browser print dialog. Restaurant files, services, keys and data were only inspected and were not modified.

## Developer

Run `npm run dev:start` in the project root and open <http://127.0.0.1:5196/printing>. The existing Developer backend owns `/api/local` on its existing port. No separate printing process or additional port is required. Stop with `npm run dev:stop`.

The local routes require a signed-in user, an active Retail license, the appropriate permissions, CSRF protection for mutations and a loopback connection. Printer changes require `organization.manage`; sending requires `printing.create`.

Printer assignment, 58/80 mm paper, copies (1–5), enable and automatic printing are saved per company in the private Developer runtime `printing` directory. Settings and durable pending jobs survive a restart. They are separate from financial records in `sham_retail_dev`; no migration, reset or seed is required. Defaults are disabled and no printer is selected automatically.

Install/connect the thermal printer in Windows, refresh printers, choose it and save before explicitly clicking **Print test receipt**. Installed drivers alone do not prove hardware is connected. XPS/OneNote/Fax/AnyDesk virtual printers are excluded to prevent interactive dialogs. Microsoft Print to PDF is supported as an explicit PDF destination: the rendered receipt images are exported with headless Chrome at the chosen paper size, without invoking the Windows PDF driver or a Save As dialog. A successful job exposes an authenticated Download PDF link in the device queue and invoice printing controls. Files remain in the private runtime queue/pdf directory; download access checks company, user/document scope and printing.read permissions. Copies become repeated pages within the file. The test is clearly marked as a test and creates no sale or stock movement. It uses the saved receipt presentation with test data, and always sends one copy. Unsaved design edits are not printed.

The receipt design tab retains the existing server settings. Actual paper width is selected in the device printer tab. The invoice receipt button sends directly, without preparing a preview first. Printing after a newly saved sale is optional and disabled initially. Saving a sale does not depend on printing succeeding. A4 preview/browser printing remains separate; barcode printing is deferred.

## Queue and recovery

Each job has a durable identifier. Repeating the same send after a lost network reply reuses the same job. A preparation failure or known failure before Windows submission can retry that job. An interrupted or unconfirmed Windows submission becomes **uncertain**; it requires an operator review and never repeats automatically. Windows accepting a job does not confirm paper delivery. Explicit reprinting creates a new job.

Windows can temporarily lock a polled queue file. Atomic JSON writes now retry only transient rename lock errors for a bounded period, preventing false queue failures without replacing or clearing existing records.

The Retail Cashier agent source also accepts the authenticated `/api/local` path, preserving its existing `/local` route compatibility. This fixes the previous session-cookie `Path=/api` mismatch. Its trusted HTTPS upstream verification is preserved. No installer, installed executable, production service or release was replaced or published.

## Verification

- `node --test desktop/tests/print-queue.test.mjs desktop/tests/local-printing.test.mjs desktop/tests/windows-printing.test.mjs desktop/tests/thermal-layout.test.mjs desktop/tests/pdf-output.test.mjs`
- `node --test frontend/tests/thermal-printing.browser.mjs frontend/tests/apiClient.test.js`
- `node --test backend/tests/presentation.test.js`
- Frontend build/lint and backend lint.

HTTP and browser tests use synthetic users, printers and financial documents with intercepted requests; the live financial database is not populated with test sales. Arabic receipt image preparation was checked with Chrome. No physical printer was connected during this work, so no actual Windows spool or paper test was performed. Physical output, margins and driver paper handling must be verified once the printer is connected.
