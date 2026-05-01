# Frontend Conversation Thread Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the backend conversation thread API into the frontend so the AI assistant remembers prior exchanges per restaurant, with a single global chat UI and header New/Resume controls.

**Architecture:** A new `conversationStorage.ts` module handles localStorage and API calls as pure functions. A `useConversation` hook wraps them with React state and handles async pre-loading. `MCPXClient` is updated to forward `conversationId`, `restaurantId`, and `userId` to `POST /api/chat` and capture the returned id. `MCPXChatInterface` wires the hook, pre-loads history, and adds `+ New` / `↩ Resume` buttons to the existing header.

**Tech Stack:** React 18, TypeScript, Vitest, Fetch API, localStorage, existing shadcn/ui Button

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `client/src/lib/conversationStorage.ts` | Create | Pure functions: localStorage R/W and conversation API calls |
| `client/src/hooks/useConversation.ts` | Create | React hook: state management + async pre-loading |
| `client/src/lib/mcp/MCPXClient.ts` | Modify | Forward conversationId/restaurantId/userId; capture returned conversationId |
| `client/src/components/MCPXChatInterface.tsx` | Modify | Wire hook, pre-load history, header buttons |
| `tests/client/conversationStorage.test.ts` | Create | Unit tests for all conversationStorage functions |
| `tests/client/mcpxClient.test.ts` | Create | Unit tests for new MCPXClient context methods |

---

### Task 1: `conversationStorage.ts` — pure utility module

**Files:**
- Create: `client/src/lib/conversationStorage.ts`
- Create: `tests/client/conversationStorage.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/client/conversationStorage.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage (not available in node environment)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

import {
  getStorageKey,
  loadConversationId,
  saveConversationId,
  clearConversationId,
  fetchConversationMessages,
  createConversation,
} from '../../client/src/lib/conversationStorage';

beforeEach(() => localStorageMock.clear());

describe('getStorageKey', () => {
  it('returns keyed string when restaurantId given', () => {
    expect(getStorageKey(42)).toBe('pt_conv_42');
  });
  it('returns global key when restaurantId omitted', () => {
    expect(getStorageKey()).toBe('pt_conv_global');
    expect(getStorageKey(undefined)).toBe('pt_conv_global');
  });
});

describe('loadConversationId / saveConversationId / clearConversationId', () => {
  it('returns null when nothing stored', () => {
    expect(loadConversationId(1)).toBeNull();
  });
  it('round-trips an id', () => {
    saveConversationId(99, 1);
    expect(loadConversationId(1)).toBe(99);
  });
  it('clears the stored id', () => {
    saveConversationId(99, 1);
    clearConversationId(1);
    expect(loadConversationId(1)).toBeNull();
  });
  it('uses separate keys per restaurantId', () => {
    saveConversationId(10, 1);
    saveConversationId(20, 2);
    expect(loadConversationId(1)).toBe(10);
    expect(loadConversationId(2)).toBe(20);
  });
  it('uses global key when no restaurantId', () => {
    saveConversationId(5);
    expect(loadConversationId()).toBe(5);
    expect(loadConversationId(1)).toBeNull();
  });
});

describe('fetchConversationMessages', () => {
  it('returns messages array on success', async () => {
    const msgs = [{ role: 'user', content: 'hello' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 7, messages: msgs }),
    }));
    const result = await fetchConversationMessages(7);
    expect(result).toEqual(msgs);
  });

  it('returns null on 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    }));
    const result = await fetchConversationMessages(99);
    expect(result).toBeNull();
  });

  it('throws on other non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));
    await expect(fetchConversationMessages(1)).rejects.toThrow('500');
  });
});

describe('createConversation', () => {
  it('posts to /api/conversations and returns id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 42 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const id = await createConversation(1, 3);
    expect(id).toBe(42);
    expect(fetchMock).toHaveBeenCalledWith('/api/conversations', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ userId: 1, restaurantId: 3 }),
    }));
  });

  it('throws on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(createConversation(1)).rejects.toThrow('400');
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
cd RestaurantReservation && npx vitest run tests/client/conversationStorage.test.ts
```

Expected: FAIL with "Cannot find module '../../client/src/lib/conversationStorage'"

- [ ] **Step 3: Implement `conversationStorage.ts`**

Create `client/src/lib/conversationStorage.ts`:

```typescript
import type { MCPXMessage } from './mcp/MCPXClient';

export function getStorageKey(restaurantId?: number): string {
  return restaurantId != null ? `pt_conv_${restaurantId}` : 'pt_conv_global';
}

export function loadConversationId(restaurantId?: number): number | null {
  try {
    const raw = localStorage.getItem(getStorageKey(restaurantId));
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

export function saveConversationId(id: number, restaurantId?: number): void {
  try {
    localStorage.setItem(getStorageKey(restaurantId), String(id));
  } catch {
    // ignore storage quota errors
  }
}

export function clearConversationId(restaurantId?: number): void {
  try {
    localStorage.removeItem(getStorageKey(restaurantId));
  } catch {
    // ignore
  }
}

export async function fetchConversationMessages(id: number): Promise<MCPXMessage[] | null> {
  const res = await fetch(`/api/conversations/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch conversation: ${res.status}`);
  const data = await res.json();
  return data.messages as MCPXMessage[];
}

export async function createConversation(userId: number, restaurantId?: number): Promise<number> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, restaurantId }),
  });
  if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`);
  const data = await res.json();
  return data.id as number;
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npx vitest run tests/client/conversationStorage.test.ts
```

Expected: all 10 tests PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/conversationStorage.ts tests/client/conversationStorage.test.ts
git commit -m "feat: add conversationStorage utility for localStorage + conversation API"
```

---

### Task 2: `useConversation` hook

**Files:**
- Create: `client/src/hooks/useConversation.ts`

Note: This hook contains React state and async effects. The vitest environment is `node` (no JSDOM), so we test the hook's behaviour indirectly through `conversationStorage` (already covered in Task 1). The hook is thin wiring only.

- [ ] **Step 1: Create the hook**

Create `client/src/hooks/useConversation.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { MCPXMessage } from '@/lib/mcp/MCPXClient';
import {
  loadConversationId,
  saveConversationId,
  clearConversationId,
  fetchConversationMessages,
} from '@/lib/conversationStorage';

interface ConversationState {
  conversationId: number | null;
  previousConversationId: number | null;
  preloadedMessages: MCPXMessage[];
  isLoading: boolean;
}

export interface UseConversationResult {
  conversationId: number | null;
  hasPreviousThread: boolean;
  preloadedMessages: MCPXMessage[];
  isLoading: boolean;
  startNewThread: () => void;
  resumePreviousThread: () => void;
  onConversationCreated: (id: number) => void;
}

export function useConversation(restaurantId?: number): UseConversationResult {
  const [state, setState] = useState<ConversationState>(() => {
    const stored = loadConversationId(restaurantId);
    return {
      conversationId: stored,
      previousConversationId: null,
      preloadedMessages: [],
      isLoading: stored != null,
    };
  });

  useEffect(() => {
    const stored = loadConversationId(restaurantId);
    if (!stored) {
      setState({ conversationId: null, previousConversationId: null, preloadedMessages: [], isLoading: false });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    fetchConversationMessages(stored)
      .then(msgs => {
        if (msgs === null) {
          clearConversationId(restaurantId);
          setState({ conversationId: null, previousConversationId: null, preloadedMessages: [], isLoading: false });
        } else {
          setState(prev => ({ ...prev, conversationId: stored, preloadedMessages: msgs, isLoading: false }));
        }
      })
      .catch(() => {
        clearConversationId(restaurantId);
        setState({ conversationId: null, previousConversationId: null, preloadedMessages: [], isLoading: false });
      });
  }, [restaurantId]);

  const startNewThread = useCallback(() => {
    setState(prev => ({
      conversationId: null,
      previousConversationId: prev.conversationId,
      preloadedMessages: [],
      isLoading: false,
    }));
    clearConversationId(restaurantId);
  }, [restaurantId]);

  const resumePreviousThread = useCallback(() => {
    setState(prev => {
      if (prev.previousConversationId == null) return prev;
      const prevId = prev.previousConversationId;
      saveConversationId(prevId, restaurantId);

      fetchConversationMessages(prevId)
        .then(msgs => {
          setState({
            conversationId: prevId,
            previousConversationId: null,
            preloadedMessages: msgs ?? [],
            isLoading: false,
          });
        })
        .catch(() => {
          clearConversationId(restaurantId);
          setState({ conversationId: null, previousConversationId: null, preloadedMessages: [], isLoading: false });
        });

      return { ...prev, previousConversationId: null, isLoading: true };
    });
  }, [restaurantId]);

  const onConversationCreated = useCallback((id: number) => {
    saveConversationId(id, restaurantId);
    setState(prev => ({ ...prev, conversationId: id }));
  }, [restaurantId]);

  return {
    conversationId: state.conversationId,
    hasPreviousThread: state.previousConversationId != null,
    preloadedMessages: state.preloadedMessages,
    isLoading: state.isLoading,
    startNewThread,
    resumePreviousThread,
    onConversationCreated,
  };
}
```

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | grep -i "useConversation\|conversationStorage" || echo "no errors in new files"
```

Expected: no errors referencing the new files

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useConversation.ts
git commit -m "feat: add useConversation hook for thread lifecycle management"
```

---

### Task 3: `MCPXClient` — forward conversation context

**Files:**
- Modify: `client/src/lib/mcp/MCPXClient.ts` (lines 189–370)
- Create: `tests/client/mcpxClient.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/client/mcpxClient.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MCPXClient } from '../../client/src/lib/mcp/MCPXClient';

const RESTAURANTS = [{ id: 1, name: 'Brat', cuisine: 'British', location: 'Shoreditch', description: 'd', imageUrl: null, bookingDifficulty: 'hard', bookingInfo: 'i', bookingPlatform: 'Resy', bookingNotes: null, platformId: null, bookingUrl: null, websiteUrl: null, platformDetails: null, bookingSelectors: null, releaseStrategy: null, lastScrapedAt: null }] as any[];

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);

  // Default: tools endpoint returns empty, chat returns assistant message
  fetchMock.mockImplementation((url: string) => {
    if (url === '/api/mcp/tools') {
      return Promise.resolve({ ok: true, json: async () => ({ tools: [] }) });
    }
    if (url === '/api/chat') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ message: { role: 'assistant', content: 'ok' }, conversationId: 55 }),
      });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  });
});

describe('MCPXClient.setContext / getConversationId', () => {
  it('stores context and exposes conversationId', () => {
    const client = new MCPXClient({ restaurants: RESTAURANTS });
    client.setContext({ conversationId: 7, restaurantId: 1, userId: 1 });
    expect(client.getConversationId()).toBe(7);
  });

  it('getConversationId returns undefined before setContext', () => {
    const client = new MCPXClient({ restaurants: RESTAURANTS });
    expect(client.getConversationId()).toBeUndefined();
  });
});

describe('MCPXClient.loadHistory', () => {
  it('replaces internal messages with provided history', () => {
    const client = new MCPXClient({ restaurants: RESTAURANTS });
    const history = [
      { role: 'user' as const, content: 'hi' },
      { role: 'assistant' as const, content: 'hello' },
    ];
    client.loadHistory(history);
    const msgs = client.getMessages();
    expect(msgs).toHaveLength(2);
    expect(msgs[0].content).toBe('hi');
  });
});

describe('MCPXClient.generateResponse payload', () => {
  it('includes conversationId and restaurantId in POST /api/chat body', async () => {
    const client = new MCPXClient({ restaurants: RESTAURANTS });
    client.setContext({ conversationId: 3, restaurantId: 1, userId: 1 });
    await client.processMessage('test');

    const chatCall = fetchMock.mock.calls.find(([url]: [string]) => url === '/api/chat');
    expect(chatCall).toBeDefined();
    const body = JSON.parse(chatCall[1].body);
    expect(body.conversationId).toBe(3);
    expect(body.restaurantId).toBe(1);
    expect(body.userId).toBe(1);
  });

  it('updates internal conversationId from response', async () => {
    const client = new MCPXClient({ restaurants: RESTAURANTS });
    await client.processMessage('test');
    expect(client.getConversationId()).toBe(55); // server returned 55
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npx vitest run tests/client/mcpxClient.test.ts
```

Expected: FAIL — `setContext`, `getConversationId`, `loadHistory` don't exist yet

- [ ] **Step 3: Add private fields and new methods to MCPXClient**

In `client/src/lib/mcp/MCPXClient.ts`, locate the class definition starting at line 189 and add three new private fields after `private simulationMode: boolean = false;`:

```typescript
  private conversationId?: number;
  private restaurantId?: number;
  private userId: number = 1;
```

Then add three new public methods after the `reset()` method (around line 536):

```typescript
  setContext(opts: { conversationId?: number; restaurantId?: number; userId?: number }): void {
    if (opts.conversationId != null) this.conversationId = opts.conversationId;
    if (opts.restaurantId != null) this.restaurantId = opts.restaurantId;
    if (opts.userId != null) this.userId = opts.userId;
  }

  getConversationId(): number | undefined {
    return this.conversationId;
  }

  loadHistory(msgs: MCPXMessage[]): void {
    this.messages = [...msgs];
  }
```

- [ ] **Step 4: Update `generateResponse()` to include context fields and capture returned conversationId**

In `generateResponse()` (around line 324), replace the payload construction and result extraction:

Find this block (lines 327–348):
```typescript
      // Prepare request payload
      const payload = {
        messages: compactMessagesForChat(this.messages),
        tools: this.tools.length > 0 ? this.tools : undefined
      };
      
      // Call the server-side endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Extract and return the assistant message
      return result.message;
```

Replace with:
```typescript
      const payload = {
        messages: compactMessagesForChat(this.messages),
        tools: this.tools.length > 0 ? this.tools : undefined,
        conversationId: this.conversationId,
        restaurantId: this.restaurantId,
        userId: this.userId,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const result = await response.json();

      if (result.conversationId != null) {
        this.conversationId = result.conversationId;
      }

      return result.message;
```

- [ ] **Step 5: Run tests and confirm they pass**

```bash
npx vitest run tests/client/mcpxClient.test.ts
```

Expected: all 5 tests PASS

- [ ] **Step 6: Run full test suite to confirm no regressions**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add client/src/lib/mcp/MCPXClient.ts tests/client/mcpxClient.test.ts
git commit -m "feat: extend MCPXClient to forward conversationId/restaurantId and capture server response"
```

---

### Task 4: `MCPXChatInterface` — wire hook, pre-load history, add header buttons

**Files:**
- Modify: `client/src/components/MCPXChatInterface.tsx`

Note: This task modifies the React component. Visual validation requires running the dev server. There are no new unit tests — the integration is covered by the component rendering correctly and existing tests continuing to pass.

- [ ] **Step 1: Add `restaurantId` prop and import `useConversation`**

At line 34, after the existing imports, add:

```typescript
import { useConversation } from '@/hooks/useConversation';
import { RotateCcw } from 'lucide-react';
```

Update the props interface (lines 64–67):

```typescript
interface MCPXChatInterfaceProps {
  restaurants: Restaurant[];
  initialSystemPrompt?: string;
  restaurantId?: number;
}
```

Update the component signature (line 73):

```typescript
const MCPXChatInterface: React.FC<MCPXChatInterfaceProps> = ({
  restaurants,
  initialSystemPrompt,
  restaurantId,
}) => {
```

- [ ] **Step 2: Add the `useConversation` hook call and update state initialization**

After line 82 (`const messagesEndRef = useRef<HTMLDivElement>(null);`), add:

```typescript
  const {
    conversationId,
    hasPreviousThread,
    preloadedMessages,
    isLoading: conversationLoading,
    startNewThread,
    resumePreviousThread,
    onConversationCreated,
  } = useConversation(restaurantId);
```

- [ ] **Step 3: Update the MCPXClient initialization effect**

Replace the existing `useEffect` for client initialization (lines 85–100) with:

```typescript
  useEffect(() => {
    if (restaurants.length === 0 || conversationLoading) return;
    if (mcpxClient) return;

    const client = new MCPXClient({
      restaurants,
      initialSystemPrompt: initialSystemPrompt || undefined,
    });
    client.testFormatConversion();
    client.setContext({ conversationId: conversationId ?? undefined, restaurantId, userId: 1 });

    if (preloadedMessages.length > 0) {
      client.loadHistory(preloadedMessages);
      setMessages(preloadedMessages);
    } else {
      setMessages(client.getMessages());
    }

    setMcpxClient(client);
  }, [restaurants, initialSystemPrompt, mcpxClient, conversationId, conversationLoading, preloadedMessages, restaurantId]);
```

- [ ] **Step 4: Add `useToast` import and update `handleSendMessage`**

Add `useToast` import after the existing imports:

```typescript
import { useToast } from '@/hooks/use-toast';
import { createConversation } from '@/lib/conversationStorage';
```

Add `const { toast } = useToast();` inside the component body, after the `useConversation` call.

Replace the `handleSendMessage` function (lines 110–134) with:

```typescript
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !mcpxClient || isProcessing) return;

    setIsProcessing(true);
    const userMessage = inputValue;
    setInputValue('');

    try {
      // On first send, create a conversation record so persistence works
      let activeConversationId = conversationId;
      if (activeConversationId == null) {
        try {
          activeConversationId = await createConversation(1, restaurantId);
          onConversationCreated(activeConversationId);
          mcpxClient.setContext({ conversationId: activeConversationId });
        } catch {
          toast({ title: 'Could not save conversation', description: 'Your message will still be sent, but history may not be saved.', variant: 'destructive' });
        }
      }

      const updatedMessages = await mcpxClient.processMessage(userMessage);
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'I encountered an error while processing your request. Please try again.' },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };
```

- [ ] **Step 5: Update `handleReset` to use the hook's `startNewThread`**

Replace the `handleReset` function (lines 199–205) with:

```typescript
  const handleNew = () => {
    startNewThread();
    if (mcpxClient) {
      mcpxClient.reset();
      setMessages(mcpxClient.getMessages());
    }
    setMcpxClient(null); // force re-init with fresh context on next effect run
  };

  const handleResume = () => {
    resumePreviousThread();
    setMcpxClient(null); // force re-init to load the resumed thread
  };
```

- [ ] **Step 6: Update the card header to add New/Resume buttons**

Replace the `CardHeader` block (lines 208–219) with:

```tsx
      <CardHeader className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarFallback className="bg-primary text-primary-foreground">PT</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">Prime Table Assistant</CardTitle>
              <CardDescription className="text-xs">AI-powered booking assistant</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {hasPreviousThread && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleResume}
                disabled={isProcessing}
                className="text-xs h-7 px-2"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Resume
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleNew}
              disabled={isProcessing}
              className="text-xs h-7 px-2"
            >
              + New
            </Button>
          </div>
        </div>
      </CardHeader>
```

- [ ] **Step 7: Remove the old reset button from the footer**

In the `CardFooter` section (around lines 346–390), remove the existing `TooltipProvider` block that wraps the `MessageSquare` reset button:

```tsx
          {/* DELETE this entire block: */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleReset}
                  disabled={isProcessing}
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New conversation</TooltipContent>
            </Tooltip>
          </TooltipProvider>
```

Also remove these now-unused imports from line 10–26 if they become unused after deletion: `MessageSquare`, `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`. Check which are still used before removing.

- [ ] **Step 8: Add loading state while conversation pre-loads**

Before the `return (` statement (line 207), add an early return for the loading state:

```tsx
  if (conversationLoading) {
    return (
      <Card className="flex flex-col h-[600px] max-h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }
```

- [ ] **Step 9: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 10: Start dev server and validate visually**

```bash
npm run dev
```

Open http://localhost:5000 and verify:
1. Chat loads and shows "Prime Table Assistant" header with `+ New` button
2. Send a message — the agent responds
3. Reload the page — prior conversation messages appear (pre-loaded history)
4. Click `+ New` — messages clear; `↩ Resume` button appears
5. Click `↩ Resume` — prior messages come back
6. Open browser DevTools → Application → Local Storage → confirm `pt_conv_global` key exists with a numeric value

- [ ] **Step 11: Commit**

```bash
git add client/src/components/MCPXChatInterface.tsx
git commit -m "feat: wire conversation threads into MCPXChatInterface with New/Resume controls"
```
