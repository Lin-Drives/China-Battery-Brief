import type { Context, Next } from "hono";
import { env } from "./env";
import { getClientIp } from "./rate-limit";

/**
 * Structured request log. Logs the pathname only — never the query string,
 * so the OAuth `code` / `state` never reaches the logs.
 */
export async function requestLogger(c: Context, next: Next) {
  if (!env.isProduction) {
    return next();
  }
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(
    JSON.stringify({
      level: "info",
      ts: new Date().toISOString(),
      ip: getClientIp(c),
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      ms,
    }),
  );
}
