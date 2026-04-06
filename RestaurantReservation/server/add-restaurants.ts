import { db } from './db';
import { restaurants } from '@shared/schema';

async function addRestaurants() {
  console.log("Adding new restaurants to the database...");
  
  const newRestaurants = [
    {
      name: "Core by Clare Smyth",
      description: "Three Michelin-starred restaurant known for its celebration of British ingredients.",
      cuisine: "Modern British",
      location: "Notting Hill",
      imageUrl: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "hard",
      bookingInfo: "Reservations open 3 months in advance and typically fill within minutes.",
      bookingPlatform: "SevenRooms",
      bookingNotes: "Prepayment required at time of booking.",
      platformId: "core",
      bookingUrl: "https://www.corebyclaresmyth.com/reservations/",
      websiteUrl: "https://www.corebyclaresmyth.com/"
    },
    {
      name: "Restaurant Gordon Ramsay",
      description: "Gordon Ramsay's flagship restaurant holding three Michelin stars since 2001.",
      cuisine: "French",
      location: "Chelsea",
      imageUrl: "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "hard",
      bookingInfo: "Books fill 3 months in advance. New slots release at midnight.",
      bookingPlatform: "SevenRooms",
      bookingNotes: "Credit card required to secure booking.",
      platformId: "gordonramsayrestaurant",
      bookingUrl: "https://www.gordonramsayrestaurants.com/restaurant-gordon-ramsay/",
      websiteUrl: "https://www.gordonramsayrestaurants.com/restaurant-gordon-ramsay/"
    },
    {
      name: "The Clove Club",
      description: "Modern British restaurant in Shoreditch Town Hall with an innovative tasting menu.",
      cuisine: "Modern British",
      location: "Shoreditch",
      imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "hard",
      bookingInfo: "Reservations available 2 months in advance.",
      bookingPlatform: "Tock",
      bookingNotes: "Tasting menu only. Prepayment required.",
      platformId: "the-clove-club",
      bookingUrl: "https://www.exploretock.com/thecloveclub",
      websiteUrl: "https://thecloveclub.com/"
    },
    {
      name: "Sketch (The Lecture Room & Library)",
      description: "Three Michelin-starred restaurant within the iconic Sketch complex.",
      cuisine: "French",
      location: "Mayfair",
      imageUrl: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "hard",
      bookingInfo: "Books 3 months in advance.",
      bookingPlatform: "OpenTable",
      bookingNotes: "Smart elegant dress code.",
      platformId: "sketch-lecture-room",
      bookingUrl: "https://www.sketch.london/booking",
      websiteUrl: "https://sketch.london/"
    },
    {
      name: "A. Wong",
      description: "Two Michelin-starred Chinese restaurant showcasing cuisine from China's 14 borders.",
      cuisine: "Chinese",
      location: "Victoria",
      imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "hard",
      bookingInfo: "Books fill 2 months in advance.",
      bookingPlatform: "SevenRooms",
      bookingNotes: "10-course Taste of China menu for dinner.",
      platformId: "awong",
      bookingUrl: "https://www.awong.co.uk/reservations",
      websiteUrl: "https://www.awong.co.uk/"
    },
    {
      name: "Ikoyi",
      description: "Two Michelin-starred restaurant with West African influences.",
      cuisine: "African-inspired",
      location: "St James's",
      imageUrl: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "hard",
      bookingInfo: "Books 6 weeks in advance.",
      bookingPlatform: "Tock",
      bookingNotes: "Blind tasting menu focused on seasonal British ingredients.",
      platformId: "ikoyi",
      bookingUrl: "https://www.exploretock.com/ikoyi",
      websiteUrl: "https://ikoyilondon.com/"
    },
    {
      name: "Brat",
      description: "Michelin-starred open-fire cooking with Basque influences.",
      cuisine: "Basque",
      location: "Shoreditch",
      imageUrl: "https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "medium",
      bookingInfo: "Books 6 weeks in advance.",
      bookingPlatform: "SevenRooms",
      bookingNotes: "Counter seats reserved for walk-ins.",
      platformId: "bratrestaurant",
      bookingUrl: "https://bratrestaurant.com/reservations/",
      websiteUrl: "https://bratrestaurant.com/"
    },
    {
      name: "Lyle's",
      description: "Michelin-starred restaurant with daily changing menu of British ingredients.",
      cuisine: "Modern British",
      location: "Shoreditch",
      imageUrl: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "medium",
      bookingInfo: "Books 3 months in advance.",
      bookingPlatform: "Tock",
      bookingNotes: "Tasting menu only for dinner. À la carte for lunch.",
      platformId: "lyles",
      bookingUrl: "https://www.exploretock.com/lyles",
      websiteUrl: "https://lyleslondon.com/"
    },
    {
      name: "Kiln",
      description: "Thai barbecue restaurant with regional Thai dishes cooked in ceramic charcoal burners.",
      cuisine: "Thai",
      location: "Soho",
      imageUrl: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "medium",
      bookingInfo: "Some tables released 2 weeks in advance. Counter seats for walk-ins only.",
      bookingPlatform: "Resy",
      bookingNotes: "Downstairs counter is first come, first served.",
      platformId: "kiln-london",
      bookingUrl: "https://resy.com/cities/ldn/kiln",
      websiteUrl: "https://www.kilnsoho.com/"
    },
    {
      name: "Sabor",
      description: "Spanish restaurant with regional dishes from across the Iberian peninsula.",
      cuisine: "Spanish",
      location: "Mayfair",
      imageUrl: "https://images.unsplash.com/photo-1616645258469-ec681c17f3ee?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "medium",
      bookingInfo: "Books 4 weeks in advance.",
      bookingPlatform: "Resy",
      bookingNotes: "Counter seats at El Asador (upstairs) highly recommended.",
      platformId: "sabor",
      bookingUrl: "https://resy.com/cities/ldn/sabor",
      websiteUrl: "https://www.saborrestaurants.co.uk/"
    },
    {
      name: "The Ledbury",
      description: "Contemporary European cuisine with an emphasis on British ingredients.",
      cuisine: "Modern European",
      location: "Notting Hill",
      imageUrl: "https://images.unsplash.com/photo-1543826173-70651703c5a4?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "hard",
      bookingInfo: "Books 3 months in advance.",
      bookingPlatform: "SevenRooms",
      bookingNotes: "Tasting menu only. Reservations rarely available last-minute.",
      platformId: "theledbury",
      bookingUrl: "https://www.theledbury.com/reservations",
      websiteUrl: "https://www.theledbury.com/"
    },
    {
      name: "Brawn",
      description: "Neighborhood restaurant focused on seasonal produce and natural wines.",
      cuisine: "Modern European",
      location: "Bethnal Green",
      imageUrl: "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "medium",
      bookingInfo: "Books 4 weeks in advance.",
      bookingPlatform: "Resy",
      bookingNotes: "Great for lunch. Excellent wine list.",
      platformId: "brawn",
      bookingUrl: "https://resy.com/cities/ldn/brawn",
      websiteUrl: "https://www.brawn.co/"
    },
    {
      name: "Mountain",
      description: "Contemporary wine-focused restaurant with seasonal small plates.",
      cuisine: "Modern European",
      location: "Soho",
      imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "medium",
      bookingInfo: "Books 4 weeks in advance. Some tables held for walk-ins.",
      bookingPlatform: "SevenRooms",
      bookingNotes: "Counter seating available for walk-ins.",
      platformId: "mountainrestaurant",
      bookingUrl: "https://mountainrestaurant.co.uk/reservations",
      websiteUrl: "https://mountainrestaurant.co.uk/"
    },
    {
      name: "Sessions Arts Club",
      description: "Restaurant in a restored 18th-century courthouse with art and seasonal cooking.",
      cuisine: "Modern European",
      location: "Clerkenwell",
      imageUrl: "https://images.unsplash.com/photo-1465014925804-7b9ede58d0d7?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "hard",
      bookingInfo: "Books 2 months in advance. Reservations open on the 1st of each month.",
      bookingPlatform: "Resy",
      bookingNotes: "Stunning space with terrace and bar areas.",
      platformId: "sessions-arts-club",
      bookingUrl: "https://resy.com/cities/ldn/sessions-arts-club",
      websiteUrl: "https://sessionsartsclub.com/"
    },
    {
      name: "The 10 Cases",
      description: "Bistro and wine bar offering just 10 cases of any wine at a time.",
      cuisine: "French",
      location: "Covent Garden",
      imageUrl: "https://images.unsplash.com/photo-1536823536771-05df547310f4?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "medium",
      bookingInfo: "Books 2 weeks in advance. Some tables kept for walk-ins.",
      bookingPlatform: "SevenRooms",
      bookingNotes: "Great value prix fixe lunch menu.",
      platformId: "the10cases",
      bookingUrl: "https://the10cases.co.uk/bookings",
      websiteUrl: "https://the10cases.co.uk/"
    },
    {
      name: "Barrafina Adelaide Street",
      description: "Acclaimed Spanish tapas bar with counter seating.",
      cuisine: "Spanish",
      location: "Covent Garden",
      imageUrl: "https://images.unsplash.com/photo-1566411427195-11be44d2e1a9?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "hard",
      bookingInfo: "Very limited reservations. Mostly walk-in only with long queues.",
      bookingPlatform: "Resy",
      bookingNotes: "Be prepared to queue from 5pm for dinner.",
      platformId: "barrafina-adelaide-street",
      bookingUrl: "https://resy.com/cities/ldn/barrafina-adelaide-street",
      websiteUrl: "https://www.barrafina.co.uk/restaurants/adelaide-street/"
    },
    {
      name: "Noble Rot Soho",
      description: "Wine bar and restaurant with seasonal British-European menu.",
      cuisine: "British",
      location: "Soho",
      imageUrl: "https://images.unsplash.com/photo-1592861956120-e524fc739696?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "medium",
      bookingInfo: "Books 4 weeks in advance.",
      bookingPlatform: "Resy",
      bookingNotes: "Excellent wine list with many options by the glass.",
      platformId: "noble-rot-soho",
      bookingUrl: "https://resy.com/cities/ldn/noble-rot-soho",
      websiteUrl: "https://noblerot.co.uk/soho"
    },
    {
      name: "Evelyn's Table",
      description: "Intimate 12-seat counter restaurant in the Blue Posts pub cellar.",
      cuisine: "British-Japanese",
      location: "Soho",
      imageUrl: "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "hard",
      bookingInfo: "Books on 1st of month for all dates 2 months ahead. Fills within minutes.",
      bookingPlatform: "Resy",
      bookingNotes: "12 seats available per night, one sitting only.",
      platformId: "evelyns-table",
      bookingUrl: "https://resy.com/cities/ldn/evelyns-table",
      websiteUrl: "https://theblueposts.co.uk/evelyns-table/"
    },
    {
      name: "Akoko",
      description: "Modern West African restaurant elevating traditional dishes with seasonal British ingredients.",
      cuisine: "West African",
      location: "Fitzrovia",
      imageUrl: "https://images.unsplash.com/photo-1583103409567-1c062dc2bd09?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "medium",
      bookingInfo: "Books 2 months in advance.",
      bookingPlatform: "SevenRooms",
      bookingNotes: "Tasting menu only.",
      platformId: "akoko",
      bookingUrl: "https://www.akoko.co.uk/reservations",
      websiteUrl: "https://www.akoko.co.uk/"
    },
    {
      name: "Bibi",
      description: "Modern Indian restaurant with dishes inspired by street food and royal kitchens.",
      cuisine: "Indian",
      location: "Mayfair",
      imageUrl: "https://images.unsplash.com/photo-1596797038530-2c107aa7e0f3?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "medium",
      bookingInfo: "Books 6 weeks in advance.",
      bookingPlatform: "Resy",
      bookingNotes: "Counter seats offer view of the kitchen.",
      platformId: "bibi",
      bookingUrl: "https://resy.com/cities/ldn/bibi-mayfair",
      websiteUrl: "https://www.bibirestaurants.com/"
    },
    {
      name: "Hawksmoor Seven Dials",
      description: "Acclaimed British steakhouse known for its prime cuts and cocktails.",
      cuisine: "Steakhouse",
      location: "Covent Garden",
      imageUrl: "https://images.unsplash.com/photo-1603073163308-9654c3fb70b5?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "medium",
      bookingInfo: "Books 3 months in advance. Weekends fill quickly.",
      bookingPlatform: "OpenTable",
      bookingNotes: "Sunday roast extremely popular.",
      platformId: "hawksmoor-seven-dials",
      bookingUrl: "https://www.opentable.co.uk/hawksmoor-seven-dials",
      websiteUrl: "https://thehawksmoor.com/locations/sevendials/"
    },
    {
      name: "Padella Shoreditch",
      description: "Popular pasta bar serving fresh handmade pasta at reasonable prices.",
      cuisine: "Italian",
      location: "Shoreditch",
      imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=480&q=80",
      bookingDifficulty: "medium",
      bookingInfo: "Limited reservations via WalkUp app. Mostly walk-in with virtual queue.",
      bookingPlatform: "Resy",
      bookingNotes: "Join virtual queue via WalkUp app if walk-in.",
      platformId: "padella-shoreditch",
      bookingUrl: "https://resy.com/cities/ldn/padella-shoreditch",
      websiteUrl: "https://www.padella.co/shoreditch"
    }
  ];

  // Insert the restaurants one by one to avoid errors
  for (const restaurant of newRestaurants) {
    try {
      await db.insert(restaurants).values(restaurant);
      console.log(`Added restaurant: ${restaurant.name}`);
    } catch (error) {
      console.error(`Error adding restaurant ${restaurant.name}:`, error);
    }
  }

  console.log("Finished adding restaurants");
}

// Run the function
addRestaurants()
  .then(() => {
    console.log("All restaurants added successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error adding restaurants:", error);
    process.exit(1);
  });