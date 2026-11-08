import AppIntents
import Foundation
import WidgetKit

// Both the provider and the intent live in the widget extension. All sizes
// share this selection; zero follows the current month as time advances.
enum MonthSelection {
    static let key = "umalog.displayMonth"
    static func current(at date: Date) -> Int {
        let stored = UserDefaults.standard.integer(forKey: key)
        return RaceCalendar.start(stored) == nil ? RaceCalendar.monthCode(date) : stored
    }
}

struct SetRaceMonth: AppIntent {
    static var title: LocalizedStringResource = "重賞カレンダーの月を表示"
    static var openAppWhenRun = false
    static var isDiscoverable = false

    @Parameter(title: "表示月") var month: Int
    init() {}
    init(_ month: Int) { self.month = month }

    func perform() async throws -> some IntentResult {
        if month == 0 || month == RaceCalendar.monthCode(Date()) {
            UserDefaults.standard.removeObject(forKey: MonthSelection.key)
        } else if RaceCalendar.start(month) != nil {
            UserDefaults.standard.set(month, forKey: MonthSelection.key)
        }
        WidgetCenter.shared.reloadTimelines(ofKind: "UmalogRaceCalendar")
        return .result()
    }
}
