// A simple script to test the scraping capabilities
import fetch from 'node-fetch';

// This function checks if we can enable real scraping without an environment variable
async function checkScrapingSettings() {
  try {
    // Try to get the application settings to see if real scraping is enabled
    const settingsResponse = await fetch('http://localhost:5000/api/settings');
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      console.log('Current scraping settings:', settings);
      return settings?.useRealScraping;
    } else {
      // If settings endpoint doesn't exist, check via logs message
      console.log('No settings endpoint available, proceeding with default test');
      return null;
    }
  } catch (error) {
    console.log('Error checking scraping settings, proceeding with test anyway:', error.message);
    return null;
  }
}

async function testScraping() {
  try {
    // Check if real scraping is enabled on the server
    console.log('Checking if real scraping is enabled...');
    await checkScrapingSettings();
    
    // First, let's get a restaurant to use
    console.log('Fetching a restaurant to test...');
    const restaurantsResponse = await fetch('http://localhost:5000/api/restaurants');
    const restaurants = await restaurantsResponse.json();
    
    if (!restaurants || restaurants.length === 0) {
      console.error('No restaurants found to test with');
      return;
    }
    
    // Let's pick a restaurant that uses a platform we can test
    let restaurant = restaurants.find(r => r.bookingPlatform === 'SevenRooms' || r.bookingPlatform === 'OpenTable');
    
    if (!restaurant) {
      console.log('No restaurant with a supported platform found. Using first restaurant instead.');
      restaurant = restaurants[0];
    }
    
    console.log(`Testing with restaurant: ${restaurant.name} (${restaurant.bookingPlatform})`);
    
    // Now create a booking with scraping enabled
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    console.log('Creating a booking with scraping enabled...');
    const bookingResponse = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId: restaurant.id,
        userId: 1, // Default user
        date: dateString,
        time: '19:00',
        partySize: 2,
        specialRequests: 'This is a test booking to check scraping functionality',
        status: 'pending',
        agentStatus: 'active', // Required field
        useRealScraping: true
      }),
    });
    
    const bookingResult = await bookingResponse.json();
    console.log('Booking created:', bookingResult);
    
    if (bookingResult && bookingResult.id) {
      console.log(`Testing scraping for booking ID: ${bookingResult.id}`);
      
      // Explicitly toggle scraping ON for this booking
      console.log('Explicitly activating scraping...');
      const toggleResponse = await fetch(`http://localhost:5000/api/bookings/${bookingResult.id}/toggle-scraping`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          useRealScraping: true // Note the correct property name should be useRealScraping
        }),
      });
      
      const toggleResult = await toggleResponse.json();
      console.log('Scraping toggle result:', toggleResult);
      
      // Now wait for a minute and check the booking status
      console.log('Waiting for 30 seconds to allow scraping to occur...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Check booking status
      console.log('Checking booking status...');
      const checkResponse = await fetch(`http://localhost:5000/api/bookings/${bookingResult.id}`);
      const updatedBooking = await checkResponse.json();
      
      console.log('Updated booking status:', updatedBooking);
      console.log('Agent Log entries:', updatedBooking.agentLog);
      console.log('Scraping test complete!');
    }
  } catch (error) {
    console.error('Error during scraping test:', error);
  }
}

testScraping();