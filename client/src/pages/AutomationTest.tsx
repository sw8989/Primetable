import { useState, useEffect } from "react";
import PuppeteerBookingTester from "@/components/PuppeteerBookingTester";
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
      <h1 className="text-3xl font-bold mb-2">Developer Testing Tools</h1>
      <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6 rounded">
        <h3 className="font-bold">Development Use Only</h3>
        <p>These tools are for development and testing purposes only. In production, all booking functionality will be accessed through the Prime Table Booking Assistant.</p>
      </div>
      
      <Tabs defaultValue="puppeteer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="puppeteer">Puppeteer MCP</TabsTrigger>
          <TabsTrigger value="tools">AI Booking Tools</TabsTrigger>
        </TabsList>
        

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
        

      </Tabs>
    </div>
  );
}