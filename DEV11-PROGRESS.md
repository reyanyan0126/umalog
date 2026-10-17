# v1.2.0-dev.11 — post-race daily ledger

Base main: `989bc7b881393f84e800caaa248012f736d35740` (dev.10).
Branch: `work/v1.2.0-dev11-postrace-ledger`.

## Design decision

うまログ is a **post-race** record of the day's actual purchase, receipt, refund and profit/loss; it is not a pre-purchase bet reservation or prediction application.

## Implementation

- Entry form now flows race → purchased combinations → actual outcome (hit / miss / full refund / partial refund) → verified save.
- Each outcome is entered before the initial atomic IndexedDB commit. Receipt is the **actual received amount**, not the payout odds per 100 yen.
- Unentered outcomes are rejected by default. A collapsed exceptional-save control retains the ability to correct historical pending records without silently altering them.
- Explicit bulk "mark unentered as miss" is restricted to draft pending choices; chosen wins and refunds are protected.
- Live final profit preview follows existing `summarize` and `resultValue` rules; incomplete drafts never persist.
- Committed schemas, refund/accounting semantics, growth math and JSON backups unchanged.
- Result selectors remain mounted on native iOS picker changes to avoid reopening.
- Source and publish mirrors plus SW cache/version updated.

## Verification

- Dev11 source/publish Chromium tests added for no silent pending saves, result/payout validation, win/miss/refund registration, edit protection and 320/390/440 px.
- Existing historical pending-ledger regression tests explicitly opt into exceptional save, maintaining legacy compatibility.
- Verify Node, all existing browser tests, PWA offline/update and source/publish consistency in GitHub Actions before merge. iPhone hands-on testing remains user-side.
