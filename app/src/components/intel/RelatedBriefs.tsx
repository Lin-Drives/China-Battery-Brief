import { Link } from 'react-router'
import { Lock } from 'lucide-react'
import Reveal from '@/components/Reveal'
import CornerTicks from '@/components/CornerTicks'
import { cn } from '@/lib/utils'
import { useLang } from '@/i18n/lang'
import { fmtReadTimeLong } from '@/i18n/format'

/* ------------------------------------------------------------------ */
/* Shared "related briefs" strip (tech.md S6 / geopolitics.md S6).     */
/* Compact IssueCards in the hairline system.                          */
/* ------------------------------------------------------------------ */

export interface RelatedBriefItem {
  num: string
  title: string
  dek?: string
  to: string
  cover?: string
  minutes?: number
}

export default function RelatedBriefs({ items }: { items: RelatedBriefItem[] }) {
  const { t, lang } = useLang()
  return (
    <Reveal className="grid gap-5 md:grid-cols-3">
      {items.map((b) => (
        <Link
          key={b.num}
          to={b.to}
          className="group relative flex flex-col border border-line bg-ink-800 transition-all duration-200 hover:-translate-y-1 hover:border-volt/40"
        >
          {b.cover && (
            <div className="relative h-40 overflow-hidden border-b border-line">
              <img
                src={b.cover}
                alt=""
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <CornerTicks color="var(--line-strong)" className="m-2" />
            </div>
          )}
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] tnum tracking-[0.12em] text-volt">{b.num}</span>
              <Lock className="h-3 w-3 text-faint" />
            </div>
            <h3 className="mt-3 font-display text-[20px] leading-snug text-text">{b.title}</h3>
            {b.dek && (
              <p className="mt-2 flex-1 font-sans text-[13.5px] leading-relaxed text-text-muted">
                {b.dek}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <span className="font-mono text-[10.5px] tracking-[0.12em] text-faint">
                {b.minutes ? fmtReadTimeLong(b.minutes, lang) : t('stamp.weeklyBrief')}
              </span>
              <span
                className={cn(
                  'font-mono text-[11px] tracking-[0.12em] text-text-muted transition-all duration-200',
                  'group-hover:translate-x-1 group-hover:text-volt',
                )}
              >
                {t('issue.read')}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </Reveal>
  )
}
