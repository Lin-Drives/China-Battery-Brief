import type { Context, Next } from "hono";

type WindowState = { count: number; resetAt: number };

/**
 * Fixed-window in-memory rate limiter. Single-process only — enough for the
 * current single-instance deployment; document the swap to a shared store
 * (e.g. Redis) before scaling horizontally.
 */
const windows = new Map<string, WindowState>();
const CLEANUP_INTERVAL_MS = 60_000;
const WINDOW_MAX_ENTRIES = 100_000;

setInterval(
  () => {
    const now = Date.now();
    for (const [key, state] of windows) {
      if (state.resetAt <= now) windows.delete(key);
      if (windows.size > WINDOW_MAX_ENTRIES) break;
    }
  },
  CLEANUP_INTERVAL_MS,
).unref?.();

/** True if the caller is within the limit; false (with retryAfter) otherwise. */
export function checkLimit(
  key: string,
  windowMs: number,
  max: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const state = windows.get(key);
  if (!state || state.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (state.count >= max) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((state.resetAt - now) / 1000)) };
  }
  state.count += 1;
  return { allowed: true, retryAfter: 0 };
}

/**
 * Best-effort client IP. Trusts X-Forwarded-For when present — only safe when
 * a trusted reverse proxy/CDN strips client-supplied XFF; revisit once the
 * deployment topology is fixed (see ../../docs/security.md).
 */
export function getClientIpFromRequest(
  req: Request,
  remoteAddress?: string,
): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return remoteAddress ?? "unknown";
}

export function getClientIp(c: Context): string {
  const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } })
    ?.incoming;
  return getClientIpFromRequest(c.req.raw, incoming?.socket?.remoteAddress);
}

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  prefix: string;
};

/** Hono middleware enforcing a per-IP limit. */
export function rateLimit(opts: RateLimitOptions) {
  return async (c: Context, next: Next) => {
    const key = `${opts.prefix}:${getClientIp(c)}`;
    const { allowed, retryAfter } = checkLimit(key, opts.windowMs, opts.max);
    if (!allowed) {
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Too many requests, please try again later" }, 429);
    }
    await next();
  };
}

export function clearRateLimits() {
  windows.clear();
}
