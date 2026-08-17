import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { getClientIpFromRequest } from "./lib/rate-limit";
import { getTaggedIp } from "./lib/ip-context";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  ip: string;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  // Auth is reserved for the upcoming email+password system (see plan.md).
  // Until then every request is anonymous: no session resolution, no Kimi
  // dependency. `user` stays undefined so `authedQuery`/`adminQuery`
  // procedures are rejected with UNAUTHORIZED, keeping the API surface intact.
  return {
    req: opts.req,
    resHeaders: opts.resHeaders,
    ip: getTaggedIp(opts.req) ?? getClientIpFromRequest(opts.req),
  };
}
