# Redis Integration

This module provides Redis-based caching and rate limiting with automatic fallback to in-memory storage when Redis is disabled.

## Environment Variables

```bash
# Enable/disable Redis
USE_REDIS=false

# Upstash Redis credentials (required if USE_REDIS=true)
UPSTASH_REDIS_REST_URL=https://your-project.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

## Usage

### Rate Limiting (Already Applied)

Rate limiting is automatically applied via middleware to all API routes:

- `/api/auth/*` - 10 req/min
- `/api/*` (general) - 100 req/min

### Caching

```typescript
import { del, getOrSet, ttlPresets } from "@/lib/redis";

// Cache expensive database query
const cars = await getOrSet(
  `cars:${locationId}`,
  () => fetchCarsFromDB(locationId),
  { ttl: ttlPresets.medium } // 5 minutes
);

// Invalidate cache when data changes
await del(`cars:${locationId}`);
```

### Manual Rate Limiting

```typescript
import { defaultLimits, rateLimit } from "@/lib/redis";

const result = await rateLimit(userId, defaultLimits.reservation);
if (!result.success) {
  return { error: "Too many requests" };
}
```

## When Redis is Disabled (USE_REDIS=false)

- Rate limiting uses in-memory Map (resets on restart)
- Caching uses in-memory Map (resets on restart)
- Perfect for development
