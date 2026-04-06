import { partySizeSchema, positiveIntSchema } from "../../server/validators";

describe("validators", () => {
  it("accepts positive integer ids", () => {
    const parsed = positiveIntSchema.safeParse("42");
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toBe(42);
    }
  });

  it("rejects invalid ids", () => {
    expect(positiveIntSchema.safeParse("abc").success).toBe(false);
    expect(positiveIntSchema.safeParse("-1").success).toBe(false);
    expect(positiveIntSchema.safeParse("0").success).toBe(false);
  });

  it("enforces party size bounds", () => {
    expect(partySizeSchema.safeParse(1).success).toBe(true);
    expect(partySizeSchema.safeParse(20).success).toBe(true);
    expect(partySizeSchema.safeParse(0).success).toBe(false);
    expect(partySizeSchema.safeParse(21).success).toBe(false);
  });
});
