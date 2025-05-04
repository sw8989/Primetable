import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, SendIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  location: string;
  bookingDifficulty: string;
}

export function AiChatTester() {
  const [message, setMessage] = useState("");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([
    { role: "system", content: "I'm a restaurant booking AI assistant to help you secure reservations at London's most exclusive restaurants." }
  ]);

  // Fetch restaurants for the dropdown
  const { data: restaurants = [], isLoading: isLoadingRestaurants } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
    staleTime: 60000, // 1 minute
  });

  // Chat mutation
  const chatMutation = useMutation<{response: string}, Error, { message: string; restaurantId?: number }>({
    mutationFn: async (data) => {
      console.log('Sending chat request with data:', data);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Received chat response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Success handler called with data:', data);
      // Add the response to the chat history
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: data.response }
      ]);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error processing your request." }
      ]);
    }
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Add user message to chat history
    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: message }
    ]);
    
    // Send the message to the server
    chatMutation.mutate({
      message,
      ...(selectedRestaurantId ? { restaurantId: parseInt(selectedRestaurantId) } : {})
    });
    
    // Clear the input
    setMessage("");
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>AI Booking Assistant Test</CardTitle>
        <CardDescription>
          Test our AI-powered booking assistant with OpenAI integration
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
              <SelectItem value="">No specific restaurant</SelectItem>
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
        
        <div className="bg-secondary/50 rounded-lg p-4 h-80 overflow-y-auto flex flex-col gap-3">
          {chatHistory.slice(1).map((chat, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                chat.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-muted mr-auto"
              } max-w-[80%]`}
            >
              {chat.content}
            </div>
          ))}
          {chatHistory.length === 1 && (
            <div className="text-center text-muted-foreground p-4">
              Send a message to start the conversation
            </div>
          )}
          {chatMutation.isPending && (
            <div className="bg-muted p-3 rounded-lg mr-auto max-w-[80%]">
              <span className="animate-pulse">Thinking...</span>
            </div>
          )}
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
          >
            <SendIcon className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <div>Using OpenAI for AI-powered booking assistance</div>
        <div>{selectedRestaurantId ? "Restaurant-specific mode" : "General booking advice mode"}</div>
      </CardFooter>
    </Card>
  );
}