# v1.6.0 — LIVING COMPANION

## Features
- Optional new play and rest actions. First two plays of each Japan-local day yield only +1 bond, no extra EXP; additional play gives reaction only. Rest stores an optional memory (one per day), never removes progress.
- Three cosmetic scenes with selectable persistent theme: meadow, room, stars. No wagering unlock criteria.
- A stage album computed from existing earned EXP thresholds. It does not invent historical stage dates.
- A recent 30-item local timeline of play/rest days, deduplicated by day/kind. No cloud usage.
- Optional companion state within growthV2 (version 2); preexisting backups remain valid with absent companion. Global IndexedDB/JSON schemaVersion stays 1.
- Existing care, learning, weekly review, previous rewards, accounting, PWA offline and secure draft save semantics preserved.

## Release gates
- Invalid companion state is rejected by existing restore validation; legacy backup round-trips preserved.
- Unit: 2/day bond limit, clock rollback, no penalties, growth EXP invariance, album thresholds, theme validation, timeline bound.
- Chromium tests source + publish: action persistence, reloading, theme/memory, mobile widths, no ledger mutation.
- Full existing regression, package parity and old-to-new PWA update CI must pass before GitHub Pages deploy.
- Actual iPhone Safari gestures and visibility not verified by Chromium and remain acceptance items.
