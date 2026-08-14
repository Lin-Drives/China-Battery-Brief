# China Battery Brief

A bilingual (English/Chinese, one-click toggle) weekly intelligence newsletter about China's battery industry going global. Every issue covers three pillars:

- **Overseas expansion** — where Chinese battery makers are building factories abroad
- **Tech routes** — LFP vs solid-state, and the chemistry that actually wins
- **Geopolitics & policy** — IRA / §45X / FEOC, EU Battery Passport, export controls

Business model: paid subscription tiers — Free / Pro ($19/mo) / Desk ($499/mo). The repo ships 4 sample issues (№044–047) in English and Chinese, seeded from a fact-checked research base.

---

## Tech stack

### Frontend — React 19 SPA
| Layer | Choice |
|---|---|
| Framework | React 19 · TypeScript · Vite 7 |
| Routing | react-router 7 |
| Styling | Tailwind CSS 3 · shadcn/ui-style components on Radix UI (full suite) |
| UI animation | GSAP 3 + ScrollTrigger (`src/lib/gsap.ts`) · Lenis smooth scroll · framer-motion |
| Data fetching | TanStack Query 5 + tRPC 11 client (superjson) |
| Visualization | d3-geo (world map) · react-three-fiber / three (hero particle map) · recharts |
| Content rendering | react-markdown + remark-gfm |
| i18n | Self-built (`src/i18n/`): flat dot-key dicts `en.ts` / `zh.ts`, `zh` falls back to `en`, then to the key |

### Backend — Hono + tRPC, single process
| Layer | Choice |
|---|---|
| HTTP server | Hono 4 (`@hono/node-server`) — serves both static assets and `/api/*` in one process |
| RPC | tRPC 11 (`@trpc/server` fetch adapter) · superjson serialization |
| Routers | `auth` · `content` · `billing` · `me` · `admin` · `ping` |
| Authz | `publicQuery` → `authedQuery` → `adminQuery` (`api/middleware.ts`) |
| Auth | Platform Kimi OAuth: auth-code → JWKS verify (jose) → JWT session cookie `kimi_sid` |
| Validation | zod 4 |
| Paywall | **Server-enforced**: `content.issues.bySlug` returns only ~40% of body to unauthorized readers (server-side truncation, not a client overlay) |

### Data — Drizzle ORM + MySQL
| Layer | Choice |
|---|---|
| ORM | Drizzle ORM 0.45 + drizzle-kit (MySQL, `mysql2` driver, planetscale mode) |
| Database | MySQL 8 · 13 tables: users · issues (with `*Zh` bilingual fields) · plans · subscriptions · payments · factories · policy_events · ticker_items · saved_briefs · alerts · api_keys · email_subscribers · audit_logs |
| Seeding | `db/seed.ts` — idempotent, reads EN (`db/seed-content/`) + ZH (`db/seed-content-zh/`) markdown + JSON metadata |

### Tooling
Vitest 4 · ESLint 9 (flat config) · Prettier 3 · tsx (seed scripts) · TypeScript 5.9 (strict, 3 project refs)

---

## Repository layout

```
├── Kimi_Agent_一键中英切换/
│   └── app/                  ← the buildable npm project (the actual codebase)
│       ├── src/              frontend (React SPA)
│       ├── api/              backend (Hono + tRPC, Node runtime)
│       ├── db/               Drizzle schema, relations, seed script + seed content
│       ├── contracts/        shared constants / types / errors (front + back)
│       ├── public/           static assets (covers, logos)
│       └── package.json / vite.config.ts / drizzle.config.ts / ...
│   └── china-battery-brief/  delivery docs: README.md (authoritative) + plan.md
├── seed-content/             EN issue source copies (№044–047)
├── seed-content-zh/          ZH issue source copies
├── info.md                   research fact base (every fact sourced & dated)
├── AGENTS.md                 repo & coding conventions for AI agents
└── README.md                 this file
```

---

## Development

All commands run from `Kimi_Agent_一键中英切换/app/`:

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Vite dev server (:3000) with Hono API in the same process (HMR covers both) |
| `npm run build` | `vite build` → `dist/public/` + esbuild bundles `api/boot.ts` → `dist/boot.js` |
| `npm start` | Production run: `NODE_ENV=production node dist/boot.js` (port 3000) |
| `npm run check` | Type check `tsc -b` (the gate before committing) |
| `npm run lint` / `format` | ESLint / Prettier |
| `npm test` | Vitest (currently no tests yet) |
| `npm run db:start` / `db:seed` | Start bundled MySQL (`../.local-mysql`) / reseed (idempotent) |
| `npm run db:backup` / `db:restore` | Dump DB + assets snapshot to `../backups/db/` (retain N) / restore from a dump |

Environment: see `Kimi_Agent_一键中英切换/app/.env.example`. Key vars: `DATABASE_URL`, `APP_ID`/`APP_SECRET` (Kimi OAuth), `KIMI_AUTH_URL`/`KIMI_OPEN_URL`, `OWNER_UNION_ID` (first log-in becomes admin).

> `.env` contains secrets — never commit it.

---

## Deployment

The app is a **single Node process** (Hono serves `dist/public` + the API), so any host that runs Node and can reach a MySQL database works:

- Build: `npm run build`
- Run: `npm start` (set `DATABASE_URL` to a reachable MySQL, run `npm run db:seed` once)
- Suggested free stack: **Render free web service** (Node) + **TiDB Cloud Serverless** (100% MySQL-compatible free tier). Swapping DB hosts later is just a `DATABASE_URL` change + reseed — the schema is standard MySQL and the seed is idempotent.

Beta switch: `OpenAccess.beta` in `contracts/constants.ts` (`true` = every brief free to all readers, paywall/teasers off; flip to `false` to restore the paywall).

## Security

Production-grade hardening is built in (rate limiting, security headers + CSP/HSTS, CSRF Origin check, OAuth state nonces, audit log table, backup scripts, request/error logging). **Deployment-topology items to re-verify once the hosting is chosen** (trusted proxy for `X-Forwarded-For`, HTTPS/HSTS, OAuth redirect allowlist) — see `Kimi_Agent_一键中英切换/china-battery-brief/security.md` (Chinese runbook + incident response).

---

## Real vs mock (honest boundaries)

| Capability | Status |
|---|---|
| Content / factory / policy data, login, permissions, paywall truncation | **Real** (DB-backed, seeded from researched facts) |
| Payment checkout | **Mock** — Stripe-shaped interface; swap point: `checkout` in `api/billing-router.ts` |
| Email delivery (weekly blast / transactional) | **Not implemented** (`subscribe.email` only persists) |
| CSV export, reading progress | Frontend gate / localStorage placeholders |

---

## Docs

- `Kimi_Agent_一键中英切换/china-battery-brief/README.md` — delivery notes (authoritative, in Chinese)
- `Kimi_Agent_一键中英切换/china-battery-brief/plan.md` — execution blueprint
- `Kimi_Agent_一键中英切换/china-battery-brief/security.md` — security architecture + incident response runbook (Chinese)
- `info.md` — research fact base (sources + dates)
- `AGENTS.md` — coding & i18n conventions
