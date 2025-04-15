import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBooking } from '@/hooks/useBooking';

const AgentDrawer = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { activeAgent, activeBooking, stopAgent } = useBooking();
  
  const toggleDrawer = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Auto-collapse after 3 seconds when first shown
  useEffect(() => {
    if (activeAgent && activeBooking) {
      setIsExpanded(true);
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [activeAgent, activeBooking]);
  
  if (!activeAgent || !activeBooking) return null;
  
  // Demo agent log entries
  const logEntries = [
    { time: '10:15 AM', message: `Started monitoring ${activeBooking.bookingPlatform} for ${activeBooking.name} cancellations on ${new Date(activeBooking.date).toLocaleDateString()}` },
    { time: '10:16 AM', message: 'Joined waitlist via notification system' },
    { time: '10:20 AM', message: 'Checking for availability at exactly midnight for the target date (90 days in advance)' },
    { time: '10:22 AM', message: 'Found potential table for 2 at 9:15 PM - attempting to secure...', important: true }
  ];
  
  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg rounded-t-xl z-40 transform transition duration-300 ${
        isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-60px)]'
      }`}
    >
      <div 
        className="p-4 flex items-center justify-between cursor-pointer" 
        onClick={toggleDrawer}
      >
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a2 2 0 00-2 2v1a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2h-8zM9 7a1 1 0 011-1h8a1 1 0 011 1v3a1 1 0 01-1 1h-8a1 1 0 01-1-1V7zM9 14a1 1 0 00-1-1H2a1 1 0 00-1 1v3a1 1 0 001 1h6a1 1 0 001-1v-3z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Booking Agent Active</p>
            <p className="text-sm text-gray-600">Monitoring for tables at {activeBooking.name}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        )}
      </div>
      
      <div className="px-4 pb-4">
        <div className="border-t border-gray-100 pt-4">
          <div className="bg-light rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">Agent Activity Log</h4>
            <ScrollArea className="max-h-[200px]">
              <div className="text-sm space-y-2">
                {logEntries.map((entry, index) => (
                  <div key={index} className="flex items-start">
                    <span className="text-xs text-gray-500 w-16">{entry.time}</span>
                    <p className={`flex-1 ${entry.important ? 'text-primary font-medium' : ''}`}>
                      {entry.message}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="h-2 w-2 bg-success rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm">Agent running</span>
            </div>
            <Button 
              variant="outline" 
              className="border-error text-error hover:bg-error hover:text-white"
              onClick={stopAgent}
            >
              Stop Agent
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDrawer;
