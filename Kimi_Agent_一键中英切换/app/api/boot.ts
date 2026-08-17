import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { requestLogger } from "./lib/request-log";
import { securityHeaders } from "./lib/security-headers";
import { csrfProtect } from "./lib/csrf";
import { rateLimit, getClientIp } from "./lib/rate-limit";
import { tagRequestIp } from "./lib/ip-context";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(requestLogger);
app.use(securityHeaders);
app.use(csrfProtect);

// 2 MB request body cap — issue markdown rarely exceeds a few hundred KB.
app.use(bodyLimit({ maxSize: 2 * 1024 * 1024 }));

app.use(
  "/api/trpc/*",
  rateLimit({ windowMs: 60_000, max: 600, prefix: "trpc" }),
  async (c) => {
    // Resolve the real client IP here (with socket fallback) so tRPC
    // procedures see a non-spoofable address.
    tagRequestIp(c.req.raw, getClientIp(c));
    return fetchRequestHandler({
      endpoint: "/api/trpc",
      req: c.req.raw,
      router: appRouter,
      createContext,
    });
  },
);
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
