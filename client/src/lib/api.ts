import { apiRequest } from './queryClient';

// Restaurant API functions
export async function getRestaurants() {
  const response = await fetch('/api/restaurants');
  if (!response.ok) {
    throw new Error('Failed to fetch restaurants');
  }
  return response.json();
}

export async function getRestaurantById(id: number) {
  const response = await fetch(`/api/restaurants/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch restaurant');
  }
  return response.json();
}

export async function searchRestaurants(query: string) {
  const response = await fetch(`/api/restaurants/search?query=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Failed to search restaurants');
  }
  return response.json();
}

export async function filterRestaurants(filters: Record<string, any>) {
  const response = await apiRequest('POST', '/api/restaurants/filter', filters);
  return response.json();
}

// Booking API functions
export async function createBooking(bookingData: Record<string, any>) {
  const response = await apiRequest('POST', '/api/bookings', bookingData);
  return response.json();
}

export async function getBookingsByUser(userId: number) {
  const response = await fetch(`/api/bookings/user/${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch bookings');
  }
  return response.json();
}

export async function getBookingById(id: number) {
  const response = await fetch(`/api/bookings/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch booking');
  }
  return response.json();
}

export async function confirmBooking(id: number) {
  const response = await apiRequest('PATCH', `/api/bookings/${id}/confirm`, {});
  return response.json();
}

export async function cancelBooking(id: number) {
  const response = await apiRequest('PATCH', `/api/bookings/${id}/cancel`, {});
  return response.json();
}

// Favorite API functions
export async function addFavorite(userId: number, restaurantId: number) {
  const response = await apiRequest('POST', '/api/favorites', { userId, restaurantId });
  return response.json();
}

export async function getFavoritesByUser(userId: number) {
  const response = await fetch(`/api/favorites/user/${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch favorites');
  }
  return response.json();
}

export async function removeFavorite(id: number) {
  await apiRequest('DELETE', `/api/favorites/${id}`);
  return true;
}
