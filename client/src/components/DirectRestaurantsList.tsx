import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import RestaurantCard from './RestaurantCard';
import type { Restaurant } from '@shared/schema';

/**
 * A direct fetch component that bypasses context and React Query
 * Used as a fallback to debug restaurant loading issues
 */
const DirectRestaurantsList = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchDirectly() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('DirectRestaurantsList - Fetching restaurants directly...');
        const response = await fetch(window.location.origin + '/api/restaurants');
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('DirectRestaurantsList - Received data:', data.length, 'restaurants');
        
        if (Array.isArray(data) && data.length > 0) {
          setRestaurants(data);
        } else {
          console.error('DirectRestaurantsList - Invalid data format:', data);
          setError('Invalid data format received from server');
        }
      } catch (err: any) {
        console.error('DirectRestaurantsList - Fetch error:', err);
        setError(err.message || 'Failed to load restaurants');
      } finally {
        setLoading(false);
      }
    }
    
    fetchDirectly();
  }, []);
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="py-12 text-center">
        <h3 className="text-xl font-semibold mb-2">Error Loading Restaurants</h3>
        <p className="text-red-500">{error}</p>
        <Button 
          className="mt-4 bg-primary hover:bg-primary-light"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }
  
  if (restaurants.length === 0) {
    return (
      <div className="py-12 text-center">
        <h3 className="text-xl font-semibold mb-2">No restaurants found</h3>
        <p className="text-gray-500">This is unexpected. Please refresh the page.</p>
        <Button 
          className="mt-4 bg-primary hover:bg-primary-light"
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      </div>
    );
  }
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>
      
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
    </>
  );
};

export default DirectRestaurantsList;