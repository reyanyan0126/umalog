import SwiftUI
import WidgetKit

private let field = Color(red: 0.098, green: 0.153, blue: 0.122)
private let tile = Color(red: 0.134, green: 0.193, blue: 0.157)
private let todayTile = Color(red: 0.188, green: 0.263, blue: 0.212)
private let secondaryInk = Color(red: 0.70, green: 0.76, blue: 0.71)
private let gold = Color(red: 230/255, green: 184/255, blue: 74/255)
private let calendarURL = URL(string: "https://reyanyan0126.github.io/umalog/#calendar")!

private struct RaceLine: View {
    let race: Race
    var size: CGFloat = 9
    var body: some View {
        HStack(spacing: 2) {
            Text(race.gradeLabel)
                .font(.system(size: size, weight: race.rank == "GI" ? .bold : .medium))
                .foregroundStyle(race.rank == "GI" ? gold : race.rank == "GII"
                    ? Color(red: 175/255, green: 201/255, blue: 227/255)
                    : Color(red: 221/255, green: 164/255, blue: 119/255))
                .fixedSize()
            Text(race.shortName).font(.system(size: size)).foregroundStyle(.white)
        }
        .lineLimit(1)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(race.date) \(race.gradeLabel) \(race.shortName)")
    }
}

struct CalendarWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ScheduleEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if family == .systemSmall {
                small
            } else {
                header
                if family == .systemLarge { fullMonth } else { compactMonth }
                if entry.inMonth.isEmpty { Text("今月の重賞登録なし").font(.caption2) }
            }
            if !entry.source.isEmpty {
                Text(entry.source).font(.system(size: 9)).foregroundStyle(secondaryInk)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(family == .systemSmall ? 12 : 9)
        .foregroundStyle(.white)
        .containerBackground(for: .widget) { field }
        .widgetURL(calendarURL)
    }

    private var header: some View {
        HStack(spacing: 2) {
            Button(intent: SetRaceMonth(0)) {
                Text("\(String(entry.month/100))年\(entry.month%100)月")
                    .font(.system(size: 16, weight: .bold)).padding(.vertical, 3)
            }
            .accessibilityLabel("今月に戻る")
            arrow(-1)
            arrow(1)
            Spacer(minLength: 0)
            Text("うまログ(仮)").font(.caption2).foregroundStyle(secondaryInk)
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder private func arrow(_ delta: Int) -> some View {
        if let target = RaceCalendar.shifted(entry.month, by: delta) {
            Button(intent: SetRaceMonth(target)) {
                Image(systemName: delta < 0 ? "chevron.left" : "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .frame(width: 34, height: 29).contentShape(Rectangle())
            }
            .accessibilityLabel(delta < 0 ? "前の月" : "次の月")
        }
    }

    private var fullMonth: some View {
        let cells = RaceCalendar.cells(entry.month)
        let events = Dictionary(grouping: entry.inMonth, by: \.date)
        return VStack(spacing: 1) {
            HStack(spacing: 1) {
                ForEach(Array("日月火水木金土"), id: \.self) { day in
                    Text(String(day)).font(.system(size: 10)).foregroundStyle(secondaryInk)
                        .frame(maxWidth: .infinity)
                }
            }
            GeometryReader { area in
                let weeks = cells.count / 7
                let height = max(1, (area.size.height - CGFloat(weeks - 1)) / CGFloat(max(1,weeks)))
                VStack(spacing: 1) {
                    ForEach(0..<weeks, id: \.self) { week in
                        HStack(spacing: 1) {
                            ForEach(0..<7, id: \.self) { column in
                                let day = cells[week * 7 + column]
                                let date = day.map { RaceCalendar.key(entry.month, $0) } ?? ""
                                let isToday = date == entry.today
                                let races = events[date] ?? []
                                let limit = max(1, Int((height-16)/11))
                                VStack(alignment: .leading, spacing: 0) {
                                    if let day {
                                        HStack(spacing: 1) {
                                            Text(String(day)).font(.system(size: 11, weight: isToday ? .bold : .medium))
                                            if races.count > limit {
                                                Text("+\(races.count-limit)").font(.system(size: 8))
                                            }
                                        }.lineLimit(1)
                                        ForEach(races.prefix(limit)) { race in
                                            RaceLine(race: race, size: 8).frame(height: 11, alignment: .leading)
                                        }
                                    }
                                }
                                .padding(.horizontal, 2)
                                .padding(.top, 1)
                                .frame(minWidth: 0, maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                                .background(isToday ? todayTile : tile)
                                .overlay { if isToday { Rectangle().strokeBorder(gold, lineWidth: 0.8) } }
                                .clipped()
                            }
                        }.frame(height: height)
                    }
                }
            }
        }
    }

    private var compactMonth: some View {
        let cells = RaceCalendar.cells(entry.month)
        let dates = Set(entry.inMonth.map(\.date))
        return HStack(alignment: .top, spacing: 8) {
            VStack(spacing: 1) {
                HStack(spacing: 0) {
                    ForEach(Array("日月火水木金土"), id: \.self) { Text(String($0)).frame(width: 16) }
                }.foregroundStyle(secondaryInk)
                ForEach(0..<(cells.count/7), id: \.self) { row in
                    HStack(spacing: 0) {
                        ForEach(0..<7, id: \.self) { col in
                            let day = cells[row*7+col]
                            let date = day.map { RaceCalendar.key(entry.month, $0) } ?? ""
                            Text(day.map { String($0) } ?? " ")
                                .underline(dates.contains(date))
                                .frame(width: 16)
                                .background(date == entry.today ? todayTile : .clear)
                                .overlay { if date == entry.today { Rectangle().strokeBorder(gold, lineWidth: 0.7) } }
                        }
                    }
                }
            }.font(.system(size: 10))
            let rows = entry.inMonth
            let upcoming = rows.filter { $0.date >= entry.today }
            let shown = (upcoming.isEmpty ? rows : upcoming).prefix(3)
            VStack(alignment: .leading, spacing: 1) {
                ForEach(shown) { race in
                    HStack(spacing: 3) {
                        Text(String(race.date.suffix(2))+"日").font(.system(size: 10))
                        RaceLine(race: race, size: 10)
                    }
                }
                if rows.count > shown.count {
                    Text("ほか\(rows.count-shown.count)件").font(.system(size: 9)).foregroundStyle(secondaryInk)
                }
            }
        }
    }

    private var small: some View {
        let active = entry.races.filter { $0.date >= entry.today && !["cancelled","changed","result"].contains($0.status) }
        return VStack(alignment: .leading, spacing: 5) {
            Text("うまログ(仮)").font(.caption2).foregroundStyle(secondaryInk)
            if let next = active.first {
                Text(String(next.date.suffix(5)).replacingOccurrences(of: "-", with: "/")).font(.headline)
                RaceLine(race: next, size: 13)
                let more = active.filter { $0.date == next.date }.count - 1
                if more > 0 { Text("同日ほか\(more)件").font(.caption2) }
            } else { Text("次の重賞は未登録").font(.caption) }
        }
    }
}
