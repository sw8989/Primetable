// Script to enable real scraping environment variable
process.env.ENABLE_REAL_SCRAPING = 'true';

// Now require the server file
require('./server/index.ts');