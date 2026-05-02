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
