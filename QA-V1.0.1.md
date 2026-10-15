# うまログ v1.0.1-rc.1 — STEP 2 独立回帰検証報告

検証日: 2026-10-15 (JST)
対象: `work/v1.0.1-results` の `9aa6825395422546a5c856dddaeef42d752488c8`
対応する CI: https://github.com/reyanyan0126/umalog/actions/runs/38715528379
実行結果: **success**（GitHub Actions / Ubuntu / Node 22 / Playwright Chromium 141）

## 独立検証結果
- `npm test`: **21件成功**（既存ドメイン計算、結果状態の相互変換、豆知識）
- `tests/browser.cjs`: ルート版 **16項目成功**
- `tests/browser.cjs`: `publish/` 版 **16項目成功**
- `tests/update.cjs`: 公開中 v1.0.0 から v1.0.1-rc.1 への更新テスト **成功**
  - IndexedDBの購入明細・払戻・振り返り・EXPを変更せずに保持
  - 更新中の未保存入力は再読み込みを止める
  - 更新後、オフラインで豆知識を開ける
  - 旧Service Workerキャッシュを削除
- `FIRST_SESSION=1 tests/update.cjs`: 初回セッション中の更新も **成功**

上記はGitHub上の最新ブランチに対して新しくCIを実行した結果であり、単なるWorkの以前のテスト記録の転記ではない。

## 検証中の修正
- テストの設定保存直後の即時リロードを、保存成功の通知を待つ形式へ修正。
- テストの記録削除直後の画面遷移を、削除成功の通知を待つ形式へ修正。
- CI workflowのYAML構文を修正し、テストジョブが正常に起動するようにした。
- いずれも開発ブランチ上で行い、アプリのドメイン処理・保存形式・公開ブランチは変更していない。

## 既存データ保護
- `SCHEMA_VERSION=1` と IndexedDB `umalog/state/main` は据え置き。
- `results.js` はUI選択を既存の `status/payout/refund` へ変換し、追加の保存キーを使わない。
- 旧版からの更新で保存データが変化しないことを自動テストで確認。

## 未完了・未検証
- iPhone Safari/ホーム画面追加済みPWAの実機アップグレード
- Android LG V60/Android 11 のキーボードやオフライン、ホーム画面起動
- VoiceOver/TalkBack、詳細返還の全操作組合せ、実機の長時間・大量記録テスト
- v1.1.0以降（レース情報取得、自動分類、自己分析）は未着手
- 公開中の `main` へマージ・GitHub Pages更新は未実施

## 次の手順
1. 変更ファイルとこの報告書をレビューし、v1.0.1 の公開承認をユーザーに確認する。
2. 承認後に限り `main` へマージ、GitHub Pagesの公開更新を確認。
3. 利用中のiPhone PWAで**まずJSONバックアップを保存**し、更新後の馬券・収支・EXP保持を確認。
4. 実機検証が終わるまで「iPhone/Androidテスト完了」とは表記しない。
5. v1.1.0 は開発ブランチで次フェーズとして進める。公開承認のない段階で `main` を変更しない。

## 現時点の判断
**自動回帰テストは合格、ただしiPhone/Android実機テストは未完了。公開可否はユーザーの判断待ち。**
