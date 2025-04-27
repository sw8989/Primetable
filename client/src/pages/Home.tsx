import { useEffect } from 'react';
import SearchBar from '@/components/SearchBar';
import FilterBar from '@/components/FilterBar';
import RestaurantCard from '@/components/RestaurantCard';
import BookingModal from '@/components/BookingModal';
import DirectRestaurantsList from '@/components/DirectRestaurantsList';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useBooking } from '@/hooks/useBooking';
import { Button } from '@/components/ui/button';

const Home = () => {
  const { restaurants, loading, getRestaurants } = useRestaurants();
  const { bookingModalOpen, selectedRestaurant, closeBookingModal } = useBooking();
  
  // Fetch restaurants on initial load
  useEffect(() => {
    console.log('Home component mounted, manually fetching restaurants...');
    console.log('Current RestaurantContext state:', {
      restaurantsCount: restaurants.length,
      loading,
      getRestaurants: !!getRestaurants
    });
    
    // Bypass React Query and try a direct fetch
    (async () => {
      try {
        // Try a direct fetch to see if we get results
        const directResponse = await fetch(window.location.origin + '/api/restaurants');
        const directData = await directResponse.json();
        console.log('DIRECT FETCH restaurants count:', directData?.length || 0);
        
        // Now call the context's method
        await getRestaurants();
        console.log('Finished fetching restaurants from Home component');
      } catch (err) {
        console.error('Error fetching from Home:', err);
      }
    })();
  }, [getRestaurants, restaurants.length, loading]);
  
  // Debug: Log when restaurants change
  useEffect(() => {
    console.log('Restaurants in Home component changed:', restaurants.length);
    console.log('Restaurant data sample:', restaurants.slice(0, 2));
    
    // Force console.dir to see full object structure
    if (restaurants.length > 0) {
      console.log('First restaurant details:');
      console.dir(restaurants[0]);
    } else {
      console.log('⚠️ NO RESTAURANTS AVAILABLE IN COMPONENT!');
    }
  }, [restaurants]);
  
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-2xl font-semibold">Exclusive London Restaurants</h2>
            <div className="text-sm text-gray-500">Using direct fetch component</div>
          </div>
          
          {/* Using our direct fetch component that bypasses context architecture */}
          <DirectRestaurantsList />
          
          {/* Original context-based implementation (currently not working)
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
          )} */}
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
