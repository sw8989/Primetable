import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  User, 
  Send, 
  Check,
  X,
  Bot, 
  Loader2,
  Calendar,
  Clock,
  Users,
  MapPin,
  Utensils 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MCPAgent } from '@/lib/mcp/MCPAgent';
import { MCPMessage } from '@/lib/mcp/agentProtocol';
import type { Restaurant } from '@shared/schema';
import { useBooking } from '@/hooks/useBooking';

// Style variations for message types
const getMessageStyle = (role: string) => {
  switch (role) {
    case 'user':
      return 'bg-primary text-white rounded-tr-none';
    case 'assistant':
      return 'bg-gray-100 text-gray-800 rounded-tl-none';
    case 'tool':
      return 'bg-blue-50 text-blue-800 border border-blue-200 rounded-tl-none';
    default:
      return 'bg-gray-200 text-gray-700';
  }
};

/**
 * MCPAgentInterface - provides a chat interface to an MCP-based agent
 */
const MCPAgentInterface = ({ restaurants }: { restaurants: Restaurant[] }) => {
  const [agent, setAgent] = useState<MCPAgent | null>(null);
  const [messages, setMessages] = useState<MCPMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { openBookingModal } = useBooking();
  
  // Initialize the agent when restaurants are available
  useEffect(() => {
    if (restaurants.length > 0 && !agent) {
      const mcpAgent = new MCPAgent(restaurants);
      setAgent(mcpAgent);
      setMessages(mcpAgent.getMessages());
    }
  }, [restaurants, agent]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !agent || isProcessing) return;
    
    // Add user message to UI immediately for responsiveness
    setMessages(prev => [...prev, {
      role: 'user',
      content: inputValue
    }]);
    
    // Clear input and set processing state
    const message = inputValue;
    setInputValue('');
    setIsProcessing(true);
    
    try {
      // Process the message using the agent
      const updatedMessages = await agent.processUserMessage(message);
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.'
      }]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleRestaurantClick = (restaurant: Restaurant) => {
    // Open the booking modal with the selected restaurant
    openBookingModal(restaurant);
  };
  
  const formatRestaurant = (restaurant: any) => {
    if (!restaurant) return null;
    
    return (
      <Card 
        key={restaurant.id} 
        className="mt-2 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleRestaurantClick(restaurant)}
      >
        <CardContent className="p-3">
          <div className="flex gap-3">
            <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-200 flex-shrink-0">
              {restaurant.imageUrl && (
                <img 
                  src={restaurant.imageUrl} 
                  alt={restaurant.name} 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div>
              <h4 className="font-medium text-sm">{restaurant.name}</h4>
              <div className="flex flex-wrap gap-2 mt-1">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Utensils className="h-3 w-3" />
                  <span>{restaurant.cuisine}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  <span>{restaurant.location}</span>
                </div>
                {restaurant.bookingDifficulty && (
                  <Badge 
                    variant={
                      restaurant.bookingDifficulty === 'easy' ? 'secondary' : 
                      restaurant.bookingDifficulty === 'medium' ? 'default' : 
                      'destructive'
                    }
                    className="text-xs"
                  >
                    {restaurant.bookingDifficulty === 'easy' ? 'Easy to book' : 
                     restaurant.bookingDifficulty === 'medium' ? 'Medium difficulty' : 
                     'Hard to book'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Extract restaurants from messages for display
  const extractRestaurants = (content: string): Restaurant[] => {
    const restaurantNames: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const match = line.match(/\d+\.\s+([^-]+)/);
      if (match) {
        restaurantNames.push(match[1].trim());
      }
    }
    
    return restaurants.filter(r => 
      restaurantNames.some(name => 
        r.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(r.name.toLowerCase())
      )
    );
  };
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md">
      <div className="p-4 border-b flex items-center gap-2">
        <Bot className="text-primary h-5 w-5" />
        <h3 className="font-display text-lg font-semibold">Prime Table Agent (MCP)</h3>
        {isProcessing && (
          <div className="ml-auto flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Processing...</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto max-h-[500px] space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] p-3 rounded-lg ${getMessageStyle(message.role)}`}>
              {message.role === 'assistant' && (
                <div className="flex items-center gap-1 mb-1 text-xs text-gray-500">
                  <Bot className="h-3 w-3" />
                  <span>Assistant</span>
                </div>
              )}
              
              {message.role === 'user' && (
                <div className="flex items-center justify-end gap-1 mb-1 text-xs text-gray-300">
                  <span>You</span>
                  <User className="h-3 w-3" />
                </div>
              )}
              
              {message.role === 'tool' && (
                <div className="flex items-center gap-1 mb-1 text-xs text-blue-500">
                  <i className="fas fa-tools text-xs"></i>
                  <span>Tool Result</span>
                </div>
              )}
              
              <p className="text-sm whitespace-pre-line">{message.content}</p>
              
              {/* Extract and display restaurants for tool results */}
              {message.role === 'tool' && message.content.includes('Found') && message.content.includes('restaurants') && (
                <div className="mt-2 space-y-2">
                  {extractRestaurants(message.content).map(restaurant => 
                    formatRestaurant(restaurant)
                  )}
                </div>
              )}
              
              {/* Show restaurant card when agent mentions specific restaurant */}
              {message.role === 'assistant' && restaurants.some(r => message.content.includes(r.name)) && (
                <div className="mt-2">
                  {restaurants
                    .filter(r => message.content.includes(r.name))
                    .slice(0, 1)
                    .map(restaurant => formatRestaurant(restaurant))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Ask about restaurants or bookings..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isProcessing}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={isProcessing || !inputValue.trim()}
            className="px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Suggested queries */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-xs"
            onClick={() => {
              setInputValue("Find me a table at a Japanese restaurant in Mayfair for tomorrow at 7pm");
              setTimeout(handleSendMessage, 100);
            }}
            disabled={isProcessing}
          >
            Japanese in Mayfair
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-xs"
            onClick={() => {
              setInputValue("Are there any tables available tonight for 2 people?");
              setTimeout(handleSendMessage, 100);
            }}
            disabled={isProcessing}
          >
            Tables tonight
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-xs"
            onClick={() => {
              setInputValue("What are the hardest restaurants to book in London?");
              setTimeout(handleSendMessage, 100);
            }}
            disabled={isProcessing}
          >
            Exclusive restaurants
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MCPAgentInterface;