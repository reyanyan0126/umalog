import SwiftUI

@main
struct UmalogApp: App {
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                List {
                    Section("ホーム画面に追加") {
                        Text("ホーム画面を長押しして「編集」→「ウィジェットを追加」→「うまログ」を選びます。")
                        Text("中・大サイズは年月の横の ◀ ▶ で月を切り替えられます。年月をタップすると今月に戻ります。")
                    }
                    Section {
                        Link("うまログのカレンダーを開く", destination: URL(string: "https://reyanyan0126.github.io/umalog/#calendar")!)
                    } footer: {
                        Text("ウィジェットには公開されたJRA重賞予定を表示します。")
                    }
                }
                .navigationTitle("うまログ")
            }
        }
    }
}
