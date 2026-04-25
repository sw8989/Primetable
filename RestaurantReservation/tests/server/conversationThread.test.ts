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
