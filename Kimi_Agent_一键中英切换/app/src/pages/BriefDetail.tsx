import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ChevronDown, ThumbsDown, ThumbsUp } from 'lucide-react'
import ChargeGauge from '@/components/ChargeGauge'
import CornerTicks from '@/components/CornerTicks'
import CBBButton from '@/components/Buttons'
import RubberStamp from '@/components/RubberStamp'
import GhostCover from '@/components/briefs/GhostCover'
import IssueCard from '@/components/briefs/IssueCard'
import PaywallGate from '@/components/briefs/PaywallGate'
import ReaderMarkdown, {
  extractHeadings,
  stripDanglingFootnoteRefs,
} from '@/components/briefs/ReaderMarkdown'
import {
  PAPER_TONES,
  ProgressRail,
  READER_SIZES,
  TocRail,
  UtilityDock,
} from '@/components/briefs/ReadingChrome'
import type { PaperTone } from '@/components/briefs/ReadingChrome'
import SaveButton from '@/components/briefs/SaveButton'
import {
  dominantPillar,
  fmtIssueNo,
  pillarColor,
} from '@/components/briefs/pillar'
import type { IssueMeta } from '@/components/briefs/pillar'
import { trpc } from '@/providers/trpc'
import { OpenAccess } from '@contracts/constants'
import { cn } from '@/lib/utils'
import { useLang, tpl } from '@/i18n/lang'
import { fmtDateLong, fmtReadTime, pick } from '@/i18n/format'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** Sheet CSS vars per paper tone (brief-detail.md S0.3: cream ↔ sepia ↔ night-flip). */
const TONE_VARS: Record<PaperTone, Record<string, string>> = {
  cream: {
    '--sheet-bg': '#F4F0E6',
    '--sheet-2': '#EAE4D5',
    '--sheet-ink': '#16181D',
    '--sheet-muted': '#6B6558',
    '--sheet-line': 'rgba(22,24,29,0.15)',
  },
  sepia: {
    '--sheet-bg': '#EFE6D2',
    '--sheet-2': '#E5DAC2',
    '--sheet-ink': '#1A1712',
    '--sheet-muted': '#6E6250',
    '--sheet-line': 'rgba(26,23,18,0.15)',
  },
  night: {
    '--sheet-bg': '#0C1017',
    '--sheet-2': '#151C2B',
    '--sheet-ink': '#EDEBE3',
    '--sheet-muted': '#8E97A8',
    '--sheet-line': 'rgba(237,235,227,0.12)',
  },
}

function wordCount(markdown: string): number {
  return markdown.split(/\s+/).filter(Boolean).length
}

export default function BriefDetail() {
  const { lang, t } = useLang()
  const { slug } = useParams<{ slug: string }>()

  const detailQuery = trpc.content['issues.bySlug'].useQuery(
    { slug: slug ?? '' },
    { enabled: !!slug, retry: false },
  )
  // Unfiltered list for prev/next + related files (S7)
  const listQuery = trpc.content['issues.list'].useQuery(
    { limit: 50 },
    { staleTime: 5 * 60_000 },
  )

  const data = detailQuery.data
  const issue = data ?? null
  const title = issue ? pick(lang, issue.titleZh, issue.title) : ''
  const dek = issue ? pick(lang, issue.dekZh, issue.dek) : null

  // Reader chrome state
  const [sizeIdx, setSizeIdx] = useState(1) // 19px default
  const [tone, setTone] = useState<PaperTone>('cream')
  const [toast, setToast] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>('reader-top')
  const [mobileTocOpen, setMobileTocOpen] = useState(false)
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => {
    if (issue) {
      document.title = `${fmtIssueNo(issue.number)}: ${title} — China Battery Brief`
    } else {
      document.title = 'Brief — China Battery Brief'
    }
  }, [issue])

  const content = useMemo(() => {
    if (!issue) return ''
    // zh mode prefers the translated body (null-safe fallback to English)
    const body = pick(lang, issue.contentZh, issue.content)
    // Truncated previews lose footnote definitions → strip dangling refs
    return issue.paywalled ? stripDanglingFootnoteRefs(body) : body
  }, [issue, lang])

  const headings = useMemo(() => extractHeadings(content), [content])
  const hasSources = /^\[\^\d+\]:/m.test(content)

  // Scrollspy: active = last section whose top has passed the 120px offset
  useEffect(() => {
    if (!issue) return
    const ids = ['reader-top', ...headings.map((h) => h.id), ...(hasSources ? ['sources'] : [])]
    const onScroll = () => {
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 120) current = id
      }
      setActiveId(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [issue, headings, hasSources])

  const share = useCallback(() => {
    const url = window.location.href
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => undefined)
    }
    showToast(t('detail.linkCopied'))
  }, [showToast, t])

  /* ---------- Loading ---------- */
  if (detailQuery.isLoading) {
    return <ReaderSkeleton />
  }

  /* ---------- 404 / error dossier ---------- */
  if (detailQuery.isError || !issue) {
    const code = detailQuery.error?.data?.code ?? 'ERROR'
    return (
      <div className="graph-grid-flat relative flex min-h-[70dvh] items-center justify-center px-[clamp(20px,4vw,48px)] py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="relative flex w-full max-w-[560px] flex-col items-center gap-6 border border-line bg-ink-900 p-10 text-center"
        >
          <CornerTicks color="var(--signal)" className="m-3" />
          <RubberStamp color="var(--signal)">{t('stamp.fileNotFound')}</RubberStamp>
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-normal leading-[1.08] text-text">
            {t('detail.notfoundA')}{' '}
            <em className="italic text-signal">{t('detail.notfoundEm')}</em>
            {t('detail.notfoundB')}
          </h1>
          <div className="w-full border-y border-line py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
            <p>
              {t('detail.requested')} <span className="text-text-muted">{slug ?? '—'}</span>
            </p>
            <p className="mt-1">
              {t('detail.status')} <span className="text-signal">{code}</span> · {t('detail.deskNotified')}
            </p>
          </div>
          <CBBButton variant="ghost" to="/briefs">
            <ArrowLeft /> {t('detail.backToArchive')}
          </CBBButton>
        </motion.div>
      </div>
    )
  }

  /* ---------- Reader ---------- */
  const pillar = dominantPillar(issue.pillars)
  const accent = pillarColor(pillar)
  const words = wordCount(content)
  const sourcesCount = issue.sources?.length ?? 0
  // Truncation keeps ~40% of blocks; estimate the locked remainder
  const remainingWords = issue.paywalled
    ? Math.max(300, Math.round(issue.readingMinutes * 220 - words))
    : 0

  const allIssues: IssueMeta[] = listQuery.data?.issues ?? []
  const older = allIssues
    .filter((i) => i.number < issue.number)
    .sort((a, b) => b.number - a.number)[0]
  const newer = allIssues
    .filter((i) => i.number > issue.number)
    .sort((a, b) => a.number - b.number)[0]
  const related = allIssues
    .filter((i) => i.slug !== issue.slug)
    .map((i) => ({
      issue: i,
      overlap: i.pillars.filter((p) => issue.pillars.includes(p)).length,
    }))
    .sort((a, b) => b.overlap - a.overlap || b.issue.number - a.issue.number)
    .slice(0, 3)
    .map((r) => r.issue)

  const sheetVars = {
    ...TONE_VARS[tone],
    '--reader-body': `${READER_SIZES[sizeIdx]}px`,
    '--dropcap-color': accent,
  } as React.CSSProperties

  return (
    <div className="relative">
      <ProgressRail />
      <TocRail
        headings={headings}
        activeId={activeId}
        pillars={issue.pillars}
        hasSources={hasSources}
      />
      <UtilityDock
        issueId={issue.id}
        sizeIdx={sizeIdx}
        onCycleSize={() => setSizeIdx((i) => (i + 1) % READER_SIZES.length)}
        tone={tone}
        onCycleTone={() =>
          setTone((t) => PAPER_TONES[(PAPER_TONES.indexOf(t) + 1) % PAPER_TONES.length])
        }
        onShare={share}
      />

      {/* Dark chrome → paper sheet */}
      <div id="reader-top" className="graph-grid-flat px-0 pb-0 pt-8 md:px-[clamp(20px,4vw,48px)] md:pt-12">
        <motion.article
          initial={{ y: 80, scale: 0.985, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="paper-grain relative mx-auto max-w-reader shadow-paper-hard"
          style={{ ...sheetVars, backgroundColor: 'var(--sheet-bg)' }}
        >
          {/* S1 · Masthead */}
          <header
            className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 md:px-10"
            style={{ borderBottom: '1px solid var(--sheet-line)' }}
          >
            <span className="flex items-center gap-2.5">
              <img
                src="/seal-cbb.svg"
                alt=""
                className="h-6 w-6"
                style={{ color: 'var(--sheet-ink)' }}
              />
              <span
                className="font-mono text-[13px] font-semibold tracking-[0.16em]"
                style={{ color: 'var(--sheet-ink)' }}
              >
                CHINA BATTERY BRIEF
              </span>
            </span>
            <span
              className="hidden font-mono text-[11px] tracking-[0.14em] tnum sm:block"
              style={{ color: 'var(--sheet-muted)' }}
            >
              {tpl(t('detail.vol'), { no: fmtIssueNo(issue.number) })}
            </span>
            <span
              className="font-mono text-[11px] tracking-[0.14em] tnum"
              style={{ color: 'var(--sheet-muted)' }}
            >
              {fmtDateLong(issue.publishedAt, lang)}
            </span>
          </header>

          {/* Stamp row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-6 pt-6 md:px-10">
            <motion.span
              initial={{ scale: 1.7, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: -6, opacity: 1 }}
              transition={{ duration: 0.28, delay: 0.7, ease: EASE }}
            >
              <RubberStamp color={tone === 'night' ? 'var(--text)' : 'var(--paper-ink)'}>
                {t('stamp.weeklyBrief')} {fmtIssueNo(issue.number)}
              </RubberStamp>
            </motion.span>
            {(issue.isFree || OpenAccess.beta) && (
              <motion.span
                initial={{ scale: 1.7, rotate: -14, opacity: 0 }}
                animate={{ scale: 1, rotate: -4, opacity: 1 }}
                transition={{ duration: 0.28, delay: 0.82, ease: EASE }}
              >
                <RubberStamp color="var(--signal)" rotate={-4}>
                  {issue.isFree ? t('stamp.free') : t('stamp.betaFree')}
                </RubberStamp>
              </motion.span>
            )}
            <span
              className="font-mono text-[11px] tracking-[0.14em] tnum"
              style={{ color: 'var(--sheet-muted)' }}
            >
              {sourcesCount > 0 ? `${tpl(t('detail.sources'), { n: sourcesCount })} · ` : ''}
              {tpl(t('detail.words'), { n: words.toLocaleString() })} · {fmtReadTime(issue.readingMinutes, lang)}
            </span>
            <span className="flex flex-wrap gap-1.5">
              {issue.pillars.map((p) => (
                <PaperPillarTag key={p} pillar={p} />
              ))}
            </span>
          </div>

          {/* Mobile contents toggle */}
          <div className="px-6 pt-6 md:px-10 xl:hidden">
            <button
              type="button"
              onClick={() => setMobileTocOpen((v) => !v)}
              aria-expanded={mobileTocOpen}
              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em]"
              style={{ color: 'var(--sheet-muted)' }}
            >
              {t('detail.contents')}{' '}
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform', mobileTocOpen && 'rotate-180')}
              />
            </button>
            {mobileTocOpen && (
              <ul className="mt-3 flex flex-col gap-1.5 border-l-2 pl-3" style={{ borderColor: 'var(--sheet-line)' }}>
                {headings.map((h, i) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileTocOpen(false)
                        document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="text-left font-mono text-[11px] uppercase tracking-[0.08em]"
                      style={{ color: 'var(--sheet-muted)' }}
                    >
                      {String(i + 1).padStart(2, '0')} — {h.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* S2 · Title block */}
          <div className="px-6 pt-10 md:px-10">
            <p
              className="font-mono text-[11px] font-medium uppercase tracking-[0.16em]"
              style={{ color: accent }}
            >
              {tpl(t('detail.leadStory'), { no: fmtIssueNo(issue.number) })}
            </p>
            <h1
              className="mt-4 font-display text-[clamp(2.2rem,4.5vw,3.5rem)] font-[450] leading-[1.08]"
              style={{ color: 'var(--sheet-ink)' }}
            >
              {title}
            </h1>
            {dek && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-5 max-w-[62ch] font-serif text-[22px] italic leading-[1.5]"
                style={{ color: 'var(--sheet-muted)' }}
              >
                {dek}
              </motion.p>
            )}
            <div
              className="mt-6 flex flex-wrap items-center justify-between gap-3 pb-8"
              style={{ borderBottom: '1px solid var(--sheet-line)' }}
            >
              <span
                className="font-mono text-[11px] uppercase tracking-[0.14em]"
                style={{ color: 'var(--sheet-muted)' }}
              >
                {tpl(t('detail.byline'), { n: fmtReadTime(issue.readingMinutes, lang) })}
              </span>
              <SaveButton issueId={issue.id} variant="link" />
            </div>
          </div>

          {/* Hero figure */}
          <figure className="px-6 pt-8 md:px-10">
            <motion.div
              initial={{ clipPath: 'inset(100% 0 0 0)' }}
              animate={{ clipPath: 'inset(0% 0 0 0)' }}
              transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
              className="relative aspect-[4/3] overflow-hidden"
            >
              {issue.coverAsset ? (
                <img
                  src={issue.coverAsset}
                  alt={`Cover art — ${title}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <GhostCover number={issue.number} pillars={issue.pillars} />
              )}
              <CornerTicks color={tone === 'night' ? 'var(--text)' : 'var(--paper-ink)'} className="m-3" />
            </motion.div>
            <figcaption
              className="mt-2 text-right font-mono text-[10.5px] uppercase tracking-[0.12em]"
              style={{ color: 'var(--sheet-muted)' }}
            >
              {tpl(t('detail.figcap'), { no: fmtIssueNo(issue.number) })}
            </figcaption>
          </figure>

          {/* S4 · Body (+ S5 paywall gate) */}
          <div className="px-6 pb-14 pt-4 md:px-10">
            <ReaderMarkdown content={content} pillars={issue.pillars} headings={headings} />
            {issue.paywalled && (
              <PaywallGate
                slug={issue.slug}
                remainingWords={remainingWords}
                sourcesCount={sourcesCount}
              />
            )}

            {/* S5.5 · Sources & attribution (full view only) */}
            {!issue.paywalled && issue.sources && issue.sources.length > 0 && (
              <section
                aria-label={t('detail.sourcesHeading')}
                className="mt-14 pt-8"
                style={{ borderTop: '1px solid var(--sheet-line)' }}
              >
                <h2
                  className="font-mono text-[11px] font-medium uppercase tracking-[0.16em]"
                  style={{ color: 'var(--sheet-muted)' }}
                >
                  {t('detail.sourcesHeading')}
                </h2>
                <ol className="mt-5 flex flex-col">
                  {issue.sources.map((src, i) => (
                    <li
                      key={i}
                      className="flex items-baseline gap-4 py-2.5"
                      style={{
                        borderBottom:
                          i < issue.sources!.length - 1 ? '1px solid var(--sheet-line)' : undefined,
                      }}
                    >
                      <span
                        className="shrink-0 font-mono text-[10.5px] tracking-[0.1em] tnum"
                        style={{ color: 'var(--sheet-muted)' }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span
                          className="font-mono text-[10.5px] uppercase tracking-[0.12em]"
                          style={{ color: 'var(--sheet-muted)' }}
                        >
                          {src.outlet} · {src.date}
                        </span>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-serif text-[14.5px] leading-relaxed underline decoration-dotted underline-offset-4 transition-colors hover:text-volt hover:decoration-solid"
                          style={{ color: 'var(--sheet-ink)' }}
                        >
                          {src.title}
                        </a>
                      </span>
                    </li>
                  ))}
                </ol>
                <p
                  className="mt-4 font-serif text-[13px] italic leading-relaxed"
                  style={{ color: 'var(--sheet-muted)' }}
                >
                  {t('detail.sourcesNote')}
                </p>
              </section>
            )}

            {/* S6 · Article footer */}
            <footer className="mt-16" style={{ borderTop: '1px solid var(--sheet-line)' }}>
              {/* Feedback row */}
              <div className="flex flex-wrap items-center gap-4 pt-8">
                <span
                  className="font-mono text-[11px] font-medium uppercase tracking-[0.16em]"
                  style={{ color: 'var(--sheet-muted)' }}
                >
                  {t('detail.feedback')}
                </span>
                {feedback ? (
                  <span
                    className="font-mono text-[11px] uppercase tracking-[0.14em]"
                    style={{ color: 'var(--sheet-ink)' }}
                  >
                    {t('detail.logged')}
                  </span>
                ) : (
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFeedback('yes')
                        showToast(t('detail.feedbackToast'))
                      }}
                      className="flex items-center gap-1.5 rounded-sm border px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] transition-transform duration-200 hover:-translate-y-0.5"
                      style={{ borderColor: 'var(--sheet-line)', color: 'var(--sheet-ink)' }}
                    >
                      <ThumbsUp className="h-3 w-3" /> {t('detail.yes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFeedback('no')
                        showToast(t('detail.feedbackToast'))
                      }}
                      className="flex items-center gap-1.5 rounded-sm border px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] transition-transform duration-200 hover:-translate-y-0.5"
                      style={{ borderColor: 'var(--sheet-line)', color: 'var(--sheet-ink)' }}
                    >
                      <ThumbsDown className="h-3 w-3" /> {t('detail.no')}
                    </button>
                  </span>
                )}
              </div>

              {/* Share row */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em]">
                <button
                  type="button"
                  onClick={share}
                  className="transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ color: 'var(--sheet-ink)' }}
                >
                  {t('detail.copyLink')}
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-transform duration-200 hover:-translate-y-0.5 inline-block"
                  style={{ color: 'var(--sheet-ink)' }}
                >
                  X/TWITTER
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-transform duration-200 hover:-translate-y-0.5 inline-block"
                  style={{ color: 'var(--sheet-ink)' }}
                >
                  LINKEDIN
                </a>
                <Link
                  to="/about#corrections"
                  className="ml-auto transition-colors hover:underline"
                  style={{ color: 'var(--sheet-muted)' }}
                >
                  {t('detail.corrections')}
                </Link>
              </div>

              {/* Colophon */}
              <div className="relative mt-14 flex flex-col items-center gap-4 pb-4 text-center">
                <img
                  src="/seal-cbb.svg"
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]"
                  style={{ color: 'var(--sheet-ink)' }}
                />
                {!issue.paywalled && (
                  <span className="w-full max-w-[280px]" style={{ color: 'var(--sheet-ink)' }}>
                    <ChargeGauge value={100} color={accent} showLabel />
                  </span>
                )}
                <p
                  className="font-mono text-[11px] uppercase tracking-[0.16em]"
                  style={{ color: 'var(--sheet-muted)' }}
                >
                  {tpl(t('detail.colophon'), { no: fmtIssueNo(issue.number) })}
                </p>
              </div>
            </footer>
          </div>
        </motion.article>
      </div>

      {/* S7 · Prev/Next + related (dark chrome resumes) */}
      <section className="mt-16 border-t border-line py-24">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)]">
          <div className="grid gap-px border border-line bg-line lg:grid-cols-2">
            <PrevNextPanel
              direction="older"
              issue={older}
              fallbackLabel={t('detail.firstFile')}
            />
            {newer ? (
              <PrevNextPanel direction="newer" issue={newer} />
            ) : (
              <Link
                to="/pricing"
                className="group flex flex-col gap-2 bg-ink-950 p-8 transition-colors duration-200 hover:bg-ink-850"
              >
                <span className="font-mono text-[11px] tracking-[0.14em] text-faint">
                  {t('detail.nextFile')}
                </span>
                <span className="font-display text-[22px] leading-[1.15] text-text transition-colors group-hover:text-volt">
                  {tpl(t('detail.nextThursday'), { no: fmtIssueNo(issue.number + 1) })}
                </span>
                <span className="font-mono text-[11px] tracking-[0.12em] text-volt">
                  {t('detail.subscribeCta')}
                </span>
              </Link>
            )}
          </div>

          {related.length > 0 && (
            <div className="mt-16">
              <div className="mb-6 flex items-center gap-3">
                <span className="kicker text-text-muted">{t('detail.related')}</span>
                <span aria-hidden className="h-px w-10 bg-line-strong" />
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <IssueCard key={r.id} issue={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Toast (design.md §8.7) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
            role="status"
            className="fixed bottom-6 right-6 z-[80] border-l-2 border-volt bg-ink-800 px-4 py-3 font-mono text-[12px] tracking-[0.1em] text-text shadow-paper-hard"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** On-paper pillar tag: pillar-colored border, ink text (brief-detail.md S1). */
function PaperPillarTag({ pillar }: { pillar: string }) {
  const { t } = useLang()
  const c = pillarColor(pillar)
  return (
    <span
      className="inline-block rounded-sm px-2 py-[3px] font-mono text-[10.5px] font-medium uppercase tracking-[0.12em]"
      style={{
        color: 'var(--sheet-ink)',
        border: `1px solid ${c}`,
        backgroundColor: `${c}14`,
      }}
    >
      {t(`pillar.${pillar}`)}
    </span>
  )
}

function PrevNextPanel({
  direction,
  issue,
  fallbackLabel,
}: {
  direction: 'older' | 'newer'
  issue?: IssueMeta
  fallbackLabel?: string
}) {
  const { lang, t } = useLang()
  if (!issue) {
    return (
      <div className="flex flex-col gap-2 bg-ink-950 p-8">
        <span className="font-mono text-[11px] tracking-[0.14em] text-faint">
          {direction === 'older' ? t('detail.olderFile') : t('detail.nextFile')}
        </span>
        <span className="font-mono text-[13px] text-faint">{fallbackLabel ?? '—'}</span>
      </div>
    )
  }
  return (
    <Link
      to={`/briefs/${issue.slug}`}
      className="group flex flex-col gap-2 bg-ink-950 p-8 transition-colors duration-200 hover:bg-ink-850"
    >
      <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-faint">
        {direction === 'older' ? (
          <>
            <ArrowLeft className="h-3 w-3" /> {t('detail.olderFile')}
          </>
        ) : (
          <>
            {t('detail.newerFile')} <ArrowRight className="h-3 w-3" />
          </>
        )}
      </span>
      <span className="font-display text-[22px] leading-[1.15] text-text transition-colors group-hover:text-volt">
        {fmtIssueNo(issue.number)} {lang === 'zh' ? (issue.titleZh ?? issue.title) : issue.title}
      </span>
      <span className="font-mono text-[11px] tracking-[0.12em] text-faint tnum">
        {fmtDateLong(issue.publishedAt, lang)} · {fmtReadTime(issue.readingMinutes, lang)}
      </span>
    </Link>
  )
}

function ReaderSkeleton() {
  return (
    <div className="px-0 pt-8 md:px-[clamp(20px,4vw,48px)] md:pt-12">
      <div className="mx-auto max-w-reader animate-pulse bg-paper shadow-paper-hard">
        <div className="h-16 border-b border-paper-ink/10" />
        <div className="space-y-4 p-10">
          <div className="h-8 w-24 bg-paper-2" />
          <div className="h-12 w-4/5 bg-paper-2" />
          <div className="h-5 w-3/5 bg-paper-2" />
          <div className="aspect-[4/3] w-full bg-paper-2" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-4 w-full bg-paper-2" />
          ))}
        </div>
      </div>
    </div>
  )
}
