# v1.3.2 release — external backup freshness

## Delivered
- A prior backup confirmation is displayed as stale if IndexedDB's latest main-ledger save occurred afterward.
- Missing confirmation, unknown last save, and 30-day-old confirmation have separate actionable messages.
- Backup JSON filenames include Japan-local timestamp through milliseconds to reduce accidental same-day overwrite.
- Existing ledger, schemaVersion 1, growth, drafts, cloud-free design and all restore protections remain unchanged.

## Verification
- Unit tests for freshness states, timestamp filename and future clock skew.
- Chromium source/publish end-to-end test: confirm backup, write newer ledger revision, reopen Settings, see re-export prompt.
- Existing automated regression suite and GitHub Pages publish must succeed before announcing release.
- Actual iPhone Safari/PWA, file save destination and share sheet require user-device acceptance; automated browser tests are not equivalent.
