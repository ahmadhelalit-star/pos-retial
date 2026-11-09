# Retail issuer: Admin Recovery and Activations

Added two Retail sections beside Issue Activation with the Restaurant visual style. Restaurant sections, records, signing keys and legacy signatures remain unchanged. The running review candidate received source extension/UI files without rebuilding its launcher or publishing a release. Original candidate files and protected hashes are in .developer/issuer-sections-before.

## Admin Recovery

Retail login now includes a recover-admin action. A local, active Retail installation creates a challenge bound to an existing active admin, signed license, hardware fingerprint and random request ID. The issuer verifies the RETAILREC-REQ- request and signs a RETAILREC- code in the independent POSREC1.RETAIL.V1 context. Restaurant request/code prefixes and signatures are mutually rejected. The existing signing key provider is reused; no private key is distributed to the client.

A recovery request expires after one hour. Applying the signed code changes only its target admin password, consumes all pending requests for that admin, invalidates their sessions and appends an audit event in one PostgreSQL transaction. Passwords keep the existing scrypt hashing and 12-character minimum. Expired, replayed, wrong-device, wrong-license, wrong-product and inactive/non-admin requests are rejected. Local origin checks and rate limits guard the unauthenticated endpoints. Registration/activation and initial-admin gates remain enforced.

Migration 010_admin_recovery.sql adds the challenge table only. Applied to sham_retail_dev after checking the database identity and taking a custom-format backup. Row fingerprints of every preexisting table were compared before/after the migration and were identical. Backup details: .developer/recovery-migration.json. No existing migrations were edited, and no business data was reset.

## Activations

Retail issuance records remain in their existing retail-issued.jsonl file. The new section reads existing entries, supports phone/status filters and pagination, details, copying the signed code, same-device license history, administrative status and notes, and a separate JSON backup of Retail records and metadata. Older issuance rows without request snapshots are supported through signed license customer fields. Metadata updates use atomic replacement of a separate sidecar, leaving signed code records untouched.

Administrative REVOKED/REPLACED labels are local record annotations, as stated in the UI; they do not revoke or modify an offline installation. Signed reset/deactivation/transfer management commands have not been added by this task. Restaurant SQLite records are not merged or edited.

## Verification

- Restaurant/Retail compatibility tests: 81/81, including a new HTTP test of recovery signatures, record filters/details/metadata/backup, cross-product separation and origin rejection.
- Backend recovery tests: invalid activation/admin/signature/device/license/expiry and replay; hashed password update and session invalidation.
- PostgreSQL recovery integration used synthetic admin/role/session rows inside an outer transaction. Service transactions ran as savepoints. Recovery succeeded, old password failed, sessions were invalidated, and code reuse failed. The entire outer transaction was rolled back; no test accounts or recovery/audit rows persisted. Existing row counts matched. Result: .developer/admin-recovery-sql-test.json.
- Isolated issuer browser checks covered all new controls and mobile layout with temporary records and synthetic keys. Client browser recovery writes were intercepted and verified, leaving live credentials unchanged.
- Live issuer navigation blocked API writes and checked protected file hashes, including existing Retail issuance records. Result: .developer/issuer-sections-review/live-result.json.
- Frontend build, Backend syntax checks and lint completed. Existing UI lint warnings and the frontend bundle-size warning remain; no new production deployment was performed.
