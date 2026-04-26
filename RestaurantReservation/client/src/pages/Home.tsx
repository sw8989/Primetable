import { useEffect, useState } from 'react';
import BookingModal from '@/components/BookingModal';
import { useBooking } from '@/hooks/useBooking';
import MCPXChatInterface from '@/components/MCPXChatInterface';
import type { Restaurant } from '@shared/schema';

const Home = () => {
  const { bookingModalOpen, selectedRestaurant, closeBookingModal } = useBooking();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch restaurants on component mount
  useEffect(() => {
    async function fetchRestaurants() {
      try {
        setLoading(true);
        const response = await fetch(window.location.origin + '/api/restaurants');
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (Array.isArray(data)) {
          console.log(`Loaded ${data.length} restaurants for booking assistant`);
          setRestaurants(data);
        }
      } catch (error) {
        console.error('Error loading restaurants:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchRestaurants();
  }, []);
  
  return (
    <>
      <section className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">
              Prime Table
            </h1>
            <h2 className="font-display text-2xl md:text-3xl font-medium mb-6 opacity-90">
              AI-Powered Booking for London's Elite Restaurants
            </h2>
            <p className="text-xl opacity-80 mb-8 leading-relaxed">
              Our intelligent AI booking assistant secures reservations at London's most exclusive establishments, 
              even when they appear fully booked. Just tell our agent where you want to dine.
            </p>
          </div>
        </div>
      </section>
      
      <main className="container mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MCPXChatInterface
                  restaurants={restaurants}
                  initialSystemPrompt="You are the Prime Table AI booking assistant for London's most exclusive restaurants. Help users find and book restaurants that match their preferences. Always be helpful, concise, and focused on booking assistance.

You have access to several powerful tools that you should use to assist users:
1. search_restaurants - Search for restaurants by cuisine, location, or difficulty level
2. check_availability - Check if a restaurant has available reservations for a date and time
3. book_restaurant - Book a reservation at a restaurant
4. detect_booking_platform - Identify which booking platform a restaurant uses
5. web_search - Search the web for restaurant information

Always use these tools when appropriate to provide the most accurate information. For example, when a user asks about Italian restaurants in Soho, use the search_restaurants tool to find matching options."
                />
              </div>
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="font-display text-xl font-semibold mb-4">How It Works</h3>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">1</div>
                      <div>
                        <h4 className="font-medium text-lg">Tell the Agent</h4>
                        <p className="text-gray-600">Describe what kind of restaurant you're looking for, or specify a particular venue</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">2</div>
                      <div>
                        <h4 className="font-medium text-lg">Set Parameters</h4>
                        <p className="text-gray-600">Share your date, time, party size and any special requirements</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">3</div>
                      <div>
                        <h4 className="font-medium text-lg">Let Us Work</h4>
                        <p className="text-gray-600">Our agent checks availability across booking platforms and secures your table</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">4</div>
                      <div>
                        <h4 className="font-medium text-lg">Enjoy Your Meal</h4>
                        <p className="text-gray-600">Receive confirmation and arrive at your reserved table</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <BookingModal 
        open={bookingModalOpen} 
        restaurant={selectedRestaurant} 
        onClose={closeBookingModal} 
      />
    </>
  );
};

export default Home;
