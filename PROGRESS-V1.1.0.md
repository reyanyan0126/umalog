# v1.1.0-dev.1 / 開発中・未公開
基準main: 27c54d8de3ae47f2176b71749194c30a2df06a51
ブランチ: work/v1.1.0-style

## STEP 1
- 既存21件のNodeテスト合格。README/PROGRESS/QAと実装を確認。
- analytics.js: 購入傾向と確定成績を分離した読み取り専用集計。
- race-info.js: キー照合、正規化データ検証、タイムアウト・エラー保持・差分更新基盤。
- db.js: 既存stateストアの別キーraceCatalog。DB版と会計schemaVersionは1を維持。
- 正規データ提供元は未確定。実データ取得B/Cは未完成。RACE_PROVIDER=null、架空データは本体に含めない。
- 添付の統合資料はメッセージにもLibrary検索にも特定できず、未読。今回の指令とリポジトリ資料を優先。
- 次: 画面連携、単体・ブラウザ・更新テスト、配布同期。
- main反映・公開は明示承認待ち。v1.2以降は未着手。
