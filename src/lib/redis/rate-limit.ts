import { getRedis, isRedisEnabled } from "./client";

export interface RateLimitConfig {
  /** Number of requests allowed per window */
  limit: number;
  /** Window size in seconds */
  windowInSeconds: number;
  /** Optional key prefix for namespacing */
  keyPrefix?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Number of requests remaining in current window */
  remaining: number;
  /** Unix timestamp when the limit resets */
  reset: number;
  /** Total limit per window */
  limit: number;
}

/**
 * Simple in-memory rate limiter for when Redis is disabled (development)
 */
const memoryStore = new Map<string, { count: number; reset: number }>();

function cleanupMemoryStore() {
  const now = Date.now();
  for (const [key, data] of memoryStore.entries()) {
    if (data.reset < now) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Rate limit a request by identifier (IP, userId, etc)
 * Uses Redis if enabled, falls back to in-memory store for development
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, windowInSeconds, keyPrefix = "rl" } = config;
  const key = `${keyPrefix}:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowInSeconds) * windowInSeconds;
  const reset = windowStart + windowInSeconds;

  const redis = getRedis();

  if (redis) {
    // Redis-based rate limiting using sliding window
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowInSeconds);

    const results = await pipeline.exec<[number, number]>();
    const count = results[0];

    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      reset,
      limit,
    };
  }

  // In-memory fallback for development
  cleanupMemoryStore();

  const existing = memoryStore.get(key);
  if (!existing || existing.reset < Date.now()) {
    memoryStore.set(key, {
      count: 1,
      reset: reset * 1000, // Convert to milliseconds for JS Date
    });
    return {
      success: true,
      remaining: limit - 1,
      reset,
      limit,
    };
  }

  existing.count++;
  return {
    success: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    reset: Math.floor(existing.reset / 1000),
    limit,
  };
}

/**
 * Default rate limits for different endpoints
 */
export const defaultLimits: Record<string, RateLimitConfig> = {
  /** For general API routes - 100 requests per minute */
  api: { limit: 100, windowInSeconds: 60 },
  /** For auth routes - 10 requests per minute */
  auth: { limit: 10, windowInSeconds: 60 },
  /** For reservation creation - 5 requests per minute */
  reservation: { limit: 5, windowInSeconds: 60 },
  /** For search - 60 requests per minute */
  search: { limit: 60, windowInSeconds: 60 },
};

/**
 * Get client IP from request headers
 * Works with Vercel, Cloudflare, and standard headers
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  return "unknown";
}
