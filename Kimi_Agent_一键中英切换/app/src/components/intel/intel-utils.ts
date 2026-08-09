/**
 * Shared types + helpers for the data-intelligence pages
 * (Tracker / Tech / Risk Radar). Mirrors the tRPC content router payload.
 */

export type FactoryStatus =
  | 'operating'
  | 'construction'
  | 'announced'
  | 'paused'
  | 'suspended'

export interface FactoryRow {
  id: number
  company: string
  siteName: string
  country: string
  countryCode: string | null
  city: string | null
  lat: number | null
  lng: number | null
  status: FactoryStatus
  capacityGwh: number | null
  chemistry: string[] | null
  sopDate: string | null
  partners: string[] | null
  sourceUrls?: string[] | null
  notes: string | null
  updatedAt: Date
}

/** design.md §4.4 functional colors per factory status */
export const STATUS_META: Record<FactoryStatus, { color: string; label: string }> = {
  operating: { color: 'var(--volt)', label: 'OPERATING' },
  construction: { color: 'var(--amber)', label: 'CONSTRUCTION' },
  announced: { color: 'var(--muted)', label: 'ANNOUNCED' },
  paused: { color: 'var(--signal)', label: 'PAUSED' },
  suspended: { color: 'var(--signal)', label: 'SUSPENDED' },
}

export const STATUS_ORDER: FactoryStatus[] = [
  'operating',
  'construction',
  'announced',
  'paused',
  'suspended',
]

/** Region select buckets (tracker.md S4) keyed by ISO-ish countryCode */
export const REGIONS = ['Europe', 'SE Asia', 'N. America', 'S. America', 'MENA', 'UK'] as const
export type Region = (typeof REGIONS)[number]

const REGION_BY_CODE: Record<string, Region> = {
  HU: 'Europe', DE: 'Europe', ES: 'Europe', PT: 'Europe', FR: 'Europe', IT: 'Europe',
  PL: 'Europe', SK: 'Europe', CZ: 'Europe', RS: 'Europe', TR: 'Europe', NL: 'Europe',
  UK: 'UK', GB: 'UK',
  ID: 'SE Asia', TH: 'SE Asia', MY: 'SE Asia', VN: 'SE Asia', SG: 'SE Asia',
  US: 'N. America', CA: 'N. America', MX: 'N. America',
  BR: 'S. America', AR: 'S. America', CL: 'S. America',
  MA: 'MENA', DZ: 'MENA', EG: 'MENA', SA: 'MENA', AE: 'MENA',
}

export function regionOf(countryCode: string | null): Region | null {
  if (!countryCode) return null
  return REGION_BY_CODE[countryCode.toUpperCase()] ?? null
}

/** `NOV 18, 2025` mono-style uppercase date */
export function fmtMonoDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase()
}

/** `2025-11` short mono date */
export function fmtMonoShort(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

/** First 4-digit year inside an sopDate string ("2026 Q3", "2027-2028", "—") */
export function parseSopYear(sopDate: string | null): number | null {
  if (!sopDate) return null
  const m = sopDate.match(/(\d{4})/)
  return m ? Number(m[1]) : null
}

/**
 * Approximate announcement year for the timeline scrubber:
 * SOP minus a ~2yr construction lead, clamped to the scrubber range.
 */
export function announceYear(f: FactoryRow): number {
  const sop = parseSopYear(f.sopDate)
  if (sop) return Math.max(2019, Math.min(2028, sop - 2))
  const dt = f.updatedAt instanceof Date ? f.updatedAt : new Date(f.updatedAt)
  const y = Number.isNaN(dt.getTime()) ? 2020 : dt.getFullYear() - 1
  return Math.max(2019, Math.min(2028, y))
}

/** tracker.md S2 node sizing: r = 4 + sqrt(GWh) * 0.9, max 26px */
export function nodeRadius(gwh: number | null): number {
  return Math.min(26, 4 + Math.sqrt(Math.max(0, gwh ?? 0)) * 0.9)
}

export function formatGwh(gwh: number | null): string {
  if (gwh == null) return '—'
  return gwh % 1 === 0 ? String(gwh) : gwh.toFixed(1)
}

/* ---------- Tracker filter state (tracker.md S4) ---------- */

export interface TrackerFilters {
  companies: string[]
  chemistry: string | null
  statuses: FactoryStatus[]
  region: Region | null
  search: string
  country: string | null
}

export const EMPTY_FILTERS: TrackerFilters = {
  companies: [],
  chemistry: null,
  statuses: [],
  region: null,
  search: '',
  country: null,
}

export function countActiveFilters(f: TrackerFilters): number {
  return (
    f.companies.length +
    (f.chemistry ? 1 : 0) +
    f.statuses.length +
    (f.region ? 1 : 0) +
    (f.search.trim() ? 1 : 0) +
    (f.country ? 1 : 0)
  )
}
