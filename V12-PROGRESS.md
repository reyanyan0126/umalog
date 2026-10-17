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

## Phase C/D implemented
- Entry: visible total at final confirmation; editing draft amounts keeps the same input and focus. Submit buttons disabled while saving.
- History: date/name/venue text search and explicit pending/partial/hit/miss/refund status, preserving existing filters and detail actions.
- Analysis: signed, diverging profit bars with a zero baseline. Eight style classifications and detailed statistics retained.
- Growth: compact EXP and bond meter; existing character art and rewards unchanged. Settings receives shared spacing/control styling; existing management actions stay available.
- All main screens, header and navigation use touch-action: manipulation. No zoom-disabled viewport, blanket preventDefault or text-selection restriction added.
- PWA upgrade tests now start from dev.4. Source/publish generator includes ledger-calendar.js. CI includes the v1.2 branch and new UI scenarios.

## Additional checks
- New UI: 4/4 root and 4/4 publish, including stable amount input/focus, history search and touch policy.
- Calendar/growth features: 11/11 root and 11/11 publish.
- Dev.4 upgrade and fresh-session update: both passed, including accounting/review/growth retention and offline reload.
- Existing browser suite rerun after adapting disclosure navigation (in progress at this checkpoint).
- Optional tests/visual.cjs produces before/after screenshots from isolated empty profiles, not user data.
- WebKit download completed but host libraries are missing; WebKit and actual iPhone/LG V60 remain unverified.

## Resume / release gates
1. Collect all final regression results and GitHub Actions outcome.
2. iPhone Safari/PWA: continuous taps, pinch zoom, native pickers, safe areas, large text and keyboard focus.
3. Review screenshots and real-device scrolling. History sorting, previous/next-day shortcuts and settings reordering were optional and are not implemented.
4. User approval is required before merging main or publishing. Public site remains dev.4.

## 通常チャットからの最終仕上げ（2026-10-17）
- 7列カレンダーの金額を読みやすい省略表示に変更。千・万・億単位の概数表示にし、日付タップ後の正確な円金額およびaria-labelは維持。数値表記境界をNodeテストに追加。
- リスト表示では選択行の強調と詳細へのスクロール導線を改善。月表示の内容を削除せず、詳細には重賞の正式名称を全件表示。
- リスト識別用属性を日付マスと分離。Chromiumの既存の厳密な要素選択と衝突しないよう修正。
- カレンダーから日付だけを引き継いだ新規馬券登録ではレース番号を自動的に1Rへ設定しない。実際のレース番号選択が必須であることをUIテストへ追加。
- GitHub Actions の最終機能検証: https://github.com/reyanyan0126/umalog/actions/runs/39006287664 （成功）。Node、従来ブラウザ、カレンダーとv1.2のroot/publish、PWA更新、source/publish整合が成功。
- iPhone Safari/PWAやLG V60の実機・WebKitは未検証。ダブルタップとピンチ操作は実機の確認が必要。
- 最新の変更はこの開発ブランチのみに保存。mainと公開サイトはユーザーの新たな承認まで変更しない。
