import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import * as cookie from "cookie";
import { eq } from "drizzle-orm";
import { Session } from "@contracts/constants";
import type { User } from "@db/schema";
import { users } from "@db/schema";
import { getDb } from "./queries/connection";
import { getClientIpFromRequest } from "./lib/rate-limit";
import { getTaggedIp } from "./lib/ip-context";
import { readSessionToken } from "./lib/jwt";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  ip: string;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const req = opts.req;

  // Resolve the `cbb_sid` session cookie (if any) into a full user row. A
  // missing/expired token leaves `user` undefined, so `authedQuery`/`adminQuery`
  // correctly reject with UNAUTHORIZED.
  let user: User | undefined;
  const jar = cookie.parse(req.headers.get("cookie") ?? "");
  const token = jar[Session.cookieName];
  if (token) {
    const userId = await readSessionToken(token);
    if (userId) {
      user = (await getDb().select().from(users).where(eq(users.id, userId)))[0];
    }
  }

  return {
    req,
    resHeaders: opts.resHeaders,
    user,
    ip: getTaggedIp(req) ?? getClientIpFromRequest(req),
  };
}
