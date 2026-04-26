/**
 * MCPXChatInterface.tsx
 * 
 * A modern chat interface component that uses the MCPX client for interaction
 * with the AI booking assistant. This interface provides a more user-friendly
 * way to interact with the booking assistant and visualizes the tool usage.
 */

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Loader2,
  Search,
  Calendar,
  Clock,
  Wrench,
  Globe,
  Database,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MCPXClient, MCPXMessage } from '@/lib/mcp/MCPXClient';
import type { Restaurant } from '@shared/schema';
import { useBooking } from '@/hooks/useBooking';
import { useConversation } from '@/hooks/useConversation';
import { createConversation } from '@/lib/conversationStorage';
import { useToast } from '@/hooks/use-toast';

// Placeholder user ID for API interactions
const PLACEHOLDER_USER_ID = 1;

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
  restaurantId?: number;
}

/**
 * MCPX Chat Interface component
 * Provides a chat interface for the AI booking assistant using MCP standard
 */
const MCPXChatInterface: React.FC<MCPXChatInterfaceProps> = ({
  restaurants,
  initialSystemPrompt,
  restaurantId,
}) => {
  const [mcpxClient, setMcpxClient] = useState<MCPXClient | null>(null);
  const [messages, setMessages] = useState<MCPXMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { openBookingModal } = useBooking();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  const {
    conversationId,
    hasPreviousThread,
    preloadedMessages,
    isLoading: conversationLoading,
    startNewThread,
    resumePreviousThread,
    onConversationCreated,
  } = useConversation(restaurantId);

  // Initialize the MCPX client with restaurants
  useEffect(() => {
    if (restaurants.length === 0 || conversationLoading) return;
    if (mcpxClient) return;

    const client = new MCPXClient({
      restaurants,
      initialSystemPrompt: initialSystemPrompt || undefined,
    });
    client.testFormatConversion();
    client.setContext({ conversationId: conversationId ?? undefined, restaurantId, userId: PLACEHOLDER_USER_ID });

    if (preloadedMessages.length > 0) {
      client.loadHistory(preloadedMessages);
      setMessages(preloadedMessages);
    } else {
      setMessages(client.getMessages());
    }

    setMcpxClient(client);
  }, [restaurants, initialSystemPrompt, mcpxClient, conversationId, conversationLoading, preloadedMessages, restaurantId]);
  
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
      let activeConversationId = conversationId;
      if (activeConversationId == null) {
        try {
          activeConversationId = await createConversation(PLACEHOLDER_USER_ID, restaurantId);
          onConversationCreated(activeConversationId);
          mcpxClient.setContext({ conversationId: activeConversationId });
        } catch {
          toast({
            title: 'Could not save conversation',
            description: 'Your message will still be sent, but history may not be saved.',
            variant: 'destructive',
          });
        }
      }

      const updatedMessages = await mcpxClient.processMessage(userMessage);
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'I encountered an error while processing your request. Please try again.' },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Format tool calls for display
  const formatToolCalls = (toolCalls: any[]) => {
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) return '';
    
    return toolCalls.map(tc => {
      try {
        // Handle different tool call formats (MCPX vs legacy)
        if (tc.function && tc.function.name) {
          // If we have arguments, try to extract key info
          let displayName = tc.function.name;
          
          if (tc.function.arguments) {
            try {
              const args = JSON.parse(tc.function.arguments);
              
              // For search tools, show the query
              if (displayName.includes('search') && args.query) {
                displayName += `: "${args.query}"`;
              } 
              // For restaurant-specific tools, show the restaurant name
              else if (args.restaurant_id) {
                displayName += ` #${args.restaurant_id}`;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
          
          return displayName;
        } else if (tc.tool) {
          // Legacy format
          return tc.tool;
        } else {
          // Unknown format
          return 'unknown tool';
        }
      } catch (error) {
        console.error('Error formatting tool call:', error, tc);
        return 'error formatting tool';
      }
    }).join(', ');
  };
  
  // Get icon for a tool
  const getToolIcon = (toolName: string) => {
    if (!toolName) return TOOL_ICONS.default;
    
    // Try to find a matching icon by full name
    if (TOOL_ICONS[toolName]) {
      return TOOL_ICONS[toolName];
    }
    
    // Try to find a partial match (e.g., "search_restaurants_tool" should match "search_restaurants")
    for (const key of Object.keys(TOOL_ICONS)) {
      if (toolName.includes(key)) {
        return TOOL_ICONS[key];
      }
    }
    
    // Default icon if no match found
    return TOOL_ICONS.default;
  };
  
  const handleNew = () => {
    startNewThread();
    setMcpxClient(null);
  };

  const handleResume = () => {
    resumePreviousThread();
    setMessages([]);
    setMcpxClient(null);
  };
  
  if (conversationLoading) {
    return (
      <Card className="flex flex-col h-[600px] max-h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px] max-h-[80vh]">
      <CardHeader className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarFallback className="bg-primary text-primary-foreground">PT</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">Prime Table Assistant</CardTitle>
              <CardDescription className="text-xs">AI-powered booking assistant</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {hasPreviousThread && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleResume}
                disabled={isProcessing}
                className="text-xs h-7 px-2"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Resume
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleNew}
              disabled={isProcessing}
              className="text-xs h-7 px-2"
            >
              + New
            </Button>
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
              {message.role === 'assistant' && message.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0 && (
                <div className="text-xs italic mb-1 flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  Using tools: {formatToolCalls(message.tool_calls)}
                </div>
              )}
              
              {message.role === 'tool' && (
                <div className="text-xs font-medium mb-1 flex items-center gap-1">
                  {/* Determine which property to use for the tool name */}
                  {message.name && getToolIcon(message.name)}
                  {message.name || (message.tool_call_id ? 'Tool result' : 'Tool')}
                </div>
              )}
              
              {/* Better formatting for tool results */}
              {message.role === 'tool' ? (
                <div className="tool-result">
                  {(() => {
                    try {
                      // Try to parse JSON content for better formatting
                      const parsedContent = JSON.parse(message.content);
                      
                      // For restaurant search results
                      if (parsedContent.restaurants) {
                        const restaurantCount =
                          typeof parsedContent.restaurantsCount === 'number'
                            ? parsedContent.restaurantsCount
                            : parsedContent.restaurants.length;

                        return (
                          <div>
                            <div className="text-sm font-medium mb-1">
                              {restaurantCount > 0 
                                ? `Found ${restaurantCount} restaurant(s)` 
                                : 'No restaurants found'}
                            </div>
                            
                            {parsedContent.restaurants.slice(0, 3).map((restaurant: any, idx: number) => (
                              <div key={idx} className="text-sm mb-1 border-l-2 border-blue-200 pl-2">
                                <strong>{restaurant.name}</strong> - {restaurant.cuisine} in {restaurant.location}
                                <div className="text-xs">{restaurant.description?.substring(0, 100)}...</div>
                              </div>
                            ))}
                            
                            {restaurantCount > 3 && (
                              <div className="text-xs italic">
                                ...and {restaurantCount - 3} more restaurants
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      // For availability results
                      if ('available' in parsedContent) {
                        return (
                          <div>
                            {parsedContent.available 
                              ? <div className="text-sm text-green-700 dark:text-green-400">✓ Available for booking</div>
                              : <div className="text-sm text-red-600 dark:text-red-400">✗ Not available for booking</div>
                            }
                            
                            {parsedContent.alternatives && parsedContent.alternatives.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs font-medium">Alternative times:</div>
                                {parsedContent.alternatives.map((alt: any, idx: number) => (
                                  <div key={idx} className="text-xs mt-1">{alt.date} at {alt.time}</div>
                                ))}
                                {typeof parsedContent.alternativesCount === 'number' &&
                                  parsedContent.alternativesCount > parsedContent.alternatives.length && (
                                    <div className="text-xs italic mt-1">
                                      ...and {parsedContent.alternativesCount - parsedContent.alternatives.length} more options
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      // For booking results
                      if (parsedContent.booking) {
                        return (
                          <div>
                            <div className="text-sm text-green-700 dark:text-green-400">
                              ✓ Booking confirmed #{parsedContent.booking.id}
                            </div>
                            <div className="text-xs mt-1">
                              {parsedContent.booking.date} at {parsedContent.booking.time}
                            </div>
                          </div>
                        );
                      }
                      
                      // Generic JSON formatting
                      return (
                        <pre className="text-xs overflow-auto max-h-[200px] whitespace-pre-wrap">
                          {JSON.stringify(parsedContent, null, 2)}
                        </pre>
                      );
                    } catch (e) {
                      // If not JSON, just show as text
                      return <div>{message.content}</div>;
                    }
                  })()}
                </div>
              ) : (
                <div>{message.content}</div>
              )}
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
