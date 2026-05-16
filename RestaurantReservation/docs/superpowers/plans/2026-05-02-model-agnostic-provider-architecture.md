# Model-Agnostic Provider Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the AI provider layer into a registry-based adapter pattern and add Kimi (Moonshot AI) as the third working provider.

**Architecture:** A `ProviderRegistry` maps provider names to `ProviderAdapter` instances. `aiService.ts` registers all adapters at startup and delegates `getService()` to the registry. Adding a future provider requires one new file, one `registry.register()` call, and one env var.

**Tech Stack:** TypeScript, `openai` SDK (reused for Kimi via custom `baseURL`), `@anthropic-ai/sdk`, Vitest

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `server/services/providers/types.ts` | `ProviderAdapter` interface + shared types |
| Create | `server/services/providers/mcpTools.ts` | Shared MCP tool definitions (openai + kimi) |
| Create | `server/services/providers/registry.ts` | `ProviderRegistry` class + `registry` singleton |
| Create | `server/services/providers/openai.ts` | OpenAI adapter + logging utils |
| Create | `server/services/providers/kimi.ts` | Kimi (Moonshot) adapter |
| Create | `server/services/providers/anthropic.ts` | Anthropic adapter |
| Modify | `server/services/aiService.ts` | Register adapters, use registry |
| Modify | `server/config.ts` | Add `PREFERRED_PROVIDER`, remove ghost providers |
| Modify | `.env` (Desktop copy) | Add `KIMI_API_KEY`, `PREFERRED_PROVIDER` |
| Create | `tests/server/providers/registry.test.ts` | Registry resolution tests |
| Create | `tests/server/providers/kimi.test.ts` | Kimi adapter tests |
| Modify | `tests/server/openaiService.test.ts` | Update import path |
| Delete | `server/services/anthropicService.ts` | Replaced by `providers/anthropic.ts` |
| Delete | `server/services/openaiService.ts` | Replaced by `providers/openai.ts` |

---

### Task 1: Create the ProviderAdapter interface

**Files:**
- Create: `server/services/providers/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// server/services/providers/types.ts
export interface ProviderAdapter {
  readonly name: string;
  isAvailable(): boolean;
  processChat(message: string, context?: string): Promise<string>;
  processMcpChat(
    messages: ChatMessage[],
    context: string,
    restaurant?: any,
    userId?: number,
  ): Promise<McpResponse>;
  getMcpTools(): Promise<any[]>;
  analyzeBookingStrategy(
    restaurantName: string,
    bookingInfo: string | null,
    difficulty: string,
  ): Promise<string>;
  suggestAlternativeTimes(
    restaurantName: string,
    preferredDate: Date,
    preferredTime: string,
    partySize: number,
  ): Promise<{ suggestions: string[]; reasoning: string }>;
  generateBookingMessage(
    restaurantName: string,
    date: Date,
    time: string,
    partySize: number,
    userName: string,
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

- [ ] **Step 2: Commit**

```bash
git add server/services/providers/types.ts
git commit -m "feat: add ProviderAdapter interface and shared types"
```

---

### Task 2: Extract shared MCP tool definitions

**Files:**
- Create: `server/services/providers/mcpTools.ts`

- [ ] **Step 1: Create the shared tools file**

```typescript
// server/services/providers/mcpTools.ts
import { getBookingTools } from "../ai/bookingTools";

export async function getMcpToolDefinitions(): Promise<any[]> {
  const standardTools = [
    {
      type: "function",
      function: {
        name: "search_restaurants_tool",
        description: "Searches for restaurants by cuisine, location, or other criteria",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query" },
            cuisine: { type: "string", description: "Type of cuisine (optional)" },
            location: { type: "string", description: "London location (optional)" },
            difficulty: { type: "string", description: "Booking difficulty level (optional): easy, medium, hard" },
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "check_availability_tool",
        description: "Checks if tables are available at specified restaurants",
        parameters: {
          type: "object",
          properties: {
            restaurant_id: { type: "number", description: "The ID of the restaurant to check" },
            date: { type: "string", description: "The date to check in YYYY-MM-DD format" },
            time: { type: "string", description: "The time to check in 24-hour format (HH:MM)" },
            party_size: { type: "number", description: "The number of people in the party" },
          },
          required: ["restaurant_id", "date", "time", "party_size"],
        },
      },
    },
  ];

  const bookingTools = getBookingTools();
  return [...standardTools, ...bookingTools];
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/providers/mcpTools.ts
git commit -m "feat: extract shared MCP tool definitions"
```

---

### Task 3: Write registry tests, then implement the registry

**Files:**
- Create: `tests/server/providers/registry.test.ts`
- Create: `server/services/providers/registry.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/server/providers/registry.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProviderRegistry } from "../../../server/services/providers/registry";
import type { ProviderAdapter } from "../../../server/services/providers/types";

function makeAdapter(name: string, available: boolean): ProviderAdapter {
  return {
    name,
    isAvailable: () => available,
    processChat: vi.fn(),
    processMcpChat: vi.fn(),
    getMcpTools: vi.fn(),
    analyzeBookingStrategy: vi.fn(),
    suggestAlternativeTimes: vi.fn(),
    generateBookingMessage: vi.fn(),
  } as unknown as ProviderAdapter;
}

describe("ProviderRegistry", () => {
  let reg: ProviderRegistry;

  beforeEach(() => {
    reg = new ProviderRegistry();
    vi.unstubAllEnvs();
  });

  it("returns null when no providers registered", () => {
    expect(reg.getProvider()).toBeNull();
  });

  it("returns the first available provider when no preference set", () => {
    reg.register(makeAdapter("openai", true));
    expect(reg.getProvider()?.name).toBe("openai");
  });

  it("returns preferred provider when available", () => {
    vi.stubEnv("PREFERRED_PROVIDER", "kimi");
    reg.register(makeAdapter("openai", true));
    reg.register(makeAdapter("kimi", true));
    expect(reg.getProvider()?.name).toBe("kimi");
  });

  it("falls back to available provider when preferred is unavailable", () => {
    vi.stubEnv("PREFERRED_PROVIDER", "kimi");
    reg.register(makeAdapter("openai", true));
    reg.register(makeAdapter("kimi", false));
    expect(reg.getProvider()?.name).toBe("openai");
  });

  it("returns null when all providers unavailable", () => {
    reg.register(makeAdapter("openai", false));
    reg.register(makeAdapter("anthropic", false));
    expect(reg.getProvider()).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd RestaurantReservation && npx vitest run tests/server/providers/registry.test.ts
```

Expected: FAIL — `ProviderRegistry` not found.

- [ ] **Step 3: Implement the registry**

```typescript
// server/services/providers/registry.ts
import type { ProviderAdapter } from "./types";

export class ProviderRegistry {
  private providers = new Map<string, ProviderAdapter>();

  register(adapter: ProviderAdapter): void {
    this.providers.set(adapter.name, adapter);
  }

  getProvider(): ProviderAdapter | null {
    const preferred = process.env.PREFERRED_PROVIDER;
    if (preferred) {
      const p = this.providers.get(preferred);
      if (p?.isAvailable()) return p;
      if (p) console.warn(`Preferred provider "${preferred}" is unavailable. Falling back.`);
    }
    for (const p of this.providers.values()) {
      if (p.isAvailable()) return p;
    }
    return null;
  }
}

export const registry = new ProviderRegistry();
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/server/providers/registry.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/services/providers/registry.ts tests/server/providers/registry.test.ts
git commit -m "feat: add ProviderRegistry with fallback resolution"
```

---

### Task 4: Move OpenAI service to providers/openai.ts

**Files:**
- Create: `server/services/providers/openai.ts`
- Modify: `tests/server/openaiService.test.ts`

- [ ] **Step 1: Create `providers/openai.ts`**

```typescript
// server/services/providers/openai.ts
import OpenAI from "openai";
import type { ProviderAdapter, ChatMessage, McpResponse } from "./types";
import { getMcpToolDefinitions } from "./mcpTools";

const LOG_PREVIEW_CHARS = 160;

export function summarizeTextForLog(value: string, maxChars = LOG_PREVIEW_CHARS): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}... [truncated ${value.length - maxChars} chars]`;
}

export function summarizeMcpMessagesForLog(
  messages: Array<{
    role: string;
    content?: string;
    tool_calls?: any;
    tool_call_id?: string;
    function_name?: string;
    name?: string;
  }>,
): Array<Record<string, unknown>> {
  return messages.map((message) => ({
    role: message.role,
    tool_call_id: message.tool_call_id,
    name: message.function_name || message.name,
    tool_calls_count: Array.isArray(message.tool_calls) ? message.tool_calls.length : 0,
    content_preview:
      typeof message.content === "string" ? summarizeTextForLog(message.content) : undefined,
  }));
}

export class OpenAIAdapter implements ProviderAdapter {
  readonly name = "openai";
  private client: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      try {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      } catch (error) {
        console.error("Failed to initialize OpenAI client:", error);
      }
    } else {
      console.warn("WARNING: OPENAI_API_KEY not set. OpenAI features will be disabled.");
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async analyzeBookingStrategy(restaurantName: string, bookingInfo: string | null, difficulty: string): Promise<string> {
    if (!this.client) return `For booking ${restaurantName} (${difficulty} difficulty), monitor the booking platform regularly, especially early morning and late at night when cancellations often occur.`;
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert in securing reservations at exclusive restaurants. Provide detailed, actionable booking strategies." },
          { role: "user", content: `Analyze the best strategy for booking a table at ${restaurantName}.\nBooking information: ${bookingInfo || "No additional information available"}\nDifficulty level: ${difficulty}\n\nProvide a specific strategy with timing recommendations and approach.` },
        ],
        max_tokens: 250,
      });
      return response.choices[0].message.content || "Could not generate a booking strategy at this time.";
    } catch (error) {
      console.error("Error analyzing booking strategy:", error);
      return "Could not generate a booking strategy due to a service error. Please try again later.";
    }
  }

  async suggestAlternativeTimes(restaurantName: string, preferredDate: Date, preferredTime: string, partySize: number): Promise<{ suggestions: string[]; reasoning: string }> {
    if (!this.client) {
      const day = preferredDate.getDay();
      const isWeekend = day === 0 || day === 6;
      return {
        suggestions: [
          isWeekend ? "Try a weekday instead - Tuesdays or Wednesdays are typically less busy" : "Earlier in the week, like Monday or Tuesday",
          "Earlier dining time, like 5:30 PM or 6:00 PM",
          "Later dining time, after 9:00 PM",
        ],
        reasoning: "Based on standard restaurant patterns, these times typically have better availability.",
      };
    }
    try {
      const dateStr = preferredDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert in restaurant booking patterns and availability." },
          { role: "user", content: `For a booking at ${restaurantName} on ${dateStr} at ${preferredTime} for ${partySize} people, suggest 3 alternative times or dates that might have better availability.` },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });
      const result = JSON.parse(response.choices[0].message.content || "{}");
      return { suggestions: result.suggestions || [], reasoning: result.reasoning || "" };
    } catch (error) {
      console.error("Error suggesting alternative times:", error);
      return { suggestions: [], reasoning: "Could not generate alternative suggestions due to a service error." };
    }
  }

  async generateBookingMessage(restaurantName: string, date: Date, time: string, partySize: number, userName: string): Promise<string> {
    if (!this.client) return `Dear ${userName}, your booking at ${restaurantName} on ${date.toLocaleDateString()} at ${time} for ${partySize} people has been confirmed. We look forward to serving you! - The Prime Table Team`;
    try {
      const dateStr = date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a professional restaurant booking assistant. Create a personalized, enthusiastic booking confirmation message." },
          { role: "user", content: `Create a personalized booking confirmation message for ${userName}'s reservation at ${restaurantName}. Reservation details: ${dateStr} at ${time} for ${partySize} people. Keep it concise, professional, but with personality.` },
        ],
        max_tokens: 200,
      });
      return response.choices[0].message.content || "Your booking has been processed successfully.";
    } catch (error) {
      console.error("Error generating booking message:", error);
      return `Your booking at ${restaurantName} on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
    }
  }

  async processChat(message: string, context?: string): Promise<string> {
    if (!this.client) return "I'm a restaurant booking assistant, but I'm currently operating in simulation mode.";
    try {
      const systemMessage = context || "You are a helpful restaurant booking assistant specialized in securing reservations at London's most exclusive restaurants.";
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemMessage }, { role: "user", content: message }],
        max_tokens: 800,
        temperature: 0.7,
      });
      return response.choices[0].message.content || "I'm sorry, I couldn't process your request right now.";
    } catch (error) {
      console.error("Error processing chat:", error);
      const openAIError = error as any;
      if (openAIError.status === 429 || (openAIError.error && openAIError.error.code === "insufficient_quota")) {
        return "I apologize, but our AI service has reached its usage limit for now. The system is working in simulation mode.";
      }
      return "I apologize, but I encountered an error while processing your request. Please try again later.";
    }
  }

  async processMcpChat(messages: ChatMessage[], context: string, restaurant?: any, userId?: number): Promise<McpResponse> {
    if (!this.client) return { role: "assistant", content: "I'm a restaurant booking assistant. How can I assist you today?" };
    try {
      const openaiMessages: any[] = [{ role: "system", content: context }];
      for (const msg of messages) {
        if (msg.role === "user") {
          openaiMessages.push({ role: "user", content: msg.content });
        } else if (msg.role === "assistant" && !msg.tool_calls) {
          openaiMessages.push({ role: "assistant", content: msg.content || "" });
        } else if (msg.role === "assistant" && msg.tool_calls?.length > 0) {
          openaiMessages.push({
            role: "assistant",
            content: msg.content || "",
            tool_calls: msg.tool_calls.map((tc: any, i: number) => ({
              id: tc.id || `call_${Date.now()}_${i}`,
              type: "function",
              function: { name: tc.function?.name || "unknown", arguments: tc.function?.arguments || "{}" },
            })),
          });
        } else if (msg.role === "tool") {
          openaiMessages.push({ role: "tool", tool_call_id: msg.tool_call_id, content: msg.content, name: msg.function_name });
        }
      }
      console.log("OpenAI messages prepared for API call:", summarizeMcpMessagesForLog(openaiMessages));
      const tools = await getMcpToolDefinitions();
      const openaiTools = tools.map((tool) => ({ type: "function", function: { name: tool.function.name, description: tool.function.description, parameters: tool.function.parameters } })) as any;
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: openaiMessages,
        tools: openaiTools,
        tool_choice: "auto",
        max_tokens: 800,
        temperature: 0.7,
      });
      const responseMessage = response.choices[0].message;
      const mcpResponse: McpResponse = { role: "assistant", content: responseMessage.content || "" };
      if (responseMessage.tool_calls?.length > 0) {
        mcpResponse.tool_calls = responseMessage.tool_calls;
        const firstTool = responseMessage.tool_calls[0];
        if (firstTool?.function) {
          try {
            const args = JSON.parse(firstTool.function.arguments);
            if (firstTool.function.name === "makeReservation" && !args.userId && userId) args.userId = userId;
            (mcpResponse as any).tool = firstTool.function.name;
            (mcpResponse as any).parameters = args;
          } catch (error) {
            console.error("Error parsing tool call arguments:", error);
            (mcpResponse as any).tool = firstTool.function.name;
            (mcpResponse as any).parameters = {};
          }
        }
      }
      return mcpResponse;
    } catch (error) {
      console.error("Error processing MCP chat:", error);
      const openAIError = error as any;
      if (openAIError.status === 429 || (openAIError.error && openAIError.error.code === "insufficient_quota")) {
        return { role: "assistant", content: "I apologize, but our AI service has reached its usage limit for now." };
      }
      if (process.env.NODE_ENV === "development") {
        return { role: "assistant", content: `Error in MCPX processing: ${openAIError.message || "unknown error"}` };
      }
      return { role: "assistant", content: "I apologize, but I encountered an error while processing your request. Please try again later." };
    }
  }

  async getMcpTools(): Promise<any[]> {
    try {
      return await getMcpToolDefinitions();
    } catch (error) {
      console.error("Error getting MCP tools:", error);
      return [];
    }
  }
}

export const openAIAdapter = new OpenAIAdapter();
export default openAIAdapter;
```

- [ ] **Step 2: Update the existing openaiService test import**

In `tests/server/openaiService.test.ts`, change:
```typescript
import {
  summarizeMcpMessagesForLog,
  summarizeTextForLog,
} from "../../server/services/openaiService";
```
to:
```typescript
import {
  summarizeMcpMessagesForLog,
  summarizeTextForLog,
} from "../../server/services/providers/openai";
```

- [ ] **Step 3: Run existing tests to verify they pass**

```bash
npx vitest run tests/server/openaiService.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add server/services/providers/openai.ts tests/server/openaiService.test.ts
git commit -m "feat: add OpenAIAdapter implementing ProviderAdapter interface"
```

---

### Task 5: Write Kimi tests, then implement KimiAdapter

**Files:**
- Create: `tests/server/providers/kimi.test.ts`
- Create: `server/services/providers/kimi.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/server/providers/kimi.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("KimiAdapter", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("isAvailable returns false when KIMI_API_KEY is not set", async () => {
    vi.stubEnv("KIMI_API_KEY", "");
    const { KimiAdapter } = await import("../../../server/services/providers/kimi");
    const adapter = new KimiAdapter();
    expect(adapter.isAvailable()).toBe(false);
  });

  it("isAvailable returns true when KIMI_API_KEY is set", async () => {
    vi.stubEnv("KIMI_API_KEY", "sk-test-key");
    const { KimiAdapter } = await import("../../../server/services/providers/kimi");
    const adapter = new KimiAdapter();
    expect(adapter.isAvailable()).toBe(true);
  });

  it("has name kimi", async () => {
    vi.stubEnv("KIMI_API_KEY", "");
    const { KimiAdapter } = await import("../../../server/services/providers/kimi");
    const adapter = new KimiAdapter();
    expect(adapter.name).toBe("kimi");
  });

  it("uses KIMI_MODEL env var when set", async () => {
    vi.stubEnv("KIMI_API_KEY", "sk-test-key");
    vi.stubEnv("KIMI_MODEL", "moonshot-v1-32k");
    const { KimiAdapter } = await import("../../../server/services/providers/kimi");
    const adapter = new KimiAdapter();
    expect(adapter.model).toBe("moonshot-v1-32k");
  });

  it("defaults to moonshot-v1-8k model", async () => {
    vi.stubEnv("KIMI_API_KEY", "sk-test-key");
    const { KimiAdapter } = await import("../../../server/services/providers/kimi");
    const adapter = new KimiAdapter();
    expect(adapter.model).toBe("moonshot-v1-8k");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/server/providers/kimi.test.ts
```

Expected: FAIL — `KimiAdapter` not found.

- [ ] **Step 3: Implement KimiAdapter**

```typescript
// server/services/providers/kimi.ts
import OpenAI from "openai";
import type { ProviderAdapter, ChatMessage, McpResponse } from "./types";
import { getMcpToolDefinitions } from "./mcpTools";
import { summarizeMcpMessagesForLog } from "./openai";

export class KimiAdapter implements ProviderAdapter {
  readonly name = "kimi";
  private client: OpenAI | null = null;
  readonly model: string;

  constructor() {
    this.model = process.env.KIMI_MODEL || "moonshot-v1-8k";
    if (process.env.KIMI_API_KEY) {
      try {
        this.client = new OpenAI({
          apiKey: process.env.KIMI_API_KEY,
          baseURL: "https://api.moonshot.cn/v1",
        });
      } catch (error) {
        console.error("Failed to initialize Kimi client:", error);
      }
    } else {
      console.warn("WARNING: KIMI_API_KEY not set. Kimi features will be disabled.");
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async analyzeBookingStrategy(restaurantName: string, bookingInfo: string | null, difficulty: string): Promise<string> {
    if (!this.client) return `For booking ${restaurantName} (${difficulty} difficulty), monitor the booking platform regularly, especially early morning and late at night when cancellations often occur.`;
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are an expert in securing reservations at exclusive restaurants. Provide detailed, actionable booking strategies." },
          { role: "user", content: `Analyze the best strategy for booking a table at ${restaurantName}.\nBooking information: ${bookingInfo || "No additional information available"}\nDifficulty level: ${difficulty}\n\nProvide a specific strategy with timing recommendations and approach.` },
        ],
        max_tokens: 250,
      });
      return response.choices[0].message.content || "Could not generate a booking strategy at this time.";
    } catch (error) {
      console.error("Error analyzing booking strategy with Kimi:", error);
      return "Could not generate a booking strategy due to a service error. Please try again later.";
    }
  }

  async suggestAlternativeTimes(restaurantName: string, preferredDate: Date, preferredTime: string, partySize: number): Promise<{ suggestions: string[]; reasoning: string }> {
    if (!this.client) {
      const day = preferredDate.getDay();
      const isWeekend = day === 0 || day === 6;
      return {
        suggestions: [
          isWeekend ? "Try a weekday instead - Tuesdays or Wednesdays are typically less busy" : "Earlier in the week, like Monday or Tuesday",
          "Earlier dining time, like 5:30 PM or 6:00 PM",
          "Later dining time, after 9:00 PM",
        ],
        reasoning: "Based on standard restaurant patterns, these times typically have better availability.",
      };
    }
    try {
      const dateStr = preferredDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are an expert in restaurant booking patterns and availability." },
          { role: "user", content: `For a booking at ${restaurantName} on ${dateStr} at ${preferredTime} for ${partySize} people, suggest 3 alternative times or dates that might have better availability.` },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });
      const result = JSON.parse(response.choices[0].message.content || "{}");
      return { suggestions: result.suggestions || [], reasoning: result.reasoning || "" };
    } catch (error) {
      console.error("Error suggesting alternative times with Kimi:", error);
      return { suggestions: [], reasoning: "Could not generate alternative suggestions due to a service error." };
    }
  }

  async generateBookingMessage(restaurantName: string, date: Date, time: string, partySize: number, userName: string): Promise<string> {
    if (!this.client) return `Dear ${userName}, your booking at ${restaurantName} on ${date.toLocaleDateString()} at ${time} for ${partySize} people has been confirmed. We look forward to serving you! - The Prime Table Team`;
    try {
      const dateStr = date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are a professional restaurant booking assistant. Create a personalized, enthusiastic booking confirmation message." },
          { role: "user", content: `Create a personalized booking confirmation message for ${userName}'s reservation at ${restaurantName}. Reservation details: ${dateStr} at ${time} for ${partySize} people. Keep it concise, professional, but with personality.` },
        ],
        max_tokens: 200,
      });
      return response.choices[0].message.content || "Your booking has been processed successfully.";
    } catch (error) {
      console.error("Error generating booking message with Kimi:", error);
      return `Your booking at ${restaurantName} on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
    }
  }

  async processChat(message: string, context?: string): Promise<string> {
    if (!this.client) return "I'm a restaurant booking assistant, but I'm currently operating in simulation mode.";
    try {
      const systemMessage = context || "You are a helpful restaurant booking assistant specialized in securing reservations at London's most exclusive restaurants.";
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "system", content: systemMessage }, { role: "user", content: message }],
        max_tokens: 800,
        temperature: 0.7,
      });
      return response.choices[0].message.content || "I'm sorry, I couldn't process your request right now.";
    } catch (error) {
      console.error("Error processing chat with Kimi:", error);
      return "I apologize, but I encountered an error while processing your request. Please try again later.";
    }
  }

  async processMcpChat(messages: ChatMessage[], context: string, restaurant?: any, userId?: number): Promise<McpResponse> {
    if (!this.client) return { role: "assistant", content: "I'm a restaurant booking assistant. How can I assist you today?" };
    try {
      const openaiMessages: any[] = [{ role: "system", content: context }];
      for (const msg of messages) {
        if (msg.role === "user") {
          openaiMessages.push({ role: "user", content: msg.content });
        } else if (msg.role === "assistant" && !msg.tool_calls) {
          openaiMessages.push({ role: "assistant", content: msg.content || "" });
        } else if (msg.role === "assistant" && msg.tool_calls?.length > 0) {
          openaiMessages.push({
            role: "assistant",
            content: msg.content || "",
            tool_calls: msg.tool_calls.map((tc: any, i: number) => ({
              id: tc.id || `call_${Date.now()}_${i}`,
              type: "function",
              function: { name: tc.function?.name || "unknown", arguments: tc.function?.arguments || "{}" },
            })),
          });
        } else if (msg.role === "tool") {
          openaiMessages.push({ role: "tool", tool_call_id: msg.tool_call_id, content: msg.content, name: msg.function_name });
        }
      }
      console.log("Kimi messages prepared for API call:", summarizeMcpMessagesForLog(openaiMessages));
      const tools = await getMcpToolDefinitions();
      const kimiTools = tools.map((tool) => ({ type: "function", function: { name: tool.function.name, description: tool.function.description, parameters: tool.function.parameters } })) as any;
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages,
        tools: kimiTools,
        tool_choice: "auto",
        max_tokens: 800,
        temperature: 0.7,
      });
      const responseMessage = response.choices[0].message;
      const mcpResponse: McpResponse = { role: "assistant", content: responseMessage.content || "" };
      if (responseMessage.tool_calls?.length > 0) {
        mcpResponse.tool_calls = responseMessage.tool_calls;
        const firstTool = responseMessage.tool_calls[0];
        if (firstTool?.function) {
          try {
            const args = JSON.parse(firstTool.function.arguments);
            if (firstTool.function.name === "makeReservation" && !args.userId && userId) args.userId = userId;
            (mcpResponse as any).tool = firstTool.function.name;
            (mcpResponse as any).parameters = args;
          } catch (error) {
            console.error("Error parsing Kimi tool call arguments:", error);
            (mcpResponse as any).tool = firstTool.function.name;
            (mcpResponse as any).parameters = {};
          }
        }
      }
      return mcpResponse;
    } catch (error) {
      console.error("Error processing MCP chat with Kimi:", error);
      if (process.env.NODE_ENV === "development") {
        return { role: "assistant", content: `Error in Kimi MCPX processing: ${(error as any).message || "unknown error"}` };
      }
      return { role: "assistant", content: "I apologize, but I encountered an error while processing your request. Please try again later." };
    }
  }

  async getMcpTools(): Promise<any[]> {
    try {
      return await getMcpToolDefinitions();
    } catch (error) {
      console.error("Error getting MCP tools:", error);
      return [];
    }
  }
}

export const kimiAdapter = new KimiAdapter();
export default kimiAdapter;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/server/providers/kimi.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/services/providers/kimi.ts tests/server/providers/kimi.test.ts
git commit -m "feat: add KimiAdapter for Moonshot AI (moonshot-v1-8k)"
```

---

### Task 6: Move Anthropic service to providers/anthropic.ts

**Files:**
- Create: `server/services/providers/anthropic.ts`

- [ ] **Step 1: Create `providers/anthropic.ts`**

```typescript
// server/services/providers/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";
import type { ProviderAdapter, ChatMessage, McpResponse } from "./types";

export class AnthropicAdapter implements ProviderAdapter {
  readonly name = "anthropic";
  private client: Anthropic | null = null;
  private readonly model = "claude-sonnet-4-6";

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      console.log("Anthropic API initialized successfully.");
    } else {
      console.warn("ANTHROPIC_API_KEY not set. Anthropic AI features will be disabled.");
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async analyzeBookingStrategy(restaurantName: string, bookingInfo: string | null, difficulty: string): Promise<string> {
    if (!this.client) return "AI service unavailable. Using standard booking strategy.";
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        messages: [{ role: "user", content: `You are an expert restaurant booking agent specializing in hard-to-book London restaurants.\n\nRestaurant: ${restaurantName}\nBooking difficulty level: ${difficulty}\nAdditional booking information: ${bookingInfo || "No additional information available"}\n\nProvide a detailed and strategic approach for securing a booking. Include specific tips on best times to check availability, how far in advance to book, and patterns that increase success. Limit to 3-4 short paragraphs.` }],
      });
      if (response.content[0].type === "text") return response.content[0].text;
      return "AI service returned an unexpected response format.";
    } catch (error) {
      console.error("Error generating booking strategy with Anthropic:", error);
      return `Error generating AI booking strategy. Using standard approach for ${difficulty} difficulty venue.`;
    }
  }

  async suggestAlternativeTimes(restaurantName: string, preferredDate: Date, preferredTime: string, partySize: number): Promise<{ suggestions: string[]; reasoning: string }> {
    if (!this.client) return { suggestions: [], reasoning: "" };
    try {
      const dateString = preferredDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 300,
        messages: [{ role: "user", content: `Restaurant: ${restaurantName}\nPreferred date: ${dateString}\nPreferred time: ${preferredTime}\nParty size: ${partySize}\n\nThe exact time is unavailable. Suggest 3-5 alternative time slots within 90 minutes of the requested time.\n\nReturn ONLY a JSON array, e.g.: ["6:30 PM", "7:15 PM", "8:00 PM"]` }],
      });
      if (response.content[0].type === "text") {
        const match = response.content[0].text.trim().match(/\[[\s\S]*\]/);
        if (match) {
          try {
            return { suggestions: JSON.parse(match[0]), reasoning: "Based on typical dining patterns for London restaurants." };
          } catch {
            return { suggestions: [], reasoning: "" };
          }
        }
      }
      return { suggestions: [], reasoning: "" };
    } catch (error) {
      console.error("Error generating alternative times with Anthropic:", error);
      return { suggestions: [], reasoning: "" };
    }
  }

  async generateBookingMessage(restaurantName: string, date: Date, time: string, partySize: number, userName: string): Promise<string> {
    const fallback = `Your booking at ${restaurantName} for ${partySize} guests on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
    if (!this.client) return fallback;
    try {
      const dateString = date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 300,
        messages: [{ role: "user", content: `Create a warm, friendly booking confirmation for:\n- Restaurant: ${restaurantName}\n- Date: ${dateString}\n- Time: ${time}\n- Party size: ${partySize}\n- Guest name: ${userName}\n\nFriendly, sophisticated tone. About 3-4 sentences.` }],
      });
      if (response.content[0].type === "text") return response.content[0].text.trim();
      return fallback;
    } catch (error) {
      console.error("Error generating booking message with Anthropic:", error);
      return fallback;
    }
  }

  async processChat(message: string, context?: string): Promise<string> {
    const result = await this.processMcpChat(
      [{ role: "user", content: message }],
      context || "You are a helpful restaurant booking assistant for London's exclusive restaurants.",
    );
    return result.content;
  }

  async processMcpChat(messages: ChatMessage[], context: string, _restaurant?: any, _userId?: number): Promise<McpResponse> {
    if (!this.client) return { role: "assistant", content: "I'm a restaurant booking assistant. How can I help you today?" };
    try {
      const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
      for (const msg of messages) {
        if (msg.role === "user") anthropicMessages.push({ role: "user", content: msg.content || "" });
        else if (msg.role === "assistant" && !msg.tool_calls) anthropicMessages.push({ role: "assistant", content: msg.content || "" });
      }
      if (anthropicMessages.length === 0) return { role: "assistant", content: "How can I help you with your restaurant booking?" };
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 800,
        system: context,
        messages: anthropicMessages,
      });
      if (response.content[0].type === "text") return { role: "assistant", content: response.content[0].text };
      return { role: "assistant", content: "I'm sorry, I could not process your request right now." };
    } catch (error) {
      console.error("Error in Anthropic processMcpChat:", error);
      return { role: "assistant", content: "I encountered an error while processing your request. Please try again." };
    }
  }

  async getMcpTools(): Promise<any[]> {
    return [];
  }
}

export const anthropicAdapter = new AnthropicAdapter();
export default anthropicAdapter;
```

- [ ] **Step 2: Commit**

```bash
git add server/services/providers/anthropic.ts
git commit -m "feat: add AnthropicAdapter implementing ProviderAdapter interface"
```

---

### Task 7: Update aiService.ts to use the registry

**Files:**
- Modify: `server/services/aiService.ts`

- [ ] **Step 1: Replace aiService.ts**

```typescript
// server/services/aiService.ts
import type { ProviderAdapter } from "./providers/types";
import { registry } from "./providers/registry";
import { anthropicAdapter } from "./providers/anthropic";
import { openAIAdapter } from "./providers/openai";
import { kimiAdapter } from "./providers/kimi";

registry.register(anthropicAdapter);
registry.register(openAIAdapter);
registry.register(kimiAdapter);

type ChatMessage = {
  role: string;
  content: string;
  tool_calls?: any;
  tool_results?: any;
  tool_call_id?: string;
  function_name?: string;
};

type McpResponse = {
  role: string;
  content: string;
  tool_calls?: any[];
};

class AiService {
  isAvailable(): boolean {
    return registry.getProvider() !== null;
  }

  getService(): ProviderAdapter | null {
    return registry.getProvider();
  }

  get name(): string {
    return registry.getProvider()?.name ?? "none";
  }

  async analyzeBookingStrategy(restaurantName: string, bookingInfo: string | null, difficulty: string): Promise<string> {
    const service = this.getService();
    if (!service) return "AI service unavailable. Using standard booking strategy.";
    return service.analyzeBookingStrategy(restaurantName, bookingInfo, difficulty);
  }

  async suggestAlternativeTimes(restaurantName: string, preferredDate: Date, preferredTime: string, partySize: number): Promise<{ suggestions: string[]; reasoning: string }> {
    const service = this.getService();
    if (!service) return { suggestions: [], reasoning: "" };
    return service.suggestAlternativeTimes(restaurantName, preferredDate, preferredTime, partySize);
  }

  async generateBookingMessage(restaurantName: string, date: Date, time: string, partySize: number, userName: string): Promise<string> {
    const service = this.getService();
    if (!service) return `Your booking at ${restaurantName} for ${partySize} guests on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
    return service.generateBookingMessage(restaurantName, date, time, partySize, userName);
  }

  async processChat(message: string, context?: string): Promise<string> {
    const service = this.getService();
    if (!service) return "I'm a restaurant booking assistant, but I'm currently operating in simulation mode.";
    return service.processChat(message, context);
  }

  async processMcpChat(messages: ChatMessage[], context: string, restaurant?: any, userId?: number): Promise<McpResponse> {
    const service = this.getService();
    if (!service) return { role: "assistant", content: "I'm the Prime Table booking assistant. How can I assist you today?" };
    return service.processMcpChat(messages, context, restaurant, userId);
  }

  async getMcpTools(): Promise<any[]> {
    const service = this.getService();
    if (!service) return [];
    return service.getMcpTools();
  }
}

const aiService = new AiService();
export default aiService;
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: All existing tests PASS.

- [ ] **Step 3: Commit**

```bash
git add server/services/aiService.ts
git commit -m "refactor: wire aiService to provider registry, replace hardcoded if/else"
```

---

### Task 8: Update config.ts

**Files:**
- Modify: `server/config.ts`

- [ ] **Step 1: Replace the `services.ai` block and remove ghost keys**

Replace the entire `services.ai` block (lines 46–71) with:

```typescript
    ai: {
      enabled: !!(
        process.env.OPENAI_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.KIMI_API_KEY
      ),
      preferredProvider: process.env.PREFERRED_PROVIDER ?? "",
      providers: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        kimi: !!process.env.KIMI_API_KEY,
      },
    },
```

Also remove the top-level `DEEPSEEK_API_KEY` line (line 36) and `SMITHERY_API_KEY` line (line 31) from `config.ts` — neither has an implementation.

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add server/config.ts
git commit -m "refactor: simplify config.ts — PREFERRED_PROVIDER env var, remove ghost providers"
```

---

### Task 9: Update .env, delete old service files

**Files:**
- Modify: `/Users/stanislasweinberger/Desktop/Projects/PrimeTable/RestaurantReservation/.env`
- Delete: `server/services/anthropicService.ts`
- Delete: `server/services/openaiService.ts`

- [ ] **Step 1: Add Kimi config to .env**

Add to `/Users/stanislasweinberger/Desktop/Projects/PrimeTable/RestaurantReservation/.env`:

```
KIMI_API_KEY=<your-moonshot-api-key>
PREFERRED_PROVIDER=kimi
KIMI_MODEL=moonshot-v1-8k
```

- [ ] **Step 2: Delete old service files**

```bash
rm server/services/anthropicService.ts server/services/openaiService.ts
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: delete anthropicService.ts and openaiService.ts — replaced by providers/"
```

---

### Task 10: Smoke test with PREFERRED_PROVIDER=kimi

- [ ] **Step 1: Start the dev server** (from `RestaurantReservation/` on Desktop)

```bash
npm run dev
```

Expected: Server logs show `Kimi API initialized` and active provider is `kimi`.

- [ ] **Step 2: Send a test chat message**

```bash
curl -s -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What restaurants do you recommend?"}],"context":"You are a restaurant booking assistant."}' \
  | jq .
```

Expected: JSON with `role: "assistant"` and non-empty `content`.

- [ ] **Step 3: Verify fallback**

Comment out `PREFERRED_PROVIDER` in `.env`, restart server, confirm it falls back to the next available provider (anthropic or openai) and logs a warning.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: Kimi integration smoke test passing, provider refactor complete"
```
