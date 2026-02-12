import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

import { defaultLimits, getClientIp, rateLimit } from "@/lib/redis";
import { isRedisEnabled } from "@/lib/redis/client";

/**
 * Rate limiting middleware
 * Only applies rate limiting when USE_REDIS=true
 * Falls back to in-memory store in development
 */
export async function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip = getClientIp(request.headers);
  const pathname = request.nextUrl.pathname;

  // Determine rate limit based on endpoint
  let limitConfig = defaultLimits.api;

  if (pathname.includes("/api/auth")) {
    limitConfig = defaultLimits.auth;
  } else if (pathname.includes("/reservation")) {
    limitConfig = defaultLimits.reservation;
  }

  // Apply rate limiting
  const result = await rateLimit(ip, {
    ...limitConfig,
    keyPrefix: "mw",
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.reset),
        },
      }
    );
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.reset));

  return response;
}

export const config = {
  matcher: [
    // Apply to all API routes
    "/api/:path*",
  ],
};
