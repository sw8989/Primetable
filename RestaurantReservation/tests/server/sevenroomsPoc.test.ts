import {
  analyzeSevenRoomsSnapshot,
  extractTimesFromText,
  type SevenRoomsSnapshot,
} from "../../server/poc/sevenroomsProbe";
import { getSevenRoomsFixture, listSevenRoomsFixtures } from "../../server/poc/sevenroomsFixtures";

function buildSnapshot(overrides?: Partial<SevenRoomsSnapshot>): SevenRoomsSnapshot {
  return {
    bodyText: "",
    controls: [],
    currentUrl: "https://www.sevenrooms.com/explore/test/reservations/create/search",
    fields: [],
    pageTitle: "Reservation at Test Venue",
    ...overrides,
  };
}

describe("sevenrooms probe", () => {
  it("extracts time values from visible control text", () => {
    expect(extractTimesFromText("Slots 18:00 18:30 19:00")).toEqual([
      "18:00",
      "18:30",
      "19:00",
    ]);
  });

  it("classifies alert-me state as unavailable", () => {
    const analysis = analyzeSevenRoomsSnapshot(
      buildSnapshot({
        controls: [
          {
            ariaLabel: null,
            className: "button",
            dataTest: "alert-me-button",
            role: null,
            tagName: "BUTTON",
            text: "Alert Me",
          },
          {
            ariaLabel: "Search",
            className: "button",
            dataTest: "search-pill-mobile-search",
            role: null,
            tagName: "BUTTON",
            text: "Search",
          },
        ],
      }),
      "19:00",
    );

    expect(analysis.status).toBe("unavailable");
    expect(analysis.targetTimeAvailable).toBe(false);
  });

  it("classifies visible time slots as available", () => {
    const analysis = analyzeSevenRoomsSnapshot(
      buildSnapshot({
        controls: [
          {
            ariaLabel: null,
            className: "button",
            dataTest: null,
            role: null,
            tagName: "BUTTON",
            text: "18:00",
          },
          {
            ariaLabel: null,
            className: "button",
            dataTest: null,
            role: null,
            tagName: "BUTTON",
            text: "19:00",
          },
        ],
      }),
      "19:00",
    );

    expect(analysis.status).toBe("available");
    expect(analysis.availableTimes).toEqual(["18:00", "19:00"]);
    expect(analysis.targetTimeAvailable).toBe(true);
  });

  it("classifies reservation form fields as available even without visible slots", () => {
    const analysis = analyzeSevenRoomsSnapshot(
      buildSnapshot({
        fields: [
          { name: "email", placeholder: "Email", type: "email" },
          { name: "first_name", placeholder: "First name", type: "text" },
        ],
      }),
      "19:00",
    );

    expect(analysis.status).toBe("available");
    expect(analysis.formFieldCount).toBe(2);
  });

  it("falls back to manual review for ambiguous widget states", () => {
    const analysis = analyzeSevenRoomsSnapshot(
      buildSnapshot({
        controls: [
          {
            ariaLabel: "Search",
            className: "button",
            dataTest: "search-pill-mobile-search",
            role: null,
            tagName: "BUTTON",
            text: "Search",
          },
        ],
      }),
      "19:00",
    );

    expect(analysis.status).toBe("manual_review");
  });

  it("resolves a restaurant-shaped fixture to a live SevenRooms URL", () => {
    expect(getSevenRoomsFixture("gymkhana")).toEqual({
      bookingPlatform: "SevenRooms",
      bookingUrl: "https://www.sevenrooms.com/explore/gymkhana/reservations/create/search",
      id: 10_001,
      name: "Gymkhana",
    });
  });

  it("lists the configured SevenRooms fixtures for a coverage sweep", () => {
    expect(listSevenRoomsFixtures().map((fixture) => fixture.key)).toEqual([
      "anglothai",
      "bourbon-steak-la",
      "gymkhana",
      "ilili-nomad",
      "napa-suites",
      "park-chinois-group",
      "rockfish-sidmouth",
      "steak-and-frice",
    ]);
  });
});
