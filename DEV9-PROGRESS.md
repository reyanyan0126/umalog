# v1.2.0-dev.9 — registration and settlement UX

Base main: 64ea542003554c4828dccd9f5ad52f3bb65bbc57 (dev.8).
Branch: work/v1.2.0-dev9-entry-settlement-ux.
User authorizes publication only after all required checks pass.

## Implemented
- Final registration review: date, venue, number, full name, type, buying method, combinations, individual stakes and exact total. Read-only detail pages of 50 rows.
- Duplicate canonical type/combination detection across buying methods. No automatic deletion/merge. Explicit approval is required to retain duplicates; editing the reviewed content resets approval.
- Race batch result groups: hit candidates, needs checking, miss candidates, settled. Groups expand in 50-row increments; no 300-row processing ceiling.
- Miss candidates remain on hold until explicitly selected. Settled rows are read-only. Actual receipts and partial/full refunds use existing resultValue validation; preview shows count/payout/refund before confirmation.
- Default context is unconfirmed. Only user-confirmed ordinary final results produce candidates. Frame bets, missing information, dead heat, cancellation, exclusion, refund, race cancellation or result correction abstain. User may manually specify confirmed outcomes.
- Place uses starters **at sale**, not actual finishers. Unknown count abstains; 5–7 uses two places; 8–18 uses three.
- Form inputs survive atomic save failure. Fixed null-error handling exposed by the injected IndexedDB abort test. No DB/Store/Key/schema migration.
- No accounting formulas, growth rules, master races, analysis definitions or backup format changed.

## Official rule review (2026-10-17)
- https://www.jra.go.jp/kouza/beginner/baken/ — eight bet types, place threshold, frame/horse distinction, third-place dead heat warning for wide.
- https://www.jra.go.jp/kouza/baken/index.html — sales/refunds. No scraping or data redistribution performed.
- https://www.jra.go.jp/faq/pop03/1_12.html — tied finishes may produce multiple winning combinations. Three unique podium numbers cannot represent these safely; dev.9 abstains rather than approximates.

## Checkpoint
- Baseline Node: 85/85. Added Node tests: 6; current 91/91.
- Existing browser root: 18/18; v1.2 UI root: 11/11; dev.8 PWA update passed.
- New dev.9 browser root: 4/4, including explicit duplicates, 7-starter place, protected settled payout, injected abort, retry, partial refund, double submit, 320-row paging and offline.
- Remaining suites/publish/CI: in progress. Do not merge until all pass.
- iPhone Safari/PWA and LG V60 physical devices unverified. CSS manipulation retains pinch policy, but real touch behavior is not proven by Chromium.

## iPhone acceptance
Back up JSON before updating. Verify settings version; register intentional duplicates and uneven stakes; inspect final total. Open history → race → enter podium → select confirmed race condition/headcount → preview groups → enter actual receipt → explicitly select misses → confirm/save. Check refund and existing settled amounts, reload and offline start. Pinch zoom, repeated taps and enlarged text require real-device confirmation.
