import { adminRouter } from "./admin-router";
import { authRouter } from "./auth-router";
import { contentRouter } from "./content-router";
import { meRouter } from "./me-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  content: contentRouter,
  me: meRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
