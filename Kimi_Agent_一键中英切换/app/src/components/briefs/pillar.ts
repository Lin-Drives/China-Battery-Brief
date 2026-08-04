import type { Pillar } from '@/components/PillarTag'

/** API pillar slugs (db/schema.ts) → design system pillar identities (design.md §4.3). */
export type ApiPillar = 'overseas-capacity' | 'tech-routes' | 'geopolitics'

export const PILLAR_ORDER: ApiPillar[] = ['overseas-capacity', 'tech-routes', 'geopolitics']

const pillarMeta: Record<
  ApiPillar,
  { tag: Pillar; short: string; label: string; color: string; cjk: string }
> = {
  'overseas-capacity': {
    tag: 'capacity',
    short: 'CAPACITY',
    label: 'Overseas Capacity',
    color: '#C9F24B',
    cjk: '海外建厂',
  },
  'tech-routes': {
    tag: 'tech',
    short: 'TECH',
    label: 'Tech Routes',
    color: '#5ADFC3',
    cjk: '技术路线',
  },
  geopolitics: {
    tag: 'risk',
    short: 'GEOPOLITICS',
    label: 'Geopolitics',
    color: '#FF5B45',
    cjk: '地缘风险',
  },
}

const FALLBACK = pillarMeta['overseas-capacity']

export function isApiPillar(p: string): p is ApiPillar {
  return p in pillarMeta
}

export function pillarTag(p: string): Pillar {
  return (isApiPillar(p) ? pillarMeta[p] : FALLBACK).tag
}

export function pillarShort(p: string): string {
  return (isApiPillar(p) ? pillarMeta[p] : FALLBACK).short
}

export function pillarLabel(p: string): string {
  return (isApiPillar(p) ? pillarMeta[p] : FALLBACK).label
}

export function pillarColor(p: string): string {
  return (isApiPillar(p) ? pillarMeta[p] : FALLBACK).color
}

/** Dominant pillar of an issue (first in its pillar list). */
export function dominantPillar(pillars: string[]): ApiPillar {
  const first = pillars.find(isApiPillar)
  return first ?? 'overseas-capacity'
}

/** Metadata shape returned by trpc.content['issues.list'] (matches api/queries/content.ts select). */
export type IssueMeta = {
  id: number
  number: number
  slug: string
  title: string
  dek: string | null
  titleZh?: string | null
  dekZh?: string | null
  publishedAt: Date | string
  isFree: boolean
  pillars: string[]
  readingMinutes: number
  coverAsset: string | null
}

/** Defensive date handling — superjson delivers Date, but tolerate strings. */
export function toDate(x: Date | string): Date {
  return x instanceof Date ? x : new Date(x)
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** `NOV 20` */
export function fmtShortDate(x: Date | string): string {
  const d = toDate(x)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/** `THU NOV 20, 2025` */
export function fmtLongDate(x: Date | string): string {
  const d = toDate(x)
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** `№047` */
export function fmtIssueNo(n: number): string {
  return `№${String(n).padStart(3, '0')}`
}
