import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  User, 
  Send, 
  Clock,
  Calendar,
  Users,
  Utensils,
  MapPin,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AgentWorkflow } from '@/lib/agentWorkflow';
import type { Restaurant } from '@shared/schema';
import { useBooking } from '@/hooks/useBooking';
import RestaurantCard from './RestaurantCard';

type MessageType = 'agent' | 'user' | 'system';

interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  suggestedActions?: string[];
  restaurants?: Restaurant[];
}

/**
 * AgentChat provides a conversational interface to the booking agent
 */
const AgentChat = ({ restaurants }: { restaurants: Restaurant[] }) => {
  const [workflow, setWorkflow] = useState<AgentWorkflow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { openBookingModal } = useBooking();
  
  // Initialize workflow when restaurants are available
  useEffect(() => {
    if (restaurants.length > 0 && !workflow) {
      const newWorkflow = new AgentWorkflow(restaurants);
      setWorkflow(newWorkflow);
      
      // Add initial greeting message
      setMessages([
        {
          id: 'initial-greeting',
          type: 'agent',
          content: "Hello! I'm your Prime Table booking assistant. I can help you secure reservations at London's most exclusive restaurants. What type of dining experience are you looking for today?",
          timestamp: new Date(),
          suggestedActions: ['Book a restaurant', 'Browse restaurants', 'Find available tables tonight']
        }
      ]);
    }
  }, [restaurants, workflow]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !workflow || isProcessing) return;
    
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    // Create loading message
    const loadingMessage: Message = {
      id: `agent-${Date.now()}`,
      type: 'agent',
      content: 'Thinking...',
      timestamp: new Date(),
      isLoading: true
    };
    
    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');
    setIsProcessing(true);
    
    try {
      // Process the message using workflow
      const response = await workflow.processMessage(userMessage.content);
      
      // Remove loading message and add agent response
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => !msg.isLoading);
        return [...filteredMessages, {
          id: `agent-${Date.now()}`,
          type: 'agent',
          content: response.response,
          timestamp: new Date(),
          suggestedActions: response.suggestedActions,
          restaurants: response.availableRestaurants
        }];
      });
      
      // Update workflow memory
      if (response.memoryUpdates) {
        workflow.updateMemory(response.memoryUpdates);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Remove loading message and add error response
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => !msg.isLoading);
        return [...filteredMessages, {
          id: `agent-${Date.now()}`,
          type: 'system',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        }];
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSuggestedActionClick = (action: string) => {
    setInputValue(action);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };
  
  const handleRestaurantCardClick = (restaurant: Restaurant) => {
    openBookingModal(restaurant);
  };
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md">
      <div className="p-4 border-b flex items-center gap-2">
        <MessageSquare className="text-primary h-5 w-5" />
        <h3 className="font-display text-lg font-semibold">Prime Table Agent</h3>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto max-h-[500px] space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : message.type === 'system' 
                    ? 'bg-gray-200 text-gray-700' 
                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}
            >
              {message.isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  <p className="text-sm">{message.content}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block text-right">
                    {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </>
              )}
              
              {/* Suggested actions */}
              {message.suggestedActions && message.suggestedActions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.suggestedActions.map((action, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="bg-white"
                      onClick={() => handleSuggestedActionClick(action)}
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              )}
              
              {/* Restaurant recommendations */}
              {message.restaurants && message.restaurants.length > 0 && (
                <div className="mt-3 space-y-3">
                  {message.restaurants.slice(0, 3).map((restaurant) => (
                    <div 
                      key={restaurant.id} 
                      className="bg-white rounded-lg shadow-sm p-2 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleRestaurantCardClick(restaurant)}
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
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Utensils className="h-3 w-3" />
                            <span>{restaurant.cuisine}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            <span>{restaurant.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {message.restaurants.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-primary"
                      onClick={() => handleSuggestedActionClick('more options')}
                    >
                      Show more options
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input 
            placeholder="Type a message..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isProcessing}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={isProcessing || !inputValue.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgentChat;