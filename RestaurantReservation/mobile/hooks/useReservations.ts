import { useCallback, useEffect, useState } from 'react';
import { cancelBooking, fetchBookings } from '@/lib/api';
import type { Booking } from '@/lib/types';

export function useReservations(userId: number) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBookings(userId)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchBookings(userId);
      setBookings(data);
    } catch {
      // keep existing bookings on error
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  const cancel = useCallback(async (id: number) => {
    const updated = await cancelBooking(id);
    setBookings(prev => prev.map(b => (b.id === id ? { ...b, ...updated } : b)));
  }, []);

  const upcoming = bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled');
  const past = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  return { bookings, upcoming, past, loading, refreshing, refresh, cancel };
}
