import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { ExternalLink, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLang, tpl } from '@/i18n/lang'

/* ------------------------------------------------------------------ */
/* geopolitics.md S2 — "How We Got Here" policy timeline. Horizontal   */
/* drag-strip on lg+ (snap points), vertical on mobile. Signal rail    */
/* progress fill scrubbed by section scroll; TODAY marker; projected   */
/* nodes dashed; event click → detail modal.                           */
/* ------------------------------------------------------------------ */

export interface PolicyEventRow {
  id: number
  region: string
  title: string
  date: Date
  severity: number
  category: 'ira' | 'passport' | 'tariff' | 'export' | 'other'
  summary: string | null
  link: string | null
}

const REGION_COLOR: Record<string, string> = {
  US: 'var(--signal)',
  EU: 'var(--lithium)',
  CN: 'var(--volt)',
  GLOBAL: 'var(--muted)',
}

function fmtEventDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function PolicyTimeline({ events }: { events: PolicyEventRow[] }) {
  const { t } = useLang()
  const rootRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<PolicyEventRow | null>(null)
  const [grabbing, setGrabbing] = useState(false)
  const dragRef = useRef<{ startX: number; scrollLeft: number; moved: boolean } | null>(null)

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

  /* TODAY marker position along the rail (0–1) */
  const todayFrac = useMemo(() => {
    if (sorted.length < 2) return null
    const min = (sorted[0].date instanceof Date ? sorted[0].date : new Date(sorted[0].date)).getTime()
    const max = (sorted[sorted.length - 1].date instanceof Date
      ? sorted[sorted.length - 1].date
      : new Date(sorted[sorted.length - 1].date)
    ).getTime()
    if (max <= min) return null
    const f = (now.getTime() - min) / (max - min)
    return Math.max(0, Math.min(1, f))
  }, [sorted, now])

  /* rail draw on entry + signal progress fill scrubbed by page scroll */
  useGSAP(
    () => {
      if (fillRef.current) {
        gsap.fromTo(
          fillRef.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top 80%',
              end: 'bottom 40%',
              scrub: 0.6,
            },
          },
        )
      }
      const cards = gsap.utils.toArray<HTMLElement>('.policy-card', rootRef.current)
      cards.forEach((card, i) => {
        gsap.fromTo(
          card,
          { x: 60, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.6,
            delay: (i % 6) * 0.08,
            ease: 'expo.out',
            scrollTrigger: { trigger: rootRef.current, start: 'top 80%', once: true },
          },
        )
      })
    },
    { scope: rootRef, dependencies: [sorted.length] },
  )

  /* drag-to-scroll (lg strip) */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = stripRef.current
    if (!el) return
    dragRef.current = { startX: e.clientX, scrollLeft: el.scrollLeft, moved: false }
    el.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    const el = stripRef.current
    if (!d || !el) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) > 4) {
      d.moved = true
      setGrabbing(true)
    }
    if (d.moved) el.scrollLeft = d.scrollLeft - dx
  }
  const onPointerUp = () => {
    setGrabbing(false)
    window.setTimeout(() => {
      dragRef.current = null
    }, 0)
  }

  return (
    <div ref={rootRef} className="relative">
      {/* rail (lg) */}
      <div className="relative mb-8 hidden h-[2px] bg-line lg:block">
        <div
          ref={fillRef}
          className="absolute inset-y-0 left-0 w-full origin-left bg-signal"
          style={{ transform: 'scaleX(0)' }}
        />
        {todayFrac != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `${todayFrac * 100}%` }}
          >
            <span className="block h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-volt animate-pulse-dot" />
            <span className="absolute left-0 top-3 -translate-x-1/2 font-mono text-[9px] tracking-[0.2em] text-volt">
              {t('pt.today')}
            </span>
          </div>
        )}
      </div>

      {/* cards strip */}
      <div
        ref={stripRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={cn(
          'flex flex-col gap-5 lg:flex-row lg:gap-6',
          'lg:cursor-grab lg:overflow-x-auto lg:pb-6 lg:[scrollbar-width:thin]',
          grabbing && 'lg:cursor-grabbing',
        )}
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {sorted.map((ev) => {
          const d = ev.date instanceof Date ? ev.date : new Date(ev.date)
          const projected = d.getTime() > now.getTime()
          const regionColor = REGION_COLOR[ev.region] ?? 'var(--muted)'
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => {
                if (dragRef.current?.moved) return
                setActive(ev)
              }}
              className={cn(
                'policy-card shrink-0 rounded-sm border p-5 text-left transition-colors duration-200 hover:border-line-strong',
                'lg:w-[280px]',
                projected ? 'border-dashed border-line opacity-70' : 'border-line bg-ink-900',
              )}
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className="flex items-center justify-between gap-2">
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
                  {ev.region}
                </span>
              </div>
              <h3 className="mt-3 font-display text-[18px] leading-snug text-text">{ev.title}</h3>
              <p className="mt-2 line-clamp-3 font-mono text-[11.5px] leading-relaxed text-text-muted">
                {ev.summary ?? ''}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.12em] text-faint">
                  <span className="tnum" style={{ color: regionColor }}>{tpl(t('pt.sev'), { n: ev.severity })}</span>
                </span>
                {projected && (
                  <span className="font-mono text-[9.5px] tracking-[0.2em] text-faint">{t('pt.projected')}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

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
                    {active.region}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.12em] text-faint">
                    {tpl(t('pt.sevCat'), { n: active.severity, cat: active.category.toUpperCase() })}
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
              <h3 className="mt-4 font-display text-[24px] leading-snug text-text">{active.title}</h3>
              <p className="mt-3 font-mono text-[12px] leading-relaxed text-text-muted">
                {active.summary ?? ''}
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
              <div className="mt-5 border-t border-line pt-4">
                <Link
                  to="/briefs/battery-passport-t-minus-200"
                  className="group flex items-baseline gap-3"
                  onClick={() => setActive(null)}
                >
                  <span className="font-mono text-[11px] tnum text-volt">No. 045</span>
                  <span className="flex-1 font-mono text-[11px] tracking-[0.06em] text-text-muted transition-colors group-hover:text-text">
                    T-MINUS 200 DAYS: THE BATTERY PASSPORT IS THE DEADLINE
                  </span>
                  <span className="font-mono text-[10px] text-faint transition-transform duration-200 group-hover:translate-x-1 group-hover:text-volt">
                    →
                  </span>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
