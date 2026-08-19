import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { ExternalLink, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLang } from '@/i18n/lang'
import { pick } from '@/i18n/format'

/* ------------------------------------------------------------------ */
/* Policy Desk — vertical policy timeline. A left rail with dated      */
/* nodes, cards to the right. Projected nodes dashed. Click → modal.   */
/* ------------------------------------------------------------------ */

export interface PolicyEventRow {
  id: number
  region: string
  title: string
  titleZh?: string | null
  date: Date
  severity: number
  category: 'ira' | 'passport' | 'tariff' | 'export' | 'other'
  summary: string | null
  summaryZh?: string | null
  link: string | null
}

export interface RelatedBriefRef {
  num: string
  title: string
  to: string
}

const REGION_COLOR: Record<string, string> = {
  US: 'var(--signal)',
  EU: 'var(--lithium)',
  CN: 'var(--volt)',
  GLOBAL: 'var(--muted)',
}

/** Region codes → localized labels. */
const REGION_LABEL: Record<string, string> = {
  US: 'US · 美国',
  EU: 'EU · 欧盟',
  CN: 'CN · 中国',
  GLOBAL: 'GLOBAL · 全球',
}

const CATEGORY_COLOR: Record<PolicyEventRow['category'], string> = {
  ira: 'var(--signal)',
  passport: 'var(--lithium)',
  tariff: 'var(--amber)',
  export: 'var(--volt)',
  other: 'var(--muted)',
}

function fmtEventDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function PolicyTimeline({
  events,
  relatedBrief,
}: {
  events: PolicyEventRow[]
  relatedBrief?: RelatedBriefRef
}) {
  const { t, lang } = useLang()
  const rootRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<PolicyEventRow | null>(null)

  const now = useMemo(() => new Date(), [])
  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          (a.date instanceof Date ? a.date : new Date(a.date)).getTime() -
          (b.date instanceof Date ? b.date : new Date(b.date)).getTime(),
      ),
    [events],
  )

  /* cards rise in on scroll */
  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>('.policy-card', rootRef.current)
      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { y: 36, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            delay: (i % 6) * 0.06,
            ease: 'expo.out',
            scrollTrigger: { trigger: rootRef.current, start: 'top 80%', once: true },
          },
        )
      })
    },
    { scope: rootRef, dependencies: [sorted.length] },
  )

  return (
    <div ref={rootRef} className="relative">
      {/* vertical rail + cards */}
      <ol className="relative border-l border-line pl-6 sm:pl-8">
        {sorted.map((ev) => {
          const d = ev.date instanceof Date ? ev.date : new Date(ev.date)
          const projected = d.getTime() > now.getTime()
          const regionColor = REGION_COLOR[ev.region] ?? 'var(--muted)'
          const catColor = CATEGORY_COLOR[ev.category] ?? 'var(--muted)'
          return (
            <li key={ev.id} className="relative pb-8 last:pb-0">
              {/* node */}
              <span
                aria-hidden
                className={cn(
                  'absolute -left-[33px] top-1.5 h-2.5 w-2.5 rounded-full border sm:-left-[41px]',
                  projected
                    ? 'border-dashed border-faint bg-ink-950'
                    : 'border-faint bg-volt',
                )}
              />
              <button
                type="button"
                onClick={() => setActive(ev)}
                className={cn(
                  'policy-card group block w-full rounded-sm border p-5 text-left transition-colors duration-200 hover:border-line-strong',
                  projected ? 'border-dashed border-line opacity-80' : 'border-line bg-ink-900',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm border border-line-strong px-2 py-0.5 font-mono text-[11px] tnum tracking-[0.1em] text-text">
                    {fmtEventDate(d)}
                  </span>
                  <span
                    className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em]"
                    style={{
                      color: regionColor,
                      borderColor: `color-mix(in srgb, ${regionColor} 60%, transparent)`,
                    }}
                  >
                    {REGION_LABEL[ev.region] ?? ev.region}
                  </span>
                  <span
                    className="rounded-sm border px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.14em]"
                    style={{
                      color: catColor,
                      borderColor: `color-mix(in srgb, ${catColor} 55%, transparent)`,
                    }}
                  >
                    {t(`pt.category.${ev.category}`)}
                  </span>
                  {projected && (
                    <span className="ml-auto font-mono text-[9.5px] tracking-[0.2em] text-faint">
                      {t('pt.projected')}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-[20px] leading-snug text-text">
                  {pick(lang, ev.titleZh, ev.title)}
                </h3>
                <p className="mt-2 font-sans text-[13.5px] leading-relaxed text-text-muted">
                  {pick(lang, ev.summaryZh, ev.summary ?? '')}
                </p>
                <span className="mt-3 inline-block font-mono text-[10.5px] tracking-[0.12em] text-text-muted transition-all duration-200 group-hover:translate-x-1 group-hover:text-volt">
                  {t('pt.detail')} →
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {/* detail modal */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/70 px-4 backdrop-blur-[4px]"
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-lg rounded-sm border border-line-strong bg-ink-900 p-6"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label={active.title}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-sm border border-line-strong px-2 py-0.5 font-mono text-[11px] tnum text-text">
                    {fmtEventDate(active.date instanceof Date ? active.date : new Date(active.date))}
                  </span>
                  <span
                    className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em]"
                    style={{
                      color: REGION_COLOR[active.region] ?? 'var(--muted)',
                      borderColor: `color-mix(in srgb, ${REGION_COLOR[active.region] ?? 'var(--muted)'} 60%, transparent)`,
                    }}
                  >
                    {REGION_LABEL[active.region] ?? active.region}
                  </span>
                  <span
                    className="rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em]"
                    style={{
                      color: CATEGORY_COLOR[active.category] ?? 'var(--muted)',
                      borderColor: `color-mix(in srgb, ${CATEGORY_COLOR[active.category] ?? 'var(--muted)'} 55%, transparent)`,
                    }}
                  >
                    {t(`pt.category.${active.category}`)}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={t('fd.close')}
                  onClick={() => setActive(null)}
                  className="text-text-muted transition-colors hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mt-4 font-display text-[24px] leading-snug text-text">
                {pick(lang, active.titleZh, active.title)}
              </h3>
              <p className="mt-3 font-sans text-[13px] leading-relaxed text-text-muted">
                {pick(lang, active.summaryZh, active.summary ?? '')}
              </p>
              {active.link && (
                <a
                  href={active.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-volt hover:underline"
                >
                  {t('pt.primarySource')}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {relatedBrief && (
                <div className="mt-5 border-t border-line pt-4">
                  <Link
                    to={relatedBrief.to}
                    className="group flex items-baseline gap-3"
                    onClick={() => setActive(null)}
                  >
                    <span className="font-mono text-[11px] tnum text-volt">{relatedBrief.num}</span>
                    <span className="flex-1 font-mono text-[11px] tracking-[0.06em] text-text-muted transition-colors group-hover:text-text">
                      {relatedBrief.title}
                    </span>
                    <span className="font-mono text-[10px] text-faint transition-transform duration-200 group-hover:translate-x-1 group-hover:text-volt">
                      →
                    </span>
                  </Link>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
