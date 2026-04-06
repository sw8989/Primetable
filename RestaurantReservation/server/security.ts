import type { NextFunction, Request, Response } from "express";

export const MAX_API_BODY_SIZE = "256kb";
export const INTEGRATION_PROXY_TIMEOUT_MS = 10_000;

const LOG_PREVIEW_CHARS = 160;
const MAX_LOG_ARRAY_ITEMS = 5;
const MAX_LOG_OBJECT_KEYS = 10;
const LOCAL_PROXY_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const SENSITIVE_KEYS = new Set([
  "apiKey",
  "authorization",
  "cookie",
  "password",
  "secret",
  "token",
  "x-firecrawl-api-key",
  "x-integration-proxy-token",
  "x-serper-api-key",
  "x-smithery-api-key",
]);

const ALLOWED_PROXY_PATHS: Record<"firecrawl" | "smithery", Set<string>> = {
  firecrawl: new Set(["scrape", "search", "test"]),
  smithery: new Set(["scrape", "search", "test"]),
};

function truncateText(value: string, maxChars = LOG_PREVIEW_CHARS): string {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}... [truncated ${value.length - maxChars} chars]`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function summarizeForLog(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return truncateText(value);
  }

  if (depth >= 2) {
    return "[truncated nested payload]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_LOG_ARRAY_ITEMS).map((item) => summarizeForLog(item, depth + 1));
  }

  if (!isPlainObject(value)) {
    return truncateText(String(value));
  }

  const entries = Object.entries(value);
  const summary: Record<string, unknown> = {};

  for (const [index, [key, entryValue]] of entries.entries()) {
    if (index >= MAX_LOG_OBJECT_KEYS) {
      summary._truncated = true;
      summary._omittedKeys = entries.length - MAX_LOG_OBJECT_KEYS;
      break;
    }

    summary[key] = SENSITIVE_KEYS.has(key) ? "[redacted]" : summarizeForLog(entryValue, depth + 1);
  }

  return summary;
}

export function buildApiLogLine(input: {
  durationMs: number;
  method: string;
  path: string;
  responseBody?: unknown;
  statusCode: number;
}): string {
  const parts = [
    input.method,
    input.path,
    String(input.statusCode),
    `in ${input.durationMs}ms`,
  ];

  if (typeof input.responseBody !== "undefined") {
    parts.push(`:: ${JSON.stringify(summarizeForLog(input.responseBody))}`);
  }

  return truncateText(parts.join(" "), 240);
}

export function sanitizeIntegrationPath(path: string): string | null {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return null;
  }

  if (normalized.includes("..") || normalized.includes("://")) {
    return null;
  }

  if (!/^[a-zA-Z0-9/_-]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function isAllowedProxyPath(provider: "firecrawl" | "smithery", path: string): boolean {
  return ALLOWED_PROXY_PATHS[provider].has(path);
}

export function canAccessIntegrationProxy(
  requestLike: Pick<Request, "headers" | "hostname">,
  proxyToken?: string,
): boolean {
  if (proxyToken) {
    return requestLike.headers["x-integration-proxy-token"] === proxyToken;
  }

  return LOCAL_PROXY_HOSTS.has(requestLike.hostname);
}

export function buildSafeHeadersForLog(headers: Request["headers"]): Record<string, unknown> {
  const safeHeaders: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(headers)) {
    safeHeaders[key] = SENSITIVE_KEYS.has(key) ? "[redacted]" : summarizeForLog(value);
  }

  return safeHeaders;
}

export function createRateLimiter(options: { max: number; windowMs: number }) {
  const requestCounts = new Map<string, { count: number; windowStart: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = `${req.ip || "unknown"}:${req.path}`;
    const now = Date.now();
    const entry = requestCounts.get(identifier);

    if (!entry || now - entry.windowStart >= options.windowMs) {
      requestCounts.set(identifier, { count: 1, windowStart: now });
      return next();
    }

    if (entry.count >= options.max) {
      return res.status(429).json({
        success: false,
        error: "Rate limit exceeded for integration endpoint",
      });
    }

    entry.count += 1;
    return next();
  };
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = INTEGRATION_PROXY_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function toProxyErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "Upstream request timed out";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown integration proxy error";
}
