export interface SevenRoomsRestaurantFixture {
  bookingPlatform: "SevenRooms";
  bookingUrl: string;
  id: number;
  name: string;
}

export const sevenRoomsFixtures: Record<string, SevenRoomsRestaurantFixture> = {
  anglothai: {
    bookingPlatform: "SevenRooms",
    bookingUrl: "https://www.sevenrooms.com/explore/anglothai/reservations/create/search",
    id: 10_004,
    name: "AngloThai",
  },
  "bourbon-steak-la": {
    bookingPlatform: "SevenRooms",
    bookingUrl: "https://www.sevenrooms.com/explore/bourbonsteakla/reservations/create/search",
    id: 10_007,
    name: "Bourbon Steak LA",
  },
  gymkhana: {
    bookingPlatform: "SevenRooms",
    bookingUrl: "https://www.sevenrooms.com/explore/gymkhana/reservations/create/search",
    id: 10_001,
    name: "Gymkhana",
  },
  "ilili-nomad": {
    bookingPlatform: "SevenRooms",
    bookingUrl: "https://www.sevenrooms.com/explore/ililinyc/reservations/create/search",
    id: 10_008,
    name: "ilili Nomad",
  },
  "napa-suites": {
    bookingPlatform: "SevenRooms",
    bookingUrl: "https://www.sevenrooms.com/explore/napasuites/reservations/create/search",
    id: 10_006,
    name: "Napa Suites",
  },
  "park-chinois-group": {
    bookingPlatform: "SevenRooms",
    bookingUrl:
      "https://www.sevenrooms.com/explore/parkchinoisgroup/reservations/create/search/?venues=parkchinois%2Cparkchinoisdoha",
    id: 10_002,
    name: "Park Chinois Group",
  },
  "rockfish-sidmouth": {
    bookingPlatform: "SevenRooms",
    bookingUrl: "https://www.sevenrooms.com/explore/rockfishsidmouth/reservations/create/search/",
    id: 10_003,
    name: "Rockfish Sidmouth",
  },
  "steak-and-frice": {
    bookingPlatform: "SevenRooms",
    bookingUrl: "https://www.sevenrooms.com/explore/steakandfrice/reservations/create/search",
    id: 10_005,
    name: "Steak & Frice",
  },
};

export function getSevenRoomsFixture(key: string): SevenRoomsRestaurantFixture {
  const fixture = sevenRoomsFixtures[key];

  if (!fixture) {
    const available = Object.keys(sevenRoomsFixtures).sort().join(", ");
    throw new Error(`Unknown SevenRooms fixture: ${key}. Available fixtures: ${available}`);
  }

  return fixture;
}

export function listSevenRoomsFixtures(): Array<{
  key: string;
  restaurant: SevenRoomsRestaurantFixture;
}> {
  return Object.entries(sevenRoomsFixtures)
    .map(([key, restaurant]) => ({ key, restaurant }))
    .sort((left, right) => left.key.localeCompare(right.key));
}
