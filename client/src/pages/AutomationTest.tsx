import { useState, useEffect } from "react";
import AutomatedBookingTester from "@/components/AutomatedBookingTester";
import PuppeteerBookingTester from "@/components/PuppeteerBookingTester";
import FireCrawlTester from "@/components/FireCrawlTester";
import BookingToolTester from "@/components/BookingToolTester";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function AutomationTestPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch restaurants on component mount
  useEffect(() => {
    async function fetchRestaurants() {
      try {
        const response = await fetch('/api/restaurants');
        if (response.ok) {
          const data = await response.json();
          setRestaurants(data);
        } else {
          console.error("Error fetching restaurants:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchRestaurants();
  }, []);
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Restaurant Automation Tools</h1>
      <p className="text-muted-foreground mb-6">
        Test our advanced automation tools for restaurant searching and booking.
      </p>
      
      <Tabs defaultValue="booking" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="booking">Standard Booking</TabsTrigger>
          <TabsTrigger value="puppeteer">Puppeteer MCP</TabsTrigger>
          <TabsTrigger value="tools">AI Booking Tools</TabsTrigger>
          <TabsTrigger value="search">Web Search</TabsTrigger>
        </TabsList>
        
        <TabsContent value="booking" className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">Standard Booking Automation</h2>
          <p className="text-muted-foreground mb-6">
            Test our automated booking system on OpenTable and other restaurant reservation platforms using the standard approach.
          </p>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : (
            <AutomatedBookingTester restaurants={restaurants} />
          )}
        </TabsContent>
        
        <TabsContent value="puppeteer" className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">Puppeteer MCP Booking Automation</h2>
          <p className="text-muted-foreground mb-6">
            Test our enhanced booking system that uses Puppeteer MCP tool for direct browser automation.
          </p>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : (
            <PuppeteerBookingTester restaurants={restaurants} />
          )}
        </TabsContent>
        
        <TabsContent value="tools" className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">AI Booking Tools</h2>
          <p className="text-muted-foreground mb-6">
            Test the AI booking tools directly to check restaurant availability and make reservations.
          </p>
          {loading ? (
            <div>
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : (
            <BookingToolTester restaurants={restaurants} />
          )}
        </TabsContent>
        
        <TabsContent value="search" className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">FireCrawl Restaurant Search</h2>
          <p className="text-muted-foreground mb-6">
            Use FireCrawl to search for restaurant information and scrape booking details.
          </p>
          <FireCrawlTester />
        </TabsContent>
      </Tabs>
    </div>
  );
}