# v1.7.0 — provenance-first manual race information

- In settings, enter an individual race (date, venue, number, optional name/surface/distance) and required HTTPS source URL, with preview and explicit opt-in before saving.
- Stored in the existing independent meeting calendar, not the user's betting/accounting database. No official data feed or automatic race-result import is claimed.
- Existing meeting status is respected; cancelled/changed meetings cannot receive manually entered races, and duplicate keys are refused rather than overwritten.
- New races show '要確認' and can be chosen in the bet-entry screen to fill race number and name. Results and financial fields remain untouched.
- Existing v1.6.1 backup schema and all accounting/growth state remain unchanged. Compatible with offline storage and existing calendar import/export.

## Release checks
- Unit: invalid/duplicate/changed/cancelled/reused meeting, source validation, no financial mutation, metadata markers.
- Browser source + publish: confirmation, rejection, save/reload, candidate pick and race name, mobile widths and existing financial state byte equivalence.
- Full legacy regressions and old-to-new offline PWA tests, then Pages deployment.
- Physical iPhone acceptance remains open.
