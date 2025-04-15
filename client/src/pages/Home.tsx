import { useEffect } from 'react';
import SearchBar from '@/components/SearchBar';
import FilterBar from '@/components/FilterBar';
import RestaurantCard from '@/components/RestaurantCard';
import BookingModal from '@/components/BookingModal';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useBooking } from '@/hooks/useBooking';
import { Button } from '@/components/ui/button';

const Home = () => {
  const { restaurants, loading, getRestaurants } = useRestaurants();
  const { bookingModalOpen, selectedRestaurant, closeBookingModal } = useBooking();
  
  // Fetch restaurants on initial load
  useEffect(() => {
    getRestaurants();
  }, [getRestaurants]);
  
  return (
    <>
      <section className="bg-dark text-light py-8 px-4">
        <div className="container mx-auto">
          <div className="max-w-3xl">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Book London's Most Exclusive Restaurants
            </h2>
            <p className="text-light/80 mb-8">
              Our AI agent secures tables at the city's most sought-after dining spots, even when they're fully booked.
            </p>
            
            <SearchBar />
          </div>
        </div>
      </section>
      
      <FilterBar />
      
      <main className="flex-1 bg-light px-4 py-6">
        <div className="container mx-auto">
          <h2 className="font-display text-2xl font-semibold mb-6">Exclusive London Restaurants</h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurants.map((restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
              
              {restaurants.length > 0 && (
                <div className="mt-10 flex justify-center">
                  <Button
                    variant="outline"
                    className="border-dark-light text-dark px-6 py-3 hover:bg-secondary hover:border-secondary hover:text-dark"
                  >
                    <span>Load More Restaurants</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Button>
                </div>
              )}
              
              {restaurants.length === 0 && (
                <div className="py-12 text-center">
                  <h3 className="text-xl font-semibold mb-2">No restaurants found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
              )}
            </>
          )}
        </div>
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
