// Fixed-window in-memory rate limiter for the Action endpoints.
//
// State lives in one server instance. That is enough to stop casual abuse of
// the fee-payer relayer; on multi-instance or serverless deployments, back
// this with a shared store (e.g. Redis/Upstash) before a public launch.

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

const PURGE_THRESHOLD = 5_000;
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (buckets.size > PURGE_THRESHOLD) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function resetRateLimits() {
  buckets.clear();
}
