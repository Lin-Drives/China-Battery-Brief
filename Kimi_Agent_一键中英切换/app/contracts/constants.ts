export const Session = {
  cookieName: "cbb_sid",
  maxAgeMs: 365 * 24 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
} as const;

export const Paths = {
  login: "/login",
} as const;

/**
 * Closed-beta switch: while `true`, every brief is fully open to all readers
 * (限时免费全量浏览) and the pricing page carries a beta notice instead of a
 * hard sell. Set to `false` to re-enable the paywall.
 */
export const OpenAccess = { beta: true } as const;
