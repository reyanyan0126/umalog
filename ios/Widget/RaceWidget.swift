import SwiftUI
import WidgetKit

@main
struct RaceWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "UmalogRaceCalendar", provider: ScheduleProvider()) { entry in
            CalendarWidgetView(entry: entry)
        }
        .configurationDisplayName("重賞カレンダー")
        .description("中・大サイズは ◀ ▶ で月移動。年月を押すと今月に戻ります。")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}
