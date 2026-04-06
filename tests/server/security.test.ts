import {
  buildApiLogLine,
  canAccessIntegrationProxy,
  createRateLimiter,
  isAllowedProxyPath,
  sanitizeIntegrationPath,
  summarizeForLog,
} from "../../server/security";

describe("integration security helpers", () => {
  it("rejects unsafe proxy paths", () => {
    expect(sanitizeIntegrationPath("search")).toBe("search");
    expect(sanitizeIntegrationPath("../search")).toBeNull();
    expect(sanitizeIntegrationPath("https://evil.com")).toBeNull();
    expect(isAllowedProxyPath("firecrawl", "search")).toBe(true);
    expect(isAllowedProxyPath("firecrawl", "admin")).toBe(false);
  });

  it("requires a token when one is configured, otherwise only allows localhost", () => {
    expect(
      canAccessIntegrationProxy(
        { hostname: "localhost", headers: {} } as any,
      ),
    ).toBe(true);

    expect(
      canAccessIntegrationProxy(
        { hostname: "api.example.com", headers: { "x-integration-proxy-token": "secret" } } as any,
        "secret",
      ),
    ).toBe(true);

    expect(
      canAccessIntegrationProxy(
        { hostname: "api.example.com", headers: {} } as any,
        "secret",
      ),
    ).toBe(false);
  });

  it("redacts sensitive log fields and truncates large values", () => {
    const summary = summarizeForLog({
      authorization: "Bearer secret",
      nested: {
        password: "top-secret",
      },
      body: "x".repeat(200),
    }) as Record<string, unknown>;

    expect(summary.authorization).toBe("[redacted]");
    expect(summary.nested).toEqual({ password: "[redacted]" });
    expect(String(summary.body)).toContain("[truncated");
  });

  it("builds compact API log lines", () => {
    const logLine = buildApiLogLine({
      method: "POST",
      path: "/api/firecrawl/search",
      statusCode: 200,
      durationMs: 42,
      responseBody: { token: "secret", content: "x".repeat(180) },
    });

    expect(logLine).toContain("POST /api/firecrawl/search 200 in 42ms");
    expect(logLine).toContain("[redacted]");
    expect(logLine).toContain("[truncated");
  });

  it("rate limits repeated integration requests", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    const next = vi.fn();
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    const req = { ip: "127.0.0.1", path: "/api/firecrawl/search" } as any;
    const res = { status } as any;

    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Rate limit exceeded for integration endpoint",
      }),
    );
  });
});
