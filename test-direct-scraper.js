// A script to directly test the scraping service functionality
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Use tsx to support TypeScript
import('tsx/register').then(async () => {
  const { default: scrapingService } = await import('./server/services/scrapingService.js');

  async function testDirectScraping() {
    try {
      console.log('Direct testing of scraping service...');
      
      // Test a known OpenTable restaurant
      const openTableTest = await scrapingService.checkAvailability(
        'OpenTable',
        'Chiltern Firehouse', // Replace with a real restaurant name
        new Date(Date.now() + 86400000), // Tomorrow
        '19:00',
        2,
        {
          platformId: 'chiltern123',
          bookingUrl: null,
          websiteUrl: null
        }
      );
      
      console.log('OpenTable Test Result:', openTableTest);
      
      // Test a known SevenRooms restaurant
      const sevenRoomsTest = await scrapingService.checkAvailability(
        'SevenRooms',
        'Sketch', // Replace with a real restaurant name
        new Date(Date.now() + 86400000), // Tomorrow
        '19:00',
        2,
        {
          platformId: 'sketch',
          bookingUrl: 'https://www.sevenrooms.com/reservations/sketch',
          websiteUrl: 'https://sketch.london'
        }
      );
      
      console.log('SevenRooms Test Result:', sevenRoomsTest);
      
      // Cleanup
      await scrapingService.close();
      console.log('Direct scraping test complete!');
    } catch (error) {
      console.error('Error during direct scraping test:', error);
    }
  }
  
  testDirectScraping();
});