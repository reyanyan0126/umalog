import Foundation

struct Race: Decodable, Identifiable {
    let id, date, grade, name, status, approval, gradeStatus: String

    var rank: String { grade.hasPrefix("J") ? String(grade.dropFirst()) : grade }
    var gradeLabel: String {
        (grade.hasPrefix("J") ? "J・" : "") + (["GI":"GⅠ", "GII":"GⅡ", "GIII":"GⅢ"][rank] ?? grade)
    }
    var shortName: String {
        let flag = ["cancelled":"中止 ", "changed":"変更 "][status] ?? (approval == "pending" ? "仮 " : "")
        return flag + (gradeStatus == "pending" ? "申 " : "") + name
            .replacingOccurrences(of: "ステークス", with: "S")
            .replacingOccurrences(of: "カップ", with: "C")
    }
}

enum RaceCalendar {
    static let jst: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "Asia/Tokyo")!
        return c
    }()
    static func dayKey(_ date: Date) -> String {
        let p = jst.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", p.year!, p.month!, p.day!)
    }
    static func monthCode(_ date: Date) -> Int {
        jst.component(.year, from: date) * 100 + jst.component(.month, from: date)
    }
    static func start(_ code: Int) -> Date? {
        guard (1...9999).contains(code / 100), (1...12).contains(code % 100) else { return nil }
        return jst.date(from: DateComponents(year: code / 100, month: code % 100, day: 1))
    }
    static func shifted(_ code: Int, by count: Int) -> Int? {
        guard let first = start(code), let date = jst.date(byAdding: .month, value: count, to: first) else { return nil }
        let next = monthCode(date)
        return start(next) == nil ? nil : next
    }
    static func cells(_ code: Int) -> [Int?] {
        guard let first = start(code), let days = jst.range(of: .day, in: .month, for: first) else { return [] }
        let offset = jst.component(.weekday, from: first) - 1
        let total = ((offset + days.count + 6) / 7) * 7
        return (0..<total).map { days.contains($0 - offset + 1) ? $0 - offset + 1 : nil }
    }
    static func key(_ code: Int, _ day: Int) -> String {
        String(format: "%04d-%02d-%02d", code / 100, code % 100, day)
    }
    static func decode(_ data: Data) throws -> [Race] {
        struct Feed: Decodable { let schemaVersion: Int; let timezone: String; let races: [Race] }
        let feed = try JSONDecoder().decode(Feed.self, from: data)
        var ids = Set<String>()
        guard feed.schemaVersion == 1, feed.timezone == "Asia/Tokyo",
              feed.races.allSatisfy({ race in
                  let parts = race.date.split(separator: "-").compactMap { Int($0) }
                  guard parts.count == 3, let date = jst.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2])) else { return false }
                  return dayKey(date) == race.date && !race.id.isEmpty && ids.insert(race.id).inserted &&
                      !race.name.isEmpty && ["GI","GII","GIII","JGI","JGII","JGIII"].contains(race.grade) &&
                      ["planned","program","entries","result","changed","cancelled"].contains(race.status)
              }) else { throw CocoaError(.fileReadCorruptFile) }
        return feed.races.sorted { $0.date < $1.date }
    }
}
