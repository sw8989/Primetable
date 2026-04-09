import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem, setItem, removeItem } from '@/lib/storage';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getItem', () => {
  it('returns parsed value when key exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ name: 'Alice' }));
    const result = await getItem<{ name: string }>('profile');
    expect(result).toEqual({ name: 'Alice' });
  });

  it('returns null when key does not exist', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const result = await getItem<{ name: string }>('profile');
    expect(result).toBeNull();
  });
});

describe('setItem', () => {
  it('serialises value and calls AsyncStorage.setItem', async () => {
    await setItem('profile', { name: 'Alice' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('profile', JSON.stringify({ name: 'Alice' }));
  });
});

describe('removeItem', () => {
  it('calls AsyncStorage.removeItem with the key', async () => {
    await removeItem('profile');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('profile');
  });
});
