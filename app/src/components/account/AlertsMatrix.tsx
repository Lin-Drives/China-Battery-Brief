import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Lock } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useToast } from './Toasts'
import { SectionSkeleton } from './Skeletons'
import { PILLAR_META, PILLAR_ORDER } from './utils'
import type { PillarSlug } from './utils'
import { useLang, tpl } from '@/i18n/lang'

type Channel = 'email' | 'web'
const CHANNELS: Channel[] = ['email', 'web']

/** Sharp pillar-colored switch (design.md §8.6 toggles, thumbs in pillar color). */
function PillarToggle({
  on,
  color,
  disabled,
  label,
  onChange,
}: {
  on: boolean
  color: string
  disabled?: boolean
  label: string
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="relative h-[22px] w-10 shrink-0 rounded-sm border transition-colors duration-[180ms] disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        borderColor: on ? color : 'var(--line-strong)',
        backgroundColor: on ? `${color}26` : 'var(--ink-700)',
      }}
    >
      <span
        aria-hidden
        className="absolute top-[2px] h-[16px] w-[16px] rounded-[2px] transition-all duration-[180ms]"
        style={{ left: on ? 'calc(100% - 19px)' : '2px', backgroundColor: on ? color : 'var(--faint)' }}
      />
    </button>
  )
}

/**
 * account.md B4 — alerts control matrix. Rows = pillars, columns = EMAIL /
 * WEB. Optimistic UI + toast. Free users see the locked inline upsell.
 */
export default function AlertsMatrix() {
  const { t } = useLang()
  const toast = useToast()
  const utils = trpc.useUtils()
  const alertsQuery = trpc.me['alerts.get'].useQuery()
  const myQuery = trpc.billing.my.useQuery()

  // Optimistic overrides keyed `${pillar}:${channel}`; cleared when fresh data lands.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  useEffect(() => setOverrides({}), [alertsQuery.data])

  const setMut = trpc.me['alerts.set'].useMutation({
    onSuccess: () => toast(t('acct.alertsUpdated')),
    onError: (e, vars) => {
      setOverrides((o) => {
        const next = { ...o }
        delete next[`${vars.pillar}:${vars.channel}`]
        return next
      })
      toast(e.message.toUpperCase() || t('acct.alertUpdateFailed'), { tone: 'signal' })
    },
    onSettled: () => utils.me['alerts.get'].invalidate(),
  })

  if (alertsQuery.isLoading || myQuery.isLoading) return <SectionSkeleton rows={4} />

  const locked = !myQuery.data // free readers: inline upsell per design

  const serverValue = (pillar: PillarSlug, channel: Channel): boolean =>
    alertsQuery.data?.find((a) => a.pillar === pillar && a.channel === channel)?.enabled ?? false

  const value = (pillar: PillarSlug, channel: Channel): boolean =>
    overrides[`${pillar}:${channel}`] ?? serverValue(pillar, channel)

  const toggle = (pillar: PillarSlug, channel: Channel, next: boolean) => {
    setOverrides((o) => ({ ...o, [`${pillar}:${channel}`]: next }))
    setMut.mutate({ pillar, channel, enabled: next })
  }

  const matrix = (
    <div className="border border-line bg-ink-900">
      {/* column headers */}
      <div className="grid grid-cols-[1fr_72px_72px] items-center border-b border-line px-5 py-3">
        <span className="kicker text-faint">{t('acct.colPillar')}</span>
        <span className="kicker text-center text-faint">{t('acct.colEmail')}</span>
        <span className="kicker text-center text-faint">{t('acct.colWeb')}</span>
      </div>
      {PILLAR_ORDER.map((slug) => {
        const meta = PILLAR_META[slug]
        return (
          <div
            key={slug}
            className="grid grid-cols-[1fr_72px_72px] items-center border-b border-line px-5 py-4 transition-colors last:border-b-0 hover:bg-ink-800/60"
          >
            <span className="flex items-center gap-2.5">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
              <span className="font-mono text-[12px] font-medium uppercase tracking-[0.12em]" style={{ color: meta.color }}>
                {t(`pillar.${slug}`)}
              </span>
            </span>
            {CHANNELS.map((channel) => (
              <span key={channel} className="flex justify-center">
                <PillarToggle
                  on={value(slug, channel)}
                  color={meta.color}
                  label={tpl(t('acct.alertsAria'), { p: t(`pillar.${slug}`), c: channel })}
                  disabled={locked || setMut.isPending}
                  onChange={(next) => toggle(slug, channel, next)}
                />
              </span>
            ))}
          </div>
        )
      })}
      <p className="border-t border-line px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
        {t('acct.alertsNote')}
      </p>
    </div>
  )

  if (!locked) return matrix

  // Pro gate (account.md B4): matrix locked behind inline upsell.
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none blur-[2px]">
        {matrix}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-ink-950/40 p-6">
        <div className="flex flex-col items-center gap-4 border border-line-strong bg-ink-900 px-8 py-7 text-center">
          <Lock className="h-4 w-4 text-volt" />
          <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-text">
            {t('acct.alertsPro')}
          </p>
          <Link
            to="/pricing"
            className="rounded-sm bg-volt px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-volt-pop active:translate-y-0 active:shadow-none"
          >
            {t('acct.upgradeArrow')}
          </Link>
        </div>
      </div>
    </div>
  )
}
