import type { Context, Next } from "hono";
import { env } from "./env";

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

function isHttps(c: Context): boolean {
  const proto = c.req.header("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return c.req.url.startsWith("https:");
}

export async function securityHeaders(c: Context, next: Next) {
  // Set headers AFTER next() so they also apply to raw Responses returned by
  // the tRPC fetch adapter (Hono only merges pre-next() c.header() calls for
  // its own response helpers).
  await next();

  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );

  // API responses must never be cached (auth/entitlement sensitive).
  if (c.req.path.startsWith("/api/")) {
    c.header("Cache-Control", "no-store");
  }

  if (env.isProduction) {
    c.header("Content-Security-Policy", CSP);
    if (isHttps(c)) {
      c.header(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
    }
  }
}
