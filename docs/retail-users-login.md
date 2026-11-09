# Retail local users and login

The Users page and everyday login now follow the restaurant frontend's navy/periwinkle design. The restaurant project was used as a read-only reference. Retail continues to use its PostgreSQL accounts, role permissions, branch/warehouse scopes, session cookies, CSRF checks and offline activation.

## User-facing changes

- Login shows active account names and initials; select an account and enter its current password using the keypad or keyboard. Existing passwords still work. Admin recovery uses the selected administrator without asking for an internal username.
- Users displays account cards, name, phone, password replacement, enabled state, assigned roles and branch/warehouse access. New accounts receive an internal unique username; the user does not enter one.
- A blank password on an existing account preserves the current hash. Local account passwords accept any nonempty value up to 200 characters, including short cashier codes. Passwords remain hashed with scrypt; account editing still revokes that account's sessions. Signing-key password requirements are separate and unchanged.
- Permission cards show effective access from the assigned roles. They are read-only; use the existing Roles tab to edit shared roles. Editing a shared role affects its assigned users. The final active Admin remains protected by the backend.

## Backend compatibility

- `GET /api/auth/accounts` requires an active Retail license and exposes only `id`, `name`, `isAdmin` for active accounts belonging to the first configured company, plus its display name. No phone numbers, internal usernames, password hashes or permission lists are returned publicly.
- `POST /api/auth/login` accepts either `{userId,password}` or the existing `{username,password}`. Both retain password verification, failed-attempt throttling, HTTP-only session cookies and CSRF.
- `GET /api/users` now includes phone and roles, with server-side name/phone search and pagination. `GET /api/users/:id` supplies company-scoped role/scope details and never returns a password hash. Existing permission checks remain in place.
- User writes accept an optional phone and optional internal username. Existing account usernames remain unchanged when omitted. Recovery requests accept a selected `userId` as well as the legacy username format.

## Database update and verification

Migration `011_user_phone.sql` adds `users.phone` with an empty default and a 50-character maximum. Migrations 001–010 were not modified. Applied to the existing `sham_retail_dev` database after checking its identity and OID, stopping Developer and validating a custom-format PostgreSQL backup. A comparison of all 53 existing public tables confirmed unchanged prior data, including accounts and activation; the only migration-history addition is 011. Backup and verification records are private under `.developer/user-ui-backup/`.

No customer data was reset or seeded. Integration fixtures ran inside a transaction that was rolled back. No sales, purchasing, stock or payment operations were created. Code rollback can leave the additional phone column in place; do not drop it after users begin storing phone numbers. The legacy login request format remains supported.

Validation:

```powershell
cd backend
node --test tests/local-login.test.js tests/initial-setup.test.js tests/admin-recovery.test.js
cd ../frontend
npm test
node --test --test-concurrency=1 tests/users-login.browser.mjs tests/admin-recovery.browser.mjs tests/initial-admin.browser.mjs
```

Browser tests mock all account writes. They cover account selection, keypad/keyboard login, invalid credentials, recovery, preserved blank passwords, phone editing, new local accounts, shared role navigation, mobile layouts, language and dark mode. PostgreSQL integration separately checked the actual login/user SQL, session invalidation, company isolation and last-admin protection using disposable transaction fixtures. Build and lint checks passed; existing unrelated React warnings remain.

Developer remains at http://127.0.0.1:5196/users. Use `npm run dev:start` and `npm run dev:stop` from the project root. No issuer, signing keys, restaurant source/database, production installer or service was changed for this task.
