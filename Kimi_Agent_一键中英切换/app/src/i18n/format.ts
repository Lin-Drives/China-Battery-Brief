import type { Lang } from './lang'

function toDate(x: Date | string): Date {
  return x instanceof Date ? x : new Date(x)
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** zh → `2026年7月30日`; en → `THU NOV 20, 2025` */
export function fmtDateLong(x: Date | string, lang: Lang): string {
  const d = toDate(x)
  if (lang === 'zh') {
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** zh → `7月30日`; en → `NOV 20` */
export function fmtDateShort(x: Date | string, lang: Lang): string {
  const d = toDate(x)
  if (lang === 'zh') {
    return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
  }
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/** zh → `约 8 分钟`; en → `8 MIN` */
export function fmtReadTime(minutes: number, lang: Lang): string {
  return lang === 'zh' ? `约 ${minutes} 分钟` : `${minutes} MIN`
}

/** zh → `约 8 分钟读完`; en → `8 MIN READ` */
export function fmtReadTimeLong(minutes: number, lang: Lang): string {
  return lang === 'zh' ? `约 ${minutes} 分钟读完` : `${minutes} MIN READ`
}

/** Pick the zh field when in zh mode, falling back to the English original. */
export function pick<T>(lang: Lang, zhField: T | null | undefined, enField: T): T {
  return lang === 'zh' && zhField != null ? zhField : enField
}
