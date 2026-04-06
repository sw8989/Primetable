import { InsertRestaurant } from "@shared/schema";

export const restaurantSeeds: InsertRestaurant[] = [
  {
    name: "Chiltern Firehouse",
    description:
      "Trendy hotel restaurant by acclaimed chef Nuno Mendes. Frequented by celebrities and A-listers.",
    cuisine: "Modern European",
    location: "Marylebone",
    imageUrl:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
    bookingDifficulty: "hard",
    bookingInfo: "Opens reservations 90 days in advance at midnight",
    bookingPlatform: "OpenTable",
    bookingNotes: "Some tables reserved for hotel guests",
    platformId: "chiltern123",
  },
  {
    name: "The Clove Club",
    description:
      "2 Michelin Star restaurant serving innovative British cuisine in a historic dining room.",
    cuisine: "British",
    location: "Shoreditch",
    imageUrl:
      "https://images.unsplash.com/photo-1559304822-9eb2813c9844?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
    bookingDifficulty: "hard",
    bookingInfo: "Reservations open 2 months in advance",
    bookingPlatform: "Tock",
    bookingNotes: "Required prepayment for tasting menu",
    platformId: "cloveclub456",
  },
  {
    name: "Dishoom",
    description:
      "Popular Bombay-style café serving Indian small plates and signature cocktails in retro setting.",
    cuisine: "Indian",
    location: "Covent Garden",
    imageUrl:
      "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
    bookingDifficulty: "medium",
    bookingInfo: "Accepts bookings up to 3 weeks in advance",
    bookingPlatform: "OpenTable",
    bookingNotes: "Walk-ins available for bar seating",
    platformId: "dishoom789",
  },
  {
    name: "Brat",
    description:
      "Michelin-starred restaurant focusing on Basque-inspired, wood-fired cooking.",
    cuisine: "Spanish",
    location: "Shoreditch",
    imageUrl:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
    bookingDifficulty: "hard",
    bookingInfo: "Books up 6 weeks in advance",
    bookingPlatform: "Resy",
    bookingNotes: "Counter seating available for walk-ins",
    platformId: "brat101",
  },
  {
    name: "Core by Clare Smyth",
    description:
      "3 Michelin Star restaurant offering elegant British cuisine in sophisticated setting.",
    cuisine: "British",
    location: "Notting Hill",
    imageUrl:
      "https://images.unsplash.com/photo-1544148103-0773bf10d330?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
    bookingDifficulty: "hard",
    bookingInfo: "Reservations release 3 months in advance",
    bookingPlatform: "SevenRooms",
    bookingNotes: "Requires credit card deposit",
    platformId: "core202",
  },
  {
    name: "Sketch (The Lecture Room)",
    description:
      "Lavish, 3 Michelin Star French restaurant in a converted Georgian townhouse with unique decor.",
    cuisine: "French",
    location: "Mayfair",
    imageUrl:
      "https://images.unsplash.com/photo-1586999768265-24af89630739?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=400",
    bookingDifficulty: "hard",
    bookingInfo: "Books 2 months ahead, releases at 7am",
    bookingPlatform: "OpenTable",
    bookingNotes: "Smart dress code required",
    platformId: "sketch303",
  },
];
