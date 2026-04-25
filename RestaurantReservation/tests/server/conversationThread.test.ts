import { describe, it, expect, vi } from "vitest";
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

describe("aiService facade", () => {
  it("exposes processMcpChat when the underlying service has it", async () => {
    // Dynamically import after mocking env
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const { default: aiService } = await import("../../server/services/aiService");
    expect(typeof aiService.processMcpChat).toBe("function");
    vi.unstubAllEnvs();
  });
});

import request from "supertest";
import express from "express";
import { registerRoutes } from "../../server/routes";

// Use in-memory storage for the API integration tests (no DATABASE_URL needed)
vi.mock("../../server/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../server/storage")>();
  return { ...actual, storage: new actual.MemStorage() };
});

vi.mock("../../server/services/bookingAgent", () => ({
  bookingAgent: { startBookingProcess: vi.fn(), stopBookingProcess: vi.fn() },
}));

vi.mock("../../server/services/enhancedBookingAgent", () => ({
  enhancedBookingAgent: { startBookingProcess: vi.fn(), stopBookingProcess: vi.fn() },
}));

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
    expect(convRes.body.messages.length).toBeGreaterThanOrEqual(2);
    expect(convRes.body.messages[0].role).toBe("user");
    expect(convRes.body.messages[1].role).toBe("assistant");
  });
});
