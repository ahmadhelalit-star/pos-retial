# Retail receipt designer

The **Design and preview** tab at `/printing?tab=receipt` follows the compact restaurant designer layout: controls, saved/unsaved status, explicit save and discard, and a paper preview beside the form. It exposes Retail cashier receipt controls only.

Supported settings:

- Overall font scale (80–140%), Arial/Tahoma/Courier New, and bold text.
- Line height, side margins, store symbol visibility and size.
- Store information, tax number, tax total, cashier, customer name and item units.
- Receipt title, header message and footer/return policy text.

Store information is maintained on the existing Settings page. Paper width comes from the device printer settings. No kitchen, menu QR, preparation, order-number reset, unsupported loyalty or electronic-invoice options are included.

`shared/receiptDesign.js` renders the preview and actual receipt using the same HTML. Preview data is clearly synthetic, inside a script-disabled iframe, and never becomes a sale. Paper remains white in dark mode. Numeric columns fit available space when large typography is selected on narrow paper. Barcode label rendering remains on its existing path.

Settings persist in the existing company-scoped `retailPresentation` configuration in PostgreSQL; no migration/reset/seed is needed. Missing values in older configurations receive defaults. Older settings clients preserve new typography fields when saving store details. Existing queued print snapshots remain immutable.

Unsaved edits survive moving between printing tabs. Discard restores the last saved design, and the test button requires saving changes first. Test printing remains an explicit action and requires an enabled printer. No physical printer was attached during verification, so all print sends were intercepted or mocked.

Verification covers persistence, company isolation, invalid typography values, escaped user content, actual 58/80 mm layout (including large fonts/narrow printable areas), browser controls/live preview/save/discard, and existing silent printing recovery. Screenshots are stored privately under `.developer/ui-review/printing/receipt-designer-*.png`.
