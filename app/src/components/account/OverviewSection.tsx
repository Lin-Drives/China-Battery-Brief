import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { animate, motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { cn } from '@/lib/utils'
import { SectionSkeleton } from './Skeletons'
import { getReadLedger, weeklyActivity } from './utils'
import { useLang, tpl } from '@/i18n/lang'

const EASE_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

/* ------------------------------------------------------------------ */
/* Charge card — the signature battery widget (account.md B1.2)        */
/* ------------------------------------------------------------------ */

function BigBattery({ pct }: { pct: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reduced) {
      setDisplay(pct)
      return
    }
    const controls = animate(0, pct, {
      duration: 1.4,
      ease: EASE_EXPO,
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, pct, reduced])

  return (
    <div ref={ref}>
      <div className="flex items-center gap-2.5">
        {/* shell */}
        <div className="relative h-[72px] w-full max-w-[260px] flex-1 overflow-hidden rounded-sm border-2 border-line-strong p-[7px]">
          <motion.div
            className="relative h-full origin-left overflow-hidden rounded-[1px]"
            style={{ background: 'linear-gradient(90deg, #8FB02E 0%, var(--volt) 100%)' }}
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: Math.max(0.015, pct / 100) } : {}}
            transition={reduced ? { duration: 0 } : { duration: 1.4, ease: EASE_EXPO }}
          >
            {/* animated shimmer */}
            {!reduced && (
              <motion.span
                aria-hidden
                className="absolute inset-y-0 w-10 skew-x-[-20deg] bg-ink-950/15"
                animate={{ x: ['-60px', '300px'] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'linear', repeatDelay: 1.2 }}
              />
            )}
          </motion.div>
          {/* percentage readout inside the cell */}
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[20px] font-semibold tnum text-text mix-blend-difference">
            {display}%
          </span>
        </div>
        {/* nub */}
        <div aria-hidden className="h-7 w-[6px] rounded-r-[2px] bg-line-strong" />
      </div>
    </div>
  )
}

function SparkBars() {
  const [days] = useState(weeklyActivity)
  const max = Math.max(1, ...days.map((d) => d.count))
  return (
    <div className="mt-6">
      <div className="flex h-12 items-end gap-1.5">
        {days.map((d, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.05, ease: EASE_EXPO }}
            className="flex-1 origin-bottom rounded-[1px]"
            style={{
              height: `${Math.max(8, (d.count / max) * 100)}%`,
              backgroundColor: d.count > 0 ? 'var(--volt)' : 'var(--ink-700)',
              opacity: d.today ? 1 : 0.75,
            }}
            title={`${d.count} file${d.count === 1 ? '' : 's'}`}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {days.map((d, i) => (
          <span
            key={i}
            className={cn('flex-1 text-center font-mono text-[10px] tracking-[0.08em]', d.today ? 'text-volt' : 'text-faint')}
          >
            {d.day}
          </span>
        ))}
      </div>
    </div>
  )
}

function ChargeCard() {
  const { t } = useLang()
  // Total published issues (public endpoint) — react-query shares this key with LatestStrip.
  const listQuery = trpc.content['issues.list'].useQuery({ limit: 4 })
  const [readCount] = useState(() => Object.keys(getReadLedger()).length)

  if (listQuery.isLoading) return <SectionSkeleton rows={4} />

  const total = listQuery.data?.total ?? 0
  const read = Math.min(readCount, total)
  const pct = total > 0 ? Math.round((read / total) * 100) : 0
  const firstFree = listQuery.data?.issues.find((i) => i.isFree)

  return (
    <div className="border border-line bg-ink-900 p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="kicker text-text-muted">{t('acct.readingCharge')}</p>
        {total > 0 && (
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
            {tpl(t('acct.chargeProgress'), { read, left: Math.max(0, total - read) })}
          </p>
        )}
      </div>
      <div className="mt-6">
        <BigBattery pct={pct} />
      </div>
      {read === 0 ? (
        <Link
          to={firstFree ? `/briefs/${firstFree.slug}` : '/briefs'}
          className="group mt-6 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-volt"
        >
          {t('acct.firstFile')}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      ) : (
        <SparkBars />
      )}
    </div>
  )
}

/** account.md B1 — overview grid: reading charge card. */
export default function OverviewSection() {
  return <ChargeCard />
}
