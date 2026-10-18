# v1.8.0 — review-first local race information dashboard

- Read-only race inventory classifying locally stored entries as blocked, pending approval, unknown approval, pending grade and other; report counts with a 'not verified' warning.
- Filter by status and venue; normalized text search on date, venue, race number, name, source, and surface.
- Render 40 rows at a time, with an explicit 'show more' control and matching results count, avoiding an unbounded 30,000-row DOM.
- Open provenance HTTPS links with noreferrer; jump directly to the safe manual correction form for compatible race metadata even beyond its original 40-row shortlist.
- Never mark races official, fetch JRA data, edit settlement, or alter calendar schema, accounting, growth or JSON backups.
- Run unit/browser (root and publish), previous regressions and offline upgrade checks; release only on full CI green. Hardware Safari remains untested.
