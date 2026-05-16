/**
 * Curated catalog of London's top restaurants.
 *
 * knownPlatform — skip HTTP detection when set (faster + avoids bot blocks).
 * websiteUrl    — used for auto-detection when knownPlatform is absent.
 * bookingUrl    — direct link to the booking widget/page.
 */

export type CatalogEntry = {
  name: string;
  description: string;
  cuisine: string;
  location: string;
  bookingDifficulty: "easy" | "medium" | "hard";
  bookingInfo?: string;
  bookingNotes?: string;
  websiteUrl?: string;
  bookingUrl?: string;
  knownPlatform?: string;
  platformId?: string;
};

export const londonRestaurantCatalog: CatalogEntry[] = [
  // ─── Soho / Carnaby ──────────────────────────────────────────────────────
  {
    name: "Mountain",
    description: "Acclaimed Beak Street restaurant from Tomos Parry of Brat fame, focusing on fire and smoke.",
    cuisine: "British",
    location: "Soho",
    bookingDifficulty: "hard",
    bookingInfo: "Reservations open 4 weeks in advance",
    websiteUrl: "https://mountainrestaurant.co.uk",
    bookingUrl: "https://mountainrestaurant.co.uk/reservations",
    knownPlatform: "Resy",
  },
  {
    name: "Kiln",
    description: "Thai small-plates cooked over clay kilns and open charcoal fire.",
    cuisine: "Thai",
    location: "Soho",
    bookingDifficulty: "hard",
    bookingInfo: "Walk-in only at the bar; dining room via Resy",
    websiteUrl: "https://www.kilnsoho.com",
    knownPlatform: "Resy",
  },
  {
    name: "Bao Soho",
    description: "Taiwanese steamed buns and small plates in a compact, buzzy room.",
    cuisine: "Taiwanese",
    location: "Soho",
    bookingDifficulty: "medium",
    bookingInfo: "Reservations available on Resy",
    websiteUrl: "https://www.baolondon.com",
    knownPlatform: "Resy",
  },
  {
    name: "Barrafina",
    description: "Celebrated tapas bar; walk-in only, but worth the queue.",
    cuisine: "Spanish",
    location: "Soho",
    bookingDifficulty: "hard",
    bookingInfo: "No reservations — walk-in only. Queue from opening.",
    websiteUrl: "https://barrafina.co.uk",
    knownPlatform: "Direct",
  },
  {
    name: "Quo Vadis",
    description: "Storied Soho institution with modern British cooking and a private members club above.",
    cuisine: "British",
    location: "Soho",
    bookingDifficulty: "medium",
    websiteUrl: "https://quovadissoho.co.uk",
    knownPlatform: "Resy",
  },
  {
    name: "Noble Rot Soho",
    description: "Wine-led neighbourhood restaurant with European small plates and a remarkable cellar.",
    cuisine: "European",
    location: "Soho",
    bookingDifficulty: "medium",
    websiteUrl: "https://noblerot.co.uk/restaurants/soho",
    knownPlatform: "Resy",
  },

  // ─── Shoreditch / East ───────────────────────────────────────────────────
  {
    name: "Brat",
    description: "Michelin-starred Basque-inspired wood-fired cooking above Smoking Goat.",
    cuisine: "Spanish",
    location: "Shoreditch",
    bookingDifficulty: "hard",
    bookingInfo: "Books up 6 weeks in advance",
    bookingNotes: "Counter seating available for walk-ins",
    websiteUrl: "https://www.bratrestaurant.com",
    knownPlatform: "Resy",
  },
  {
    name: "The Clove Club",
    description: "2 Michelin Star innovative British cuisine in a historic Shoreditch dining room.",
    cuisine: "British",
    location: "Shoreditch",
    bookingDifficulty: "hard",
    bookingInfo: "Reservations open 2 months in advance",
    bookingNotes: "Prepayment required for tasting menu",
    websiteUrl: "https://thecloveclub.com",
    knownPlatform: "Tock",
  },
  {
    name: "Lyle's",
    description: "Minimalist, produce-led British cooking with a short daily-changing menu.",
    cuisine: "British",
    location: "Shoreditch",
    bookingDifficulty: "medium",
    websiteUrl: "https://www.lyleslondon.com",
    knownPlatform: "Resy",
  },
  {
    name: "Smoking Goat",
    description: "Thai barbecue and natural wine — loud, fun, brilliant.",
    cuisine: "Thai",
    location: "Shoreditch",
    bookingDifficulty: "medium",
    websiteUrl: "https://www.smokinggoatbar.com",
    knownPlatform: "Resy",
  },

  // ─── Mayfair ─────────────────────────────────────────────────────────────
  {
    name: "Gymkhana",
    description: "Elegant Indian fine dining inspired by British-India's gymkhana clubs.",
    cuisine: "Indian",
    location: "Mayfair",
    bookingDifficulty: "hard",
    bookingInfo: "Reservations open 4 weeks ahead",
    websiteUrl: "https://www.gymkhanalondon.com",
    knownPlatform: "SevenRooms",
    platformId: "gymkhana",
  },
  {
    name: "Scott's",
    description: "Classic Mayfair seafood institution beloved by the establishment since 1851.",
    cuisine: "Seafood",
    location: "Mayfair",
    bookingDifficulty: "hard",
    bookingInfo: "Reservations open 4 weeks in advance",
    websiteUrl: "https://www.scotts-restaurant.com",
    knownPlatform: "OpenTable",
  },
  {
    name: "Sketch (The Lecture Room)",
    description: "3 Michelin Star French restaurant in a converted Georgian townhouse with art installations.",
    cuisine: "French",
    location: "Mayfair",
    bookingDifficulty: "hard",
    bookingInfo: "Books 2 months ahead, releases at 7am",
    bookingNotes: "Smart dress code required",
    websiteUrl: "https://sketch.london",
    knownPlatform: "OpenTable",
  },
  {
    name: "Sexy Fish",
    description: "Striking Mayfair restaurant with Asian-inspired seafood and Damien Hirst artwork.",
    cuisine: "Asian",
    location: "Mayfair",
    bookingDifficulty: "hard",
    bookingInfo: "Books 6 weeks ahead",
    websiteUrl: "https://sexyfish.com",
    knownPlatform: "OpenTable",
  },
  {
    name: "Hakkasan Mayfair",
    description: "Michelin-starred modern Chinese cuisine in a glamorous basement.",
    cuisine: "Chinese",
    location: "Mayfair",
    bookingDifficulty: "medium",
    websiteUrl: "https://hakkasan.com/mayfair",
    knownPlatform: "OpenTable",
  },
  {
    name: "Sabor",
    description: "José Pizarro's Spanish restaurant with an upstairs asador; one Michelin star.",
    cuisine: "Spanish",
    location: "Mayfair",
    bookingDifficulty: "hard",
    bookingInfo: "Reservations open 4 weeks in advance; ground floor walk-in only",
    websiteUrl: "https://www.saborrestaurants.co.uk",
    knownPlatform: "OpenTable",
  },

  // ─── Marylebone ──────────────────────────────────────────────────────────
  {
    name: "Chiltern Firehouse",
    description: "Celebrity haunt by chef Nuno Mendes in a converted Victorian fire station.",
    cuisine: "Modern European",
    location: "Marylebone",
    bookingDifficulty: "hard",
    bookingInfo: "Opens reservations 90 days in advance at midnight",
    bookingNotes: "Some tables reserved for hotel guests",
    websiteUrl: "https://www.chilternfirehouse.com",
    knownPlatform: "OpenTable",
  },

  // ─── Notting Hill / West ─────────────────────────────────────────────────
  {
    name: "Core by Clare Smyth",
    description: "3 Michelin Star British cooking — the only British female chef with three stars.",
    cuisine: "British",
    location: "Notting Hill",
    bookingDifficulty: "hard",
    bookingInfo: "Reservations release 3 months in advance",
    bookingNotes: "Credit card deposit required",
    websiteUrl: "https://corebyclare.com",
    knownPlatform: "SevenRooms",
    platformId: "corebyclare",
  },
  {
    name: "The Ledbury",
    description: "2 Michelin Star French-influenced cooking in a relaxed neighbourhood setting.",
    cuisine: "French",
    location: "Notting Hill",
    bookingDifficulty: "hard",
    bookingInfo: "Books 6 weeks in advance",
    websiteUrl: "https://www.theledbury.com",
    knownPlatform: "OpenTable",
  },
  {
    name: "The River Café",
    description: "Legendary Italian restaurant on the Thames — Ruth Rogers's lifelong project.",
    cuisine: "Italian",
    location: "Hammersmith",
    bookingDifficulty: "hard",
    bookingInfo: "Books 2 months in advance; very hard to get",
    websiteUrl: "https://rivercafe.co.uk",
    knownPlatform: "Resy",
  },

  // ─── Covent Garden / Strand ──────────────────────────────────────────────
  {
    name: "Dishoom Covent Garden",
    description: "Bombay-style café with legendary black dal and breakfast bacon naan rolls.",
    cuisine: "Indian",
    location: "Covent Garden",
    bookingDifficulty: "medium",
    bookingInfo: "Accepts bookings up to 3 weeks in advance",
    bookingNotes: "Walk-ins available for bar seating",
    websiteUrl: "https://www.dishoom.com/covent-garden",
    knownPlatform: "OpenTable",
  },
  {
    name: "J Sheekey",
    description: "Theatre-district institution for impeccably fresh seafood since 1896.",
    cuisine: "Seafood",
    location: "Covent Garden",
    bookingDifficulty: "medium",
    websiteUrl: "https://www.j-sheekey.co.uk",
    knownPlatform: "OpenTable",
  },
  {
    name: "Rules",
    description: "London's oldest restaurant (1798), serving traditional British game and pies.",
    cuisine: "British",
    location: "Covent Garden",
    bookingDifficulty: "easy",
    websiteUrl: "https://www.rules.co.uk",
    knownPlatform: "OpenTable",
  },
  {
    name: "Darjeeling Express",
    description: "Asma Khan's beloved restaurant serving real home-style Indian cooking.",
    cuisine: "Indian",
    location: "Covent Garden",
    bookingDifficulty: "medium",
    websiteUrl: "https://www.darjeelingexpress.com",
    knownPlatform: "OpenTable",
  },

  // ─── Smithfield / City ───────────────────────────────────────────────────
  {
    name: "St. JOHN Smithfield",
    description: "Fergus Henderson's nose-to-tail cooking that changed British food forever.",
    cuisine: "British",
    location: "Smithfield",
    bookingDifficulty: "medium",
    websiteUrl: "https://stjohnrestaurant.com",
    knownPlatform: "Resy",
  },

  // ─── Dalston / Hackney ───────────────────────────────────────────────────
  {
    name: "Mangal 2",
    description: "Legendary Turkish ocakbaşı grill; artists' hangout with exceptional kebabs.",
    cuisine: "Turkish",
    location: "Dalston",
    bookingDifficulty: "medium",
    bookingInfo: "Book ahead; walk-ins usually accepted",
    websiteUrl: "https://www.mangal2.com",
    knownPlatform: "Direct",
  },

  // ─── Chelsea ─────────────────────────────────────────────────────────────
  {
    name: "Restaurant Gordon Ramsay",
    description: "Gordon Ramsay's flagship 3 Michelin Star restaurant in Chelsea.",
    cuisine: "French",
    location: "Chelsea",
    bookingDifficulty: "hard",
    bookingInfo: "Books 3 months in advance; breakfast slots easier",
    websiteUrl: "https://www.gordonramsayrestaurants.com/restaurant-gordon-ramsay",
    knownPlatform: "OpenTable",
  },

  // ─── Fitzrovia ───────────────────────────────────────────────────────────
  {
    name: "Yauatcha",
    description: "Michelin-starred dim sum teahouse with outstanding pâtisserie.",
    cuisine: "Chinese",
    location: "Fitzrovia",
    bookingDifficulty: "medium",
    websiteUrl: "https://www.yauatcha.com",
    knownPlatform: "OpenTable",
  },

  // ─── Knightsbridge / South Kensington ────────────────────────────────────
  {
    name: "Zuma",
    description: "Contemporary Japanese izakaya dining; celebrity favourite in Knightsbridge.",
    cuisine: "Japanese",
    location: "Knightsbridge",
    bookingDifficulty: "hard",
    bookingInfo: "Books 4 weeks ahead",
    websiteUrl: "https://www.zumarestaurant.com/en/restaurant/london",
    knownPlatform: "SevenRooms",
  },
  {
    name: "Hutong",
    description: "Northern Chinese cuisine with dramatic views from The Shard's 33rd floor.",
    cuisine: "Chinese",
    location: "London Bridge",
    bookingDifficulty: "medium",
    websiteUrl: "https://www.hutong.co.uk",
    knownPlatform: "OpenTable",
  },
];
