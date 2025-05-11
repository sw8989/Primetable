import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function BookingToolTester({ restaurants }: { restaurants: any[] }) {
  const [selectedTool, setSelectedTool] = useState('book_restaurant');
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [specialRequests, setSpecialRequests] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [location, setLocation] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [timeRangeStart, setTimeRangeStart] = useState('');
  const [timeRangeEnd, setTimeRangeEnd] = useState('');
  
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get unique values for filters using filter approach instead of Set
  const cuisines = restaurants
    .map((r) => r.cuisine)
    .filter((value, index, self) => self.indexOf(value) === index);
  const locations = restaurants
    .map((r) => r.location)
    .filter((value, index, self) => self.indexOf(value) === index);
  const difficulties = restaurants
    .map((r) => r.bookingDifficulty)
    .filter((value, index, self) => self.indexOf(value) === index);

  const handleToolCall = async () => {
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      // Build parameters based on selected tool
      let parameters: any = {};
      
      if (selectedTool === 'book_restaurant') {
        if (!selectedRestaurant || !date || !time || !partySize) {
          throw new Error('Please fill all required fields');
        }
        
        parameters = {
          restaurant: selectedRestaurant,
          date: date ? format(date, 'yyyy-MM-dd') : '',
          time,
          partySize: parseInt(partySize),
          specialRequests,
          userId: 1 // Default user ID for testing
        };
      } 
      else if (selectedTool === 'check_availability') {
        if (!selectedRestaurant || !date || !partySize) {
          throw new Error('Please fill restaurant, date and party size');
        }
        
        parameters = {
          restaurant: selectedRestaurant,
          date: date ? format(date, 'yyyy-MM-dd') : '',
          partySize: parseInt(partySize),
        };
        
        if (timeRangeStart && timeRangeEnd) {
          parameters.timeRange = {
            start: timeRangeStart,
            end: timeRangeEnd
          };
        }
      }
      else if (selectedTool === 'get_restaurant_info') {
        if (!selectedRestaurant) {
          throw new Error('Please select a restaurant');
        }
        
        parameters = {
          restaurant: selectedRestaurant
        };
      }
      else if (selectedTool === 'find_alternative_restaurants') {
        if (!selectedRestaurant) {
          throw new Error('Please select a restaurant');
        }
        
        parameters = {
          restaurant: selectedRestaurant
        };
        
        if (cuisine) parameters.cuisine = cuisine;
        if (location) parameters.location = location;
        if (difficulty) parameters.difficulty = difficulty;
      }

      // Call the API
      const response = await fetch('/api/mcp/tool-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: selectedTool,
          parameters
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Booking Tools Tester</CardTitle>
        <CardDescription>
          Test the AI assistant's restaurant booking tools directly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="book_restaurant" onValueChange={setSelectedTool}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="book_restaurant">Book Restaurant</TabsTrigger>
            <TabsTrigger value="check_availability">Check Availability</TabsTrigger>
            <TabsTrigger value="get_restaurant_info">Restaurant Info</TabsTrigger>
            <TabsTrigger value="find_alternative_restaurants">Find Alternatives</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 space-y-4">
            {/* Restaurant Selection - Common to all tools */}
            <div className="space-y-2">
              <Label htmlFor="restaurant">Restaurant</Label>
              <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((restaurant) => (
                    <SelectItem key={`restaurant-${restaurant.id}`} value={restaurant.name}>
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Date Picker - for booking and availability */}
            {(selectedTool === 'book_restaurant' || selectedTool === 'check_availability') && (
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            
            {/* Time - for booking only */}
            {selectedTool === 'book_restaurant' && (
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a time" />
                  </SelectTrigger>
                  <SelectContent>
                    {['12:00', '12:30', '13:00', '13:30', '14:00', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Time Range - for availability only */}
            {selectedTool === 'check_availability' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeRangeStart">Earliest Time</Label>
                  <Select value={timeRangeStart} onValueChange={setTimeRangeStart}>
                    <SelectTrigger>
                      <SelectValue placeholder="Earliest" />
                    </SelectTrigger>
                    <SelectContent>
                      {['12:00', '13:00', '14:00', '18:00', '19:00', '20:00'].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeRangeEnd">Latest Time</Label>
                  <Select value={timeRangeEnd} onValueChange={setTimeRangeEnd}>
                    <SelectTrigger>
                      <SelectValue placeholder="Latest" />
                    </SelectTrigger>
                    <SelectContent>
                      {['14:00', '15:00', '21:00', '22:00', '23:00'].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {/* Party Size - for booking and availability */}
            {(selectedTool === 'book_restaurant' || selectedTool === 'check_availability') && (
              <div className="space-y-2">
                <Label htmlFor="partySize">Party Size</Label>
                <Select value={partySize} onValueChange={setPartySize}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select party size" />
                  </SelectTrigger>
                  <SelectContent>
                    {['1', '2', '3', '4', '5', '6', '7', '8'].map((size) => (
                      <SelectItem key={size} value={size}>
                        {size} {parseInt(size) === 1 ? 'person' : 'people'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Special Requests - for booking only */}
            {selectedTool === 'book_restaurant' && (
              <div className="space-y-2">
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Textarea
                  id="specialRequests"
                  placeholder="Any special requests for your reservation"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                />
              </div>
            )}
            
            {/* Filters - for find alternatives only */}
            {selectedTool === 'find_alternative_restaurants' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cuisine">Cuisine</Label>
                  <Select value={cuisine} onValueChange={setCuisine}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any cuisine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any cuisine</SelectItem>
                      {cuisines.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any location</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Booking Difficulty</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any difficulty</SelectItem>
                      {difficulties.map((diff) => (
                        <SelectItem key={diff} value={diff}>
                          {diff}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex flex-col items-start gap-4">
        <Button 
          onClick={handleToolCall} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Processing...' : 'Test Tool'}
        </Button>
        
        {error && (
          <div className="w-full p-4 bg-red-50 text-red-800 rounded-md">
            {error}
          </div>
        )}
        
        {response && (
          <div className="w-full space-y-2">
            <h3 className="text-lg font-medium">Response:</h3>
            <div className="p-4 bg-slate-50 rounded-md overflow-auto max-h-[300px]">
              <pre className="whitespace-pre-wrap">{JSON.stringify(response, null, 2)}</pre>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}