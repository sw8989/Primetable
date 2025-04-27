import { createContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Restaurant } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface RestaurantContextType {
  restaurants: Restaurant[];
  loading: boolean;
  getRestaurants: () => Promise<void>;
  searchRestaurants: (query: string) => Promise<void>;
  filterRestaurants: (filters: Partial<{
    cuisine: string[];
    location: string[];
    difficulty: string[];
  }>) => Promise<void>;
  clearFilters: () => Promise<void>;
}

export const RestaurantContext = createContext<RestaurantContextType>({
  restaurants: [],
  loading: false,
  getRestaurants: async () => {},
  searchRestaurants: async () => {},
  filterRestaurants: async () => {},
  clearFilters: async () => {},
});

export const RestaurantProvider = ({ children }: { children: ReactNode }) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const { toast } = useToast();
  
  const getRestaurants = useCallback(async () => {
    try {
      console.log('Fetching restaurants...');
      setLoading(true);
      
      // Make sure we're using the absolute URL
      const apiUrl = window.location.origin + '/api/restaurants';
      console.log('API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch restaurants: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Received restaurants data:', data);
      console.log('Restaurant count:', Array.isArray(data) ? data.length : 'Not an array');
      
      // Make sure we actually set the restaurants
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load restaurants. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  const searchRestaurants = useCallback(async (query: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/restaurants/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to search restaurants');
      }
      const data = await response.json();
      setRestaurants(data);
    } catch (error) {
      console.error('Error searching restaurants:', error);
      toast({
        title: 'Error',
        description: 'Failed to search restaurants. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  const filterRestaurants = useCallback(async (filters: Partial<{
    cuisine: string[];
    location: string[];
    difficulty: string[];
  }>) => {
    try {
      setLoading(true);
      const response = await apiRequest('POST', '/api/restaurants/filter', filters);
      const data = await response.json();
      setRestaurants(data);
    } catch (error) {
      console.error('Error filtering restaurants:', error);
      toast({
        title: 'Error',
        description: 'Failed to filter restaurants. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  const clearFilters = useCallback(async () => {
    getRestaurants();
  }, [getRestaurants]);
  
  // Initial fetch when provider mounts
  useEffect(() => {
    console.log('RestaurantProvider mounted, fetching initial restaurants data');
    getRestaurants();
  }, [getRestaurants]);
  
  const value = {
    restaurants,
    loading,
    getRestaurants,
    searchRestaurants,
    filterRestaurants,
    clearFilters,
  };
  
  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
};