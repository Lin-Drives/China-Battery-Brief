import * as cookie from "cookie";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ErrorMessages, Session } from "@contracts/constants";
import type { User } from "@db/schema";
import { users } from "@db/schema";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { getSessionCookieOptions } from "./lib/cookies";
import { hashPassword, verifyPassword } from "./lib/passwords";
import { createSessionToken } from "./lib/jwt";
import { env } from "./lib/env";
import { audit } from "./lib/audit";

const credentials = z.object({
  email: z.string().email().max(320).transform((e) => e.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});

/** User shape safe to return to the client (strips passwordHash etc.). */
export type PublicUser = Pick<
  User,
  "id" | "name" | "email" | "role" | "avatar" | "createdAt" | "lastSignInAt"
>;

function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar,
    createdAt: u.createdAt,
    lastSignInAt: u.lastSignInAt,
  };
}

async function setSessionCookie(ctx: { req: Request; resHeaders: Headers }, user: User): Promise<void> {
  const token = await createSessionToken(user.id);
  const opts = getSessionCookieOptions(ctx.req.headers);
  ctx.resHeaders.append(
    "set-cookie",
    cookie.serialize(Session.cookieName, token, {
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      maxAge: Math.floor(Session.maxAgeMs / 1000),
    }),
  );
}

export const authRouter = createRouter({
  me: publicQuery.query(({ ctx }) => (ctx.user ? toPublicUser(ctx.user) : null)),

  /**
   * Create an account and immediately establish a session. The email matching
   * OWNER_EMAIL (if set) is auto-promoted to the admin role on first sign-up.
   */
  register: publicQuery
    .input(
      credentials.extend({
        name: z.string().trim().min(1).max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      if (input.password.length < 8) {
        throw new TRPCError({ code: "BAD_REQUEST", message: ErrorMessages.weakPassword });
      }
      const existing = (await db.select().from(users).where(eq(users.email, input.email)))[0];
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: ErrorMessages.emailTaken });
      }

      const role = env.ownerEmail && input.email === env.ownerEmail ? "admin" : "user";
      const [row] = await db
        .insert(users)
        .values({
          email: input.email,
          passwordHash: await hashPassword(input.password),
          name: input.name ?? null,
          role,
        })
        .$returningId();

      const user = (await db.select().from(users).where(eq(users.id, row.id)))[0];
      await setSessionCookie(ctx, user);
      await audit({
        userId: user.id,
        actorName: user.name ?? user.email,
        action: "auth.register",
        targetType: "user",
        targetId: user.id,
        meta: { email: user.email, role: user.role },
      });
      return toPublicUser(user);
    }),

  login: publicQuery
    .input(credentials)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const user = (await db.select().from(users).where(eq(users.email, input.email)))[0];
      // Same error whether the account is missing or the password is wrong, to
      // avoid leaking which emails are registered.
      if (!user || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: ErrorMessages.invalidCredentials });
      }

      await db.update(users).set({ lastSignInAt: new Date() }).where(eq(users.id, user.id));
      await setSessionCookie(ctx, user);
      await audit({
        userId: user.id,
        actorName: user.name ?? user.email,
        action: "auth.login",
        targetType: "user",
        targetId: user.id,
        meta: { email: user.email },
      });
      return toPublicUser(user);
    }),

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
