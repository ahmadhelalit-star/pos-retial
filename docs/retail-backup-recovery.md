# Retail Developer backup and recovery

Open `/settings?tab=backups` as the installation administrator. The screen follows the restaurant workflow: status cards, manual backup, download/import, automatic scheduling, checked storage location, saved copies, and a separate restore confirmation dialog. Restaurant sources were inspected read-only.

## What is available

- Real PostgreSQL custom-format copies of the existing `sham_retail_dev` database, verified with a restore catalog, SHA-256 and an installation integrity signature.
- Automatic backup every six hours while Developer is running. Manual backups also refresh the latest protected recovery point. Automatic backup can be stopped or enabled from the screen.
- Download a self-contained `.retailbackup` package and import it without restoring data. Importing an already present verified copy does not overwrite it.
- Validate a local writable folder before applying it. Optionally copy verified existing copies to the new folder; originals are retained. Previous locations remain visible.
- No automatic deletion of old, manual or safety copies. This deliberately preserves existing files under the user's no-deletion constraint.

The default location is the current Windows user's `Documents/Sham Touch Retail/Backups`, separate from the project and PostgreSQL files. Direct, local folders are required; application, restaurant and PostgreSQL directories, drive roots and redirected paths are rejected. Configuration and integrity identity are kept in the private `.developer/runtime/operations` directory, outside Git.

Imports currently accept packages issued by this installation and matching this company/database/schema version. A restaurant backup, bare `.pgdump`, corrupted package, foreign company or foreign integrity identity is rejected. The integrity key `backup-integrity.key` is essential to these files: preserve the private Developer runtime when moving this installation. Cross-installation disaster recovery/import is a separate workflow; this page does not silently trust a foreign SQL archive. Package upload is limited to 256 MB.

## Restore safeguards

Restoring requires `organization.manage`, an administrator role, installation company scope, a valid session/CSRF token, the current administrator password, typing `استعادة البيانات`, and explicit acknowledgment that newer activity will be replaced. Opening the dialog or importing a package never starts a restore.

The Developer restore:

1. Verifies the selected copy, pauses API writes/automatic backups and drains printing.
2. Creates and verifies a fresh safety backup of the current data.
3. Prepares the archive's clean restore SQL privately. It uses the **same** `sham_retail_dev` database; no database is created, dropped or switched.
4. Executes PostgreSQL through `psql --single-transaction` with `ON_ERROR_STOP=1`. A failure rolls back the database transaction and restores the previous Developer environment settings.
5. Validates company IDs and migration checksums inside the transaction, preserves the active device activation, clears restored sessions and records the restore event.
6. Changes the data epoch, restarts only the Developer backend and requires signing in again. The runner keeps the frontend available. Restart is requested even if the client disconnects after confirmation.

Newer records will not be present in the selected historical snapshot; they remain recoverable from the newly created safety copy. The user's existing database name and OID remain the same. Old pending print jobs are held for operator review after the epoch changes; they are never replayed automatically against the restored database. Runtime printer assignments remain device settings, rather than being imported from another machine.

The existing production installation/service restore mechanism remains on its original staged-database path. No installer, Windows Service configuration, restaurant database or activation/signing key was changed or published.

## Verification performed

- Backend file/package tests cover signatures, corruption, foreign company/key rejection, copy-with-originals-preserved, duplicate and new imports, scheduling, and no automatic cleanup.
- Restore tests inject PostgreSQL execution: failure restores the environment and service state, while success prepares the same-database transactional command, preserves activation and blocks old sessions. No live restore is executed by these tests.
- HTTP tests cover admin/company scope, CSRF, authenticated downloads/uploads, password reauthentication and restart after a disconnected client.
- Browser tests intercept every API call and cover creation, binary download/import, folder validation, scheduling, failed password, explicit restore acknowledgment, cancellation, reconnect UI, Arabic/English, dark mode and mobile layout.
- A real automatic and manual backup of `sham_retail_dev` were generated. The manual dump and exported package were verified and re-imported as a duplicate. Financial/catalog row hashes and database OID stayed unchanged.
- Restore validation SQL was checked against the live schema using a read-only transaction and `EXPLAIN` without `ANALYZE`. No restore, data replacement, test sale or test database creation was performed.

Private verification details are in `.developer/backup-verification.json`. A complete live restore remains unexecuted because replacing the user's current data requires their deliberate restore action.
