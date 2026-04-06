import { useContext } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';

export const useRestaurants = () => {
  return useContext(RestaurantContext);
};
