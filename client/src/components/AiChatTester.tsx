import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  AlertCircle, 
  SendIcon, 
  Bot, 
  User, 
  Calendar, 
  Clock, 
  Users, 
  Search, 
  CheckSquare, 
  Wrench
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";

// Import MCP types from the existing protocol implementation
import type { MCPMessage, ToolCall, ToolResult } from "@/lib/mcp/agentProtocol";

interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  location: string;
  bookingDifficulty: string;
}

// Get appropriate style for each message type
const getMessageStyle = (role: string) => {
  switch (role) {
    case 'user':
      return 'bg-primary text-primary-foreground ml-auto';
    case 'assistant':
      return 'bg-muted mr-auto';
    case 'tool':
      return 'bg-blue-50 text-blue-800 border border-blue-200 mr-auto';
    default:
      return 'bg-muted mr-auto';
  }
};

// Get appropriate icon for tool calls
const getToolIcon = (toolName: string) => {
  switch (toolName) {
    case 'search_restaurants_tool':
      return <Search className="h-4 w-4" />;
    case 'check_availability_tool':
      return <Calendar className="h-4 w-4" />;
    default:
      return <Wrench className="h-4 w-4" />;
  }
};

export function AiChatTester() {
  const [message, setMessage] = useState("");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("none");
  const [chatHistory, setChatHistory] = useState<MCPMessage[]>([
    { 
      role: "assistant", 
      content: "Hello! I'm your Prime Table booking assistant for London's exclusive restaurants. How can I help you today?" 
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  // Fetch restaurants for the dropdown
  const { data: restaurants = [], isLoading: isLoadingRestaurants } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
    staleTime: 60000, // 1 minute
  });

  // Chat mutation - updated to handle MCP protocol
  const chatMutation = useMutation<MCPMessage, Error, { messages: MCPMessage[]; restaurantId?: number }>({
    mutationFn: async (data) => {
      console.log('Sending MCP chat request with data:', data);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Received MCP chat response:', result);
      
      // If the response is in the old format, convert it to MCP format
      if (result.response && typeof result.response === 'string') {
        return {
          role: 'assistant',
          content: result.response
        };
      }
      
      return result;
    },
    onSuccess: (data) => {
      console.log('Success handler called with MCP data:', data);
      
      // Add the response to the chat history
      setChatHistory((prev) => [...prev, data]);
      
      // Handle tool calls if present
      if (data.tool_calls && data.tool_calls.length > 0) {
        handleToolCalls(data.tool_calls);
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setChatHistory((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: "Sorry, I encountered an error processing your request." 
        }
      ]);
    }
  });

  // Handle tool calls from the assistant
  const handleToolCalls = async (toolCalls: ToolCall[]) => {
    for (const toolCall of toolCalls) {
      // Simulate tool execution
      let result: ToolResult;
      
      switch (toolCall.tool) {
        case 'search_restaurants_tool':
          result = {
            result: {
              restaurants: restaurants.filter(r => {
                const params = toolCall.parameters as { cuisine?: string; location?: string; difficulty?: string };
                return (
                  (params.cuisine ? r.cuisine.toLowerCase().includes((params.cuisine || '').toLowerCase()) : false) ||
                  (params.location ? r.location.toLowerCase().includes((params.location || '').toLowerCase()) : false) ||
                  (params.difficulty ? r.bookingDifficulty === params.difficulty : false)
                );
              }).slice(0, 3).map(r => ({
                id: r.id,
                name: r.name,
                cuisine: r.cuisine,
                location: r.location,
                difficulty: r.bookingDifficulty
              }))
            }
          };
          break;
          
        case 'check_availability_tool':
          const availParams = toolCall.parameters as { 
            restaurant_id?: number; 
            date?: string; 
            time?: string; 
            party_size?: number 
          };
          
          result = {
            result: {
              available: Math.random() > 0.7, // Simulate random availability
              restaurant: restaurants.find(r => r.id === availParams.restaurant_id)?.name,
              date: availParams.date,
              time: availParams.time,
              party_size: availParams.party_size,
              alternative_times: ['18:00', '21:30'] // Sample alternative times
            }
          };
          break;
          
        default:
          result = {
            result: {},
            error: `Tool ${toolCall.tool} not implemented`
          };
      }
      
      // Add tool result to chat history
      const toolResultMessage: MCPMessage = {
        role: 'tool',
        content: `Results from ${toolCall.tool}`,
        tool_results: [result]
      };
      
      setChatHistory(prev => [...prev, toolResultMessage]);
      
      // Send the updated message history including tool results
      setTimeout(() => {
        const updatedMessages = [...chatHistory, toolResultMessage];
        
        chatMutation.mutate({
          messages: updatedMessages,
          ...(selectedRestaurantId && selectedRestaurantId !== 'none' 
            ? { restaurantId: parseInt(selectedRestaurantId) } 
            : {}
          )
        });
      }, 500);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Add user message to chat history
    const userMessage: MCPMessage = { 
      role: "user", 
      content: message 
    };
    
    setChatHistory((prev) => [...prev, userMessage]);
    
    // Prepare the full conversation history for MCP
    const updatedMessages = [...chatHistory, userMessage];
    
    // Send the full conversation to the server
    chatMutation.mutate({
      messages: updatedMessages,
      ...(selectedRestaurantId && selectedRestaurantId !== 'none' 
        ? { restaurantId: parseInt(selectedRestaurantId) } 
        : {}
      )
    });
    
    // Clear the input
    setMessage("");
  };

  // Render tool call UI
  const renderToolCall = (toolCall: ToolCall) => {
    return (
      <div className="flex flex-col gap-1 mt-1 p-2 bg-blue-50 rounded border border-blue-100">
        <div className="flex items-center gap-1 text-xs text-blue-600">
          {getToolIcon(toolCall.tool)}
          <span className="font-semibold">{toolCall.tool}</span>
        </div>
        <div className="text-xs text-gray-600">
          {Object.entries(toolCall.parameters).map(([key, value]) => (
            <div key={key} className="flex gap-1">
              <span className="font-medium">{key}:</span>
              <span>{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render tool result UI
  const renderToolResult = (toolResult: ToolResult) => {
    return (
      <div className="mt-1 p-2 bg-green-50 rounded border border-green-100">
        <div className="flex items-center gap-1 text-xs text-green-600">
          <CheckSquare className="h-4 w-4" />
          <span className="font-semibold">Result</span>
        </div>
        <div className="text-xs text-gray-600">
          {toolResult.error ? (
            <div className="text-red-500">{toolResult.error}</div>
          ) : (
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(toolResult.result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="text-primary h-5 w-5" />
          AI Booking Assistant (MCP)
        </CardTitle>
        <CardDescription>
          Test our AI-powered booking assistant with MCP integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="restaurant">Restaurant (Optional)</Label>
          <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId}>
            <SelectTrigger id="restaurant">
              <SelectValue placeholder="Select a restaurant (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific restaurant</SelectItem>
              {restaurants?.map((restaurant: Restaurant) => (
                <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                  {restaurant.name} ({restaurant.cuisine}, {restaurant.location})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Select a restaurant to get specific booking strategies
          </p>
        </div>
        
        <div className="bg-secondary/50 rounded-lg p-4 h-[360px] overflow-y-auto flex flex-col gap-3">
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}
            >
              <div className={`p-3 rounded-lg ${getMessageStyle(message.role)} max-w-[85%]`}>
                {/* Message header with role icon */}
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
                    <Wrench className="h-3 w-3" />
                    <span>Tool</span>
                  </div>
                )}
                
                {/* Message content */}
                <div>{message.content}</div>
                
                {/* Tool calls if present */}
                {message.tool_calls && message.tool_calls.map((toolCall, i) => (
                  <div key={i}>
                    {renderToolCall(toolCall)}
                  </div>
                ))}
                
                {/* Tool results if present */}
                {message.tool_results && message.tool_results.map((toolResult, i) => (
                  <div key={i}>
                    {renderToolResult(toolResult)}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Empty state */}
          {chatHistory.length === 0 && (
            <div className="text-center text-muted-foreground p-4">
              Send a message to start the conversation
            </div>
          )}
          
          {/* Loading indicator */}
          {chatMutation.isPending && (
            <div className="bg-muted p-3 rounded-lg mr-auto max-w-[80%]">
              <span className="animate-pulse">Thinking...</span>
            </div>
          )}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
        
        {chatMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to connect to the AI service. Please try again.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-2">
          <Input
            placeholder="Ask about booking strategies..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={chatMutation.isPending}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!message.trim() || chatMutation.isPending}
            className="bg-primary"
          >
            <SendIcon className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">MCP Protocol</Badge>
          <span>Using OpenAI for AI-powered booking assistance</span>
        </div>
        <div>
          {selectedRestaurantId && selectedRestaurantId !== 'none' 
            ? "Restaurant-specific mode" 
            : "General booking advice mode"
          }
        </div>
      </CardFooter>
    </Card>
  );
}