import { NextRequest } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

// Global in-memory storage to survive hot reloads in dev mode
const globalAny = global as any;
if (!globalAny.rateLimitMap) {
  globalAny.rateLimitMap = new Map<string, RateLimitRecord>();
}
const rateLimitMap: Map<string, RateLimitRecord> = globalAny.rateLimitMap;

/**
 * Checks if a key exceeds the rate limit (max attempts within windowMs).
 */
export function checkRateLimit(key: string, limit: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record) {
    return true; // Not limited
  }

  // Filter timestamps to only keep ones within the sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= limit) {
    return false; // Rate limit exceeded
  }

  return true;
}

/**
 * Increments the rate limit count for a key.
 */
export function incrementRateLimit(key: string) {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record) {
    rateLimitMap.set(key, { timestamps: [now] });
  } else {
    record.timestamps.push(now);
  }
}

/**
 * Resets the rate limit count for a key.
 */
export function resetRateLimit(key: string) {
  rateLimitMap.delete(key);
}

/**
 * Resolves the client IP address from request headers.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "127.0.0.1";
}
