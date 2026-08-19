import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { env } from "./lib/env";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter: ({ error, shape }) => {
    // Log the real cause, but never leak internal error details to clients
    // in production. TRPCError messages are user-facing and stay as-is.
    if (env.isProduction && !(error instanceof TRPCError)) {
      console.error("[tRPC] unexpected error", error);
      return { ...shape, message: "Internal server error" };
    }
    return shape;
  },
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(role: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);
export const adminQuery = authedQuery.use(requireRole("admin"));
