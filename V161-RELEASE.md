# v1.6.1 — Companion costumes and responsive animations

- Optional `growthV2.companion.outfit` values: none, ribbon, clover, scarf. All are free cosmetic choices; no wager-dependent unlocks.
- Existing optional companion data without an outfit defaults to none, and pre-v1.6 JSON remains valid.
- Separate play, rest, care, and outfit-change animations; respect both app motion preference and OS prefers-reduced-motion.
- Costume renders as non-interactive decoration over existing 5-stage companion SVGs; no image assets removed or changed.
- Retains all financial/character/EXP calculations and storage schema version 1.
- Tests: invalid costume rejection, persistence, old snapshots, no ledger mutation, 320/390/440 mobile widths, reduced-motion, source and published PWA parity and regression suite.
- iPhone Safari/installed-PWA real-device acceptance remains unverified.
