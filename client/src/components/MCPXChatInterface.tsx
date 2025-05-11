/**
 * MCPXChatInterface.tsx
 * 
 * A modern chat interface component that uses the MCPX client for interaction
 * with the AI booking assistant. This interface provides a more user-friendly
 * way to interact with the booking assistant and visualizes the tool usage.
 */

import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  User, 
  Send, 
  Bot, 
  Loader2,
  Search,
  Calendar,
  Clock,
  Users,
  MapPin,
  Utensils,
  Wrench,
  Globe,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MCPXClient, MCPXMessage } from '@/lib/mcp/MCPXClient';
import type { Restaurant } from '@shared/schema';
import { useBooking } from '@/hooks/useBooking';

// Mapping of tool names to icons for visual representation
const TOOL_ICONS: Record<string, React.ReactNode> = {
  search_restaurants: <Search className="h-4 w-4" />,
  check_availability: <Calendar className="h-4 w-4" />,
  book_restaurant: <Clock className="h-4 w-4" />,
  detect_booking_platform: <Database className="h-4 w-4" />,
  web_search: <Globe className="h-4 w-4" />,
  // Add more mappings as needed
  default: <Wrench className="h-4 w-4" />
};

// Style variations for message types
const getMessageStyle = (role: string) => {
  switch (role) {
    case 'user':
      return 'bg-primary text-primary-foreground rounded-br-none';
    case 'assistant':
      return 'bg-muted text-muted-foreground rounded-bl-none';
    case 'tool':
      return 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-bl-none';
    case 'system':
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

// Props for the MCPX Chat Interface
interface MCPXChatInterfaceProps {
  restaurants: Restaurant[];
  initialSystemPrompt?: string;
}

/**
 * MCPX Chat Interface component
 * Provides a chat interface for the AI booking assistant using MCP standard
 */
const MCPXChatInterface: React.FC<MCPXChatInterfaceProps> = ({ 
  restaurants,
  initialSystemPrompt
}) => {
  const [mcpxClient, setMcpxClient] = useState<MCPXClient | null>(null);
  const [messages, setMessages] = useState<MCPXMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { openBookingModal } = useBooking();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialize the MCPX client with restaurants
  useEffect(() => {
    if (restaurants.length > 0 && !mcpxClient) {
      console.log('Initializing MCPX client with', restaurants.length, 'restaurants');
      
      const client = new MCPXClient({
        restaurants,
        initialSystemPrompt: initialSystemPrompt || undefined
      });
      
      setMcpxClient(client);
      setMessages(client.getMessages());
    }
  }, [restaurants, initialSystemPrompt, mcpxClient]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !mcpxClient || isProcessing) return;
    
    setIsProcessing(true);
    const userMessage = inputValue;
    setInputValue('');
    
    try {
      // Process the user message
      const updatedMessages = await mcpxClient.processMessage(userMessage);
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Error processing message:', error);
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I encountered an error while processing your request. Please try again.'
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Format tool calls for display
  const formatToolCalls = (toolCalls: any[]) => {
    return toolCalls.map(tc => tc.function.name).join(', ');
  };
  
  // Get icon for a tool
  const getToolIcon = (toolName: string) => {
    return TOOL_ICONS[toolName] || TOOL_ICONS.default;
  };
  
  // Reset the conversation
  const handleReset = () => {
    if (mcpxClient) {
      mcpxClient.reset();
      setMessages(mcpxClient.getMessages());
    }
  };
  
  return (
    <Card className="flex flex-col h-[600px] max-h-[80vh]">
      <CardHeader className="px-4 py-3 border-b">
        <div className="flex items-center">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarFallback className="bg-primary text-primary-foreground">PT</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">Prime Table Assistant</CardTitle>
            <CardDescription className="text-xs">AI-powered booking assistant</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.filter(msg => msg.role !== 'system').map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 shadow-sm ${getMessageStyle(message.role)}`}
            >
              {message.role === 'assistant' && message.tool_calls && (
                <div className="text-xs italic mb-1 flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  Using tools: {formatToolCalls(message.tool_calls)}
                </div>
              )}
              
              {message.role === 'tool' && (
                <div className="text-xs font-medium mb-1 flex items-center gap-1">
                  {message.name && getToolIcon(message.name)}
                  {message.name || 'Tool'} result
                </div>
              )}
              
              <div>{message.content}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      
      <CardFooter className="p-4 border-t">
        <div className="flex w-full items-center space-x-2">
          <Input
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isProcessing}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleReset}
                  disabled={isProcessing}
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New conversation</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            type="submit"
            disabled={!inputValue.trim() || isProcessing}
            onClick={handleSendMessage}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="ml-2">{isProcessing ? 'Thinking...' : 'Send'}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default MCPXChatInterface;