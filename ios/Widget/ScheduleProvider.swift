import Foundation
import WidgetKit

struct ScheduleEntry: TimelineEntry {
    let date: Date
    let month: Int
    let races: [Race]
    let source: String
    var today: String { RaceCalendar.dayKey(date) }
    var inMonth: [Race] {
        let prefix = String(RaceCalendar.key(month, 1).prefix(7))
        return races.filter { $0.date.hasPrefix(prefix) }
    }
}

enum ScheduleStore {
    static let endpoint = URL(string: "https://reyanyan0126.github.io/umalog/widget/graded-races.json")!
    static let cache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("umalog-native-schedule.json")
    static let lifetime: TimeInterval = 6 * 3600

    static func read(_ url: URL?) -> [Race]? {
        guard let url, let data = try? Data(contentsOf: url) else { return nil }
        return try? RaceCalendar.decode(data)
    }
    static func bundled() -> [Race]? {
        read(Bundle.main.url(forResource: "graded-races", withExtension: "json"))
    }
    static func load(now: Date) async -> ([Race], String) {
        let cached = read(cache)
        let saved = (try? cache.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate
        if let cached, let saved, now.timeIntervalSince(saved) < lifetime { return (cached, "") }
        do {
            let request = URLRequest(url: endpoint, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 6)
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            let races = try RaceCalendar.decode(data)
            try? data.write(to: cache, options: .atomic)
            return (races, "")
        } catch {
            if let cached { return (cached, "保存版" + (saved.map { " " + RaceCalendar.dayKey($0) } ?? "")) }
            if let races = bundled() { return (races, "同梱版") }
            return ([], "予定を取得できません")
        }
    }
}

struct ScheduleProvider: TimelineProvider {
    func placeholder(in context: Context) -> ScheduleEntry {
        let now = Date()
        return ScheduleEntry(date: now, month: RaceCalendar.monthCode(now), races: ScheduleStore.bundled() ?? [], source: "")
    }
    func getSnapshot(in context: Context, completion: @escaping (ScheduleEntry) -> Void) {
        completion(placeholder(in: context))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<ScheduleEntry>) -> Void) {
        Task {
            let (races, source) = await ScheduleStore.load(now: Date())
            let now = Date(), c = RaceCalendar.jst
            let entry = ScheduleEntry(date: now, month: MonthSelection.current(at: now), races: races, source: source)
            let tomorrow = c.date(byAdding: .day, value: 1, to: c.startOfDay(for: now))!
            let next = now.addingTimeInterval(source.isEmpty ? ScheduleStore.lifetime : 3600)
            completion(Timeline(entries: [entry], policy: .after(min(tomorrow, next))))
        }
    }
}
