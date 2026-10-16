# v1.1.0-dev.2 QA（2026-10-16）

開発ブランチのみ。main f890664 / 公開dev.1は変更していない。

## 実施結果

| 検証 | 件数 | 結果 |
|---|---:|---|
| Node純粋関数・回帰 | 56 | 合格（既存33＋開催5＋育成7＋精算11） |
| 既存Chromium操作・root | 18 | 合格 |
| 既存Chromium操作・publish | 18 | 合格 |
| 新規Chromium操作・root | 10 | 合格 |
| 新規Chromium操作・publish | 10 | 合格 |
| dev.1→dev.2 Service Worker更新 | 1シナリオ | 合格 |
| 初回利用セッション中の更新 | 1シナリオ | 合格 |
| source/publish一致 | 26ファイル | 合格 |
| JS構文・git diff空白検査 | 一式 | 合格 |
| 日本語フォントで画面確認 | 育成初期/最終・ホーム | 確認済み |

ブラウザ項目数は複数アサーションをまとめた操作シナリオです。実機の試験件数ではありません。
ローカルChromiumはPlaywright＋portable Chromium 133。GitHub CIはplaywright 1.56.1のChromiumを使用。
最終小変更（取得状況の折りたたみ）のroot回帰は再実施。publishは同期検査に加えてGitHub CIで最終コミットを検証。

## 新規操作シナリオ

1. iPhone相当のファイル入力→プレビュー→確認→2026/2027件数→保存。mainをdeepEqual比較。
2. 破損JSON・内部重複拒否。正常プレビュー後に不正ファイルを選んでも古い候補を実行できない。
3. 同一データの再取り込み・距離訂正の新旧差分。
4. 日付→競馬場・既知R候補、番号未確定重賞の候補番号なし、既存履歴への分析照合。
5. put後のtransaction.abortを注入して旧カレンダー保持。古いrevision拒否。main不変。
6. カレンダー全件書き出し。オフライン再起動、お世話上限、図鑑登録。
7. 合成3000開催のローカル取り込み。プレビュー100件上限・全件保存・main不変。Nodeでは7000件検証。
8. 開催のみ削除した後も会計・育成保持。
9. 旧JSONを実際の復元UIで読み込み、700EXP/第5段階・会計保持を確認。
10. 育成以外の5画面にpet要素なし。320px/文字200%で横幅超過なし。動き軽減時のアニメーション停止。

既存ブラウザ回帰：BOX10点/1000円、登録・精算、部分返還、全額返還、編集・削除、集計、自己分析、ピッカーDOM保持、メニュー、バックアップ・復元、振り返り、オフライン、キャッシュ破損時の会計維持を継続。

育成単体：JST境界、経過日加算、同日二重加算なし、日3回上限、なつき度、巻戻し、大幅未来日時の制限、8券種初回学習、旧EXP/段階、旧/新JSON、レビュー訂正、純粋関数の非破壊性。

精算単体：8券種の100円単位払戻、複数的中組み合わせ（同着想定）、不的中時の表完備確認、明示返還、不成立、結果訂正時の手動保護、不一致レース・暫定結果・重複・矛盾拒否。実払戻表による検証はなし。

## 未検証

- iPhone 16 Pro Max/Safari、LG V60/Android11の実機。Filesピッカー・共有シート・PWA更新は実機未確認。
- WebKitエンジン。Chromiumのモバイル幅をSafari互換性確認済みとは扱わない。
- 実レースデータ。2026/2027の納品は0件。
- 実端末でのストレージ満杯・OSによるストレージ削除・30,000件限界。
- 会計/育成の複数タブ編集競合解決（既存と同様に同時編集を避ける）。
- 本番自動取得・精算保存・結果訂正適用・部分返還アダプター。

## 再実行

```
npm test
python tools/check_publish.py
node tests/browser.cjs
TEST_URL=http://127.0.0.1:8000/umalog/publish/ node tests/browser.cjs
node tests/features.cjs
PUBLISH=1 node tests/features.cjs
CHROMIUM_MODULE=./ci-chromium.cjs node tests/update.cjs
FIRST_SESSION=1 CHROMIUM_MODULE=./ci-chromium.cjs node tests/update.cjs
```

Playwrightの導入とupdate用アダプターは.github/workflows/verify-v101.ymlを参照。各ローカルサーバーの同一ポートで同時実行しない。
公開前のiPhone手順・移行仕様・制約はCALENDAR-GROWTH-V1.1.mdを参照。
