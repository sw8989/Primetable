# Model-Agnostic Provider Architecture

**Date:** 2026-05-02  
**Status:** Approved  
**Scope:** Refactor AI provider layer + add Kimi (Moonshot AI) as first new provider

---

## Problem

The current `aiService.ts` hardcodes `if (provider === "anthropic") ... else openai` logic. Adding any new provider requires touching `config.ts`, `aiService.ts`, and potentially `routes.ts`. The contract between providers is implicit — there is no shared interface, so divergence goes undetected until runtime.

DeepSeek and Smithery appear in `config.ts` but have no service implementations. The `preferredProvider` file is empty and unused.

---

## Goal

A provider registry pattern where adding a new AI model requires:
- One new file in `server/services/providers/`
- One line in `registry.ts`
- One env var

No changes to `aiService.ts`, `routes.ts`, or `config.ts` for future providers.

---

## Architecture

```
server/services/
  providers/
    types.ts          ← ProviderAdapter interface
    registry.ts       ← maps name → adapter, resolves active provider
    anthropic.ts      ← refactored from anthropicService.ts
    openai.ts         ← refactored from openaiService.ts
    kimi.ts           ← new provider (Moonshot AI)
  aiService.ts        ← simplified facade, delegates to registry
config.ts             ← reads PREFERRED_PROVIDER env var
.env                  ← add KIMI_API_KEY, PREFERRED_PROVIDER
```

---

## ProviderAdapter Interface (`providers/types.ts`)

Every provider must implement this interface:

```ts
export interface ProviderAdapter {
  readonly name: string;
  isAvailable(): boolean;
  processChat(
    messages: ChatMessage[],
    context: string,
    restaurant?: any,
    userId?: number
  ): Promise<McpResponse>;
  getMcpTools(): Promise<any[]>;
  analyzeBookingStrategy(
    restaurantName: string,
    bookingInfo: string | null,
    difficulty: string
  ): Promise<string>;
  suggestAlternativeTimes(
    restaurantName: string,
    preferredDate: Date,
    preferredTime: string,
    partySize: number
  ): Promise<{ suggestions: string[]; reasoning: string }>;
  generateBookingMessage(
    restaurantName: string,
    date: Date,
    time: string,
    partySize: number,
    userName: string
  ): Promise<string>;
}

export type ChatMessage = {
  role: string;
  content: string;
  tool_calls?: any;
  tool_results?: any;
  tool_call_id?: string;
  function_name?: string;
};

export type McpResponse = {
  role: string;
  content: string;
  tool_calls?: any[];
};
```

---

## Provider Registry (`providers/registry.ts`)

- Holds a `Map<string, ProviderAdapter>` of all registered providers
- Exposes `getProvider(): ProviderAdapter | null`
- Resolution order:
  1. Try `PREFERRED_PROVIDER` env var value — use if `isAvailable()` is true
  2. Fall back to first registered provider where `isAvailable()` is true
  3. Return `null` if none available → graceful degradation (existing behaviour preserved)

```ts
// Adding a provider in future:
registry.register(new GeminiAdapter());
```

---

## Provider Implementations

### `providers/anthropic.ts`
- Refactored from `server/services/anthropicService.ts`
- Implements `ProviderAdapter`
- `name = "anthropic"`
- `isAvailable()` checks `ANTHROPIC_API_KEY`
- Model: `claude-sonnet-4-6`

### `providers/openai.ts`
- Refactored from `server/services/openaiService.ts`
- Implements `ProviderAdapter`
- `name = "openai"`
- `isAvailable()` checks `OPENAI_API_KEY`
- Model: `gpt-4o`

### `providers/kimi.ts` *(new)*
- Implements `ProviderAdapter`
- `name = "kimi"`
- `isAvailable()` checks `KIMI_API_KEY`
- Uses OpenAI SDK with custom `baseURL: "https://api.moonshot.cn/v1"`
- Model: `moonshot-v1-8k` (default); override via `KIMI_MODEL` env var
- Mirrors `openai.ts` implementation — only base URL and model differ

---

## `aiService.ts` Changes

Simplified to a thin facade:

```ts
import { registry } from "./providers/registry";

class AiService {
  getService(): ProviderAdapter | null {
    return registry.getProvider();
  }
}
```

All hardcoded provider if/else logic removed.

---

## `config.ts` Changes

- Add `preferredProvider: process.env.PREFERRED_PROVIDER ?? ""`
- Remove ghost provider entries for DeepSeek and Smithery
- Keep provider availability map but drive it from registered adapters

---

## `.env` Changes

```
KIMI_API_KEY=<moonshot api key>
PREFERRED_PROVIDER=kimi   # or: anthropic, openai
KIMI_MODEL=moonshot-v1-8k # optional override
```

---

## Provider Selection

Set `PREFERRED_PROVIDER` in `.env` and restart. If the named provider's API key is missing, the registry falls back to the first available registered provider and logs a warning. No runtime switching — restart required.

---

## Error Handling

- Provider unavailable at startup → warning logged, fallback attempted
- All providers unavailable → `getService()` returns `null`, existing graceful degradation preserved
- Individual method errors → each provider handles internally, throws to caller

---

## Testing

- Unit tests for `registry.ts`: resolution order, fallback behaviour, null case
- Unit tests for `kimi.ts`: `isAvailable()` with/without key, correct baseURL passed to OpenAI SDK
- Existing tests for anthropic and openai services migrated to new file paths
- No new integration tests required

---

## Out of Scope

- Runtime provider switching via API
- Per-request model selection
- DeepSeek or Smithery implementation
- Model selection UI in the frontend
