# v1.5.0 — period comparison and segment details

## Features
- Last 30 calendar days (including today's date in JST) versus the preceding 30 days.
- Each period reports settled stake, cash receipts (payout + refund), realized profit, recovery percentage, settled valid/hit lines, pending lines and stake.
- Null rates and profit comparisons display as uncalculated, not zero.
- Recent-period analysis by bet type and venue sorted by actual recorded stake; no suggested bet or implied advantage.
- Existing type and venue filters apply. The panel is displayed only for the all-period scope, to avoid compounded filters.
- Read-only derived data; no adjustments to wagering records, rewards, persistence or backups.

## Release gates
- Date boundaries, stale/future dates, pending and full refunds verified by Node tests.
- Chromium checks source and publish packages, responsiveness, filtering, read-only source data.
- All earlier browser, offline-update and IndexedDB regression checks must pass.
- Actual iPhone Safari validation remains a separate user-device check.
