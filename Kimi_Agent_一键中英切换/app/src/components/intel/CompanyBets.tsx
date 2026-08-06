import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { cn } from '@/lib/utils'
import { useLang } from '@/i18n/lang'

/* ------------------------------------------------------------------ */
/* tech.md S4 — Company bets hairline table ("Who's riding which horse"). */
/* ------------------------------------------------------------------ */

interface BetRow {
  company: string
  bet: string
  betColor: string
  move: string
  timeline: string
  reality: string
  footnote?: boolean
}

const BET_COLORS: Record<string, string> = {
  LFP: 'var(--volt)',
  LMFP: 'var(--volt)',
  SEMI: 'var(--amber)',
  SSB: 'var(--lithium)',
  'NA-ION': 'var(--muted)',
}

function betPillColor(bet: string): string {
  if (bet.includes('SSB') && bet.includes('LFP')) return 'var(--lithium)'
  if (bet.startsWith('LFP')) return BET_COLORS.LFP
  if (bet.startsWith('SEMI')) return BET_COLORS.SEMI
  if (bet.startsWith('SSB')) return BET_COLORS.SSB
  if (bet.startsWith('NA')) return BET_COLORS['NA-ION']
  return 'var(--muted)'
}

export default function CompanyBets() {
  const { t } = useLang()
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const ROWS: BetRow[] = [
    { company: 'CATL', bet: 'LFP+CONDENSED', betColor: '', move: t('bets.catl.move'), timeline: t('bets.catl.timeline'), reality: t('bets.catl.reality') },
    { company: 'BYD', bet: 'LFP BLADE', betColor: '', move: t('bets.byd.move'), timeline: t('bets.byd.timeline'), reality: t('bets.byd.reality') },
    { company: 'QINGTAO', bet: 'SEMI→SSB', betColor: '', move: t('bets.qingtao.move'), timeline: t('bets.qingtao.timeline'), reality: t('bets.qingtao.reality') },
    { company: 'WELION', bet: 'SEMI', betColor: '', move: t('bets.welion.move'), timeline: t('bets.welion.timeline'), reality: t('bets.welion.reality') },
    { company: 'GANFENG', bet: 'SSB OXIDE', betColor: '', move: t('bets.ganfeng.move'), timeline: t('bets.ganfeng.timeline'), reality: t('bets.ganfeng.reality') },
    { company: 'GOTION', bet: 'LFP+SSB', betColor: '', move: t('bets.gotion.move'), timeline: t('bets.gotion.timeline'), reality: t('bets.gotion.reality') },
    { company: 'TOYOTA*', bet: 'SSB SULFIDE', betColor: '', move: t('bets.toyota.move'), timeline: t('bets.toyota.timeline'), reality: t('bets.toyota.reality'), footnote: true },
  ]

  useGSAP(
    () => {
      const rows = gsap.utils.toArray<HTMLElement>('.bet-row', rootRef.current)
      gsap.fromTo(
        rows,
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.06,
          ease: 'expo.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 80%', once: true },
        },
      )
    },
    { scope: rootRef },
  )

  return (
    <div ref={rootRef} className="overflow-x-auto border border-line">
      <table className="w-full min-w-[880px] border-collapse">
        <thead>
          <tr className="border-b border-line bg-ink-900">
            {[t('cb.h1'), t('cb.h2'), t('cb.h3'), t('cb.h4'), t('cb.h5')].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-faint"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const color = betPillColor(r.bet)
            return (
              <tr
                key={r.company}
                onClick={() => navigate(`/briefs?q=${encodeURIComponent(r.company.replace('*', ''))}`)}
                className={cn(
                  'bet-row group cursor-pointer border-b border-line bg-ink-950 transition-colors last:border-b-0 hover:bg-ink-800',
                  r.footnote && 'border-dashed opacity-80',
                )}
              >
                <td className="px-4 py-4 font-mono text-[12.5px] font-medium tracking-[0.06em] text-text">
                  {t(`company.${r.company}`)}
                </td>
                <td className="px-4 py-4">
                  <span
                    className="inline-block rounded-sm border px-2 py-[3px] font-mono text-[10.5px] font-medium uppercase tracking-[0.1em]"
                    style={{
                      color,
                      borderColor: `color-mix(in srgb, ${color} 60%, transparent)`,
                      backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
                    }}
                  >
                    {r.bet}
                  </span>
                </td>
                <td className="px-4 py-4 font-sans text-[13.5px] text-text-muted">{r.move}</td>
                <td className="px-4 py-4 font-mono text-[12px] tnum text-text">{r.timeline}</td>
                <td className="px-4 py-4 font-sans text-[13px] leading-snug text-text-muted transition-colors duration-200 group-hover:text-text">
                  {r.reality}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="border-t border-line px-4 py-3 font-mono text-[10.5px] tracking-[0.08em] text-faint">
        {t('cb.footnote')}
      </p>
    </div>
  )
}
