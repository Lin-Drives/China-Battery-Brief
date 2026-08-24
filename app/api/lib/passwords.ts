import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb);
const KEY_LEN = 64;

/**
 * Password hashing via Node's built-in scrypt (CPU/memory-hard, no extra
 * dependency, as recommended for a resource-tight VPS). Format: `salt:hash`
 * hex, so each stored value carries its own salt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

/** Constant-time verify against a stored `salt:hash` string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  let expected: Buffer;
  try {
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  const derived = (await scrypt(password, salt, KEY_LEN)) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
