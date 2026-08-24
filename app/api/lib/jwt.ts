import { SignJWT, jwtVerify } from "jose";
import { Session } from "@contracts/constants";
import { env } from "./env";

const key = new TextEncoder().encode(env.sessionSecret);

/** Sign a stateless JWT session token (HS256) for the given user id. */
export async function createSessionToken(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + Session.maxAgeMs))
    .sign(key);
}

/**
 * Verify a session token and return its user id, or null when the token is
 * invalid/expired. Cheap so it can run on every request.
 */
export async function readSessionToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const sub = payload.sub;
    return sub ? Number(sub) : null;
  } catch {
    return null;
  }
}
