import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const formSchema = z.object({
  restaurantName: z.string().min(2, { message: 'Please enter a restaurant name' }),
  date: z.string().min(1, { message: 'Please select a date' }),
  time: z.string().min(1, { message: 'Please select a time' }),
  partySize: z.string().min(1, { message: 'Please select party size' }),
  name: z.string().min(2, { message: 'Please enter your name' }),
  email: z.string().email({ message: 'Please enter a valid email' }),
  phone: z.string().min(5, { message: 'Please enter a valid phone number' }),
  specialRequests: z.string().optional(),
});

export default function PuppeteerBookingTester() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      restaurantName: 'Chiltern Firehouse',
      date: '2025-05-25',
      time: '19:00',
      partySize: '2',
      name: 'John Smith',
      email: 'test@example.com',
      phone: '+44 7700 900123',
      specialRequests: 'Window table if possible',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setLogs([]);

    try {
      // Get the restaurant details
      const restaurantsResponse = await fetch('/api/restaurants');
      const restaurants = await restaurantsResponse.json();
      const restaurant = restaurants.find((r: any) => r.name === values.restaurantName);

      if (!restaurant) {
        throw new Error(`Restaurant "${values.restaurantName}" not found`);
      }

      const requestData = {
        restaurantName: values.restaurantName,
        platformId: restaurant.platformId || '',
        platform: restaurant.bookingPlatform || 'OpenTable',
        date: values.date,
        time: values.time,
        partySize: parseInt(values.partySize),
        name: values.name,
        email: values.email,
        phone: values.phone,
        specialRequests: values.specialRequests || '',
        useMcpPuppeteer: true, // Flag to use Puppeteer MCP
      };

      const response = await fetch('/api/automated-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process booking');
      }

      setResult(data);
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (err: any) {
      console.error('Error in booking test:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Puppeteer MCP Booking Test</CardTitle>
          <CardDescription>
            Test automated booking using Smithery's Puppeteer MCP tool
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="restaurantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restaurant</FormLabel>
                      <FormControl>
                        <Input placeholder="Restaurant name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party Size</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select party size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
                            <SelectItem key={size} value={size.toString()}>
                              {size} {size === 1 ? 'person' : 'people'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[
                            '17:00', '17:30', '18:00', '18:30', '19:00', 
                            '19:30', '20:00', '20:30', '21:00', '21:30'
                          ].map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialRequests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requests</FormLabel>
                      <FormControl>
                        <Input placeholder="Any special requests (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing Booking...
                  </>
                ) : (
                  'Test Booking with Puppeteer MCP'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {result.success ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
                  Booking Test Successful
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-5 w-5 text-amber-500" />
                  Booking Test Result
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>Status:</strong> {result.success ? 'Success' : 'Failed'}
              </p>
              {result.message && (
                <p>
                  <strong>Message:</strong> {result.message}
                </p>
              )}
              {result.booking && (
                <>
                  <p>
                    <strong>Booking ID:</strong> {result.booking.id}
                  </p>
                  <p>
                    <strong>Restaurant:</strong> {result.booking.restaurantName}
                  </p>
                  <p>
                    <strong>Date/Time:</strong> {result.booking.date} at {result.booking.time}
                  </p>
                  <p>
                    <strong>Status:</strong> {result.booking.status}
                  </p>
                </>
              )}
              {result.simulation && (
                <p className="text-amber-500 font-medium">
                  Note: This was a simulated booking. No actual reservation was made.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Booking Process Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              {logs.map((log, index) => (
                <div key={index} className="pb-2 text-sm">
                  {log}
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}