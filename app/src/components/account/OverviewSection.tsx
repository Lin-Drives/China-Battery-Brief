import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { animate, motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { cn } from '@/lib/utils'
import { useToast } from './Toasts'
import AccountModal from './Modal'
import { SectionSkeleton } from './Skeletons'
import { daysUntil, fmtDate, fmtMoney, getReadLedger, weeklyActivity } from './utils'
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

/* ------------------------------------------------------------------ */
/* Plan card (account.md B1.1)                                         */
/* ------------------------------------------------------------------ */

const statusPill: Record<string, { labelKey: string; color: string }> = {
  active: { labelKey: 'acct.sub.active', color: 'var(--volt)' },
  trialing: { labelKey: 'acct.sub.trialing', color: 'var(--lithium)' },
  canceled: { labelKey: 'acct.sub.canceled', color: 'var(--amber)' },
  past_due: { labelKey: 'acct.sub.past_due', color: 'var(--signal)' },
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function PlanCard() {
  const { t } = useLang()
  const toast = useToast()
  const utils = trpc.useUtils()
  const myQuery = trpc.billing.my.useQuery()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const cancel = trpc.billing.cancel.useMutation({
    onSuccess: async () => {
      await utils.billing.my.invalidate()
      setConfirmOpen(false)
      toast(t('acct.cancelDone'), { tone: 'amber' })
    },
    onError: (e) => toast(e.message.toUpperCase() || t('acct.cancelFailed'), { tone: 'signal' }),
  })

  if (myQuery.isLoading) return <SectionSkeleton className="lg:col-span-2" rows={4} />

  const my = myQuery.data ?? null
  const tierLabel = my ? my.plan.tier.toUpperCase() : t('acct.planFree')
  const intervalLabel = my
    ? my.plan.interval === 'year'
      ? t('pricing.annual')
      : my.plan.interval === 'month'
        ? t('pricing.monthly')
        : ''
    : t('acct.planReader')
  const seats = my?.plan.tier === 'desk' ? '1/5' : '1/1'

  return (
    <div className="flex flex-col border border-line bg-ink-900 p-6 lg:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <p className="kicker text-text-muted">{t('acct.currentPlan')}</p>
        {my && (
          <span
            className="rounded-sm px-2 py-[3px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em]"
            style={{
              color: statusPill[my.subscription.status]?.color ?? 'var(--muted)',
              border: `1px solid ${statusPill[my.subscription.status]?.color ?? 'var(--muted)'}`,
            }}
          >
            {statusPill[my.subscription.status]
              ? t(statusPill[my.subscription.status].labelKey)
              : my.subscription.status.toUpperCase()}
          </span>
        )}
      </div>

      <p className="mt-5 font-display text-[28px] leading-none text-text">
        {tierLabel} — <em className="italic text-volt">{intervalLabel}</em>
      </p>
      {my && <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-faint">{my.plan.name}</p>}

      <div className="mt-6 space-y-2.5 border-t border-line pt-5 font-mono text-[12.5px] uppercase tracking-[0.08em] tnum">
        {my ? (
          <>
            <p className="flex justify-between gap-4">
              <span className="text-faint">{my.subscription.status === 'canceled' ? t('acct.accessUntil') : t('acct.renews')}</span>
              <span className="text-text">
                {fmtDate(my.subscription.currentPeriodEnd)} ({tpl(t('acct.daysN'), { n: daysUntil(my.subscription.currentPeriodEnd) })})
              </span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-faint">{t('acct.price')}</span>
              <span className="text-text">
                {fmtMoney(my.plan.priceCents, my.plan.currency)}/{my.plan.interval === 'year' ? t('acct.yr') : t('acct.mo')}
              </span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-faint">{t('acct.seats')}</span>
              <span className="text-text">{seats}</span>
            </p>
          </>
        ) : (
          <>
            <p className="flex justify-between gap-4">
              <span className="text-faint">{t('acct.price')}</span>
              <span className="text-text">$0</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-faint">{t('acct.access')}</span>
              <span className="text-text">{t('acct.freeFilesOnly')}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-faint">{t('acct.archive')}</span>
              <span className="text-text">{t('acct.archiveLocked')}</span>
            </p>
          </>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-3 pt-8">
        {my ? (
          <>
            <button
              type="button"
              onClick={() => scrollToId('billing')}
              className="inline-flex items-center gap-2 rounded-sm border border-line-strong px-5 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-text transition-colors duration-200 hover:border-text hover:bg-text/5"
            >
              {t('acct.manageBilling')} <ArrowRight className="h-3.5 w-3.5" />
            </button>
            {my.subscription.status === 'active' && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-2 rounded-sm border border-signal/50 px-5 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-signal transition-colors duration-200 hover:border-signal hover:bg-signal/10"
              >
                {t('acct.cancelPlan')}
              </button>
            )}
          </>
        ) : (
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-sm bg-volt px-6 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-volt-pop active:translate-y-0 active:shadow-none"
          >
            {t('acct.upgrade')} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* Cancel confirmation (account.md B1) */}
      <AccountModal open={confirmOpen} onClose={() => setConfirmOpen(false)} labelledBy="cancel-title">
        <p id="cancel-title" className="font-display text-[20px] text-text">
          {tpl(t('acct.cancelTitle'), { tier: my ? my.plan.tier.toUpperCase() : t('acct.planFree') })}
        </p>
        <ul className="mt-5 space-y-2 border-t border-line pt-5 font-mono text-[11.5px] uppercase tracking-[0.1em] text-text-muted">
          {my && <li>{tpl(t('acct.cancelArchive'), { d: fmtDate(my.subscription.currentPeriodEnd) })}</li>}
          <li>{t('acct.cancelAlerts')}</li>
          <li>{t('acct.cancelExport')}</li>
        </ul>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
            className="rounded-sm bg-signal px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(255,91,69,0.28)] active:translate-y-0 active:shadow-none disabled:opacity-50"
          >
            {cancel.isPending ? t('acct.cancelling') : t('acct.confirmCancel')}
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="rounded-sm border border-line-strong px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-text transition-colors duration-200 hover:border-text hover:bg-text/5"
          >
            {tpl(t('acct.keepPlan'), { tier: tierLabel })}
          </button>
        </div>
      </AccountModal>
    </div>
  )
}

/** account.md B1 — overview grid: plan card (2 cols) + charge card. */
export default function OverviewSection() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <PlanCard />
      <ChargeCard />
    </div>
  )
}
