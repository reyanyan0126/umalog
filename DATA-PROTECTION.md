# Data protection v4.5.2

## Storage contract

- `umalog` IndexedDB, schema version 1, `state` store remain unchanged.
- `main` and `mainRevision` are read together. Only a missing main without revision/backups is a first launch. Null, invalid data, migration failures and read errors fail closed. Startup does not save.
- Every save requires the revision read by the caller. The read/compare, main write, JSON generation, pruning and draft removal share one readwrite transaction. Any synchronous error explicitly aborts the transaction (IDBTransaction has no `readyState` property).
- A failed backup (including quota failure) rejects the whole save; the user must retry/export, never assume the edit succeeded.
- Existing data is validated before overwrite. Transition to no records is rejected unless it is an explicitly confirmed deletion. Empty restore is always rejected over populated data.
- JSON snapshots include all main properties (races, tickets, lines, refunds, simple entries, growth, reviews and settings). Disposable external race/calendar caches and entry drafts are not part of financial backup.
- `ledgerBackup:` keys retain 50 distinct revisions. Old 12-digit keys are accepted and deduplicated against new 16-digit keys by revision. Prior raw data is protected before first save from an older release. FNV-1a checksums detect accidental corruption; they are not signatures. Legacy snapshots without checksums receive schema validation.
- A successful restore also preserves the exact prior main under `preRestoreBackup` (one additional protected copy, replaced by the next successful restore). A failed restore leaves main, revision and this copy unchanged.

## iPhone external backup

Each save presents a button to export the current JSON. Tap it, select **Save to Files**, then choose **On My iPhone** or **iCloud Drive**. A cancelled share is not recorded as success. Settings offers manual export and user attestation after checking the actual saved file. Automatic snapshots are in the same browser storage as the ledger, not independent Files backups. Web Share requires a user gesture; no silent arbitrary-folder writes are promised.

Settings → Backup management → expand a generation → preview counts → confirm restore. For external JSON use the file input, review contents, check the confirmation and confirm replacement. Export the latest data from the environment where it was entered. Safari and installed home-screen PWA are not assumed to share storage.

Sources: https://webkit.org/blog/13862/the-user-activation-api/ and https://wicg.github.io/file-system-access/ .

## Update and release

All required application dependencies and the rescue/recovery pages are precached. Failed installs never activate. Exact navigation URLs are retained. Explicit activation is refused while multiple app windows are open; the active page refuses reload during edits or saves. No service worker accesses IndexedDB.

The verified release workflow runs syntax/unit/accounting tests, Chromium/WebKit storage, startup and offline checks and existing UI acceptance before deploy. Deployment refuses a Pages source other than `workflow`; repository settings still need to be independently checked. `build.json` stamps the tested commit and post-deploy checks compare public file bytes with that commit. An unsuccessful post-deployment check indicates a failed verification, not an automatic rollback.

## Incident limits

The October 27 loss cannot be conclusively attributed from repository code alone. Previous startup rewrites were already disabled at baseline d7c75564. This change fixes reproducible hazards, but does not claim recovery of records absent from all accessible backups. Physical iPhone termination, OS storage eviction and Safari/home-screen isolation require device checks. Same-origin scripts or old still-open versions can still write browser storage; close other app windows before upgrading. Independent external backup remains necessary.
