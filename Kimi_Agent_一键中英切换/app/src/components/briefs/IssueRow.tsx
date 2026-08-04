import { Link } from 'react-router'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Lock } from 'lucide-react'
import PillarTag from '@/components/PillarTag'
import { fmtIssueNo, pillarTag } from './pillar'
import { useLang } from '@/i18n/lang'
import { fmtDateShort, fmtReadTime, pick } from '@/i18n/format'
import type { IssueMeta } from './pillar'

/**
 * briefs.md S3 — archive LIST row. Grid columns on lg: 140px / 1fr / 220px / 120px;
 * stacked card on mobile. Hover: bg ink-800, title volt, `OPEN →` slides in.
 */
export default function IssueRow({
  issue,
  variants,
}: {
  issue: IssueMeta
  variants?: Variants
}) {
  const { lang, t } = useLang()
  const title = pick(lang, issue.titleZh, issue.title)
  const dek = pick(lang, issue.dekZh, issue.dek)
  return (
    <motion.article variants={variants} className="group relative border-b border-line">
      <Link
        to={`/briefs/${issue.slug}`}
        data-cursor={issue.isFree ? 'OPEN' : 'UNLOCK'}
        aria-label={`${fmtIssueNo(issue.number)} — ${title}`}
        className="grid grid-cols-1 gap-3 px-4 py-5 transition-colors duration-200 group-hover:bg-ink-800 lg:grid-cols-[140px_1fr_220px_120px] lg:items-center lg:gap-6 lg:py-0 lg:h-24"
      >
        {/* № + date */}
        <div className="flex items-baseline gap-2 font-mono text-[12px] tracking-[0.12em] tnum lg:flex-col lg:gap-1">
          <span className="text-text-muted">{fmtIssueNo(issue.number)}</span>
          <span className="text-faint">{fmtDateShort(issue.publishedAt, lang)}</span>
        </div>

        {/* Title + dek */}
        <div className="min-w-0">
          <h3 className="truncate font-display text-[22px] font-normal leading-[1.15] text-text transition-colors duration-200 group-hover:text-volt">
            {title}
          </h3>
          {dek && (
            <p className="mt-1 truncate font-sans text-[14px] leading-[1.55] text-text-muted">
              {dek}
            </p>
          )}
        </div>

        {/* Pillar tags */}
        <div className="flex flex-wrap gap-1.5">
          {issue.pillars.map((p) => (
            <PillarTag key={p} pillar={pillarTag(p)}>
              {t(`pillar.${p}`)}
            </PillarTag>
          ))}
        </div>

        {/* Min + status */}
        <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.12em] tnum lg:justify-end">
          <span className="text-faint">{fmtReadTime(issue.readingMinutes, lang)}</span>
          {issue.isFree ? (
            <span className="rounded-sm border border-volt/60 bg-volt/10 px-2 py-[3px] text-[10.5px] font-medium text-volt">
              {t('issue.free')}
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-sm border border-line-strong px-2 py-[3px] text-[10.5px] font-medium text-text-muted">
              <Lock className="h-3 w-3 text-signal" /> PRO
            </span>
          )}
        </div>

        {/* OPEN → slide-in on hover (lg+) */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 translate-x-2 font-mono text-[11px] tracking-[0.14em] text-volt opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 xl:block"
        >
          {t('issue.open')}
        </span>
      </Link>
    </motion.article>
  )
}
