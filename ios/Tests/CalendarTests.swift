import XCTest
import AppIntents

final class CalendarTests: XCTestCase {
    func testArrowsCrossYearAndLeapDay() {
        XCTAssertEqual(RaceCalendar.shifted(202612, by: 1), 202701)
        XCTAssertEqual(RaceCalendar.shifted(202701, by: -1), 202612)
        XCTAssertEqual(RaceCalendar.cells(202402).compactMap { $0 }.last, 29)
        XCTAssertEqual(RaceCalendar.cells(202611).first!, 1)
        XCTAssertEqual(RaceCalendar.cells(202608).count, 42)
        XCTAssertNil(RaceCalendar.start(202613))
        let boundary = ISO8601DateFormatter().date(from: "2026-12-31T15:00:00Z")!
        XCTAssertEqual(RaceCalendar.dayKey(boundary), "2027-01-01")
    }
    func testIntentsChangeSelectionWithoutOpeningApp() async throws {
        defer { UserDefaults.standard.removeObject(forKey: MonthSelection.key) }
        XCTAssertFalse(SetRaceMonth.openAppWhenRun)
        let now = Date(), current = RaceCalendar.monthCode(now)
        let next = try XCTUnwrap(RaceCalendar.shifted(current, by: 1))
        _ = try await SetRaceMonth(next).perform()
        XCTAssertEqual(MonthSelection.current(at: now), next)
        _ = try await SetRaceMonth(current).perform()
        XCTAssertNil(UserDefaults.standard.object(forKey: MonthSelection.key))
        _ = try await SetRaceMonth(next).perform()
        _ = try await SetRaceMonth(0).perform()
        XCTAssertEqual(MonthSelection.current(at: now), current)
    }
    func testSharedFeedIncludesSimultaneousRacesAndJumpGrades() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "graded-races", withExtension: "json"))
        let rows = try RaceCalendar.decode(Data(contentsOf: url))
        XCTAssertTrue(rows.filter { $0.date == "2026-11-08" }.count >= 2)
        XCTAssertEqual(Set(rows.map(\.gradeLabel)), Set(["GⅠ","GⅡ","GⅢ","J・GⅠ","J・GⅡ","J・GⅢ"]))
        XCTAssertThrowsError(try RaceCalendar.decode(Data("{}".utf8)))
    }
}
