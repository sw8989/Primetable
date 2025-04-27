import { createContext, useState, useCallback, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Restaurant } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Partial<{
    cuisine: string[];
    location: string[];
    difficulty: string[];
  }>>({});
  const { toast } = useToast();
  
  // Using TanStack Query to fetch and manage restaurants data
  const { data: allRestaurants = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/restaurants'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  const { data: filteredRestaurants = [], isLoading: isSearchLoading } = useQuery({
    queryKey: ['/api/restaurants/search', searchTerm],
    enabled: Boolean(searchTerm), // Only run when there is a search term
  });
  
  const { data: filterResults = [], isLoading: isFilterLoading } = useQuery({
    queryKey: ['/api/restaurants/filter', filters],
    enabled: Object.keys(filters).length > 0 && 
      Object.values(filters).some(arr => arr && arr.length > 0),
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/restaurants/filter', filters);
      return response.json();
    }
  });
  
  // Determine which data to show based on active search/filters
  const restaurants = searchTerm 
    ? filteredRestaurants 
    : (Object.keys(filters).length > 0 ? filterResults : allRestaurants);
  
  const loading = isLoading || isSearchLoading || isFilterLoading;
  
  const getRestaurants = useCallback(async () => {
    try {
      console.log('Manually fetching restaurants...');
      await refetch();
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load restaurants. Please try again later.',
        variant: 'destructive',
      });
    }
  }, [refetch, toast]);
  
  const searchRestaurants = useCallback(async (query: string) => {
    try {
      console.log('Searching restaurants with query:', query);
      setSearchTerm(query);
      setFilters({}); // Clear filters when searching
    } catch (error) {
      console.error('Error searching restaurants:', error);
      toast({
        title: 'Error',
        description: 'Failed to search restaurants. Please try again later.',
        variant: 'destructive',
      });
    }
  }, [toast]);
  
  const filterRestaurants = useCallback(async (newFilters: Partial<{
    cuisine: string[];
    location: string[];
    difficulty: string[];
  }>) => {
    try {
      console.log('Filtering restaurants with:', newFilters);
      setFilters(newFilters);
      setSearchTerm(''); // Clear search when filtering
    } catch (error) {
      console.error('Error filtering restaurants:', error);
      toast({
        title: 'Error',
        description: 'Failed to filter restaurants. Please try again later.',
        variant: 'destructive',
      });
    }
  }, [toast]);
  
  const clearFilters = useCallback(async () => {
    console.log('Clearing all filters and search');
    setFilters({});
    setSearchTerm('');
    await getRestaurants();
  }, [getRestaurants]);
  
  // Log state for debugging
  console.log('RestaurantContext state:', {
    restaurantsCount: restaurants.length,
    loading,
    searchTerm,
    filters,
  });
  
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