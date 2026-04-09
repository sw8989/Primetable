import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from '@/hooks/useProfile';

const PROFILE_KEY = 'user_profile';

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
});

it('starts with null profile and isOnboarded=false', async () => {
  const { result } = renderHook(() => useProfile());
  await act(async () => {});
  expect(result.current.profile).toBeNull();
  expect(result.current.isOnboarded).toBe(false);
});

it('loads saved profile on mount and sets isOnboarded=true', async () => {
  const saved = { name: 'Alice', postcode: 'EC2A', dietary: [], partySize: 2 };
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(saved));
  const { result } = renderHook(() => useProfile());
  await act(async () => {});
  expect(result.current.profile).toEqual(saved);
  expect(result.current.isOnboarded).toBe(true);
});

it('saveProfile persists data and updates state', async () => {
  const { result } = renderHook(() => useProfile());
  await act(async () => {});
  const newProfile = { name: 'Bob', postcode: 'W1A', dietary: ['vegetarian'], partySize: 3 };
  await act(async () => { await result.current.saveProfile(newProfile); });
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(PROFILE_KEY, JSON.stringify(newProfile));
  expect(result.current.profile).toEqual(newProfile);
  expect(result.current.isOnboarded).toBe(true);
});
