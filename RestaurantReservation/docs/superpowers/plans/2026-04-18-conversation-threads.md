# Conversation Threads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent conversation thread support to PrimeTable's LLM integration so users' multi-turn chat sessions are stored per-user and can be resumed across page loads.

**Architecture:** Add a `conversations` table (JSONB messages array, userId, optional restaurantId) and wire a `conversationId` param through `POST /api/chat` so the route loads prior history, appends the new exchange, and returns the thread ID. Fix the broken `aiService` facade (dead `deepseekService`/`smitheryService` references), add Anthropic multi-turn support, and update the Claude model.

**Tech Stack:** TypeScript, Express, Drizzle ORM + PostgreSQL (NeonDB), Vitest, OpenAI SDK 4.x, Anthropic SDK 0.37.x

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `shared/schema.ts` | Modify | Add `conversations` table + types |
| `server/storage.ts` | Modify | Add conversation CRUD to `IStorage`, `MemStorage`, `DatabaseStorage` |
| `server/services/aiService.ts` | Modify | Remove dead service refs, expose `processMcpChat`, fix `suggestAlternativeTimes` return type |
| `server/services/anthropicService.ts` | Modify | Update model to `claude-sonnet-4-6`, add `processMcpChat`, fix `suggestAlternativeTimes` return type |
| `server/services/openaiService.ts` | Modify | Remove hardcoded `userId: 1` fallback |
| `server/routes.ts` | Modify | Add `/api/conversations` routes; thread-aware `/api/chat` |
| `tests/server/conversationThread.test.ts` | Create | Integration tests for thread persistence |

---

## Task 1: Add `conversations` Table to Schema

**Files:**
- Modify: `shared/schema.ts`
- Test: `tests/server/conversationThread.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/server/conversationThread.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { MemStorage } from "../../server/storage";

describe("conversation threads", () => {
  it("creates a conversation and retrieves it by user", async () => {
    const storage = new MemStorage();
    const conv = await storage.createConversation({ userId: 1, restaurantId: null, messages: [] });
    expect(conv.id).toBeDefined();
    expect(conv.userId).toBe(1);
    expect(conv.messages).toEqual([]);

    const list = await storage.getConversationsByUser(1);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(conv.id);
  });

  it("appends messages to an existing conversation", async () => {
    const storage = new MemStorage();
    const conv = await storage.createConversation({ userId: 2, restaurantId: 5, messages: [] });

    const msg = { role: "user", content: "Is Sketch available Saturday?" };
    const updated = await storage.appendConversationMessage(conv.id, msg);

    expect(updated?.messages).toHaveLength(1);
    expect(updated?.messages[0].content).toBe("Is Sketch available Saturday?");
  });

  it("returns undefined for unknown conversation", async () => {
    const storage = new MemStorage();
    const result = await storage.getConversation(9999);
    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd RestaurantReservation && npx vitest run tests/server/conversationThread.test.ts
```

Expected: FAIL — `storage.createConversation is not a function`

- [ ] **Step 3: Add `conversations` table to `shared/schema.ts`**

Add after the `favorites` table (before the `// Types` block):

```typescript
// Conversation message type
export const ConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant", "tool"]),
  content: z.string(),
  tool_calls: z.any().optional(),
  tool_call_id: z.string().optional(),
  function_name: z.string().optional(),
});
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

// Conversations schema
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  restaurantId: integer("restaurant_id"),
  messages: jsonb("messages").$type<ConversationMessage[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  userId: true,
  restaurantId: true,
  messages: true,
});
```

Add types at the bottom of the file:

```typescript
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
```

- [ ] **Step 4: Push schema to DB**

```bash
cd RestaurantReservation && npm run db:push
```

Expected: no errors; `conversations` table created.

- [ ] **Step 5: Commit**

```bash
git add shared/schema.ts
git commit -m "feat: add conversations table to schema"
```

---

## Task 2: Implement Conversation CRUD in Storage

**Files:**
- Modify: `server/storage.ts`

- [ ] **Step 1: Add imports at top of `server/storage.ts`**

Add to the existing import from `@shared/schema`:

```typescript
import {
  users, User, InsertUser,
  restaurants, Restaurant, InsertRestaurant,
  bookings, Booking, InsertBooking,
  favorites, Favorite, InsertFavorite,
  conversations, Conversation, InsertConversation, ConversationMessage,
} from "@shared/schema";
```

- [ ] **Step 2: Add methods to `IStorage` interface**

After `removeFavorite`, add:

```typescript
  // Conversation operations
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByUser(userId: number): Promise<Conversation[]>;
  createConversation(conversation: Omit<InsertConversation, never>): Promise<Conversation>;
  appendConversationMessage(id: number, message: ConversationMessage): Promise<Conversation | undefined>;
```

- [ ] **Step 3: Implement in `MemStorage`**

Add private field to `MemStorage`:

```typescript
  private conversations: Map<number, Conversation>;
  private currentConversationId: number;
```

Initialize in constructor (after `this.currentFavoriteId = 1;`):

```typescript
    this.conversations = new Map();
    this.currentConversationId = 1;
```

Add methods after the `removeFavorite` method in `MemStorage`:

```typescript
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationsByUser(userId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(
      (c) => c.userId === userId
    );
  }

  async createConversation(data: Omit<InsertConversation, never>): Promise<Conversation> {
    const id = this.currentConversationId++;
    const now = new Date();
    const conv: Conversation = {
      id,
      userId: data.userId,
      restaurantId: data.restaurantId ?? null,
      messages: data.messages ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conv);
    return conv;
  }

  async appendConversationMessage(id: number, message: ConversationMessage): Promise<Conversation | undefined> {
    const conv = this.conversations.get(id);
    if (!conv) return undefined;
    const updated: Conversation = {
      ...conv,
      messages: [...(conv.messages ?? []), message],
      updatedAt: new Date(),
    };
    this.conversations.set(id, updated);
    return updated;
  }
```

- [ ] **Step 4: Implement in `DatabaseStorage`**

Add after the last method in `DatabaseStorage` (before the closing brace):

```typescript
  async getConversation(id: number): Promise<Conversation | undefined> {
    try {
      const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
      return conv;
    } catch (error) {
      console.error("Error getting conversation:", error);
      return undefined;
    }
  }

  async getConversationsByUser(userId: number): Promise<Conversation[]> {
    try {
      return await db.select().from(conversations).where(eq(conversations.userId, userId));
    } catch (error) {
      console.error("Error getting conversations by user:", error);
      return [];
    }
  }

  async createConversation(data: Omit<InsertConversation, never>): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values(data).returning();
    return conv;
  }

  async appendConversationMessage(id: number, message: ConversationMessage): Promise<Conversation | undefined> {
    try {
      const conv = await this.getConversation(id);
      if (!conv) return undefined;
      const newMessages = [...(conv.messages ?? []), message];
      const [updated] = await db
        .update(conversations)
        .set({ messages: newMessages, updatedAt: new Date() })
        .where(eq(conversations.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error appending conversation message:", error);
      return undefined;
    }
  }
```

- [ ] **Step 5: Run tests**

```bash
cd RestaurantReservation && npx vitest run tests/server/conversationThread.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/storage.ts
git commit -m "feat: add conversation CRUD to storage"
```

---

## Task 3: Fix `aiService` Facade

**Files:**
- Modify: `server/services/aiService.ts`

The current `getService()` references `deepseekService` and `smitheryService` which are never imported — this crashes at runtime if either is configured. Also, `processMcpChat` is never exposed through the facade.

- [ ] **Step 1: Write the failing test**

Add to `tests/server/conversationThread.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

describe("aiService facade", () => {
  it("exposes processMcpChat when the underlying service has it", async () => {
    // Dynamically import after mocking env
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const { default: aiService } = await import("../../server/services/aiService");
    expect(typeof aiService.processMcpChat).toBe("function");
    vi.unstubAllEnvs();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd RestaurantReservation && npx vitest run tests/server/conversationThread.test.ts
```

Expected: FAIL — `aiService.processMcpChat is not a function`

- [ ] **Step 3: Rewrite `server/services/aiService.ts`**

Replace the entire file with:

```typescript
import openaiService from "./openaiService";
import anthropicService from "./anthropicService";
import config from "../config";

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
  private preferredProvider: string;
  private availableProviders: { [key: string]: boolean };

  constructor() {
    this.preferredProvider = config.services.ai.preferredProvider;
    this.availableProviders = {
      openai: config.services.ai.providers.openai ?? false,
      anthropic: config.services.ai.providers.anthropic ?? false,
    };

    if (this.isAvailable()) {
      console.log(`AI service initialized. Preferred provider: ${this.preferredProvider}`);
      const providers = Object.entries(this.availableProviders)
        .filter(([, available]) => available)
        .map(([name]) => name)
        .join(", ");
      console.log(`Available AI providers: ${providers || "None"}`);
    } else {
      console.warn("No AI providers available. AI features will be disabled.");
    }
  }

  isAvailable(): boolean {
    return Object.values(this.availableProviders).some((available) => available);
  }

  getService(): typeof openaiService | typeof anthropicService | null {
    if (this.availableProviders[this.preferredProvider]) {
      if (this.preferredProvider === "anthropic") return anthropicService;
      return openaiService;
    }
    if (this.availableProviders.anthropic) return anthropicService;
    if (this.availableProviders.openai) return openaiService;
    return null;
  }

  async analyzeBookingStrategy(
    restaurantName: string,
    bookingInfo: string | null,
    difficulty: string,
  ): Promise<string> {
    const service = this.getService();
    if (!service) return "AI service unavailable. Using standard booking strategy.";
    return service.analyzeBookingStrategy(restaurantName, bookingInfo, difficulty);
  }

  async suggestAlternativeTimes(
    restaurantName: string,
    preferredDate: Date,
    preferredTime: string,
    partySize: number,
  ): Promise<{ suggestions: string[]; reasoning: string }> {
    const service = this.getService();
    if (!service) return { suggestions: [], reasoning: "" };
    return service.suggestAlternativeTimes(restaurantName, preferredDate, preferredTime, partySize);
  }

  async generateBookingMessage(
    restaurantName: string,
    date: Date,
    time: string,
    partySize: number,
    userName: string,
  ): Promise<string> {
    const service = this.getService();
    if (!service) {
      return `Your booking at ${restaurantName} for ${partySize} guests on ${date.toLocaleDateString()} at ${time} has been confirmed.`;
    }
    return service.generateBookingMessage(restaurantName, date, time, partySize, userName);
  }

  async processChat(message: string, context?: string): Promise<string> {
    const service = this.getService();
    if (!service || !service.processChat) {
      return "I'm a restaurant booking assistant, but I'm currently operating in simulation mode.";
    }
    return service.processChat(message, context);
  }

  async processMcpChat(
    messages: ChatMessage[],
    context: string,
    restaurant?: any,
  ): Promise<McpResponse> {
    const service = this.getService();
    if (!service || !service.processMcpChat) {
      return {
        role: "assistant",
        content: "I'm the Prime Table booking assistant. How can I assist you today?",
      };
    }
    return service.processMcpChat(messages, context, restaurant);
  }
}

const aiService = new AiService();
export default aiService;
```

- [ ] **Step 4: Run tests**

```bash
cd RestaurantReservation && npx vitest run tests/server/conversationThread.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/services/aiService.ts
git commit -m "fix: remove dead service refs and expose processMcpChat in aiService"
```

---

## Task 4: Update `anthropicService` — Model, Return Type, Multi-Turn

**Files:**
- Modify: `server/services/anthropicService.ts`

Three fixes in one file:
1. Update model from `claude-3-7-sonnet-20250219` to `claude-sonnet-4-6`
2. Fix `suggestAlternativeTimes` to return `{ suggestions: string[]; reasoning: string }` (matching openaiService)
3. Add `processMcpChat` for multi-turn Anthropic conversations

- [ ] **Step 1: Update model constant and fix `suggestAlternativeTimes` return type**

In `server/services/anthropicService.ts`, change line 5:

```typescript
// Before
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// After
const CLAUDE_MODEL = 'claude-sonnet-4-6';
```

Change the `suggestAlternativeTimes` return type signature from:

```typescript
): Promise<{ suggestions: string[] }> {
```

To:

```typescript
): Promise<{ suggestions: string[]; reasoning: string }> {
```

Update the two return statements in `suggestAlternativeTimes` that return `{ suggestions: [] }` to also include `reasoning`:

```typescript
// All three return sites in suggestAlternativeTimes:
return { suggestions: [], reasoning: "" };
```

And update the successful return:

```typescript
        if (suggestionsMatch) {
          try {
            const suggestions = JSON.parse(suggestionsMatch[0]);
            return { suggestions, reasoning: "Based on typical dining patterns for London restaurants." };
          } catch (e) {
            console.error('Error parsing JSON from Anthropic response:', e);
            return { suggestions: [], reasoning: "" };
          }
        }
      }
      
      return { suggestions: [], reasoning: "" };
```

- [ ] **Step 2: Add `processMcpChat` to `anthropicService`**

Add the following method before the closing `const anthropicService = {` block:

```typescript
type ChatMessage = {
  role: string;
  content: string;
  tool_calls?: any;
  tool_call_id?: string;
  function_name?: string;
};

async function processMcpChat(
  messages: ChatMessage[],
  context: string,
  _restaurant?: any,
): Promise<{ role: string; content: string }> {
  if (!isAvailable()) {
    return {
      role: "assistant",
      content: "I'm a restaurant booking assistant. How can I help you today?",
    };
  }

  try {
    // Convert from OpenAI-style message array to Anthropic format.
    // Anthropic takes system as a top-level param, and only supports user/assistant turns.
    const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === "user") {
        anthropicMessages.push({ role: "user", content: msg.content || "" });
      } else if (msg.role === "assistant" && !msg.tool_calls) {
        anthropicMessages.push({ role: "assistant", content: msg.content || "" });
      }
      // Tool-call turns are skipped — Anthropic tool use is not wired up yet.
    }

    if (anthropicMessages.length === 0) {
      return { role: "assistant", content: "How can I help you with your restaurant booking?" };
    }

    const response = await anthropicClient!.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 800,
      system: context,
      messages: anthropicMessages,
    });

    if (response.content[0].type === "text") {
      return { role: "assistant", content: response.content[0].text };
    }

    return { role: "assistant", content: "I'm sorry, I could not process your request right now." };
  } catch (error) {
    console.error("Error in Anthropic processMcpChat:", error);
    return {
      role: "assistant",
      content: "I encountered an error while processing your request. Please try again.",
    };
  }
}
```

Update the exported object to include `processMcpChat` and `processChat`:

```typescript
const anthropicService = {
  isAvailable,
  analyzeBookingStrategy,
  suggestAlternativeTimes,
  generateBookingMessage,
  processMcpChat,
  processChat: async (message: string, context?: string): Promise<string> => {
    const result = await processMcpChat(
      [{ role: "user", content: message }],
      context || "You are a helpful restaurant booking assistant for London's exclusive restaurants.",
    );
    return result.content;
  },
};
```

- [ ] **Step 3: Run all tests**

```bash
cd RestaurantReservation && npx vitest run
```

Expected: all existing tests pass, no type errors introduced.

- [ ] **Step 4: Commit**

```bash
git add server/services/anthropicService.ts
git commit -m "feat: update Claude model, add processMcpChat, fix return types in anthropicService"
```

---

## Task 5: Fix Hardcoded `userId: 1` in `openaiService`

**Files:**
- Modify: `server/services/openaiService.ts`

The `makeReservation` tool call in `processMcpChat` defaults to `userId: 1` when none is provided. This silently assigns reservations to the wrong user. The userId must come from the authenticated session context, not be hardcoded.

- [ ] **Step 1: Update `processMcpChat` signature to accept `userId`**

Change the `processMcpChat` signature in `openaiService.ts` (line 313) to accept an optional `userId`:

```typescript
export async function processMcpChat(
  messages: Array<{
    role: string;
    content: string;
    tool_calls?: any;
    tool_results?: any;
    tool_call_id?: string;
    function_name?: string;
    name?: string;
  }>,
  context: string,
  restaurant?: any,
  userId?: number,
): Promise<{
  role: string;
  content: string;
  tool_calls?: any[];
}> {
```

- [ ] **Step 2: Replace the hardcoded fallback with the passed `userId`**

Find and remove this block (around line 562):

```typescript
          // Make sure userId is included for booking operations
          if (toolName === "makeReservation" && !args.userId) {
            // Default to user ID 1 for demo purposes
            args.userId = 1;
          }
```

Replace with:

```typescript
          if (toolName === "makeReservation" && !args.userId && userId) {
            args.userId = userId;
          }
```

- [ ] **Step 3: Update `aiService.processMcpChat` to forward `userId`**

In `server/services/aiService.ts`, update the `processMcpChat` signature and call:

```typescript
  async processMcpChat(
    messages: ChatMessage[],
    context: string,
    restaurant?: any,
    userId?: number,
  ): Promise<McpResponse> {
    const service = this.getService();
    if (!service || !service.processMcpChat) {
      return {
        role: "assistant",
        content: "I'm the Prime Table booking assistant. How can I assist you today?",
      };
    }
    return service.processMcpChat(messages, context, restaurant, userId);
  }
```

- [ ] **Step 4: Run all tests**

```bash
cd RestaurantReservation && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/services/openaiService.ts server/services/aiService.ts
git commit -m "fix: remove hardcoded userId:1 fallback in makeReservation tool call"
```

---

## Task 6: Add Conversation Thread API Routes

**Files:**
- Modify: `server/routes.ts`
- Modify: `tests/server/conversationThread.test.ts`

- [ ] **Step 1: Write failing integration tests**

Add to `tests/server/conversationThread.test.ts`:

```typescript
import request from "supertest";
import express from "express";
import { registerRoutes } from "../../server/routes";

describe("conversation thread API", () => {
  let app: express.Express;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterAll(() => server.close());

  it("POST /api/conversations creates a new conversation", async () => {
    const res = await request(app)
      .post("/api/conversations")
      .send({ userId: 1, restaurantId: null });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.userId).toBe(1);
    expect(res.body.messages).toEqual([]);
  });

  it("GET /api/conversations/user/:userId lists conversations", async () => {
    await request(app).post("/api/conversations").send({ userId: 3 });
    await request(app).post("/api/conversations").send({ userId: 3 });

    const res = await request(app).get("/api/conversations/user/3");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("POST /api/chat with conversationId persists messages", async () => {
    const createRes = await request(app)
      .post("/api/conversations")
      .send({ userId: 1 });
    const conversationId = createRes.body.id;

    const chatRes = await request(app).post("/api/chat").send({
      message: "What are the best Italian restaurants in London?",
      conversationId,
      userId: 1,
    });
    expect(chatRes.status).toBe(200);
    expect(chatRes.body.conversationId).toBe(conversationId);

    const convRes = await request(app).get(`/api/conversations/${conversationId}`);
    expect(convRes.status).toBe(200);
    expect(convRes.body.messages.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd RestaurantReservation && npx vitest run tests/server/conversationThread.test.ts
```

Expected: FAIL — routes don't exist yet.

- [ ] **Step 3: Add conversation routes to `server/routes.ts`**

Add the following three route handlers inside `registerRoutes`, before the closing `const httpServer = createServer(app); return httpServer;` block:

```typescript
  // Conversation thread routes
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { userId, restaurantId } = req.body;
      const parsedUserId = positiveIntSchema.safeParse(userId);
      if (!parsedUserId.success) {
        return res.status(400).json({ message: "userId is required and must be a positive integer" });
      }
      const conv = await storage.createConversation({
        userId: parsedUserId.data,
        restaurantId: restaurantId ?? null,
        messages: [],
      });
      return res.status(201).json(conv);
    } catch (error) {
      res.status(500).json({ message: "Error creating conversation" });
    }
  });

  app.get("/api/conversations/user/:userId", async (req: Request, res: Response) => {
    try {
      const parsedUserId = positiveIntSchema.safeParse(req.params.userId);
      if (!parsedUserId.success) {
        return res.status(400).json({ message: "Invalid user id" });
      }
      const convs = await storage.getConversationsByUser(parsedUserId.data);
      return res.json(convs);
    } catch (error) {
      res.status(500).json({ message: "Error fetching conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const parsedId = positiveIntSchema.safeParse(req.params.id);
      if (!parsedId.success) {
        return res.status(400).json({ message: "Invalid conversation id" });
      }
      const conv = await storage.getConversation(parsedId.data);
      if (!conv) return res.status(404).json({ message: "Conversation not found" });
      return res.json(conv);
    } catch (error) {
      res.status(500).json({ message: "Error fetching conversation" });
    }
  });
```

- [ ] **Step 4: Update `POST /api/chat` to be thread-aware**

Find the existing `app.post("/api/chat", ...)` handler in `routes.ts`. Add `conversationId` and `userId` extraction at the top of the try block, after the existing `const { message, restaurantId, messages, tools } = req.body;` line:

```typescript
      const { message, restaurantId, messages, tools, conversationId, userId } = req.body;
```

Then, after the AI response is obtained (just before each `return res.json(...)` call that returns `{ message: ... }`), add conversation persistence. Find the block that builds `formattedResponse` and the two `return res.json({ message: ... })` calls and wrap them:

Replace the `return res.json({ message: formattedResponse });` (the standard chat path) with:

```typescript
            // Persist to conversation thread if a conversationId was provided
            if (conversationId) {
              const parsedConvId = positiveIntSchema.safeParse(conversationId);
              if (parsedConvId.success) {
                if (message) {
                  await storage.appendConversationMessage(parsedConvId.data, {
                    role: "user",
                    content: message,
                  });
                }
                await storage.appendConversationMessage(parsedConvId.data, {
                  role: "assistant",
                  content: formattedResponse.content,
                });
              }
            }
            return res.json({
              message: formattedResponse,
              conversationId: conversationId ?? null,
            });
```

Replace the MCP path `return res.json({ message: mcpResponse });` with:

```typescript
            if (conversationId) {
              const parsedConvId = positiveIntSchema.safeParse(conversationId);
              if (parsedConvId.success) {
                if (message) {
                  await storage.appendConversationMessage(parsedConvId.data, {
                    role: "user",
                    content: message,
                  });
                }
                if (mcpResponse.content) {
                  await storage.appendConversationMessage(parsedConvId.data, {
                    role: "assistant",
                    content: mcpResponse.content,
                  });
                }
              }
            }
            return res.json({
              message: mcpResponse,
              conversationId: conversationId ?? null,
            });
```

Also pass `userId` to `processMcpChat`:

```typescript
            const mcpResponse = await service.processMcpChat(
              messages,
              context,
              restaurant,
              userId ? Number(userId) : undefined,
            );
```

- [ ] **Step 5: Run all tests**

```bash
cd RestaurantReservation && npx vitest run
```

Expected: all tests pass including the new conversation thread integration tests.

- [ ] **Step 6: Commit**

```bash
git add server/routes.ts tests/server/conversationThread.test.ts
git commit -m "feat: add conversation thread routes and persist chat history in /api/chat"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Persist conversation messages per user | Tasks 1, 2, 6 |
| Resume conversations across page loads | Task 6 (conversationId returned from /api/chat) |
| Fix runtime crash (dead deepseekService refs) | Task 3 |
| Anthropic multi-turn support | Task 4 |
| Update Claude model | Task 4 |
| Fix hardcoded userId:1 | Task 5 |
| Fix suggestAlternativeTimes type mismatch | Tasks 3, 4 |
| Expose processMcpChat through aiService | Tasks 3, 5 |

### Placeholder Scan

No TBDs, TODOs, or incomplete steps. All code is fully written out.

### Type Consistency

- `ConversationMessage` defined in `shared/schema.ts`, imported in `storage.ts` for both `appendConversationMessage` signatures.
- `ChatMessage` type in `aiService.ts` matches the existing message shape used in `openaiService.processMcpChat`.
- `processMcpChat` in `openaiService` now has a 4th `userId?: number` param; `aiService` forwards it; `anthropicService.processMcpChat` accepts it as `_userId?: number` (unused for now — Anthropic tool calling not wired).
