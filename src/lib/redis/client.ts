import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

/**
 * Redis client for caching and rate limiting.
 * Only initialized if USE_REDIS=true and credentials are provided.
 */
let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!env.USE_REDIS) return null;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn(
      "Redis is enabled but missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN"
    );
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return redis;
}

/**
 * Check if Redis is available and configured
 */
export function isRedisEnabled(): boolean {
  return (
    env.USE_REDIS &&
    !!env.UPSTASH_REDIS_REST_URL &&
    !!env.UPSTASH_REDIS_REST_TOKEN
  );
}
