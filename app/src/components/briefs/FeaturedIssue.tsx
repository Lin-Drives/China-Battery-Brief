import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Lock } from 'lucide-react'
import CornerTicks from '@/components/CornerTicks'
import PillarTag from '@/components/PillarTag'
import RubberStamp from '@/components/RubberStamp'
import CBBButton from '@/components/Buttons'
import GhostCover from './GhostCover'
import SaveButton from './SaveButton'
import { fmtIssueNo, pillarColor, pillarTag } from './pillar'
import { useLang, tpl } from '@/i18n/lang'
import { fmtDateLong, fmtReadTime, pick } from '@/i18n/format'
import type { IssueMeta } from './pillar'
import { trpc } from '@/providers/trpc'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** Extract up to `max` `##` chapter headings from markdown. */
function chapterHeadings(markdown: string, max = 3): string[] {
  return markdown
    .split('\n')
    .filter((l) => l.startsWith('## '))
    .map((l) => l.replace(/^##\s+/, '').trim())
    .filter(Boolean)
    .slice(0, max)
}

/**
 * briefs.md S2 — featured issue (latest, pinned top of archive).
 * Full-width hairline card: cover left (corner ticks), content right with
 * stamp, mono meta, chapter ledger preview and READ NOW / SAVE CTAs.
 */
export default function FeaturedIssue({ issue }: { issue: IssueMeta }) {
  const { lang, t } = useLang()
  const navigate = useNavigate()
  const title = pick(lang, issue.titleZh, issue.title)
  const dek = pick(lang, issue.dekZh, issue.dek)

  // Chapter preview ledger rows come from the issue's own `##` headings
  const detail = trpc.content['issues.bySlug'].useQuery(
    { slug: issue.slug },
    { staleTime: 5 * 60_000 },
  )
  const chapters = useMemo(
    () =>
      detail.data
        ? chapterHeadings(
            (lang === 'zh' && detail.data.contentZh) || detail.data.content,
          )
        : [],
    [detail.data, lang],
  )

  const open = () => navigate(`/briefs/${issue.slug}`)

  return (
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE }}
      aria-label={`Featured issue ${fmtIssueNo(issue.number)}`}
      className="relative cursor-pointer border border-line bg-ink-900 transition-colors duration-200 hover:border-volt/40"
      onClick={open}
    >
      <div className="grid lg:grid-cols-[380px_1fr]">
        {/* Cover — tall column, contain the 4:3 SVG so it is never cropped sideways */}
        <div className="relative min-h-[280px] overflow-hidden bg-ink-950 border-b border-line lg:border-b-0 lg:border-r">
          {issue.coverAsset ? (
            <motion.img
              src={issue.coverAsset}
              alt={`Cover art for issue ${fmtIssueNo(issue.number)}`}
              initial={{ scale: 1.02, filter: 'grayscale(20%)' }}
              animate={{ scale: 1, filter: 'grayscale(0%)' }}
              transition={{ duration: 0.8, ease: EASE }}
              className="absolute inset-0 m-auto h-full max-h-[100%] w-full max-w-[100%] object-contain transition-[filter] duration-300 hover:brightness-110"
            />
          ) : (
            <GhostCover number={issue.number} pillars={issue.pillars} className="absolute inset-0" />
          )}
          <CornerTicks color="var(--volt)" className="z-10 m-3" />
        </div>

        {/* Content */}
        <motion.div
          className="flex flex-col gap-5 p-6 md:p-10"
          initial="closed"
          animate="open"
          variants={{ open: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } }}
        >
          <motion.div
            variants={{ closed: { y: 20, opacity: 0 }, open: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } } }}
            className="flex flex-wrap items-center gap-x-4 gap-y-3"
          >
            <motion.span
              initial={{ scale: 1.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5, ease: EASE }}
            >
              <RubberStamp color="var(--volt)">{tpl(t('issue.latestStamp'), { n: issue.number })}</RubberStamp>
            </motion.span>
            <span className="font-mono text-[11px] tracking-[0.14em] text-faint tnum">
              {fmtIssueNo(issue.number)} · {fmtDateLong(issue.publishedAt, lang)} ·{' '}
              {fmtReadTime(issue.readingMinutes, lang)}
            </span>
            {issue.isFree ? (
              <span className="rounded-sm border border-volt/60 bg-volt/10 px-2 py-[3px] font-mono text-[10.5px] font-medium tracking-[0.12em] text-volt">
                {t('stamp.free')}
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-sm border border-line-strong px-2 py-[3px] font-mono text-[10.5px] font-medium tracking-[0.12em] text-text-muted">
                <Lock className="h-3 w-3 text-signal" /> {t('issue.subscribers')}
              </span>
            )}
            <span className="flex flex-wrap gap-1.5">
              {issue.pillars.map((p) => (
                <PillarTag key={p} pillar={pillarTag(p)}>
                  {t(`pillar.${p}`)}
                </PillarTag>
              ))}
            </span>
          </motion.div>

          <motion.h2
            variants={{ closed: { y: 20, opacity: 0 }, open: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } } }}
            className="font-display text-[clamp(2.1rem,4vw,3.25rem)] font-[450] leading-[1.08] text-text"
          >
            {title}
          </motion.h2>

          {dek && (
            <motion.p
              variants={{ closed: { y: 20, opacity: 0 }, open: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } } }}
              className="line-clamp-2 max-w-[68ch] font-sans text-[16px] leading-[1.65] text-text-muted"
            >
              {dek}
            </motion.p>
          )}

          {/* Chapter ledger preview */}
          {chapters.length > 0 && (
            <motion.div
              variants={{ closed: { y: 20, opacity: 0 }, open: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } } }}
              className="border-t border-line"
            >
              {chapters.map((ch, i) => {
                const color = pillarColor(issue.pillars[i % issue.pillars.length] ?? '')
                return (
                  <div
                    key={ch}
                    className="flex items-center gap-3 border-b border-line py-2.5 font-mono text-[12px] tracking-[0.08em]"
                  >
                    <span className="tnum text-faint">{String(i + 1).padStart(2, '0')}</span>
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="uppercase text-text-muted">{ch}</span>
                  </div>
                )
              })}
            </motion.div>
          )}

          <motion.div
            variants={{ closed: { y: 20, opacity: 0 }, open: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } } }}
            className="mt-1 flex flex-wrap items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <CBBButton variant="primary" to={`/briefs/${issue.slug}`} className="group/btn">
              {t('issue.readNow')}{' '}
              <ArrowRight className="transition-transform duration-200 group-hover/btn:translate-x-1" />
            </CBBButton>
            <SaveButton issueId={issue.id} variant="button" />
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  )
}
