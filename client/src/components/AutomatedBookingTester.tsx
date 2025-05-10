import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatISO } from "date-fns";

export default function AutomatedBookingTester() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [form, setForm] = useState({
    restaurantName: 'Chiltern Firehouse',
    platformId: 'chiltern123',
    platform: 'OpenTable',
    date: formatISO(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)).split('T')[0], // 14 days from now
    time: '19:00',
    partySize: 2,
    userName: 'Test User',
    userEmail: 'test@example.com',
    userPhone: '07700900000',
    specialRequests: 'This is a test booking, please ignore',
    bookingUrl: 'https://www.opentable.com/chiltern-firehouse'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm({
      ...form,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);
    
    try {
      // Call the automated booking endpoint
      const response = await fetch('/api/automated-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResults(data);
        toast({
          title: data.success ? "Booking Test Successful" : "Booking Test Failed",
          description: data.success 
            ? "Automated booking process completed successfully." 
            : `Booking process failed: ${data.error}`,
          variant: data.success ? "default" : "destructive"
        });
      } else {
        toast({
          title: "Booking Test Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to communicate with the server",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Automated Booking Tester</CardTitle>
        <CardDescription>
          This tool tests the automated booking system by simulating a booking process on a specific platform.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="restaurantName">Restaurant Name</Label>
                <Input 
                  id="restaurantName" 
                  name="restaurantName" 
                  value={form.restaurantName} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="platform">Booking Platform</Label>
                <Select 
                  value={form.platform} 
                  onValueChange={(value) => handleSelectChange('platform', value)}
                >
                  <SelectTrigger id="platform">
                    <SelectValue placeholder="Select Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OpenTable">OpenTable</SelectItem>
                    <SelectItem value="SevenRooms" disabled>SevenRooms (Coming Soon)</SelectItem>
                    <SelectItem value="Resy" disabled>Resy (Coming Soon)</SelectItem>
                    <SelectItem value="Tock" disabled>Tock (Coming Soon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platformId">Platform ID</Label>
                <Input 
                  id="platformId" 
                  name="platformId" 
                  value={form.platformId} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bookingUrl">Booking URL (Optional)</Label>
                <Input 
                  id="bookingUrl" 
                  name="bookingUrl" 
                  value={form.bookingUrl} 
                  onChange={handleChange} 
                  placeholder="https://example.com/booking" 
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Booking Date</Label>
                <Input 
                  id="date" 
                  name="date" 
                  type="date" 
                  value={form.date} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time">Booking Time</Label>
                <Input 
                  id="time" 
                  name="time" 
                  type="time" 
                  value={form.time} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="partySize">Party Size</Label>
                <Select 
                  value={form.partySize.toString()} 
                  onValueChange={(value) => handleSelectChange('partySize', value)}
                >
                  <SelectTrigger id="partySize">
                    <SelectValue placeholder="Select Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
                      <SelectItem key={size} value={size.toString()}>{size} {size === 1 ? 'person' : 'people'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userName">Name</Label>
                <Input 
                  id="userName" 
                  name="userName" 
                  value={form.userName} 
                  onChange={handleChange} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userEmail">Email</Label>
                <Input 
                  id="userEmail" 
                  name="userEmail" 
                  type="email" 
                  value={form.userEmail} 
                  onChange={handleChange} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userPhone">Phone</Label>
                <Input 
                  id="userPhone" 
                  name="userPhone" 
                  value={form.userPhone} 
                  onChange={handleChange} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specialRequests">Special Requests</Label>
              <Input 
                id="specialRequests" 
                name="specialRequests" 
                value={form.specialRequests} 
                onChange={handleChange} 
              />
            </div>
          </div>
          
          <Button className="mt-6 w-full" type="submit" disabled={loading}>
            {loading ? "Testing Booking Process..." : "Test Automated Booking"}
          </Button>
        </form>
        
        {results && (
          <div className="mt-8">
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Booking Details</TabsTrigger>
                <TabsTrigger value="logs">Process Logs</TabsTrigger>
                <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-4">
                <div className="rounded-md bg-muted p-4">
                  <h3 className="text-xl font-semibold mb-2">
                    {results.success ? "Booking Test Successful" : "Booking Test Failed"}
                  </h3>
                  
                  {results.error && (
                    <p className="text-destructive mb-4">{results.error}</p>
                  )}
                  
                  {results.bookingDetails && (
                    <div className="space-y-2">
                      <p><strong>Restaurant:</strong> {results.bookingDetails.restaurant}</p>
                      <p><strong>Date:</strong> {formatDate(results.bookingDetails.date)}</p>
                      <p><strong>Time:</strong> {results.bookingDetails.time}</p>
                      <p><strong>Party Size:</strong> {results.bookingDetails.partySize} people</p>
                      {results.bookingDetails.confirmationCode && (
                        <p><strong>Confirmation Code:</strong> {results.bookingDetails.confirmationCode}</p>
                      )}
                      <p><strong>Status:</strong> <span className={
                        results.status === 'confirmed' ? 'text-green-600' : 
                        results.status === 'pending' ? 'text-amber-600' : 'text-red-600'
                      }>{results.status}</span></p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="logs" className="mt-4">
                <div className="rounded-md bg-muted p-4 max-h-80 overflow-y-auto">
                  <h3 className="text-xl font-semibold mb-2">Process Logs</h3>
                  {results.logs && results.logs.length > 0 ? (
                    <pre className="whitespace-pre-wrap text-xs">{results.logs.join('\n')}</pre>
                  ) : (
                    <p>No logs available</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="screenshots" className="mt-4">
                <div className="rounded-md bg-muted p-4">
                  <h3 className="text-xl font-semibold mb-2">Process Screenshots</h3>
                  {results.screenshots && results.screenshots.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {results.screenshots.map((screenshot: string, index: number) => (
                        <div key={index} className="border rounded p-2">
                          <p className="text-sm mb-1">Screenshot {index + 1}</p>
                          <img 
                            src={screenshot} 
                            alt={`Booking process screenshot ${index + 1}`} 
                            className="w-full"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No screenshots available</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}