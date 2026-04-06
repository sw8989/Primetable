import { apiRequest } from "../../client/src/lib/queryClient";

describe("apiRequest", () => {
  it("uses method-first signature and sends payload JSON", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await apiRequest("POST", "/api/test", { hello: "world" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      }),
    );
  });

  it("throws for non-ok responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("nope", { status: 400, statusText: "Bad Request" }),
    );

    await expect(apiRequest("GET", "/api/fail")).rejects.toThrow("400:");
  });
});
