# v1.2.0-dev.14 — daily log, analytics and cosmetic growth rewards

Base: `a96eaeb89c1840a45c135d283fb9f95e4d72ffb5` (dev.11). Release includes planned dev.12, dev.13 and dev.14 features together.

## dev.12 Daily log and sequential registration
- Dedicated read-only `#day/YYYY-MM-DD` screen with actual daily purchase/receipt/refund/net, per-race summary and clickable individual ticket results.
- Home and calendar links to the full day log. Day route allows adding another race.
- Optional post-save continuation keeps **only date and venue**; race number is empty and requires explicit re-selection to protect against mistaken duplicate race recording.
- Cross-saved purchase duplicate warning is keyed to canonical ticket type + combination, within the same date, venue and race. Identical purchases are neither auto-merged nor deleted; explicitly confirm intentional repetition. Prior draft-internal duplicate checks remain unchanged.

## dev.13 Monthly/annual trend analysis
- Extends existing all-time/year/month/venue/bet-type filters with distinct settled day count, profitable/unprofitable/zero days, best/worst recorded day and cumulative month-end profit.
- Uses existing `summarize/aggregate`; no pending stake is added to settled profit. Partial settlement may count that day as a recorded day, but pending lines remain excluded and the UI states that limitation.
- Empty groups are shown as uncalculated, not profit=0.

## dev.14 Decorative reward collection
- Five unlocks (40 EXP, 10 bond, 4 learned bet types, 10 distinct diary dates, 400 EXP), computed from existing ledger/character/growthV2.
- No extra EXP, payout, bonuses, server calls, schema changes or rewards attached to gambling profit.
- Lightweight acknowledgment on care-based unlock; honors disabled and preferred reduced motion.
- Unlocked badges and future targets display compactly on the nursery screen.

## Data protection and QA
- IndexedDB and JSON schema remain v1; original accounting, refund/settlement, existing growth EXP, backup, and offline features remain untouched.
- dev14 pure Node tests cover daily aggregation, canonical duplicates, best/worst/cumulative period summaries and milestones.
- dev14 Chromium source/publish scenarios cover continuous recording, explicit saved-duplicate consent, day log, analytics, rewards and 320/390/440px.
- Full legacy Node, browser (source/publish), PWA upgrade/offline and consistency pipeline must pass before main integration. Physical iPhone Safari remains for the user's final acceptance.
