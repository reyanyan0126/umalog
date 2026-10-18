# v1.4.0 SMART ENTRY

## Scope
- Reuse the 4 most recent existing purchases of up to 200 lines each.
- Only type, combination and stake are copied. Dates, race IDs, hit status, payouts and refunds remain untouched in the original source and are not transferred.
- Require valid destination date/venue/race number and affirmative confirmation. New records are pending; existing save/settlement/duplicate checks still apply.
- Quick stake choices: 100, 200, 500, 1000 JPY; manually entered amounts also supported.
- No modifications to accounting logic, character progression, IndexedDB schemaVersion 1 or JSON backup format.

## QA gates
- Unit tests: copy isolation, no payout propagation, invalid combinations, old/empty ticket handling and >200 exclusion.
- Chromium: source and publish PWA copies, selection guard, final confirmation, no auto-save and responsive 320/390/440.
- Full regression, offline upgrade from older versions, source/publish file parity, Pages deployment.
- Hardware iPhone Safari tests remain pending and must not be reported as completed.
