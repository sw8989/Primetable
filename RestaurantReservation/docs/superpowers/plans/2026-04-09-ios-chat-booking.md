# Prime Table iOS App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React Native (Expo) iOS app for Prime Table — a chat-first AI booking concierge for London's elite restaurants, with a 4-screen onboarding flow, WhatsApp-style chat screen, and a reservations management screen.

**Architecture:** A new Expo Router project lives at `RestaurantReservation/mobile/`. It talks to the existing Express backend via REST endpoints (`/api/chat`, `/api/mcp/tools`, `/api/mcp/tool-call`, `/api/bookings`, etc.) — no backend changes required. All AI logic, LLM calls, and scraping remain server-side; the app is a thin, premium client.

**Tech Stack:** React Native, Expo SDK 51, Expo Router (file-based navigation), NativeWind v2 (Tailwind for RN), AsyncStorage (local profile), `@expo-google-fonts/playfair-display` + `@expo-google-fonts/inter`, Jest + React Native Testing Library.

---

## File Structure

```
RestaurantReservation/mobile/
├── app/
│   ├── _layout.tsx                  # Root layout — checks onboarding, redirects
│   ├── (onboarding)/
│   │   ├── _layout.tsx              # Onboarding stack navigator
│   │   ├── name.tsx                 # Screen 1: first name
│   │   ├── postcode.tsx             # Screen 2: postcode
│   │   ├── dietary.tsx              # Screen 3: dietary requirements
│   │   └── party-size.tsx           # Screen 4: party size + finish
│   └── (tabs)/
│       ├── _layout.tsx              # Tab bar (Chat + Reservations)
│       ├── index.tsx                # Chat screen
│       └── reservations.tsx         # Reservations screen
├── components/
│   ├── chat/
│   │   ├── MessageBubble.tsx        # Renders user / AI / system messages
│   │   ├── ToolActivity.tsx         # Muted italic "Checking Sketch…" line
│   │   ├── BookingCard.tsx          # Rich inline booking confirmation card
│   │   └── ChatInput.tsx            # Pill input bar with send on return
│   └── reservations/
│       ├── BookingListItem.tsx      # Single booking card (status dot + details)
│       └── ManageSheet.tsx          # Bottom sheet: calendar / directions / cancel
├── hooks/
│   ├── useProfile.ts                # Read/write user profile from AsyncStorage
│   ├── useChat.ts                   # Conversation state + API calls
│   └── useReservations.ts           # Fetch bookings, confirm, cancel
├── lib/
│   ├── api.ts                       # Typed fetch helpers for all backend endpoints
│   ├── storage.ts                   # Thin AsyncStorage wrappers (get/set/clear)
│   └── types.ts                     # Shared domain types (Restaurant, Booking, MCPXMessage…)
├── constants/
│   └── theme.ts                     # Colour tokens, font names, spacing
├── __tests__/
│   ├── lib/storage.test.ts
│   ├── lib/api.test.ts
│   ├── hooks/useProfile.test.ts
│   ├── hooks/useChat.test.ts
│   ├── hooks/useReservations.test.ts
│   ├── components/MessageBubble.test.tsx
│   └── components/BookingListItem.test.tsx
├── app.json
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── babel.config.js
└── .env.example
```

---

## Task 1: Expo Project Bootstrap

**Files:**
- Create: `RestaurantReservation/mobile/` (entire Expo project)

All commands run from `RestaurantReservation/mobile/` unless stated otherwise.

- [ ] **Step 1: Scaffold the Expo project**

Run from `RestaurantReservation/`:
```bash
npx create-expo-app@latest mobile --template blank-typescript
```
Expected: `mobile/` directory created with `app.json`, `App.tsx`, `package.json`, `tsconfig.json`.

- [ ] **Step 2: Delete the default App.tsx entry point**

```bash
cd mobile && rm App.tsx
```

- [ ] **Step 3: Install Expo Router and navigation deps**

```bash
npx expo install expo-router expo-status-bar expo-linking expo-constants expo-font expo-splash-screen
```
Expected: packages added to `package.json`.

- [ ] **Step 4: Install AsyncStorage and icons**

```bash
npx expo install @react-native-async-storage/async-storage @expo/vector-icons
```

- [ ] **Step 5: Install NativeWind and Tailwind**

```bash
npm install nativewind
npm install --save-dev tailwindcss@3.3.2
```

- [ ] **Step 6: Install fonts**

```bash
npm install @expo-google-fonts/playfair-display @expo-google-fonts/inter
```

- [ ] **Step 7: Install testing libraries**

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native jest-expo
```

- [ ] **Step 8: Write `app.json`**

Replace `mobile/app.json` entirely:
```json
{
  "expo": {
    "name": "Prime Table",
    "slug": "prime-table",
    "scheme": "primetable",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#F7F4EF"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.primetable.app"
    },
    "plugins": ["expo-router"],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 9: Update `package.json` — set main entry and jest config**

In `mobile/package.json`, set `"main": "expo-router/entry"` and add jest config:
```json
{
  "main": "expo-router/entry",
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/$1"
    },
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ],
    "setupFiles": [
      "./node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js"
    ]
  }
}
```

- [ ] **Step 10: Write `tsconfig.json`**

Replace `mobile/tsconfig.json`:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 11: Write `tailwind.config.js`**

Create `mobile/tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F7F4EF',
        surface: '#FFFFFF',
        'text-primary': '#1A1714',
        'text-muted': '#6B6560',
        terracotta: '#9B3B1F',
        'ai-bubble': '#EDEAE4',
        divider: '#E8E4DE',
        'status-green': '#2D7A4F',
        'status-amber': '#B87B2A',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 12: Write `babel.config.js`**

Replace `mobile/babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
```

- [ ] **Step 13: Write `.env.example`**

Create `mobile/.env.example`:
```
EXPO_PUBLIC_API_URL=http://localhost:5000
```

Copy to `.env.local`:
```bash
cp .env.example .env.local
```

- [ ] **Step 14: Create placeholder `app/_layout.tsx` to verify Expo Router boots**

Create `mobile/app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 15: Verify the app starts**

```bash
npx expo start --ios
```
Expected: Metro bundler starts, iOS simulator opens showing a blank screen (no errors in terminal).

- [ ] **Step 16: Commit**

```bash
git add mobile/
git commit -m "feat: scaffold Prime Table Expo app with NativeWind and Expo Router"
```

---

## Task 2: Theme Constants

**Files:**
- Create: `mobile/constants/theme.ts`

- [ ] **Step 1: Write the theme file**

Create `mobile/constants/theme.ts`:
```ts
export const Colors = {
  cream: '#F7F4EF',
  surface: '#FFFFFF',
  textPrimary: '#1A1714',
  textMuted: '#6B6560',
  terracotta: '#9B3B1F',
  aiBubble: '#EDEAE4',
  userBubble: '#9B3B1F',
  divider: '#E8E4DE',
  statusGreen: '#2D7A4F',
  statusAmber: '#B87B2A',
  white: '#FFFFFF',
} as const;

export const FontFamily = {
  serif: 'PlayfairDisplay_400Regular',
  serifMedium: 'PlayfairDisplay_500Medium',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 32,
} as const;

export const Radius = {
  card: 12,
  message: 18,
  pill: 999,
  chip: 20,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add mobile/constants/theme.ts
git commit -m "feat: add theme constants (colours, fonts, spacing, radius)"
```

---

## Task 3: Types, Storage Lib, and API Client

**Files:**
- Create: `mobile/lib/types.ts`
- Create: `mobile/lib/storage.ts`
- Create: `mobile/lib/api.ts`
- Create: `mobile/__tests__/lib/storage.test.ts`
- Create: `mobile/__tests__/lib/api.test.ts`

### 3a — Types

- [ ] **Step 1: Write `lib/types.ts`**

Create `mobile/lib/types.ts`:
```ts
// Domain types matching shared/schema.ts on the backend

export interface Restaurant {
  id: number;
  name: string;
  description: string;
  cuisine: string;
  location: string;
  imageUrl: string | null;
  bookingDifficulty: 'easy' | 'medium' | 'hard';
  bookingInfo: string;
  bookingPlatform: string;
  bookingNotes: string | null;
  bookingUrl: string | null;
  websiteUrl: string | null;
}

export interface Booking {
  id: number;
  userId: number;
  restaurantId: number;
  date: string;
  time: string;
  partySize: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  agentStatus: 'active' | 'success' | 'failed';
  platformBookingId: string | null;
  restaurant: Restaurant | null;
}

// MCP message types (match MCPXClient.ts on web client)
export interface MCPXMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  name?: string;
  tool_calls?: MCPXToolCall[];
  tool_call_id?: string;
  function_name?: string;
}

export interface MCPXToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface MCPXTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

// Booking card data surfaced inline in chat
export interface BookingProposal {
  restaurantName: string;
  address: string;
  neighbourhood: string;
  date: string;
  time: string;
  partySize: number;
  restaurantId?: number;
}

// User profile stored locally
export interface UserProfile {
  name: string;
  postcode: string;
  dietary: string[];
  partySize: number;
}
```

### 3b — Storage

- [ ] **Step 2: Write the failing storage test**

Create `mobile/__tests__/lib/storage.test.ts`:
```ts
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
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
npx jest __tests__/lib/storage.test.ts --no-coverage
```
Expected: FAIL — `Cannot find module '@/lib/storage'`

- [ ] **Step 4: Write `lib/storage.ts`**

Create `mobile/lib/storage.ts`:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getItem<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  return JSON.parse(raw) as T;
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npx jest __tests__/lib/storage.test.ts --no-coverage
```
Expected: PASS (3 tests)

### 3c — API Client

- [ ] **Step 6: Write the failing API test**

Create `mobile/__tests__/lib/api.test.ts`:
```ts
import { fetchRestaurants, fetchBookings, cancelBooking, sendChatMessage, fetchTools } from '@/lib/api';

const BASE = 'http://localhost:5000';

beforeEach(() => {
  jest.spyOn(global, 'fetch').mockClear();
  process.env.EXPO_PUBLIC_API_URL = BASE;
});

describe('fetchRestaurants', () => {
  it('calls GET /api/restaurants and returns parsed array', async () => {
    const mockData = [{ id: 1, name: 'Sketch' }];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });
    const result = await fetchRestaurants();
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/api/restaurants`);
    expect(result).toEqual(mockData);
  });
});

describe('fetchBookings', () => {
  it('calls GET /api/bookings/user/:userId', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    await fetchBookings(1);
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/api/bookings/user/1`);
  });
});

describe('cancelBooking', () => {
  it('calls PATCH /api/bookings/:id/cancel', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 42, status: 'cancelled' }),
    });
    await cancelBooking(42);
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/api/bookings/42/cancel`,
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});

describe('sendChatMessage', () => {
  it('calls POST /api/chat with messages payload', async () => {
    const messages = [{ role: 'user' as const, content: 'Hello' }];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: { role: 'assistant', content: 'Hi' } }),
    });
    const result = await sendChatMessage(messages, []);
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE}/api/chat`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ messages, tools: [] }),
      })
    );
    expect(result).toEqual({ role: 'assistant', content: 'Hi' });
  });
});

describe('fetchTools', () => {
  it('calls GET /api/mcp/tools and returns tools array', async () => {
    const tools = [{ type: 'function', function: { name: 'search_restaurants', description: 'Search', parameters: { type: 'object', properties: {} } } }];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tools }),
    });
    const result = await fetchTools();
    expect(result).toEqual(tools);
  });
});
```

- [ ] **Step 7: Run test — expect FAIL**

```bash
npx jest __tests__/lib/api.test.ts --no-coverage
```
Expected: FAIL — `Cannot find module '@/lib/api'`

- [ ] **Step 8: Write `lib/api.ts`**

Create `mobile/lib/api.ts`:
```ts
import type { Booking, MCPXMessage, MCPXTool, Restaurant } from './types';

const base = (): string =>
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${base()}${path}`, options);
  if (!res.ok) throw new Error(`API ${options?.method ?? 'GET'} ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function fetchRestaurants(): Promise<Restaurant[]> {
  return request<Restaurant[]>('/api/restaurants');
}

export function fetchBookings(userId: number): Promise<Booking[]> {
  return request<Booking[]>(`/api/bookings/user/${userId}`);
}

export function cancelBooking(id: number): Promise<Booking> {
  return request<Booking>(`/api/bookings/${id}/cancel`, { method: 'PATCH' });
}

export function confirmBooking(id: number): Promise<Booking> {
  return request<Booking>(`/api/bookings/${id}/confirm`, { method: 'PATCH' });
}

export async function sendChatMessage(
  messages: MCPXMessage[],
  tools: MCPXTool[]
): Promise<MCPXMessage> {
  const res = await request<{ message: MCPXMessage }>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, tools }),
  });
  return res.message;
}

export async function fetchTools(): Promise<MCPXTool[]> {
  const res = await request<{ tools: MCPXTool[] }>('/api/mcp/tools');
  return res.tools;
}

export async function executeToolCall(
  tool: string,
  parameters: Record<string, unknown>
): Promise<unknown> {
  return request<unknown>('/api/mcp/tool-call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, parameters }),
  });
}
```

- [ ] **Step 9: Run test — expect PASS**

```bash
npx jest __tests__/lib/api.test.ts --no-coverage
```
Expected: PASS (5 tests)

- [ ] **Step 10: Commit**

```bash
git add mobile/lib/ mobile/__tests__/lib/
git commit -m "feat: add types, storage helpers, and API client with tests"
```

---

## Task 4: useProfile Hook

**Files:**
- Create: `mobile/hooks/useProfile.ts`
- Create: `mobile/__tests__/hooks/useProfile.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/hooks/useProfile.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/hooks/useProfile.test.ts --no-coverage
```
Expected: FAIL — `Cannot find module '@/hooks/useProfile'`

- [ ] **Step 3: Write `hooks/useProfile.ts`**

Create `mobile/hooks/useProfile.ts`:
```ts
import { useCallback, useEffect, useState } from 'react';
import { getItem, setItem } from '@/lib/storage';
import type { UserProfile } from '@/lib/types';

const PROFILE_KEY = 'user_profile';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItem<UserProfile>(PROFILE_KEY)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = useCallback(async (data: UserProfile) => {
    await setItem(PROFILE_KEY, data);
    setProfile(data);
  }, []);

  return {
    profile,
    loading,
    isOnboarded: profile !== null,
    saveProfile,
  };
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/hooks/useProfile.test.ts --no-coverage
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/hooks/useProfile.ts mobile/__tests__/hooks/useProfile.test.ts
git commit -m "feat: add useProfile hook with AsyncStorage persistence"
```

---

## Task 5: Onboarding Flow

**Files:**
- Create: `mobile/app/(onboarding)/_layout.tsx`
- Create: `mobile/app/(onboarding)/name.tsx`
- Create: `mobile/app/(onboarding)/postcode.tsx`
- Create: `mobile/app/(onboarding)/dietary.tsx`
- Create: `mobile/app/(onboarding)/party-size.tsx`

The onboarding screens use a shared `OnboardingState` via React context to accumulate data across screens before saving in one shot on the final screen.

- [ ] **Step 1: Write `app/(onboarding)/_layout.tsx`**

Create `mobile/app/(onboarding)/_layout.tsx`:
```tsx
import { createContext, useContext, useState } from 'react';
import { Stack } from 'expo-router';
import type { UserProfile } from '@/lib/types';

interface OnboardingCtx {
  draft: Partial<UserProfile>;
  update: (patch: Partial<UserProfile>) => void;
}

const OnboardingContext = createContext<OnboardingCtx>({
  draft: {},
  update: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

export default function OnboardingLayout() {
  const [draft, setDraft] = useState<Partial<UserProfile>>({});

  function update(patch: Partial<UserProfile>) {
    setDraft(prev => ({ ...prev, ...patch }));
  }

  return (
    <OnboardingContext.Provider value={{ draft, update }}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </OnboardingContext.Provider>
  );
}
```

- [ ] **Step 2: Write `app/(onboarding)/name.tsx`**

Create `mobile/app/(onboarding)/name.tsx`:
```tsx
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useOnboarding } from './_layout';

export default function NameScreen() {
  const [value, setValue] = useState('');
  const { update } = useOnboarding();

  function onContinue() {
    if (!value.trim()) return;
    update({ name: value.trim() });
    router.push('/(onboarding)/postcode');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.cream }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg }}>
        <ProgressDots total={4} current={0} />
        <Text
          style={{
            fontFamily: FontFamily.serif,
            fontSize: FontSize['3xl'],
            color: Colors.textPrimary,
            marginBottom: Spacing.xl,
            marginTop: Spacing.lg,
          }}
        >
          What's your name?
        </Text>
        <TextInput
          autoFocus
          value={value}
          onChangeText={setValue}
          placeholder="First name"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="next"
          onSubmitEditing={onContinue}
          style={{
            fontFamily: FontFamily.sans,
            fontSize: FontSize.xl,
            color: Colors.textPrimary,
            borderBottomWidth: 1,
            borderBottomColor: Colors.divider,
            paddingVertical: Spacing.sm,
          }}
        />
      </View>
      <ContinueButton onPress={onContinue} disabled={!value.trim()} />
    </KeyboardAvoidingView>
  );
}

// ── Shared sub-components used across all onboarding screens ──────────────────

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === current ? Colors.terracotta : Colors.divider,
          }}
        />
      ))}
    </View>
  );
}

export function ContinueButton({
  onPress,
  disabled,
  label = 'Continue',
}: {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <View style={{ padding: Spacing.lg, paddingBottom: Spacing.xl }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={{
          backgroundColor: disabled ? Colors.divider : Colors.terracotta,
          borderRadius: 999,
          paddingVertical: Spacing.md,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: FontFamily.sansMedium,
            fontSize: FontSize.base,
            color: Colors.white,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 3: Write `app/(onboarding)/postcode.tsx`**

Create `mobile/app/(onboarding)/postcode.tsx`:
```tsx
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useOnboarding } from './_layout';
import { ProgressDots, ContinueButton } from './name';

export default function PostcodeScreen() {
  const [value, setValue] = useState('');
  const { update } = useOnboarding();

  function formatPostcode(raw: string) {
    return raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 8);
  }

  function onContinue() {
    if (!value.trim()) return;
    update({ postcode: value.trim() });
    router.push('/(onboarding)/dietary');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.cream }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg }}>
        <ProgressDots total={4} current={1} />
        <Text
          style={{
            fontFamily: FontFamily.serif,
            fontSize: FontSize['3xl'],
            color: Colors.textPrimary,
            marginBottom: Spacing.xl,
            marginTop: Spacing.lg,
          }}
        >
          Where are you based?
        </Text>
        <TextInput
          autoFocus
          autoCapitalize="characters"
          value={value}
          onChangeText={v => setValue(formatPostcode(v))}
          placeholder="Postcode e.g. EC2A"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="next"
          onSubmitEditing={onContinue}
          style={{
            fontFamily: FontFamily.sans,
            fontSize: FontSize.xl,
            color: Colors.textPrimary,
            borderBottomWidth: 1,
            borderBottomColor: Colors.divider,
            paddingVertical: Spacing.sm,
          }}
        />
      </View>
      <ContinueButton onPress={onContinue} disabled={!value.trim()} />
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 4: Write `app/(onboarding)/dietary.tsx`**

Create `mobile/app/(onboarding)/dietary.tsx`:
```tsx
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '@/constants/theme';
import { useOnboarding } from './_layout';
import { ProgressDots, ContinueButton } from './name';

const OPTIONS = ['None', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free'];

export default function DietaryScreen() {
  const [selected, setSelected] = useState<string[]>(['None']);
  const { update } = useOnboarding();

  function toggle(option: string) {
    if (option === 'None') {
      setSelected(['None']);
      return;
    }
    setSelected(prev => {
      const without = prev.filter(o => o !== 'None');
      return without.includes(option)
        ? without.filter(o => o !== option)
        : [...without, option];
    });
  }

  function onContinue() {
    update({ dietary: selected.filter(o => o !== 'None') });
    router.push('/(onboarding)/party-size');
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.cream }}>
      <ScrollView
        contentContainerStyle={{ flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <ProgressDots total={4} current={2} />
        <Text
          style={{
            fontFamily: FontFamily.serif,
            fontSize: FontSize['3xl'],
            color: Colors.textPrimary,
            marginBottom: Spacing.xl,
            marginTop: Spacing.lg,
          }}
        >
          Any dietary requirements?
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {OPTIONS.map(option => {
            const active = selected.includes(option);
            return (
              <Pressable
                key={option}
                onPress={() => toggle(option)}
                style={{
                  borderRadius: Radius.chip,
                  paddingVertical: Spacing.sm,
                  paddingHorizontal: Spacing.md,
                  backgroundColor: active ? Colors.terracotta : Colors.surface,
                  borderWidth: 1,
                  borderColor: active ? Colors.terracotta : Colors.divider,
                }}
              >
                <Text
                  style={{
                    fontFamily: FontFamily.sans,
                    fontSize: FontSize.base,
                    color: active ? Colors.white : Colors.textPrimary,
                  }}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <ContinueButton onPress={onContinue} />
    </View>
  );
}
```

- [ ] **Step 5: Write `app/(onboarding)/party-size.tsx`**

Create `mobile/app/(onboarding)/party-size.tsx`:
```tsx
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useOnboarding } from './_layout';
import { useProfile } from '@/hooks/useProfile';
import { ProgressDots, ContinueButton } from './name';
import type { UserProfile } from '@/lib/types';

export default function PartySizeScreen() {
  const [count, setCount] = useState(2);
  const { draft } = useOnboarding();
  const { saveProfile } = useProfile();

  async function onFinish() {
    const profile: UserProfile = {
      name: draft.name ?? '',
      postcode: draft.postcode ?? '',
      dietary: draft.dietary ?? [],
      partySize: count,
    };
    await saveProfile(profile);
    router.replace('/(tabs)/');
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.cream }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg }}>
        <ProgressDots total={4} current={3} />
        <Text
          style={{
            fontFamily: FontFamily.serif,
            fontSize: FontSize['3xl'],
            color: Colors.textPrimary,
            marginBottom: Spacing.xl,
            marginTop: Spacing.lg,
            alignSelf: 'flex-start',
          }}
        >
          Usual party size?
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xl }}>
          <Pressable
            onPress={() => setCount(c => Math.max(1, c - 1))}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: Colors.divider,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.xl, color: Colors.textPrimary }}>−</Text>
          </Pressable>
          <Text style={{ fontFamily: FontFamily.serif, fontSize: 56, color: Colors.textPrimary }}>{count}</Text>
          <Pressable
            onPress={() => setCount(c => Math.min(20, c + 1))}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: Colors.terracotta,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.xl, color: Colors.white }}>+</Text>
          </Pressable>
        </View>
      </View>
      <ContinueButton onPress={onFinish} label="Get Started" />
    </View>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add mobile/app/\(onboarding\)/
git commit -m "feat: add 4-screen onboarding flow (name, postcode, dietary, party size)"
```

---

## Task 6: Root Layout and Tab Navigation

**Files:**
- Modify: `mobile/app/_layout.tsx`
- Create: `mobile/app/(tabs)/_layout.tsx`
- Create: `mobile/app/(tabs)/index.tsx` (placeholder)
- Create: `mobile/app/(tabs)/reservations.tsx` (placeholder)

- [ ] **Step 1: Load fonts in root layout and handle onboarding gate**

Replace `mobile/app/_layout.tsx`:
```tsx
import { useEffect } from 'react';
import { Slot, router, useSegments } from 'expo-router';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
} from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useProfile } from '@/hooks/useProfile';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    Inter_400Regular,
    Inter_500Medium,
  });

  const { isOnboarded, loading } = useProfile();
  const segments = useSegments();

  useEffect(() => {
    if (!fontsLoaded || loading) return;
    SplashScreen.hideAsync();

    const inOnboarding = segments[0] === '(onboarding)';

    if (!isOnboarded && !inOnboarding) {
      router.replace('/(onboarding)/name');
    } else if (isOnboarded && inOnboarding) {
      router.replace('/(tabs)/');
    }
  }, [fontsLoaded, loading, isOnboarded, segments]);

  if (!fontsLoaded || loading) return null;

  return <Slot />;
}
```

- [ ] **Step 2: Write the tab bar layout**

Create `mobile/app/(tabs)/_layout.tsx`:
```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.terracotta,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.divider,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontFamily: FontFamily.sans,
          fontSize: FontSize.xs,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'Reservations',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 3: Create placeholder Chat screen**

Create `mobile/app/(tabs)/index.tsx`:
```tsx
import { View, Text } from 'react-native';
import { Colors } from '@/constants/theme';

export default function ChatScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Chat — coming soon</Text>
    </View>
  );
}
```

- [ ] **Step 4: Create placeholder Reservations screen**

Create `mobile/app/(tabs)/reservations.tsx`:
```tsx
import { View, Text } from 'react-native';
import { Colors } from '@/constants/theme';

export default function ReservationsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Reservations — coming soon</Text>
    </View>
  );
}
```

- [ ] **Step 5: Verify navigation works end-to-end**

```bash
npx expo start --ios
```
Expected:
- First launch → onboarding screen 1 (name question, cream background)
- Complete onboarding → tab bar appears with Chat and Reservations tabs
- Subsequent launches → lands directly in Chat tab

- [ ] **Step 6: Commit**

```bash
git add mobile/app/
git commit -m "feat: add root layout with font loading, onboarding gate, and tab navigation"
```

---

## Task 7: Chat Components

**Files:**
- Create: `mobile/components/chat/MessageBubble.tsx`
- Create: `mobile/components/chat/ToolActivity.tsx`
- Create: `mobile/components/chat/BookingCard.tsx`
- Create: `mobile/components/chat/ChatInput.tsx`
- Create: `mobile/__tests__/components/MessageBubble.test.tsx`

- [ ] **Step 1: Write the failing MessageBubble test**

Create `mobile/__tests__/components/MessageBubble.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import MessageBubble from '@/components/chat/MessageBubble';

it('renders user message right-aligned', () => {
  render(<MessageBubble role="user" content="Hello" />);
  expect(screen.getByText('Hello')).toBeTruthy();
});

it('renders assistant message', () => {
  render(<MessageBubble role="assistant" content="Good evening" />);
  expect(screen.getByText('Good evening')).toBeTruthy();
});

it('does not render system messages', () => {
  const { toJSON } = render(<MessageBubble role="system" content="System prompt" />);
  expect(toJSON()).toBeNull();
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/components/MessageBubble.test.tsx --no-coverage
```
Expected: FAIL

- [ ] **Step 3: Write `components/chat/MessageBubble.tsx`**

Create `mobile/components/chat/MessageBubble.tsx`:
```tsx
import { Text, View } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import type { MCPXMessage } from '@/lib/types';

interface Props {
  role: MCPXMessage['role'];
  content: string;
}

export default function MessageBubble({ role, content }: Props) {
  if (role === 'system') return null;

  const isUser = role === 'user';

  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '80%',
        marginVertical: Spacing.xs,
        marginHorizontal: Spacing.md,
      }}
    >
      <View
        style={{
          backgroundColor: isUser ? Colors.userBubble : Colors.aiBubble,
          borderRadius: Radius.message,
          borderBottomRightRadius: isUser ? 4 : Radius.message,
          borderBottomLeftRadius: isUser ? Radius.message : 4,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm + 2,
        }}
      >
        <Text
          style={{
            fontFamily: FontFamily.sans,
            fontSize: FontSize.base,
            color: isUser ? Colors.white : Colors.textPrimary,
            lineHeight: FontSize.base * 1.5,
          }}
        >
          {content}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/components/MessageBubble.test.tsx --no-coverage
```
Expected: PASS (3 tests)

- [ ] **Step 5: Write `components/chat/ToolActivity.tsx`**

Create `mobile/components/chat/ToolActivity.tsx`:
```tsx
import { Text, View } from 'react-native';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';

interface Props {
  label: string;
}

// Muted italic line shown when the AI is calling a tool
export default function ToolActivity({ label }: Props) {
  return (
    <View style={{ marginHorizontal: Spacing.md, marginVertical: Spacing.xs }}>
      <Text
        style={{
          fontFamily: FontFamily.sans,
          fontSize: FontSize.sm,
          color: Colors.textMuted,
          fontStyle: 'italic',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 6: Write `components/chat/BookingCard.tsx`**

Create `mobile/components/chat/BookingCard.tsx`:
```tsx
import { Pressable, Text, View } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import type { BookingProposal } from '@/lib/types';

interface Props {
  proposal: BookingProposal;
  onConfirm: () => void;
  onChange: () => void;
}

export default function BookingCard({ proposal, onConfirm, onChange }: Props) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        maxWidth: '85%',
        marginVertical: Spacing.xs,
        marginHorizontal: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: Radius.card,
        padding: Spacing.md,
        shadowColor: Colors.textPrimary,
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      {/* Restaurant name */}
      <Text
        style={{
          fontFamily: FontFamily.serifMedium,
          fontSize: FontSize.lg,
          color: Colors.textPrimary,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {proposal.restaurantName}
      </Text>

      {/* Address */}
      <Text
        style={{
          fontFamily: FontFamily.sans,
          fontSize: FontSize.sm,
          color: Colors.textMuted,
          marginTop: 2,
        }}
      >
        {proposal.address} · {proposal.neighbourhood}
      </Text>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.sm }} />

      {/* Date / time / guests */}
      <Text
        style={{
          fontFamily: FontFamily.sans,
          fontSize: FontSize.base,
          color: Colors.textPrimary,
        }}
      >
        {proposal.date} · {proposal.time}
      </Text>
      <Text
        style={{
          fontFamily: FontFamily.sans,
          fontSize: FontSize.sm,
          color: Colors.textMuted,
          marginTop: 2,
        }}
      >
        Table for {proposal.partySize}
      </Text>

      {/* CTAs */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
        <Pressable
          onPress={onConfirm}
          style={{
            flex: 1,
            backgroundColor: Colors.terracotta,
            borderRadius: Radius.pill,
            paddingVertical: Spacing.sm,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: FontSize.sm, color: Colors.white }}>
            Confirm
          </Text>
        </Pressable>
        <Pressable
          onPress={onChange}
          style={{
            flex: 1,
            borderRadius: Radius.pill,
            paddingVertical: Spacing.sm,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: Colors.divider,
          }}
        >
          <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: FontSize.sm, color: Colors.textPrimary }}>
            Change
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 7: Write `components/chat/ChatInput.tsx`**

Create `mobile/components/chat/ChatInput.tsx`:
```tsx
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export default function ChatInput({ value, onChange, onSend, disabled }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
        backgroundColor: Colors.surface,
        gap: Spacing.sm,
      }}
    >
      {/* Mic icon (placeholder for future voice input) */}
      <Pressable>
        <Ionicons name="mic-outline" size={22} color={Colors.textMuted} />
      </Pressable>

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Message Prime Table…"
        placeholderTextColor={Colors.textMuted}
        returnKeyType="send"
        onSubmitEditing={onSend}
        blurOnSubmit={false}
        editable={!disabled}
        multiline
        style={{
          flex: 1,
          fontFamily: FontFamily.sans,
          fontSize: FontSize.base,
          color: Colors.textPrimary,
          backgroundColor: Colors.cream,
          borderRadius: Radius.pill,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          maxHeight: 100,
        }}
      />
    </View>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add mobile/components/chat/ mobile/__tests__/components/MessageBubble.test.tsx
git commit -m "feat: add chat components (MessageBubble, ToolActivity, BookingCard, ChatInput)"
```

---

## Task 8: useChat Hook

**Files:**
- Create: `mobile/hooks/useChat.ts`
- Create: `mobile/__tests__/hooks/useChat.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile/__tests__/hooks/useChat.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/hooks/useChat.test.ts --no-coverage
```
Expected: FAIL — `Cannot find module '@/hooks/useChat'`

- [ ] **Step 3: Write `hooks/useChat.ts`**

Create `mobile/hooks/useChat.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { executeToolCall, fetchTools, sendChatMessage } from '@/lib/api';
import type { MCPXMessage, MCPXTool, MCPXToolCall } from '@/lib/types';

const SYSTEM_PROMPT = (name: string, postcode: string, partySize: number) =>
  `You are the Prime Table AI booking assistant for London's most exclusive restaurants. ` +
  `The user's name is ${name}, they are based near ${postcode}, and their usual party size is ${partySize}. ` +
  `Help them find and book restaurants. Always be helpful, concise, and focused on booking assistance. ` +
  `Use the available tools to search restaurants, check availability, and make bookings.`;

const WELCOME = (name: string): MCPXMessage => ({
  role: 'assistant',
  content: `Good evening, ${name}. Where would you like to dine?`,
});

export function useChat(name: string, postcode: string, partySize: number) {
  const [messages, setMessages] = useState<MCPXMessage[]>([WELCOME(name)]);
  const [isProcessing, setIsProcessing] = useState(false);
  const toolsRef = useRef<MCPXTool[]>([]);

  // Fetch available tools on mount
  useEffect(() => {
    fetchTools()
      .then(tools => { toolsRef.current = tools; })
      .catch(() => { toolsRef.current = []; });
  }, []);

  const send = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isProcessing) return;

      const userMsg: MCPXMessage = { role: 'user', content: userText };

      setMessages(prev => [...prev, userMsg]);
      setIsProcessing(true);

      try {
        const systemMsg: MCPXMessage = {
          role: 'system',
          content: SYSTEM_PROMPT(name, postcode, partySize),
        };

        // Build full history for the API (system + all messages + new user msg)
        const history = [systemMsg, ...messages, userMsg];

        let assistantResponse = await sendChatMessage(history, toolsRef.current);
        setMessages(prev => [...prev, assistantResponse]);

        // Handle tool calls (same loop as MCPXClient on web)
        while (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
          const toolMessages: MCPXMessage[] = [];

          for (const toolCall of assistantResponse.tool_calls) {
            const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
            const result = await executeToolCall(toolCall.function.name, args);

            toolMessages.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
              function_name: toolCall.function.name,
            });
          }

          setMessages(prev => [...prev, ...toolMessages]);

          const updatedHistory = [
            systemMsg,
            ...messages,
            userMsg,
            assistantResponse,
            ...toolMessages,
          ];
          assistantResponse = await sendChatMessage(updatedHistory, toolsRef.current);
          setMessages(prev => [...prev, assistantResponse]);
        }
      } catch {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'Something went wrong. Please try again.' },
        ]);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, messages, name, postcode, partySize]
  );

  const reset = useCallback(() => {
    setMessages([WELCOME(name)]);
  }, [name]);

  return { messages, isProcessing, send, reset };
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/hooks/useChat.test.ts --no-coverage
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/hooks/useChat.ts mobile/__tests__/hooks/useChat.test.ts
git commit -m "feat: add useChat hook with tool-call loop and conversation state"
```

---

## Task 9: Chat Screen Assembly

**Files:**
- Modify: `mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Replace placeholder Chat screen with full implementation**

Replace `mobile/app/(tabs)/index.tsx`:
```tsx
import { useRef } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  View,
  useState,
} from 'react-native';
import { useProfile } from '@/hooks/useProfile';
import { useChat } from '@/hooks/useChat';
import MessageBubble from '@/components/chat/MessageBubble';
import ToolActivity from '@/components/chat/ToolActivity';
import ChatInput from '@/components/chat/ChatInput';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import type { MCPXMessage } from '@/lib/types';

// Detect tool-activity messages: assistant messages with tool_calls but no content
function isToolActivity(msg: MCPXMessage): boolean {
  return (
    msg.role === 'assistant' &&
    (!msg.content || msg.content.trim() === '') &&
    Array.isArray(msg.tool_calls) &&
    msg.tool_calls.length > 0
  );
}

function toolActivityLabel(msg: MCPXMessage): string {
  const name = msg.tool_calls?.[0]?.function?.name ?? 'working';
  const labels: Record<string, string> = {
    search_restaurants: 'Searching restaurants…',
    check_availability: 'Checking availability…',
    book_restaurant: 'Securing your table…',
    detect_booking_platform: 'Identifying booking system…',
    web_search: 'Searching the web…',
  };
  return labels[name] ?? 'Working…';
}

export default function ChatScreen() {
  const { profile } = useProfile();
  const name = profile?.name ?? '';
  const postcode = profile?.postcode ?? '';
  const partySize = profile?.partySize ?? 2;

  const { messages, isProcessing, send } = useChat(name, postcode, partySize);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    send(text);
  }

  const visibleMessages = messages.filter(m => m.role !== 'system' && m.role !== 'tool');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: Colors.divider,
        }}
      >
        <Text
          style={{
            fontFamily: FontFamily.serifMedium,
            fontSize: FontSize.lg,
            color: Colors.textPrimary,
          }}
        >
          Prime Table
        </Text>
        {/* Avatar placeholder */}
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: Colors.terracotta,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: FontFamily.sansMedium, fontSize: FontSize.sm, color: Colors.white }}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Message list */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={visibleMessages}
          keyExtractor={(_, i) => String(i)}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ paddingVertical: Spacing.md }}
          renderItem={({ item }) => {
            if (isToolActivity(item)) {
              return <ToolActivity label={toolActivityLabel(item)} />;
            }
            return <MessageBubble role={item.role} content={item.content} />;
          }}
          ListFooterComponent={
            isProcessing ? (
              <View style={{ marginHorizontal: Spacing.md, marginVertical: Spacing.xs }}>
                <Text
                  style={{
                    fontFamily: FontFamily.sans,
                    fontSize: FontSize.sm,
                    color: Colors.textMuted,
                    fontStyle: 'italic',
                  }}
                >
                  ···
                </Text>
              </View>
            ) : null
          }
        />

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={isProcessing}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Fix the import — `useState` is not from react-native**

React Native doesn't export `useState`. Fix the import in `index.tsx`:
```tsx
import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
// … rest unchanged
```

- [ ] **Step 3: Verify the chat screen in simulator**

```bash
npx expo start --ios
```
Expected:
- Chat tab shows "Prime Table" header with initial greeting message
- Typing a message and pressing return adds user bubble and triggers AI response
- Tool activity lines appear briefly while the agent works

- [ ] **Step 4: Commit**

```bash
git add mobile/app/\(tabs\)/index.tsx
git commit -m "feat: assemble chat screen with message list, tool activity, and input bar"
```

---

## Task 10: Reservations Components and Hook

**Files:**
- Create: `mobile/components/reservations/BookingListItem.tsx`
- Create: `mobile/components/reservations/ManageSheet.tsx`
- Create: `mobile/hooks/useReservations.ts`
- Create: `mobile/__tests__/hooks/useReservations.test.ts`
- Create: `mobile/__tests__/components/BookingListItem.test.tsx`

### 10a — BookingListItem

- [ ] **Step 1: Write failing BookingListItem test**

Create `mobile/__tests__/components/BookingListItem.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BookingListItem from '@/components/reservations/BookingListItem';
import type { Booking } from '@/lib/types';

const base: Booking = {
  id: 1,
  userId: 1,
  restaurantId: 1,
  date: '2026-04-11',
  time: '20:00',
  partySize: 2,
  status: 'confirmed',
  agentStatus: 'success',
  platformBookingId: 'SKT-001',
  restaurant: {
    id: 1,
    name: 'Sketch',
    description: '',
    cuisine: 'Modern European',
    location: 'Mayfair',
    imageUrl: null,
    bookingDifficulty: 'hard',
    bookingInfo: '',
    bookingPlatform: 'SevenRooms',
    bookingNotes: null,
    bookingUrl: null,
    websiteUrl: null,
  },
};

it('renders restaurant name', () => {
  render(<BookingListItem booking={base} onManage={() => {}} />);
  expect(screen.getByText('Sketch')).toBeTruthy();
});

it('shows "Agent still working…" for active agent status', () => {
  render(<BookingListItem booking={{ ...base, agentStatus: 'active', status: 'pending', platformBookingId: null }} onManage={() => {}} />);
  expect(screen.getByText('Agent still working…')).toBeTruthy();
});

it('shows booking ref when confirmed', () => {
  render(<BookingListItem booking={base} onManage={() => {}} />);
  expect(screen.getByText('Ref: SKT-001')).toBeTruthy();
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/components/BookingListItem.test.tsx --no-coverage
```
Expected: FAIL

- [ ] **Step 3: Write `components/reservations/BookingListItem.tsx`**

Create `mobile/components/reservations/BookingListItem.tsx`:
```tsx
import { Pressable, Text, View } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Booking } from '@/lib/types';

interface Props {
  booking: Booking;
  onManage: () => void;
}

function StatusDot({ status, agentStatus }: { status: Booking['status']; agentStatus: Booking['agentStatus'] }) {
  let color = Colors.textMuted;
  if (status === 'confirmed') color = Colors.statusGreen;
  else if (agentStatus === 'active') color = Colors.statusAmber;

  return (
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        marginTop: 4,
      }}
    />
  );
}

export default function BookingListItem({ booking, onManage }: Props) {
  const isPast = booking.status === 'completed' || booking.status === 'cancelled';
  const subText =
    booking.agentStatus === 'active'
      ? 'Agent still working…'
      : booking.platformBookingId
      ? `Ref: ${booking.platformBookingId}`
      : '';

  return (
    <View
      style={{
        backgroundColor: Colors.surface,
        borderRadius: Radius.card,
        padding: Spacing.md,
        marginHorizontal: Spacing.md,
        marginVertical: Spacing.xs,
        opacity: isPast ? 0.6 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: FontFamily.serifMedium,
              fontSize: FontSize.lg,
              color: Colors.textPrimary,
            }}
          >
            {booking.restaurant?.name ?? 'Unknown restaurant'}
          </Text>
          <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 }}>
            {booking.restaurant?.location}
          </Text>
          <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.sm, color: Colors.textPrimary, marginTop: Spacing.xs }}>
            {booking.date} · {booking.time} · {booking.partySize} {booking.partySize === 1 ? 'guest' : 'guests'}
          </Text>
          {subText ? (
            <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 }}>
              {subText}
            </Text>
          ) : null}
        </View>

        <View style={{ alignItems: 'flex-end', gap: Spacing.sm }}>
          <StatusDot status={booking.status} agentStatus={booking.agentStatus} />
          {!isPast && (
            <Pressable onPress={onManage}>
              <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.sm, color: Colors.terracotta }}>
                Manage ›
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/components/BookingListItem.test.tsx --no-coverage
```
Expected: PASS (3 tests)

### 10b — ManageSheet

- [ ] **Step 5: Write `components/reservations/ManageSheet.tsx`**

Create `mobile/components/reservations/ManageSheet.tsx`:
```tsx
import { Alert, Linking, Modal, Pressable, Text, View } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import type { Booking } from '@/lib/types';

interface Props {
  booking: Booking | null;
  onClose: () => void;
  onCancel: (id: number) => Promise<void>;
}

export default function ManageSheet({ booking, onClose, onCancel }: Props) {
  if (!booking) return null;

  function handleCancel() {
    Alert.alert(
      'Cancel Reservation',
      `Cancel your reservation at ${booking!.restaurant?.name}?`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel reservation',
          style: 'destructive',
          onPress: async () => {
            await onCancel(booking!.id);
            onClose();
          },
        },
      ]
    );
  }

  function handleDirections() {
    const q = encodeURIComponent(booking!.restaurant?.name ?? '');
    Linking.openURL(`maps://?q=${q}`);
    onClose();
  }

  const actions = [
    { label: 'Get Directions', onPress: handleDirections, destructive: false },
    { label: 'Cancel Reservation', onPress: handleCancel, destructive: true },
  ];

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <View
          style={{
            backgroundColor: Colors.surface,
            borderTopLeftRadius: Radius.card * 2,
            borderTopRightRadius: Radius.card * 2,
            padding: Spacing.lg,
            paddingBottom: Spacing.xl,
          }}
        >
          {/* Handle bar */}
          <View style={{ width: 36, height: 4, backgroundColor: Colors.divider, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.md }} />

          <Text style={{ fontFamily: FontFamily.serifMedium, fontSize: FontSize.lg, color: Colors.textPrimary, marginBottom: Spacing.sm }}>
            {booking.restaurant?.name}
          </Text>
          <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.lg }}>
            {booking.date} · {booking.time}
          </Text>

          {actions.map(action => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              style={{
                paddingVertical: Spacing.md,
                borderTopWidth: 1,
                borderTopColor: Colors.divider,
              }}
            >
              <Text
                style={{
                  fontFamily: FontFamily.sans,
                  fontSize: FontSize.base,
                  color: action.destructive ? '#C0392B' : Colors.textPrimary,
                }}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
```

### 10c — useReservations hook

- [ ] **Step 6: Write failing useReservations test**

Create `mobile/__tests__/hooks/useReservations.test.ts`:
```ts
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
```

- [ ] **Step 7: Run test — expect FAIL**

```bash
npx jest __tests__/hooks/useReservations.test.ts --no-coverage
```
Expected: FAIL

- [ ] **Step 8: Write `hooks/useReservations.ts`**

Create `mobile/hooks/useReservations.ts`:
```ts
import { useCallback, useEffect, useState } from 'react';
import { cancelBooking, fetchBookings } from '@/lib/api';
import type { Booking } from '@/lib/types';

export function useReservations(userId: number) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings(userId)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const cancel = useCallback(async (id: number) => {
    const updated = await cancelBooking(id);
    setBookings(prev => prev.map(b => (b.id === id ? { ...b, ...updated } : b)));
  }, []);

  const upcoming = bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled');
  const past = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  return { bookings, upcoming, past, loading, cancel };
}
```

- [ ] **Step 9: Run test — expect PASS**

```bash
npx jest __tests__/hooks/useReservations.test.ts --no-coverage
```
Expected: PASS (2 tests)

- [ ] **Step 10: Commit**

```bash
git add mobile/components/reservations/ mobile/hooks/useReservations.ts mobile/__tests__/
git commit -m "feat: add reservations components, ManageSheet, and useReservations hook"
```

---

## Task 11: Reservations Screen Assembly

**Files:**
- Modify: `mobile/app/(tabs)/reservations.tsx`

- [ ] **Step 1: Replace placeholder with full reservations screen**

Replace `mobile/app/(tabs)/reservations.tsx`:
```tsx
import { useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, Text, View } from 'react-native';
import BookingListItem from '@/components/reservations/BookingListItem';
import ManageSheet from '@/components/reservations/ManageSheet';
import { useReservations } from '@/hooks/useReservations';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import type { Booking } from '@/lib/types';

// Demo user — replace with real auth later
const DEMO_USER_ID = 1;

function SectionLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        fontFamily: FontFamily.sansMedium,
        fontSize: FontSize.xs,
        color: Colors.textMuted,
        letterSpacing: 1,
        textTransform: 'uppercase',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
      }}
    >
      {text}
    </Text>
  );
}

function EmptyState() {
  return (
    <View style={{ alignItems: 'center', paddingTop: Spacing.xl * 2 }}>
      <Text style={{ fontFamily: FontFamily.serifMedium, fontSize: FontSize.lg, color: Colors.textPrimary }}>
        No upcoming reservations
      </Text>
      <Text style={{ fontFamily: FontFamily.sans, fontSize: FontSize.base, color: Colors.textMuted, marginTop: Spacing.sm }}>
        Head to chat to book
      </Text>
    </View>
  );
}

export default function ReservationsScreen() {
  const { upcoming, past, loading, cancel } = useReservations(DEMO_USER_ID);
  const [managed, setManaged] = useState<Booking | null>(null);

  type ListItem =
    | { type: 'header'; text: string; key: string }
    | { type: 'booking'; booking: Booking; key: string }
    | { type: 'empty'; key: string };

  const data: ListItem[] = [];

  data.push({ type: 'header', text: 'Upcoming', key: 'h-upcoming' });
  if (upcoming.length === 0) {
    data.push({ type: 'empty', key: 'empty-upcoming' });
  } else {
    upcoming.forEach(b => data.push({ type: 'booking', booking: b, key: `booking-${b.id}` }));
  }

  if (past.length > 0) {
    data.push({ type: 'header', text: 'Past', key: 'h-past' });
    past.forEach(b => data.push({ type: 'booking', booking: b, key: `booking-past-${b.id}` }));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: Colors.divider,
        }}
      >
        <Text
          style={{
            fontFamily: FontFamily.serifMedium,
            fontSize: FontSize.lg,
            color: Colors.textPrimary,
          }}
        >
          Reservations
        </Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={item => item.key}
        refreshControl={
          <RefreshControl refreshing={loading} tintColor={Colors.terracotta} />
        }
        renderItem={({ item }) => {
          if (item.type === 'header') return <SectionLabel text={item.text} />;
          if (item.type === 'empty') return <EmptyState />;
          return (
            <BookingListItem
              booking={item.booking}
              onManage={() => setManaged(item.booking)}
            />
          );
        }}
      />

      <ManageSheet
        booking={managed}
        onClose={() => setManaged(null)}
        onCancel={cancel}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify reservations screen in simulator**

```bash
npx expo start --ios
```
Expected:
- Reservations tab shows "UPCOMING" and "PAST" sections
- Empty state renders "No upcoming reservations / Head to chat to book"
- If bookings exist (seed the backend with test data), cards appear with correct status dots
- Tapping "Manage ›" opens the bottom sheet with directions and cancel options

- [ ] **Step 3: Run all tests**

```bash
npx jest --no-coverage
```
Expected: All tests pass (no failures)

- [ ] **Step 4: Commit**

```bash
git add mobile/app/\(tabs\)/reservations.tsx
git commit -m "feat: assemble reservations screen with section list, empty state, and manage sheet"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] iOS app with React Native/Expo ✓ Task 1
- [x] 4-screen onboarding (name, postcode, dietary, party size) ✓ Task 5
- [x] Chat-first, app opens to chat after onboarding ✓ Task 6
- [x] WhatsApp-style bubbles (user right/terracotta, AI left/cream) ✓ Task 7
- [x] Tool activity shown as muted italic ✓ Task 7
- [x] Booking card inline in chat with Confirm / Change CTAs ✓ Task 7
- [x] Pill input, return key sends ✓ Task 7
- [x] 2-tab bar: Chat + Reservations ✓ Task 6
- [x] Reservations: upcoming / past sections, status dots ✓ Task 10-11
- [x] Manage bottom sheet: directions, cancel ✓ Task 10
- [x] Warm cream background, terracotta accent, Playfair serif ✓ Tasks 2, 7
- [x] API client connects to existing Express backend ✓ Task 3
- [x] `EXPO_PUBLIC_API_URL` env var for backend URL ✓ Task 1

**Out of scope (confirmed):**
- Push notifications — post-MVP
- WhatsApp integration — post-MVP
- Voice input — post-MVP
- Auth — demo user `id=1`
