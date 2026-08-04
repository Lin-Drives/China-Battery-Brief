import type { Pillar } from '@/components/PillarTag'

/** Backend pillar slugs ↔ design.md §4.3 pillar system */
export type PillarSlug = 'overseas-capacity' | 'tech-routes' | 'geopolitics'

export const PILLAR_ORDER: PillarSlug[] = ['overseas-capacity', 'tech-routes', 'geopolitics']

export const PILLAR_META: Record<PillarSlug, { tag: Pillar; label: string; color: string }> = {
  'overseas-capacity': { tag: 'capacity', label: 'CAPACITY', color: '#C9F24B' },
  'tech-routes': { tag: 'tech', label: 'TECH', color: '#5ADFC3' },
  geopolitics: { tag: 'risk', label: 'GEOPOLITICS', color: '#FF5B45' },
}

export function pillarMeta(slug: string) {
  return PILLAR_META[slug as PillarSlug] ?? PILLAR_META['overseas-capacity']
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** `DEC 1, 2025` — mono dossier date */
export function fmtDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** `SEP 2025` */
export function fmtMonthYear(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** `NOV 3` */
export function fmtShort(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

export function fmtMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

export function daysUntil(d: Date): number {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000))
}

export function firstNameOf(name?: string | null, email?: string | null): string {
  const fromName = name?.trim().split(/\s+/)[0]
  if (fromName) return fromName
  const fromEmail = email?.split('@')[0]
  return fromEmail ? fromEmail : 'READER'
}

/** Time-aware greeting (account.md B) */
export function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Up late'
  if (h < 12) return 'Morning'
  if (h < 18) return 'Afternoon'
  return 'Evening'
}

/** Dictionary key for the time-aware greeting (see acct.greet.*). */
export function timeGreetingKey(): string {
  const h = new Date().getHours()
  if (h < 5) return 'acct.greet.late'
  if (h < 12) return 'acct.greet.morning'
  if (h < 18) return 'acct.greet.afternoon'
  return 'acct.greet.evening'
}

/* ------------------------------------------------------------------ */
/* Reading ledger — localStorage record of opened briefs.              */
/* The backend has no read-tracking endpoint (v1), so the account page */
/* keeps a local ledger: clicking a file in the dashboard marks it.    */
/* ------------------------------------------------------------------ */

const READS_KEY = 'cbb:reads'

export function getReadLedger(): Record<number, number> {
  try {
    const raw = window.localStorage.getItem(READS_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as Record<number, number>
    return {}
  } catch {
    return {}
  }
}

export function markIssueRead(id: number) {
  try {
    const ledger = getReadLedger()
    ledger[id] = Date.now()
    window.localStorage.setItem(READS_KEY, JSON.stringify(ledger))
  } catch {
    /* storage unavailable — ignore */
  }
}

/** Last-7-days read activity for the charge-card spark bars (oldest → today). */
export function weeklyActivity(): { day: string; count: number; today: boolean }[] {
  const ledger = getReadLedger()
  const stamps = Object.values(ledger)
  const out: { day: string; count: number; today: boolean }[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const next = d.getTime() + 86_400_000
    const count = stamps.filter((t) => t >= d.getTime() && t < next).length
    out.push({
      day: ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d.getDay()],
      count,
      today: i === 0,
    })
  }
  return out
}
