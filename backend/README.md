# Sham Touch Retail Backend — Phase 2

Node.js 22.23.2+, Express 5 and PostgreSQL 17. Run from `backend/`; keep the sibling `shared/` directory when packaging this service. No restaurant runtime, keys or database are required.

## Local development

1. Provision a **separate** PostgreSQL database named `sham_touch_retail_dev` and an appropriate database user. Do not use any restaurant database. Migration 003 requires permission to install the bundled `pg_trgm` extension in `public`.
2. `npm ci`. Copy `.env.example` to `.env` and set your database credentials. `.env` is ignored by Git.
3. Run `npm run migrate` explicitly. SQL migrations are transactional, serialized, ordered and checksum-checked. Server startup never performs migrations or imports.
4. Set `BOOTSTRAP_COMPANY`, `BOOTSTRAP_USERNAME`, `BOOTSTRAP_PASSWORD` (12+ characters), and optionally `BOOTSTRAP_CURRENCY`; run `npm run bootstrap`. Bootstrap only works on an empty Retail database. No default password is installed.
5. `npm start`. The default address is `127.0.0.1:37941`; `WEB_ORIGIN` defaults to `http://127.0.0.1:5188`.
6. In `../frontend`, run `npm ci` then `npm run dev`. This proxies `/api` to the local backend. Product persistence uses PostgreSQL by default. An explicit, labelled demo retains the old browser-local workflows.

The foundation deliberately refuses `NODE_ENV=production`. LAN requires deliberate host/origin configuration and an HTTPS boundary for credentials/cookies before operational use. Service installation, portable Retail activation, real-data import and deployment remain separate work.

## Verification

```powershell
$env:TEST_DATABASE_URL='postgresql://YOUR_TEST_USER:YOUR_TEST_PASSWORD@127.0.0.1:YOUR_TEST_PORT/sham_touch_retail_test'
npm test
npm run lint
npm run build
```

Tests require an explicitly supplied, independently provisioned `sham_touch_retail_*test` database. Each run creates a new schema; no existing data is cleared. The test database must allow schema creation and the `pg_trgm` extension. Never point tests at real customer data. A missing test database fails the suite instead of silently skipping PostgreSQL checks.

`lint` runs Oxlint. `build` checks the syntax of service, scripts, tests and shared JavaScript; this plain Node service does not require transpilation. See `../docs/retail-phase-2.md` for the API contract, actual results, frontend integration and remaining boundaries.
