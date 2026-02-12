import { getRedis, isRedisEnabled } from "./client";

export interface CacheConfig {
  /** TTL in seconds */
  ttl?: number;
  /** Key prefix for namespacing */
  keyPrefix?: string;
}

// In-memory cache for development fallback
const memoryCache = new Map<string, { data: unknown; expiry: number }>();

function cleanupMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiry < now) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Get cached data or fetch and cache it
 * Uses Redis if enabled, falls back to in-memory for development
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig = {}
): Promise<T> {
  const { ttl = 300, keyPrefix = "cache" } = config;
  const fullKey = `${keyPrefix}:${key}`;

  const redis = getRedis();

  if (redis) {
    // Try Redis first
    const cached = await redis.get<string>(fullKey);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // Invalid cache, fetch fresh
      }
    }

    // Fetch and cache
    const data = await fetcher();
    await redis.setex(fullKey, ttl, JSON.stringify(data));
    return data;
  }

  // In-memory fallback for development
  cleanupMemoryCache();

  const cached = memoryCache.get(fullKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }

  // Fetch and cache
  const data = await fetcher();
  memoryCache.set(fullKey, {
    data,
    expiry: Date.now() + ttl * 1000,
  });
  return data;
}

/**
 * Get cached value directly
 */
export async function get<T>(
  key: string,
  keyPrefix = "cache"
): Promise<T | null> {
  const fullKey = `${keyPrefix}:${key}`;
  const redis = getRedis();

  if (redis) {
    const cached = await redis.get<string>(fullKey);
    if (!cached) return null;
    try {
      return JSON.parse(cached) as T;
    } catch {
      return null;
    }
  }

  // In-memory fallback
  const cached = memoryCache.get(fullKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }
  return null;
}

/**
 * Set cache value
 */
export async function set<T>(
  key: string,
  value: T,
  config: CacheConfig = {}
): Promise<void> {
  const { ttl = 300, keyPrefix = "cache" } = config;
  const fullKey = `${keyPrefix}:${key}`;

  const redis = getRedis();

  if (redis) {
    await redis.setex(fullKey, ttl, JSON.stringify(value));
    return;
  }

  // In-memory fallback
  memoryCache.set(fullKey, {
    data: value,
    expiry: Date.now() + ttl * 1000,
  });
}

/**
 * Delete cached value
 */
export async function del(key: string, keyPrefix = "cache"): Promise<void> {
  const fullKey = `${keyPrefix}:${key}`;
  const redis = getRedis();

  if (redis) {
    await redis.del(fullKey);
    return;
  }

  // In-memory fallback
  memoryCache.delete(fullKey);
}

/**
 * Delete multiple cached values by pattern (Redis only)
 * Falls back to exact match on in-memory
 */
export async function delPattern(
  pattern: string,
  keyPrefix = "cache"
): Promise<void> {
  const fullPattern = `${keyPrefix}:${pattern}`;
  const redis = getRedis();

  if (redis) {
    // Upstash Redis supports KEYS command
    const keys = await redis.keys(fullPattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return;
  }

  // In-memory fallback - delete keys that start with pattern
  const prefix = fullPattern.replace("*", "");
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Clear all cache (use with caution!)
 */
export async function clear(keyPrefix = "cache"): Promise<void> {
  const redis = getRedis();

  if (redis) {
    const keys = await redis.keys(`${keyPrefix}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return;
  }

  // In-memory fallback
  for (const key of memoryCache.keys()) {
    if (key.startsWith(`${keyPrefix}:`)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Common TTL presets
 */
export const ttlPresets = {
  /** 1 minute - for frequently changing data */
  short: 60,
  /** 5 minutes - default for most data */
  medium: 300,
  /** 1 hour - for semi-static data */
  long: 3600,
  /** 24 hours - for static/reference data */
  day: 86400,
} as const;
