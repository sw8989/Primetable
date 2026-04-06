import {
  compactMessagesForChat,
  compactToolResultPayload,
  truncateText,
} from "../../client/src/lib/mcp/MCPXClient";

describe("MCPX payload compaction", () => {
  it("truncates oversized text with an explicit marker", () => {
    expect(truncateText("abcdef", 4)).toBe("abcd... [truncated 2 chars]");
    expect(truncateText("abc", 4)).toBe("abc");
  });

  it("caps large tool result arrays and preserves total counts", () => {
    const result = compactToolResultPayload({
      restaurants: [
        { name: "A", description: "x".repeat(20) },
        { name: "B", description: "y".repeat(20) },
        { name: "C", description: "z".repeat(20) },
        { name: "D", description: "w".repeat(20) },
      ],
      html: "<div>" + "a".repeat(2_000) + "</div>",
    }) as Record<string, unknown>;

    expect(result.restaurantsCount).toBe(4);
    expect(result.restaurantsTruncated).toBe(true);
    expect(Array.isArray(result.restaurants)).toBe(true);
    expect((result.restaurants as unknown[])).toHaveLength(3);
    expect(String(result.html)).toContain("[truncated");
  });

  it("compacts message content before chat requests", () => {
    const messages = compactMessagesForChat([
      {
        role: "tool",
        content: "a".repeat(2_200),
        tool_call_id: "call_1",
        function_name: "search_restaurants",
      },
    ]);

    expect(messages[0].content.length).toBeLessThan(2_200);
    expect(messages[0].content).toContain("[truncated");
  });
});
