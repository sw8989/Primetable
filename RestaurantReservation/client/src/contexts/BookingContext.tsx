import { createContext, useState, useCallback, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Restaurant, InsertBooking, Booking } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface BookingContextType {
  bookingModalOpen: boolean;
  selectedRestaurant: Restaurant | null;
  activeAgent: boolean;
  activeBooking: Partial<Restaurant & Booking> | null;
  openBookingModal: (restaurant: Restaurant) => void;
  closeBookingModal: () => void;
  deployBookingAgent: (bookingData: InsertBooking) => Promise<void>;
  stopAgent: () => void;
}

export const BookingContext = createContext<BookingContextType>({
  bookingModalOpen: false,
  selectedRestaurant: null,
  activeAgent: false,
  activeBooking: null,
  openBookingModal: () => {},
  closeBookingModal: () => {},
  deployBookingAgent: async () => {},
  stopAgent: () => {},
});

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [activeAgent, setActiveAgent] = useState(false);
  const [activeBooking, setActiveBooking] = useState<Partial<Restaurant & Booking> | null>(null);
  const { toast } = useToast();
  
  const openBookingModal = useCallback((restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setBookingModalOpen(true);
  }, []);
  
  const closeBookingModal = useCallback(() => {
    setBookingModalOpen(false);
    // Give time for the closing animation
    setTimeout(() => {
      setSelectedRestaurant(null);
    }, 300);
  }, []);
  
  const deployBookingAgent = useCallback(async (bookingData: InsertBooking) => {
    try {
      const response = await apiRequest('POST', '/api/bookings', bookingData);
      const data = await response.json();
      
      // In a real app, we'd get this from the API
      const restaurant = selectedRestaurant;
      
      if (restaurant) {
        setActiveAgent(true);
        setActiveBooking({
          ...data,
          name: restaurant.name,
          cuisine: restaurant.cuisine,
          location: restaurant.location,
          bookingPlatform: restaurant.bookingPlatform
        });
        
        toast({
          title: 'Booking Agent Deployed',
          description: `The agent is now looking for a table at ${restaurant.name}`,
        });
      }
    } catch (error) {
      console.error('Error deploying booking agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to deploy booking agent. Please try again later.',
        variant: 'destructive',
      });
    }
  }, [selectedRestaurant, toast]);
  
  const stopAgent = useCallback(() => {
    setActiveAgent(false);
    toast({
      title: 'Agent Stopped',
      description: 'The booking agent has been stopped.',
    });
    
    // In a real app, we'd call the API to cancel the agent
    setTimeout(() => {
      setActiveBooking(null);
    }, 300);
  }, [toast]);
  
  const value = {
    bookingModalOpen,
    selectedRestaurant,
    activeAgent,
    activeBooking,
    openBookingModal,
    closeBookingModal,
    deployBookingAgent,
    stopAgent,
  };
  
  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
};
