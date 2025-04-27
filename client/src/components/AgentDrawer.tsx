import { useState } from 'react';
import { MessageSquare, X, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Mobile-friendly drawer for the agent interface
 */
const AgentDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      type: 'agent',
      content: 'Hi, I\'m your booking assistant. How can I help you secure a table today?',
      timestamp: new Date()
    }
  ]);
  
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Add user message
    const userMessage = { type: 'user', content: message, timestamp: new Date() };
    setMessages([...messages, userMessage]);
    
    // Clear input
    setMessage('');
    
    // Simulate agent response
    setTimeout(() => {
      const agentResponse = {
        type: 'agent',
        content: 'I understand you\'re looking for a reservation. Let me help you with that. Could you tell me which restaurant you\'re interested in and when you would like to dine?',
        timestamp: new Date()
      };
      setMessages([...messages, userMessage, agentResponse]);
    }, 1000);
  };
  
  return (
    <>
      {/* Floating button */}
      <div className={`fixed right-4 bottom-4 z-50 ${isOpen ? 'hidden' : 'block'}`}>
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 shadow-lg flex items-center justify-center"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
      
      {/* Drawer */}
      <div 
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      >
        <div 
          className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 transition-transform ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: '80vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Prime Table Agent</h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Messages area */}
          <div className="overflow-y-auto mb-4" style={{ maxHeight: 'calc(80vh - 140px)' }}>
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`mb-3 flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-3/4 p-3 rounded-lg ${
                    msg.type === 'user' 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <span className="text-xs opacity-70 mt-1 block text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Input area */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Send a message..."
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
    </>
  );
};

export default AgentDrawer;