import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  User, 
  Send, 
  Sparkles,
  Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MCPXClient, MCPXMessage } from '@/lib/mcp/MCPXClient';
import type { Restaurant } from '@shared/schema';
import { useBooking } from '@/hooks/useBooking';
import RestaurantCard from './RestaurantCard';

interface MCPChatInterfaceProps {
  restaurants: Restaurant[];
}

/**
 * MCPChatInterface - A component for interacting with the AI booking assistant
 * This provides a chat interface for users to book restaurant reservations
 */
const MCPChatInterface: React.FC<MCPChatInterfaceProps> = ({ restaurants }) => {
  const [messages, setMessages] = useState<MCPXMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mcpAgent, setMcpAgent] = useState<MCPXClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { openBookingModal } = useBooking();
  
  // Initialize AI assistant when restaurants are available
  useEffect(() => {
    if (restaurants.length > 0 && !mcpAgent) {
      console.log('Initializing AI assistant with', restaurants.length, 'restaurants');
      const agent = new MCPXClient({ restaurants, simulationMode: false });
      setMcpAgent(agent);
      setMessages(agent.getMessages());
    }
  }, [restaurants, mcpAgent]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !mcpAgent || isProcessing) return;
    
    setIsProcessing(true);
    setInputValue('');
    
    try {
      // Process the message using the AI assistant
      const updatedMessages = await mcpAgent.processMessage(inputValue);
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Error processing message with AI assistant:', error);
      
      // Add error message
      setMessages(prev => [
        ...prev, 
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please try again.'
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const extractRestaurants = (msg: MCPXMessage): Restaurant[] => {
    if (msg.role !== 'tool' || !msg.tool_results) return [];
    
    const restaurants: Restaurant[] = [];
    
    for (const result of msg.tool_results) {
      try {
        // Parse the tool result content
        const resultData = JSON.parse(result.function.content);
        
        // Check for restaurants in search results
        if (resultData.restaurants && Array.isArray(resultData.restaurants)) {
          restaurants.push(...(resultData.restaurants as Restaurant[]));
        }
        
        // Check for single restaurant in result
        if (resultData.restaurant && typeof resultData.restaurant === 'object') {
          restaurants.push(resultData.restaurant as Restaurant);
        }
      } catch (error) {
        console.error('Error parsing tool result:', error);
      }
    }
    
    return restaurants;
  };
  
  const handleRestaurantClick = (restaurant: Restaurant) => {
    openBookingModal(restaurant);
  };
  
  const renderMessageContent = (message: MCPXMessage) => {
    const restaurants = message.role === 'tool' ? extractRestaurants(message) : [];
    
    return (
      <div className="space-y-3">
        {/* Main message content */}
        <div className="whitespace-pre-line">{message.content}</div>
        
        {/* Tool results hidden */}
        
        {/* Restaurant results */}
        {restaurants.length > 0 && (
          <div className="mt-2 space-y-2">
            {restaurants.slice(0, 5).map((restaurant) => (
              <div 
                key={restaurant.id} 
                className="bg-white rounded-lg shadow-sm p-2 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleRestaurantClick(restaurant)}
              >
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-200">
                    {restaurant.imageUrl && (
                      <img 
                        src={restaurant.imageUrl} 
                        alt={restaurant.name} 
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{restaurant.name}</h4>
                    <div className="text-xs text-gray-500">{restaurant.cuisine} • {restaurant.location}</div>
                    <div className="text-xs mt-1">
                      <Badge variant="outline" className={
                        restaurant.bookingDifficulty === 'hard' ? 'border-red-200 text-red-600 bg-red-50' :
                        restaurant.bookingDifficulty === 'medium' ? 'border-amber-200 text-amber-600 bg-amber-50' :
                        'border-green-200 text-green-600 bg-green-50'
                      }>
                        {restaurant.bookingDifficulty === 'hard' ? 'Hard to book' :
                         restaurant.bookingDifficulty === 'medium' ? 'Moderate' :
                         'Easy to book'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {restaurants.length > 5 && (
              <div className="text-primary text-sm font-medium text-center cursor-pointer hover:underline">
                + {restaurants.length - 5} more restaurants
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md">
      <div className="p-4 border-b flex items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary h-5 w-5" />
          <h3 className="font-display text-lg font-semibold">Prime Table Booking Assistant</h3>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto max-h-[500px] space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : message.role === 'tool' 
                    ? 'bg-blue-50 text-gray-800 border border-blue-100' 
                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}
            >
              <div className="flex items-start mb-2">
                <div className="h-5 w-5 mr-2 flex-shrink-0">
                  {message.role === 'user' ? (
                    <User className="h-5 w-5 text-white" />
                  ) : message.role === 'tool' ? (
                    <Bot className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-primary" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 text-sm">
                  {renderMessageContent(message)}
                </div>
              </div>
              
              {/* Hidden tool calls */}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input 
            placeholder="Ask for help with your restaurant booking..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isProcessing}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={isProcessing || !inputValue.trim()}
            className="gap-1"
          >
            {isProcessing ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MCPChatInterface;