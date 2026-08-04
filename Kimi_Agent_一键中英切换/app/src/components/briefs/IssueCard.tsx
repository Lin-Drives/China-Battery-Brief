import { Link } from 'react-router'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Lock } from 'lucide-react'
import PillarTag from '@/components/PillarTag'
import RubberStamp from '@/components/RubberStamp'
import GhostCover from './GhostCover'
import { fmtIssueNo, pillarTag } from './pillar'
import { useLang } from '@/i18n/lang'
import { fmtDateShort, fmtReadTime, pick } from '@/i18n/format'
import { OpenAccess } from '@contracts/constants'
import type { IssueMeta } from './pillar'

/**
 * design.md §8.5 IssueCard — ink-800, hairline, cover thumb, mono issue number,
 * Fraunces title, dek, pillar tags, footer (read time · lock · READ →).
 * Hover: translateY(-4px), border volt 40%, arrow slides 4px.
 */
export default function IssueCard({
  issue,
  variants,
}: {
  issue: IssueMeta
  variants?: Variants
}) {
  const { lang, t } = useLang()
  const title = pick(lang, issue.titleZh, issue.title)
  const dek = pick(lang, issue.dekZh, issue.dek)
  // Closed beta: everything reads as free while OpenAccess.beta is on
  const open = OpenAccess.beta || issue.isFree
  return (
    <motion.article variants={variants} className="group relative h-full">
      <Link
        to={`/briefs/${issue.slug}`}
        data-cursor={open ? 'READ' : 'UNLOCK'}
        className="flex h-full flex-col border border-line bg-ink-800 transition-all duration-200 ease-out group-hover:-translate-y-1 group-hover:border-volt/40"
        aria-label={`${fmtIssueNo(issue.number)} — ${title}`}
      >
        {/* Cover thumb */}
        <div className="relative aspect-[4/3] overflow-hidden border-b border-line">
          {issue.coverAsset ? (
            <img
              src={issue.coverAsset}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.03]"
            />
          ) : (
            <GhostCover number={issue.number} pillars={issue.pillars} />
          )}
          {open && (
            <div className="absolute right-3 top-3">
              <RubberStamp color="var(--volt)" rotate={-6} className="px-2 py-1 text-[9px]">
                {issue.isFree ? t('stamp.free') : t('stamp.betaFree')}
              </RubberStamp>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.14em] text-faint tnum">
            <span className="text-text-muted">{fmtIssueNo(issue.number)}</span>
            <span>{fmtDateShort(issue.publishedAt, lang)}</span>
          </div>
          <h3 className="font-display text-[22px] font-normal leading-[1.15] text-text transition-colors duration-200 group-hover:text-volt">
            {title}
          </h3>
          {dek && (
            <p className="line-clamp-2 font-sans text-[14px] leading-[1.55] text-text-muted">
              {dek}
            </p>
          )}
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {issue.pillars.map((p) => (
              <PillarTag key={p} pillar={pillarTag(p)}>
                {t(`pillar.${p}`)}
              </PillarTag>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-line pt-3 font-mono text-[11px] tracking-[0.12em]">
            <span className="flex items-center gap-2 text-faint tnum">
              {fmtReadTime(issue.readingMinutes, lang)}
              {!open && (
                <span className="flex items-center gap-1 text-signal">
                  <Lock className="h-3 w-3" /> PRO
                </span>
              )}
            </span>
            <span className="text-text-muted transition-all duration-200 group-hover:translate-x-1 group-hover:text-volt">
              {t('issue.read')}
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}
