import type { CookieOptions } from "hono/utils/cookie";

function isLocalhost(headers: Headers): boolean {
  const host = headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const localhost = isLocalhost(headers);

  return {
    httpOnly: true,
    path: "/",
    // Same-origin SPA + API. "None" previously allowed cross-site POSTs to
    // carry the session cookie — a CSRF vector. "Lax" keeps auth working
    // while blocking cross-site state changes.
    sameSite: "Lax",
    secure: !localhost,
  };
}
