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
