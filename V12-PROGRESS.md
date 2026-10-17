# v1.2 UI redesign checkpoint

Base: main b43308a09618cc89ea6fdd2e227ca6e03fd7f948 (v1.1.0-dev.4).
Branch: work/v1.2-ui-redesign. Working version: 1.2.0-dev.1.
Do not merge or publish without a new user approval.

## Phase B implemented
- Home: monthly confirmed balance, pending stake separated, entry CTA, compact graded events, three recent records. Secondary data in a disclosure.
- Dedicated sixth calendar tab. At narrow widths the visible label is 暦, accessible name remains カレンダー; targets at least 44px.
- Calendar month/list modes, date selection retention, weekends/today, full event names and exact money in day details, date-to-entry link.
- No changes to accounting, growth or IndexedDB models. Existing 11 graded events unchanged.
- Fixed prepare_publish.py omission of ledger-calendar.js.

## Verified at checkpoint
- Node: 71/71.
- Chromium root: existing ledger 5/5; new UI 3/3.
- Chromium publish: new UI 3/3. Ledger retest in progress.
- New checks cover 320/390/440px, 200% text, navigation target size, page overflow, calendar route/list and date-to-entry.
- Source/publish: all 29 files match.

## Resume next
1. Finish existing browser suites and publish ledger regression.
2. Entry focus retention, history/analysis/growth/settings refinements.
3. All-screen touch-action manipulation and interaction checks.
4. Update PWA test from dev.4 to current; run upgrade/offline regression.
5. Screenshot comparison and WebKit attempt; actual iPhone/LG V60 unverified.
6. Final branch save and report; main/public remain unchanged.
