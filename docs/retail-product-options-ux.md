# Product editor usability

The product popup is wider, with shortcuts to basic information, extra units and variants. The save/cancel footer remains visible while the contents scroll, including on mobile. Units and variants are visible cards rather than a collapsed section. Financial settings remain optional.

Extra units explain how many base units they contain and show a conversion preview. Each draft unit can be removed, including its draft per-variant price overrides. Numeric text remains editable while typing and is converted to numbers only after validation at submission.

Variants follow two visible steps: define attributes and values, then add the combinations sold. Add variant remains visible with an explanation when prerequisites are incomplete. Each draft property and variant can be removed. Removing an attribute with unsaved variants requires confirmation and removes those unsaved variants together; canceling preserves them. Generated SKU values avoid making the user invent technical identifiers. New variants inherit the entered base price and have their own opening stock.

Saved unit/variant IDs are retained, with disabled removal controls and an explanation. Saved variant attributes remain unchanged. New draft variants on an existing product can still be undone. The backend's catalog-history protections remain intact. Closing the popup discards unsaved changes normally. No database migration, account change or existing-data edit was performed.

Validation: mocked browser tests cover add/remove/undo, confirmation cancellation, comma-separated values, numeric conversions, variant opening quantities, fixed footer, mobile layout, persistence in the submitted product structure and saved-unit/variant protection. The existing opening-stock browser regression and 16 frontend unit tests are included in checks. No browser test writes to the real backend.
