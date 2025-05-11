/**
 * Platform Detector Service
 * 
 * This service provides functionality to detect the booking platform 
 * used by a restaurant website based on URL patterns and HTML content analysis.
 */

import fetch from 'node-fetch';
import { config } from '../../config';

// Supported platform types
export enum BookingPlatform {
  UNKNOWN = 'unknown',
  OPENTABLE = 'opentable',
  RESY = 'resy',
  TOCK = 'tock',
  SEVENROOMS = 'sevenrooms',
  DIRECT = 'direct', // Restaurant's own booking system
}

// Patterns to identify booking platforms from URLs
const URL_PATTERNS = {
  [BookingPlatform.OPENTABLE]: [
    /opentable\.com/i,
    /reservations\.opentable/i,
    /bookatable\.com/i
  ],
  [BookingPlatform.RESY]: [
    /resy\.com/i,
    /widget\.resy/i
  ],
  [BookingPlatform.TOCK]: [
    /exploretock\.com/i,
    /tockify\.com/i,
    /tockhq\.com/i
  ],
  [BookingPlatform.SEVENROOMS]: [
    /sevenrooms\.com/i,
    /widget\.sevenrooms/i,
    /resdiary\.com/i
  ]
};

// Patterns to identify booking platforms from HTML content
const HTML_PATTERNS = {
  [BookingPlatform.OPENTABLE]: [
    /OpenTable/i,
    /data-restaurant-id="ot/i,
    /opentable-widget/i,
    /ot-button/i,
    /OTButton/i
  ],
  [BookingPlatform.RESY]: [
    /data-resy-venue-id/i,
    /resy-venue-guid/i,
    /ResyWidget/i,
    /Powered by Resy/i
  ],
  [BookingPlatform.TOCK]: [
    /exploretock/i,
    /tock-widget/i,
    /TockLoaderFrame/i,
    /Powered by Tock/i
  ],
  [BookingPlatform.SEVENROOMS]: [
    /sevenrooms-button/i,
    /sevenrooms-widget/i,
    /SevenRoomsWidget/i,
    /sv-booker/i,
    /data-sv-lmr/i,
    /resdiary-widget/i
  ]
};

/**
 * Detects the booking platform based on URL
 */
export function detectPlatformFromUrl(url: string): BookingPlatform {
  // Skip if url is not provided
  if (!url) {
    return BookingPlatform.UNKNOWN;
  }
  
  // Check for platform-specific URL patterns
  for (const [platform, patterns] of Object.entries(URL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return platform as BookingPlatform;
      }
    }
  }
  
  return BookingPlatform.UNKNOWN;
}

/**
 * Fetches and analyzes a website to detect booking platform
 */
export async function analyzeWebsite(url: string): Promise<{
  platform: BookingPlatform;
  confidence: number;
  platformDetails?: any;
}> {
  // First, check URL patterns (fast check)
  const urlBasedPlatform = detectPlatformFromUrl(url);
  
  // If we have high confidence from URL alone, return early
  if (urlBasedPlatform !== BookingPlatform.UNKNOWN) {
    return {
      platform: urlBasedPlatform,
      confidence: 0.9, // High confidence for URL pattern matches
    };
  }
  
  try {
    // If FireCrawl API key is available, use it to scrape the page
    if (config.FIRECRAWL_API_KEY) {
      return await analyzeWithFireCrawl(url);
    }
    
    // Otherwise fall back to simple fetch
    return await analyzeWithSimpleFetch(url);
  } catch (error) {
    console.error('Error analyzing website:', error);
    return {
      platform: BookingPlatform.UNKNOWN,
      confidence: 0,
    };
  }
}

/**
 * Analyze using a simple fetch approach
 */
async function analyzeWithSimpleFetch(url: string): Promise<{
  platform: BookingPlatform;
  confidence: number;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    return analyzeHtmlContent(html);
  } catch (error) {
    console.error('Error in simple fetch:', error);
    return {
      platform: BookingPlatform.UNKNOWN,
      confidence: 0,
    };
  }
}

/**
 * Analyze using FireCrawl service
 */
async function analyzeWithFireCrawl(url: string): Promise<{
  platform: BookingPlatform;
  confidence: number;
  platformDetails?: any;
}> {
  try {
    const apiKey = config.FIRECRAWL_API_KEY;
    
    if (!apiKey) {
      throw new Error('FireCrawl API key not available');
    }
    
    // Call FireCrawl API to get HTML content
    const response = await fetch('https://api.firecrawl.dev/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      throw new Error(`FireCrawl API error: ${response.status}`);
    }
    
    const data = await response.json() as { 
      success: boolean; 
      content: string;
      url?: string;
      error?: string; 
    };
    
    if (!data.success || !data.content) {
      throw new Error('FireCrawl scraping failed: ' + (data.error || 'No content returned'));
    }
    
    // Analyze the HTML content
    const result = analyzeHtmlContent(data.content);
    
    // Look for booking form details in the page
    const platformDetails = extractBookingDetails(data.content, result.platform);
    
    return {
      ...result,
      platformDetails
    };
  } catch (error) {
    console.error('Error in FireCrawl analysis:', error);
    return {
      platform: BookingPlatform.UNKNOWN,
      confidence: 0,
    };
  }
}

/**
 * Analyzes HTML content to detect booking platform
 */
function analyzeHtmlContent(html: string): {
  platform: BookingPlatform;
  confidence: number;
} {
  // Initialize confidence scores
  const confidenceScores: Record<BookingPlatform, number> = {
    [BookingPlatform.OPENTABLE]: 0,
    [BookingPlatform.RESY]: 0,
    [BookingPlatform.TOCK]: 0,
    [BookingPlatform.SEVENROOMS]: 0,
    [BookingPlatform.DIRECT]: 0,
    [BookingPlatform.UNKNOWN]: 0
  };
  
  // Check for platform-specific patterns in HTML
  for (const [platform, patterns] of Object.entries(HTML_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(html)) {
        confidenceScores[platform as BookingPlatform] += 0.25;
      }
    }
  }
  
  // Check for general booking indicators that suggest a direct booking system
  if (
    /reservation/i.test(html) &&
    /booking/i.test(html) &&
    (/date/i.test(html) || /calendar/i.test(html)) &&
    (/time/i.test(html) || /slot/i.test(html)) &&
    (/party/i.test(html) || /people/i.test(html) || /guests/i.test(html))
  ) {
    confidenceScores[BookingPlatform.DIRECT] += 0.3;
  }
  
  // Find the platform with highest confidence
  let highestConfidence = 0;
  let detectedPlatform = BookingPlatform.UNKNOWN;
  
  for (const [platform, score] of Object.entries(confidenceScores)) {
    if (score > highestConfidence) {
      highestConfidence = score;
      detectedPlatform = platform as BookingPlatform;
    }
  }
  
  // Cap confidence at 0.95
  highestConfidence = Math.min(highestConfidence, 0.95);
  
  return {
    platform: detectedPlatform,
    confidence: highestConfidence
  };
}

/**
 * Extract booking details like form selectors, IDs from the page
 */
function extractBookingDetails(html: string, platform: BookingPlatform): any {
  try {
    const details: any = {
      detected: false,
      platform
    };
    
    switch (platform) {
      case BookingPlatform.OPENTABLE:
        // Extract OpenTable restaurant ID
        const otMatchRestId = html.match(/data-restaurant-id="([^"]+)"/i);
        if (otMatchRestId) {
          details.restaurantId = otMatchRestId[1];
          details.detected = true;
        }
        
        // Extract widget form
        const otWidgetMatch = html.match(/data-ot-widget-id="([^"]+)"/i);
        if (otWidgetMatch) {
          details.widgetId = otWidgetMatch[1];
          details.detected = true;
        }
        break;
        
      case BookingPlatform.RESY:
        // Extract Resy venue ID
        const resyMatch = html.match(/data-resy-venue-id="([^"]+)"/i);
        if (resyMatch) {
          details.venueId = resyMatch[1];
          details.detected = true;
        }
        break;
        
      case BookingPlatform.TOCK:
        // Extract Tock venue ID or slug
        const tockMatch = html.match(/data-tock-slug="([^"]+)"/i) || 
                         html.match(/exploretock\.com\/([^\/]+)/i);
        if (tockMatch) {
          details.slug = tockMatch[1];
          details.detected = true;
        }
        break;
        
      case BookingPlatform.SEVENROOMS:
        // Extract SevenRooms venue ID
        const svRoomsMatch = html.match(/data-sv-lmr="([^"]+)"/i) ||
                           html.match(/data-venue-id="([^"]+)"/i);
        if (svRoomsMatch) {
          details.venueId = svRoomsMatch[1];
          details.detected = true;
        }
        break;
    }
    
    return details;
  } catch (error) {
    console.error('Error extracting booking details:', error);
    return {
      detected: false,
      platform
    };
  }
}

export default {
  detectPlatformFromUrl,
  analyzeWebsite,
  BookingPlatform
};