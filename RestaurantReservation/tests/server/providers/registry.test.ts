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
