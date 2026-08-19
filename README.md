# China Battery Brief

A bilingual (English/Chinese, one-click toggle) weekly intelligence newsletter about China's battery industry going global. Every issue covers three pillars:

- **Overseas expansion** — where Chinese battery makers are building factories abroad
- **Tech routes** — LFP vs solid-state, and the chemistry that actually wins
- **Geopolitics & policy** — IRA / §45X / FEOC, EU Battery Passport, export controls

> 🔗 **Live site: https://chinabatterybrief.com** — self-hosted (VPS + Nginx + Cloudflare + MariaDB). See [Deployment](#deployment).

Business model: paid subscription tiers — Free / Pro ($19/mo) / Desk ($499/mo). The repo ships 7 sample issues (No. 044–050) in English and Chinese, seeded from a fact-checked research base.

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
| Auth | **No login (demo)**: whole site anonymous-readable, `auth.*` reserved as stubs — legacy Kimi OAuth removed (email+password auth is queue B in `plan.md`) |
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
├── app/                      ← the buildable npm project (the actual codebase)
│   ├── src/                  frontend (React SPA)
│   ├── api/                  backend (Hono + tRPC, Node runtime)
│   ├── db/                   Drizzle schema, relations, seed script + seed content
│   ├── contracts/            shared constants / types / errors (front + back)
│   ├── public/               static assets (covers, logos)
│   └── package.json / vite.config.ts / drizzle.config.ts / ...
├── docs/                     delivery docs: README.md (authoritative) + plan.md + deploy.md + security.md
├── dev/                      dev tooling & notes: devboard.mjs/html, workspace file
├── backups/                  backup dumps: local dev (db/) + offsite prod archive (pull/)
├── info.md                   research fact base (every fact sourced & dated)
├── AGENTS.md                 repo & coding conventions for AI agents
└── README.md                 this file
```

---

## Development

All commands run from `app/`:

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
| `npm run db:backup` / `db:restore` | Dump DB + assets snapshot to `../backups/db/` (DB retain 7, assets retain 3) / restore from a dump |

Environment: see `app/.env.example`. Key vars: `DATABASE_URL` (MySQL), `MYSQL_BIN`/`BACKUP_ROOT` (backup overrides), `APP_SECRET` (reserved for the upcoming email+password auth).

> `.env` contains secrets — never commit it.

---

## Deployment

**Live now (self-hosted)**: VPS (DigitalOcean) + Nginx reverse proxy + Cloudflare CDN + on-box MariaDB. Topology and runbook: `docs/deploy.md` (DNS, Nginx XFF trust, HTTPS/HSTS, backup cron, migration & rollback). Note the SSL mode is **Flexible** (CF↔VPS leg is plain HTTP) — full end-to-end HTTPS upgrade is tracked in `plan.md` queue E.

**Backups (dual track)**: VPS cron backs up daily (DB retain 7, assets retain 3 — short fast-recovery window, `/opt/cbb/backups`), and this machine's launchd job (`com.cbb.pull-backup`, 21:00 local) pulls the newest artifacts to `backups/pull/` (retain 90 days) as the offsite archive. Manual: `bash app/scripts/pull-backup.sh`.

The app itself is a **single Node process** (Hono serves `dist/public` + the API), so any host that runs Node and can reach a MySQL database works: build with `npm run build`, run with `npm start` (set `DATABASE_URL`, run `npm run db:seed` once). Swapping DB hosts later is just a `DATABASE_URL` change + reseed — schema is standard MySQL and the seed is idempotent.

Beta switch: `OpenAccess.beta` in `contracts/constants.ts` (`true` = every brief free to all readers, paywall/teasers off; flip to `false` to restore the paywall).

## Security

Production-grade hardening is built in (rate limiting, security headers + CSP/HSTS, CSRF Origin check, OAuth state nonces, audit log table, backup scripts, request/error logging). **Deployment-topology items to re-verify once the hosting is chosen** (trusted proxy for `X-Forwarded-For`, HTTPS/HSTS, OAuth redirect allowlist) — see `docs/security.md` (Chinese runbook + incident response). Self-hosted form: checklist in `docs/deploy.md` §四.

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

- `docs/README.md` — delivery notes (authoritative, in Chinese)
- `docs/plan.md` — execution blueprint
- `docs/deploy.md` — self-hosted deployment runbook (VPS + Nginx + Cloudflare, live)
- `docs/security.md` — security architecture + incident response runbook (Chinese)
- `info.md` — research fact base (sources + dates)
- `AGENTS.md` — coding & i18n conventions
- `dev/devboard.mjs` — dev-progress visual board generator (`node dev/devboard.mjs` → `dev/devboard.html`)
