# Inventory categories

The Inventory page has a **Categories** button beside **Add product**. It opens a modal popup over Inventory, with a Close button and Escape support. The existing `/inventory?tab=categories` link also opens the popup; View products closes it and filters Inventory. Native modal focus containment keeps background controls inactive while it is open.

The panel supports adding categories, editing their names, searching, viewing product counts, opening a category's products and deleting empty categories after confirmation. Counts include archived products when deciding whether deletion is allowed. Product editing remains in the existing inventory editor; its category selector now uses server categories.

Category IDs remain unchanged when names are edited. Product links, stock balances, prices and document history are not rewritten. Inventory filters, the product editor and the cashier category bar share the current organization's categories. Existing category codes retain their familiar labels/icons until renamed; categories absent from the database are not added back as default choices. New products may be left uncategorized.

Backend endpoints:

| Endpoint | Required permission |
| --- | --- |
| `GET /api/categories` | `catalog.read` |
| `POST /api/categories` | `catalog.create` |
| `PUT /api/categories/:id` | `catalog.update` |
| `DELETE /api/categories/:id` | `catalog.archive` |

All queries use the authenticated company ID. Writes require the existing session, CSRF and Retail activation checks. Names must be nonempty and at most 100 characters; duplicate names are rejected. Writes share the catalog transaction lock with product saves. Deletion is blocked if any product, including an archived one, references the category. The database foreign key remains an additional protection. Writes are audited.

No migration, reset, seed or existing-category rename was performed. The existing `categories` table is used. PostgreSQL HTTP integration tests used transaction fixtures that were rolled back; comparing all 53 public tables confirmed unchanged existing data. No live sales, purchases, payments or stock movements were created. Developer was restarted at its existing ports, and activation remained ACTIVE.

Validation:

```powershell
cd backend
node --test tests/categories.test.js
cd ../frontend
node --test tests/categories.browser.mjs
npm test
```

Browser tests mock all writes and verify opening the panel, adding/renaming categories, duplicate prevention, empty deletion, resetting a deleted category filter, viewing and editing associated products, category updates in the cashier, reload, read-only permissions, mobile layout, English and dark mode. Real PostgreSQL integration additionally checks route permissions, authentication, CSRF, company isolation, stable product links and archived-product protection. Its private result is `.developer/ui-review/categories-integration.json`; screenshots are under `.developer/ui-review/categories/`.
