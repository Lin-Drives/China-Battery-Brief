import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  // Never expose dotfiles / source maps / tool configs to the public web.
  app.use("*", async (c, next) => {
    const url = new URL(c.req.url);
    const segs = url.pathname.split("/");
    if (segs.some((s) => s.startsWith(".") || s.startsWith("_"))) {
      return c.text("Not Found", 404);
    }
    await next();
  });

  // Vite emits content-hashed files under /assets/ — safe to cache forever;
  // Cloudflare only edge-caches responses carrying explicit Cache-Control.
  app.use("*", async (c, next) => {
    await next();
    if (c.req.path.startsWith("/assets/")) {
      c.header("Cache-Control", "public, max-age=31536000, immutable");
    }
  });

  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.resolve(distPath, "index.html");
    const content = fs.readFileSync(indexPath, "utf-8");
    // The HTML shell references hashed assets by name — always revalidate so
    // a new deploy is picked up immediately.
    c.header("Cache-Control", "no-cache");
    return c.html(content);
  });
}
