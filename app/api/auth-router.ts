import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import type { User } from "@db/schema";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, publicQuery } from "./middleware";

/**
 * Auth endpoints are reserved for the upcoming email+password system.
 * While the demo runs without login these return anonymous / no-op results so
 * the frontend contract stays stable.
 */
export const authRouter = createRouter({
  me: publicQuery.query(
    (): Promise<User | null> => Promise.resolve(null),
  ),
  logout: publicQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
