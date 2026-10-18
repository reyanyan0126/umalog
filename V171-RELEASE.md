# v1.7.1 — source-linked metadata corrections

- List up to 40 recent unverified races whose record structure matches manual entries; do not assert historical origin that was not stored.
- Correct only name, surface, distance and HTTPS source URL after displaying old and new values and requiring explicit confirmation.
- Fix date, venue and race number immutable. Records in cancelled/changed meetings, event-ID references, graded/approved or non-manual-compatible states are not corrected here.
- Keep revision-aware calendar-only writes, preserve all other meetings and races and keep the complete ledger/character data unchanged.
- Handle identical edits and invalid URLs as errors without mutating data. Prevent outdated writes with existing revision checks.
- No auto-scraping, official attestation, auto-settlement or claims of licensed feeds.
- Run unit, root and publish Chromium tests plus all existing PWA upgrade/legacy tests. Real iPhone acceptance still requires hardware verification.
