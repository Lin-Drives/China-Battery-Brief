import type { Context, Next } from "hono";

const PROTECTED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function requestHost(c: Context): string | undefined {
  return (
    c.req.header("x-forwarded-host") ??
    c.req.header("x-original-host") ??
    c.req.header("host")
  );
}

/**
 * Origin check for state-changing requests (defense-in-depth on top of the
 * Lax session cookie). Non-browser clients that omit the Origin header pass
 * through; browsers with a mismatched origin are rejected with 403.
 */
export async function csrfProtect(c: Context, next: Next) {
  if (!PROTECTED_METHODS.has(c.req.method)) {
    return next();
  }
  const origin = c.req.header("origin");
  if (!origin) {
    return next();
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return c.text("Forbidden", 403);
  }
  const host = requestHost(c);
  if (host && originHost === host) {
    return next();
  }
  return c.text("Forbidden", 403);
}
