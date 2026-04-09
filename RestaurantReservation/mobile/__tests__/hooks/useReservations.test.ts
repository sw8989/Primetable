import { renderHook, act } from '@testing-library/react-native';
import { useReservations } from '@/hooks/useReservations';

const BASE = 'http://localhost:5000';

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockClear();
  process.env.EXPO_PUBLIC_API_URL = BASE;
});

it('fetches bookings on mount', async () => {
  const mockBookings = [{ id: 1, status: 'confirmed', agentStatus: 'success', restaurant: { name: 'Sketch' } }];
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockBookings });

  const { result } = renderHook(() => useReservations(1));
  await act(async () => {});

  expect(global.fetch).toHaveBeenCalledWith(`${BASE}/api/bookings/user/1`);
  expect(result.current.bookings).toEqual(mockBookings);
  expect(result.current.loading).toBe(false);
});

it('cancel updates booking status in state', async () => {
  const initial = [{ id: 1, status: 'confirmed', agentStatus: 'success', restaurant: null }];
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => initial })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1, status: 'cancelled', agentStatus: 'failed' }) });

  const { result } = renderHook(() => useReservations(1));
  await act(async () => {});
  await act(async () => { await result.current.cancel(1); });

  expect(result.current.bookings[0].status).toBe('cancelled');
});
