import { createContext, useState, useCallback, ReactNode } from 'react';
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
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const getRestaurants = useCallback(async () => {
    try {
      console.log('Fetching restaurants...');
      setLoading(true);
      const response = await fetch('/api/restaurants');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch restaurants');
      }
      
      const data = await response.json();
      console.log('Received restaurants:', data.length);
      setRestaurants(data);
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
