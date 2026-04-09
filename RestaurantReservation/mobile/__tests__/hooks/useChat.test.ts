import { renderHook, act } from '@testing-library/react-native';
import { useChat } from '@/hooks/useChat';

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockClear();
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:5000';
});

it('starts with a welcome assistant message', () => {
  const { result } = renderHook(() => useChat('Alice', 'EC2A', 2));
  expect(result.current.messages).toHaveLength(1);
  expect(result.current.messages[0].role).toBe('assistant');
});

it('send adds user message immediately', async () => {
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ tools: [] }) }) // fetchTools
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: { role: 'assistant', content: 'Sure!' } }),
    });

  const { result } = renderHook(() => useChat('Alice', 'EC2A', 2));
  await act(async () => { await result.current.send('Book Sketch'); });

  const userMessages = result.current.messages.filter(m => m.role === 'user');
  expect(userMessages).toHaveLength(1);
  expect(userMessages[0].content).toBe('Book Sketch');
});

it('isProcessing is true while awaiting response', async () => {
  let resolve: (v: unknown) => void = () => {};
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ tools: [] }) })
    .mockReturnValueOnce(new Promise(r => { resolve = r; }));

  const { result } = renderHook(() => useChat('Alice', 'EC2A', 2));

  act(() => { result.current.send('Book Sketch'); });
  expect(result.current.isProcessing).toBe(true);

  await act(async () => {
    resolve({ ok: true, json: async () => ({ message: { role: 'assistant', content: 'Done' } }) });
  });
  expect(result.current.isProcessing).toBe(false);
});
