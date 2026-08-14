import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";
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
  const ctx: TrpcContext = {
    req: opts.req,
    resHeaders: opts.resHeaders,
    ip: getTaggedIp(opts.req) ?? getClientIpFromRequest(opts.req),
  };
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
  } catch {
    // Authentication is optional here
  }
  return ctx;
}
