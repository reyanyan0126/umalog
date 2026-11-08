# うまログ重賞カレンダー for iPhone

iOS 17以降のWidgetKit版。中・大サイズの年月の横の ◀ ▶ で前月／翌月へ、年月を押すと今月へ戻ります。指で操作できるのはホーム画面に追加したウィジェットです。小サイズは直近の重賞を表示します。

## 手元のiPhoneで試す

1. Macに、手元のiPhoneのiOSに対応するXcodeとXcodeGenを用意します。Homebrewを利用している場合は `brew install xcodegen`。
2. このリポジトリを取得して次を実行します。

   ```sh
   cd ios
   xcodegen generate
   open Umalog.xcodeproj
   ```

3. XcodeにApple Accountを追加し、UmalogとRaceWidgetの両ターゲットの「Signing & Capabilities」で自分のTeamを選択します。Bundle IDが使用済みの場合は、両方のIDを同じ固有プレフィックス（例：アプリ com.example.myumalog、拡張 com.example.myumalog.RaceWidget）に変更します。
4. iPhoneをMacに接続して信頼し、必要に応じてiPhoneの「設定 → プライバシーとセキュリティ → デベロッパモード」を有効にします。Xcodeのスキームは「Umalog」、実行先は接続したiPhoneを選び、▶で起動します。
5. ホーム画面を長押し → 編集 → ウィジェットを追加 → **うまログ** を選び、中または大を追加。以前のScriptable版とは別の枠です。
6. ▶で翌月、◀で前月、年月で今月に戻ることを確認します。背景をタップすると公開PWAのカレンダーを開きます。

## 更新と表示範囲

日本時間で表示します。同日複数重賞、障害重賞、未認可・変更・中止の表示に対応します。ホームの中・大サイズ間で選択月を共有します。公開されている月以外へ移動すると「今月の重賞登録なし」を表示します。

公開JSONの正常な取得結果を拡張の端末内キャッシュに保存し、6時間を目安に再取得。オフライン時は保存版、初回はビルド時点の同梱版を使用します。JSONは既存の widget/graded-races.json を直接参照して同梱します。アプリ／拡張はPWAの個人収支やIndexedDBにアクセスしません。

## シミュレータ

GitHub Actions「Native iPhone widget」はXcodeビルド、iOSシミュレータテスト、アプリ起動を実行します。成功した実行のArtifactsから取得できる Umalog-iOS-Simulator はシミュレータ用です。iPhoneへの配布にはXcodeの実機署名、または開発者の署名とApp Store Connectを通したTestFlight等の配布が必要です。
