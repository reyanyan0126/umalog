# v1.2.0-dev.10 — entry preview and selection UX

Base main: `39d19f1203c48943c7c70e20aacff666cf4a1afb`.
Branch: `work/v1.2.0-dev10-entry-quick-review`.

- Live pre-add amount/count using the existing validated `generateBets` and `money` rules; no ledger write from preview.
- One-tap replacement of a single flow axis; 2-horse flow axes still require explicit deselection.
- Next group shortcut for flow and formation, dirty state update when changing flow position or axis count.
- Source/publish mirrored, PWA version bumped; IndexedDB and JSON schemas, existing accounting, settlement and character growth unchanged.
- New `tests/dev10.cjs` browser scenarios. Existing Node, browser, PWA offline and update regression required before publishing.
- Physical iPhone Safari and installed PWA still require hands-on acceptance.
