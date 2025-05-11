import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

// Date picker components
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PuppeteerBookingTester({ restaurants }: { restaurants: any[] }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  
  // Form state
  const [formState, setFormState] = useState({
    restaurantName: '',
    platform: 'OpenTable',
    date: new Date(),
    time: '19:00',
    partySize: 2,
    name: '',
    email: '',
    phone: '',
    specialRequests: '',
  });
  
  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setFormState(prev => ({ ...prev, date }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setBookingResult(null);
    
    try {
      // Check if required fields are filled
      if (!formState.restaurantName || !formState.platform || !formState.time) {
        toast({
          title: "Missing information",
          description: "Please fill out all required fields.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Find the restaurant details
      const selectedRestaurant = restaurants.find(r => r.name === formState.restaurantName);
      
      // Create booking request
      const bookingRequest = {
        restaurantName: formState.restaurantName,
        platform: formState.platform,
        platformId: selectedRestaurant?.platformId || '',
        date: formState.date,
        time: formState.time,
        partySize: formState.partySize,
        userName: formState.name,
        userEmail: formState.email,
        userPhone: formState.phone,
        specialRequests: formState.specialRequests,
        useMcpPuppeteer: true // Enable Puppeteer MCP mode
      };
      
      // Call API to create booking
      const response = await fetch('/api/automated-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingRequest)
      });
      
      const data = await response.json();
      setBookingResult(data);
      
      toast({
        title: data.success ? "Booking Test Successful" : "Booking Test Failed",
        description: data.message || data.error || "No details available",
        variant: data.success ? "default" : "destructive"
      });
      
    } catch (error: any) {
      console.error('Error in booking:', error);
      
      toast({
        title: "Error Testing Booking",
        description: error.message || "An unknown error occurred",
        variant: "destructive"
      });
      
      setBookingResult({
        success: false,
        error: error.message || "An unknown error occurred",
      });
    }
    
    setLoading(false);
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Puppeteer MCP Booking Test</CardTitle>
          <CardDescription>
            Test browser automation booking using Puppeteer and Model Context Protocol
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="restaurantName">Restaurant</Label>
                <Select 
                  value={formState.restaurantName} 
                  onValueChange={value => handleSelectChange('restaurantName', value)}
                >
                  <SelectTrigger id="restaurantName">
                    <SelectValue placeholder="Select a restaurant" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map(restaurant => (
                      <SelectItem key={restaurant.id} value={restaurant.name}>
                        {restaurant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="platform">Booking Platform</Label>
                <Select 
                  value={formState.platform} 
                  onValueChange={value => handleSelectChange('platform', value)}
                >
                  <SelectTrigger id="platform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OpenTable">OpenTable</SelectItem>
                    <SelectItem value="Resy">Resy</SelectItem>
                    <SelectItem value="SevenRooms">SevenRooms</SelectItem>
                    <SelectItem value="Tock">Tock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formState.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formState.date ? format(formState.date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formState.date}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Select 
                  value={formState.time} 
                  onValueChange={value => handleSelectChange('time', value)}
                >
                  <SelectTrigger id="time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="12:30">12:30 PM</SelectItem>
                    <SelectItem value="13:00">1:00 PM</SelectItem>
                    <SelectItem value="13:30">1:30 PM</SelectItem>
                    <SelectItem value="18:00">6:00 PM</SelectItem>
                    <SelectItem value="18:30">6:30 PM</SelectItem>
                    <SelectItem value="19:00">7:00 PM</SelectItem>
                    <SelectItem value="19:30">7:30 PM</SelectItem>
                    <SelectItem value="20:00">8:00 PM</SelectItem>
                    <SelectItem value="20:30">8:30 PM</SelectItem>
                    <SelectItem value="21:00">9:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="partySize">Party Size</Label>
                <Select 
                  value={String(formState.partySize)} 
                  onValueChange={value => handleSelectChange('partySize', value)}
                >
                  <SelectTrigger id="partySize">
                    <SelectValue placeholder="Select party size" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
                      <SelectItem key={size} value={String(size)}>
                        {size} {size === 1 ? 'person' : 'people'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-2">Guest Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name"
                    name="name"
                    value={formState.name}
                    onChange={handleChange}
                    placeholder="John Smith"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    name="email"
                    type="email"
                    value={formState.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone"
                    name="phone"
                    value={formState.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              
              <div className="space-y-2 mt-4">
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Textarea 
                  id="specialRequests"
                  name="specialRequests"
                  value={formState.specialRequests}
                  onChange={handleChange}
                  placeholder="Add any special requests or notes for the restaurant"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? "Testing Booking..." : "Test MCP Booking"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {bookingResult && (
        <Card>
          <CardHeader>
            <CardTitle>
              {bookingResult.success ? (
                <span className="text-green-500">Booking Test Successful</span>
              ) : (
                <span className="text-red-500">Booking Test Failed</span>
              )}
            </CardTitle>
            <CardDescription>
              {bookingResult.simulation ? "Simulation Mode" : "Real Booking Mode"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-2">
              {bookingResult.message && (
                <p className="text-sm">{bookingResult.message}</p>
              )}
              
              {bookingResult.booking && (
                <div className="text-sm border rounded-md p-3 bg-muted/50">
                  <p><strong>Restaurant:</strong> {bookingResult.booking.restaurantName}</p>
                  <p><strong>Date/Time:</strong> {bookingResult.booking.date} at {bookingResult.booking.time}</p>
                  <p><strong>Party Size:</strong> {bookingResult.booking.partySize} people</p>
                  <p><strong>Status:</strong> {bookingResult.booking.status}</p>
                  {bookingResult.booking.confirmationCode && (
                    <p><strong>Confirmation Code:</strong> {bookingResult.booking.confirmationCode}</p>
                  )}
                </div>
              )}
              
              {bookingResult.error && (
                <div className="text-sm text-red-500 border border-red-200 rounded-md p-3 bg-red-50">
                  <p><strong>Error:</strong> {bookingResult.error}</p>
                </div>
              )}
              
              {bookingResult.logs && bookingResult.logs.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Booking Logs</h4>
                  <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                    <div className="text-xs font-mono">
                      {bookingResult.logs.map((log: string, index: number) => (
                        <div key={index} className="py-1">
                          {log}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}