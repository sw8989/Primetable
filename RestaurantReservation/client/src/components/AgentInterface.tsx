import { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  MessageSquare, 
  UserCheck, 
  Check, 
  Loader2,
  Search,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import RestaurantCard from './RestaurantCard';
import type { Restaurant } from '@shared/schema';
import { useBooking } from '@/hooks/useBooking';

/**
 * AgentInterface provides a unified chat-like interface for working with the booking agent
 */
const AgentInterface = ({ restaurants }: { restaurants: Restaurant[] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<{
    cuisine: string | null;
    location: string | null;
    difficulty: string | null;
  }>({
    cuisine: null,
    location: null,
    difficulty: null
  });
  const [message, setMessage] = useState('');
  const [agentMessages, setAgentMessages] = useState<
    { type: 'agent' | 'user' | 'system'; content: string; timestamp: Date }[]
  >([
    { 
      type: 'agent', 
      content: 'Hi there! I\'m your Prime Table booking assistant. I can help you secure reservations at London\'s most exclusive restaurants. What type of restaurant are you looking for today?', 
      timestamp: new Date() 
    }
  ]);
  
  const { openBookingModal } = useBooking();
  
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Add user message
    const userMessage = { type: 'user' as const, content: message, timestamp: new Date() };
    setAgentMessages([...agentMessages, userMessage]);
    
    // Clear input
    setMessage('');
    
    // Simulate agent thinking
    setTimeout(() => {
      // Agent response
      const agentResponse = { 
        type: 'agent' as const, 
        content: `I've found some restaurants that might interest you based on "${message}". Take a look at these options below. Would you like me to secure a booking at any of these establishments?`, 
        timestamp: new Date() 
      };
      setAgentMessages([...agentMessages, userMessage, agentResponse]);
      
      // Set search query based on message
      setSearchQuery(message);
    }, 1000);
  };
  
  // Filter restaurants based on search and filters
  const filteredRestaurants = restaurants.filter(restaurant => {
    // Search query filtering
    if (searchQuery && !restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !restaurant.location.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !restaurant.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by cuisine
    if (selectedFilters.cuisine && restaurant.cuisine !== selectedFilters.cuisine) {
      return false;
    }
    
    // Filter by location
    if (selectedFilters.location && restaurant.location !== selectedFilters.location) {
      return false;
    }
    
    // Filter by difficulty
    if (selectedFilters.difficulty && restaurant.bookingDifficulty !== selectedFilters.difficulty) {
      return false;
    }
    
    return true;
  });
  
  // Get unique values for filters (using Array.filter for compatibility)
  const cuisines = restaurants
    .map(r => r.cuisine)
    .filter((value, index, self) => self.indexOf(value) === index);
  
  const locations = restaurants
    .map(r => r.location)
    .filter((value, index, self) => self.indexOf(value) === index);
  
  const difficulties = restaurants
    .map(r => r.bookingDifficulty)
    .filter((value, index, self) => self.indexOf(value) === index);
  
  return (
    <div className="flex flex-col md:flex-row gap-4 h-full">
      {/* Agent Conversation */}
      <div className="flex flex-col w-full md:w-1/3 bg-white rounded-lg shadow-md">
        <div className="p-4 border-b">
          <h3 className="font-display text-xl font-semibold flex items-center">
            <UserCheck className="mr-2 text-primary" />
            Prime Table Agent
          </h3>
          <p className="text-sm text-gray-500">Your restaurant booking assistant</p>
        </div>
        
        <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[500px]">
          {agentMessages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-3/4 p-3 rounded-lg ${
                  msg.type === 'user' 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : msg.type === 'system' 
                      ? 'bg-gray-200 text-gray-700' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <span className="text-xs opacity-70 mt-1 block text-right">
                  {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input 
              placeholder="Ask the agent for help..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage}>
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Results Section */}
      <div className="flex-1">
        <div className="bg-white p-4 mb-4 rounded-lg shadow-md">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-auto flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search restaurants..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {/* Cuisine Filter */}
              <Select 
                value={selectedFilters.cuisine || ''} 
                onValueChange={(value) => setSelectedFilters({...selectedFilters, cuisine: value || null})}
              >
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue placeholder="Cuisine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cuisines</SelectItem>
                  {cuisines.map(cuisine => (
                    <SelectItem key={cuisine} value={cuisine}>{cuisine}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Location Filter */}
              <Select 
                value={selectedFilters.location || ''} 
                onValueChange={(value) => setSelectedFilters({...selectedFilters, location: value || null})}
              >
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Difficulty Filter */}
              <Select 
                value={selectedFilters.difficulty || ''} 
                onValueChange={(value) => setSelectedFilters({...selectedFilters, difficulty: value || null})}
              >
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  {difficulties.map(difficulty => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {difficulty === 'easy' ? 'Easy to book' : 
                       difficulty === 'medium' ? 'Moderate' : 
                       'Hard to book'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Reset Filters */}
              {(selectedFilters.cuisine || selectedFilters.location || selectedFilters.difficulty || searchQuery) && (
                <Button 
                  variant="outline" 
                  className="gap-1"
                  onClick={() => {
                    setSelectedFilters({cuisine: null, location: null, difficulty: null});
                    setSearchQuery('');
                  }}
                >
                  <X className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Results Count */}
          <div className="flex justify-between items-center">
            <h2 className="font-display text-xl font-semibold">
              {filteredRestaurants.length} Restaurants Found
            </h2>
            
            <div className="flex gap-2 items-center">
              <Badge variant="outline" className="bg-white">
                <Check className="h-3 w-3 mr-1 text-success" />
                Agent Ready
              </Badge>
            </div>
          </div>
          
          {/* Restaurants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
          
          {filteredRestaurants.length === 0 && (
            <Card className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-2">No matching restaurants found</h3>
              <p className="text-gray-500 mb-4">Try adjusting your search criteria or filters</p>
              <Button
                onClick={() => {
                  setSelectedFilters({cuisine: null, location: null, difficulty: null});
                  setSearchQuery('');
                }}
              >
                Reset All Filters
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentInterface;