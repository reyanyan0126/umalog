# うまログ v2.0.0 — PWA milestone

## Included milestones
- **v1.8.2 functionality:** select multiple individual horse-racing combinations and apply a common amount without touching other combinations; single edit and previous 10 stake changes undo; show pre-save correction differences for previously saved tickets; confirmation on correcting a saved purchase.
- **v1.9 functionality:** purchase history breaks out amount recorded vs. amount settled, receipts/refunds, realized profit and pending stake. Pending-only shortcut and reset, direct history item amount editing.
- **v2.0 UI:** mobile-first touch sizing, clear selected status and accessible field labels, responsive settled/pending summary and improved visual hierarchy.

## Finance rules and scope
- No actual JRA wager/transaction or unlicensed scrape; recorded stakes only.
- The amount must be a positive 100-yen multiple, totals capped by existing MAX_MONEY, refund consistency enforced. All changes are backed by existing revision-controlled save.
- Pending stake never counted in realized profit; refunds separated from payouts. No gambling-linked character growth changes.
- No IndexedDB schema changes; backups remain schemaVersion 1 and retain all character progress.
- GitHub Pages PWA publication is not App Store publication. iPhone Safari/installed-PWA acceptance still requires on-device verification.

## Quality gates
- Unit: selected-only changes, undo, safe invalid amounts, saved-diff, pending-vs-settled finances.
- Chromium: source and packaged PWA, 320–440px mobile, formation -> bulk -> select -> undo -> save -> reopen -> correction/confirm, history pending and realized labels, preservation.
- Existing 61-step regression and PWA update tests must pass; deployment SHA must match main and v2.0.0 manifest/cache.
