vi.mock("../../server/services/ai/bookingTools", () => ({
  getBookingTools: vi.fn(() => []),
}));

import {
  summarizeMcpMessagesForLog,
  summarizeTextForLog,
} from "../../server/services/openaiService";

describe("openaiService logging summaries", () => {
  it("truncates large log content previews", () => {
    const preview = summarizeTextForLog("a".repeat(200), 20);

    expect(preview).toBe("aaaaaaaaaaaaaaaaaaaa... [truncated 180 chars]");
  });

  it("summarizes MCP messages without logging full payloads", () => {
    const summary = summarizeMcpMessagesForLog([
      {
        role: "tool",
        content: "x".repeat(220),
        tool_call_id: "call_123",
        function_name: "search_restaurants",
      },
      {
        role: "assistant",
        content: "Done",
        tool_calls: [{ id: "call_1" }, { id: "call_2" }],
      },
    ]);

    expect(summary).toEqual([
      expect.objectContaining({
        role: "tool",
        tool_call_id: "call_123",
        name: "search_restaurants",
      }),
      expect.objectContaining({
        role: "assistant",
        tool_calls_count: 2,
        content_preview: "Done",
      }),
    ]);
    expect(String(summary[0].content_preview)).toContain("[truncated");
  });
});
