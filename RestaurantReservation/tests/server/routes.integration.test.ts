import { EventEmitter } from "events";
import express, { Express } from "express";
import httpMocks from "node-mocks-http";

const storageMock = {
  getUserByUsername: vi.fn(),
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  getRestaurants: vi.fn(),
  searchRestaurants: vi.fn(),
  getRestaurant: vi.fn(),
  filterRestaurants: vi.fn(),
  createBooking: vi.fn(),
  getBookingsByUser: vi.fn(),
  getBookingsWithRestaurantByUser: vi.fn(),
  getBooking: vi.fn(),
  updateBooking: vi.fn(),
  createFavorite: vi.fn(),
  getFavoritesByUser: vi.fn(),
  getFavoritesWithRestaurantByUser: vi.fn(),
  removeFavorite: vi.fn(),
};

vi.mock("../../server/storage", () => ({
  storage: storageMock,
}));

vi.mock("../../server/services/bookingAgent", () => ({
  bookingAgent: { startBookingProcess: vi.fn(), stopBookingProcess: vi.fn() },
}));

vi.mock("../../server/services/enhancedBookingAgent", () => ({
  enhancedBookingAgent: { startBookingProcess: vi.fn(), stopBookingProcess: vi.fn() },
}));

vi.mock("../../server/services/aiService", () => ({
  default: { getService: vi.fn(() => null) },
}));

const getApp = async (): Promise<Express> => {
  const app = express();
  const { registerRoutes } = await import("../../server/routes");
  await registerRoutes(app);
  return app;
};

const invoke = async (
  app: Express,
  method: string,
  url: string,
  options?: { query?: Record<string, unknown>; body?: unknown; headers?: Record<string, string> },
) => {
  const req = httpMocks.createRequest({
    method,
    url,
    query: options?.query ?? {},
    body: options?.body,
    headers: options?.headers ?? {},
  });
  const res = httpMocks.createResponse({ eventEmitter: EventEmitter });

  await new Promise<void>((resolve) => {
    res.on("end", resolve);
    app.handle(req, res);
  });

  return res;
};

describe("routes integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.searchRestaurants.mockResolvedValue([]);
    storageMock.getBookingsWithRestaurantByUser.mockResolvedValue([]);
    storageMock.getFavoritesWithRestaurantByUser.mockResolvedValue([]);
  });

  it("uses query param for restaurant search", async () => {
    const app = await getApp();
    const res = await invoke(app, "GET", "/api/restaurants/search", {
      query: { query: "soho" },
    });

    expect(res.statusCode).toBe(200);
    expect(storageMock.searchRestaurants).toHaveBeenCalledWith("soho");
  });

  it("rejects invalid booking user id", async () => {
    const app = await getApp();
    const res = await invoke(app, "GET", "/api/bookings/user/not-a-number");

    expect(res.statusCode).toBe(400);
    expect(storageMock.getBookingsWithRestaurantByUser).not.toHaveBeenCalled();
  });

  it("uses batched bookings-with-restaurant storage method", async () => {
    const app = await getApp();
    const res = await invoke(app, "GET", "/api/bookings/user/12");

    expect(res.statusCode).toBe(200);
    expect(storageMock.getBookingsWithRestaurantByUser).toHaveBeenCalledWith(12);
  });

  it("uses batched favorites-with-restaurant storage method", async () => {
    const app = await getApp();
    const res = await invoke(app, "GET", "/api/favorites/user/9");

    expect(res.statusCode).toBe(200);
    expect(storageMock.getFavoritesWithRestaurantByUser).toHaveBeenCalledWith(9);
  });

  it("returns 400 for unknown MCP tool", async () => {
    const app = await getApp();
    const res = await invoke(app, "POST", "/api/mcp/tool-call", {
      body: { tool: "unknown_tool", parameters: {} },
    });

    expect(res.statusCode).toBe(400);
  });

  it("rejects unsupported smithery proxy paths", async () => {
    const app = await getApp();
    const res = await invoke(app, "GET", "/api/smithery-proxy/admin", {
      headers: { host: "localhost" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("rejects firecrawl proxy access from non-local hosts without a proxy token", async () => {
    const app = await getApp();
    const res = await invoke(app, "POST", "/api/firecrawl/test", {
      headers: { host: "api.example.com" },
    });

    expect(res.statusCode).toBe(401);
  });
});
