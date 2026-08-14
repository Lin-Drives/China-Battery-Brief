import { randomBytes } from "crypto";

type OAuthStateEntry = { redirectUri: string; expiresAt: number };

const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_STATES = 10_000;
const states = new Map<string, OAuthStateEntry>();

function prune() {
  const now = Date.now();
  for (const [nonce, entry] of states) {
    if (entry.expiresAt <= now) states.delete(nonce);
    if (states.size > MAX_STATES) break;
  }
}

/** Issue a single-use, time-boxed OAuth state nonce bound to a redirect URI. */
export function issueOAuthState(redirectUri: string): string {
  prune();
  if (states.size >= MAX_STATES) {
    states.clear();
  }
  const nonce = randomBytes(24).toString("hex");
  states.set(nonce, { redirectUri, expiresAt: Date.now() + STATE_TTL_MS });
  return nonce;
}

/**
 * Validate and atomically consume a state nonce. Returns the redirect URI it
 * was bound to, or null if the state is missing, expired or already used.
 */
export function consumeOAuthState(nonce: string): string | null {
  const entry = states.get(nonce);
  if (!entry || entry.expiresAt <= Date.now()) {
    states.delete(nonce);
    return null;
  }
  states.delete(nonce);
  return entry.redirectUri;
}
