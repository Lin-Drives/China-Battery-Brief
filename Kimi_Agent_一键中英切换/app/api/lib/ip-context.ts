/**
 * Request-scoped client IP for tRPC procedures.
 *
 * The tRPC fetch adapter only exposes the raw Request (no socket address), and
 * trusting a client-sendable header would let attackers spoof the IP. Instead,
 * the Hono layer resolves the real IP (with socket fallback) and tags the
 * Request object here before handing it to tRPC. Not spoofable via headers.
 */
const ipByRequest = new WeakMap<Request, string>();

export function tagRequestIp(req: Request, ip: string): void {
  ipByRequest.set(req, ip);
}

export function getTaggedIp(req: Request): string | undefined {
  return ipByRequest.get(req);
}
