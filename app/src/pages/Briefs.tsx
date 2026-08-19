import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import CBBButton from '@/components/Buttons'
import FilterBar from '@/components/briefs/FilterBar'
import type { PillarFilter, SortKey, ViewMode } from '@/components/briefs/FilterBar'
import FeaturedIssue from '@/components/briefs/FeaturedIssue'
import IssueRow from '@/components/briefs/IssueRow'
import IssueCard from '@/components/briefs/IssueCard'
import ArchiveSidebar from '@/components/briefs/ArchiveSidebar'
import { PILLAR_ORDER } from '@/components/briefs/pillar'
import type { IssueMeta } from '@/components/briefs/pillar'
import { trpc } from '@/providers/trpc'
import { useLang, tpl } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]
const PAGE_SIZE = 8

/** Client-side region keyword map (issue metadata carries no region field). */
const REGION_KEYWORDS: Record<string, string[]> = {
  europe: ['hungary', 'debrecen', 'germany', 'spain', 'zaragoza', 'europe', 'brussels', 'portugal', 'sines', 'szeged', 'eu '],
  'se-asia': ['indonesia', 'nickel', 'hpal', 'antam', 'cikarang'],
  'n-america': ['michigan', 'marshall', 'ford', 'u.s', 'united states', 'america', 'feoc', 'pfe', 'tariff'],
  's-america': ['brazil', 'camaçari', 'lula', 'mercosur'],
  africa: ['morocco', 'kenitra'],
  'middle-east': ['saudi', 'uae', 'emirates', 'qatar', 'turkey'],
}

function matchesRegion(issue: IssueMeta, region: string): boolean {
  if (region === 'all') return true
  const hay = `${issue.title} ${issue.dek ?? ''}`.toLowerCase()
  return (REGION_KEYWORDS[region] ?? []).some((k) => hay.includes(k))
}

function sortIssues(issues: IssueMeta[], sort: SortKey): IssueMeta[] {
  const arr = [...issues]
  if (sort === 'oldest') arr.sort((a, b) => a.number - b.number)
  else if (sort === 'most-read') arr.sort((a, b) => b.readingMinutes - a.readingMinutes)
  else arr.sort((a, b) => b.number - a.number)
  return arr
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
  exit: { transition: { staggerChildren: 0.02 } },
}
const itemVariants = {
  hidden: { y: 24, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: EASE } },
  exit: { y: 8, opacity: 0, transition: { duration: 0.15 } },
}

export default function Briefs() {
  const { t } = useLang()
  const [params, setParams] = useSearchParams()

  // URL-reflected filter state (briefs.md S5)
  const pillar = (params.get('pillar') as PillarFilter | null) ?? 'all'
  const q = params.get('q') ?? ''
  const region = params.get('region') ?? 'all'
  const sort = (params.get('sort') as SortKey | null) ?? 'newest'
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)

  // View mode persisted to localStorage (S1)
  const [view, setView] = useState<ViewMode>(() =>
    typeof window !== 'undefined' && window.localStorage.getItem('cbb-briefs-view') === 'grid'
      ? 'grid'
      : 'list',
  )
  useEffect(() => {
    window.localStorage.setItem('cbb-briefs-view', view)
  }, [view])

  useEffect(() => {
    document.title = 'Briefs — China Battery Brief'
  }, [])

  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v === null || v === '') next.delete(k)
          else next.set(k, v)
        }
        return next
      })
    },
    [setParams],
  )

  const setPillar = (p: PillarFilter) => patchParams({ pillar: p === 'all' ? null : p, page: null })
  const setSearch = (v: string) => patchParams({ q: v.trim() === '' ? null : v, page: null })
  const setRegion = (r: string) => patchParams({ region: r === 'all' ? null : r, page: null })
  const setSort = (s: SortKey) => patchParams({ sort: s === 'newest' ? null : s })
  const setPage = (p: number) => patchParams({ page: p <= 1 ? null : String(p) })
  const clearFilters = () =>
    patchParams({ pillar: null, q: null, region: null, sort: null, page: null })

  // Filtered archive query (server filters pillar + q; region/sort client-side)
  const archiveQuery = trpc.content['issues.list'].useQuery({
    pillar: pillar === 'all' ? undefined : pillar,
    q: q.trim() === '' ? q.trim() : undefined,
    limit: page * PAGE_SIZE,
  })
  // Unfiltered query for pillar counts / most-read sidebar
  const allQuery = trpc.content['issues.list'].useQuery(
    { limit: 50 },
    { staleTime: 5 * 60_000 },
  )

  const allIssues: IssueMeta[] = useMemo(() => allQuery.data?.issues ?? [], [allQuery.data])
  const total = allQuery.data?.total ?? 0

  const counts = useMemo(() => {
    const c: Record<PillarFilter, number> = { all: allIssues.length } as Record<PillarFilter, number>
    for (const p of PILLAR_ORDER) {
      c[p] = allIssues.filter((i) => i.pillars.includes(p)).length
    }
    return c
  }, [allIssues])

  const visible: IssueMeta[] = useMemo(() => {
    const rows = (archiveQuery.data?.issues ?? []) as IssueMeta[]
    return sortIssues(rows.filter((i) => matchesRegion(i, region)), sort)
  }, [archiveQuery.data, region, sort])

  const isLoading = archiveQuery.isLoading
  const filtersActive = pillar !== 'all' || q.trim() !== '' || region !== 'all'
  const featured = !filtersActive && page === 1 ? visible[0] : undefined
  const rest = featured ? visible.slice(1) : visible

  // Pagination math: server `total` counts all issues; exact only when unfiltered
  const totalPages = filtersActive
    ? visible.length >= page * PAGE_SIZE
      ? page + 1
      : page
    : Math.max(1, Math.ceil(total / PAGE_SIZE))
  const canOlder = filtersActive
    ? visible.length >= page * PAGE_SIZE
    : page < totalPages
  const filterKey = `${pillar}|${q}|${region}|${sort}`

  return (
    <div>
      {/* S0 · Page header */}
      <section className="border-b border-line pb-12 pt-24">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)]">
          <motion.p
            key={t('briefs.archiveKicker')}
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.01 } } }}
            className="kicker text-text-muted"
          >
            {t('briefs.archiveKicker').split('').map((ch, i) => (
              <motion.span
                key={i}
                aria-hidden
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
              >
                {ch}
              </motion.span>
            ))}
            <span className="tnum text-volt">
              {' '}
              · {total} {t('briefs.filesSuffix')} ·
            </span>{' '}
            {t('briefs.updated')}
          </motion.p>
          <h1 className="mt-6 font-display text-[clamp(2.75rem,6vw,5.5rem)] font-normal leading-[0.98] tracking-[-0.02em] text-text">
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
              >
                {t('briefs.h1a')}
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span
                className="block"
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: 0.12, ease: EASE }}
              >
                {t('briefs.h1bA')}
                <em className="italic text-volt">{t('briefs.h1em')}</em>
                {t('briefs.h1B')}
              </motion.span>
            </span>
          </h1>
          <motion.p
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
            className="mt-6 max-w-[60ch] font-sans text-[16px] leading-[1.65] text-text-muted"
          >
            {total > 0 ? tpl(t('briefs.subCount'), { n: total }) : ''}
            {t('briefs.subRest')}
          </motion.p>
        </div>
      </section>

      {/* S1 · Filter bar (sticky) */}
      <FilterBar
        pillar={pillar}
        onPillarChange={setPillar}
        counts={counts}
        region={region}
        onRegionChange={setRegion}
        sort={sort}
        onSortChange={setSort}
        search={q}
        onSearchChange={setSearch}
        resultCount={visible.length}
        view={view}
        onViewChange={setView}
        onClearFilters={clearFilters}
      />

      {/* S2 · Featured issue (latest, when unfiltered) */}
      {featured && (
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-12">
          <FeaturedIssue issue={featured} />
        </div>
      )}

      {/* S3/S4 · Index + sidebar */}
      <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] pb-24">
        <div className="grid gap-16 xl:grid-cols-[1fr_320px]">
          <div>
            {isLoading ? (
              <ArchiveSkeleton view={view} />
            ) : rest.length === 0 && !featured ? (
              <EmptyState onClear={clearFilters} />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={filterKey}
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  {view === 'list' ? (
                    <div className="border-t border-line">
                      {rest.map((issue) => (
                        <IssueRow key={issue.id} issue={issue} variants={itemVariants} />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                      {rest.map((issue) => (
                        <IssueCard key={issue.id} issue={issue} variants={itemVariants} />
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {/* S5 · Pagination */}
            {!isLoading && rest.length > 0 && (
              <div className="mt-12 flex flex-col items-center gap-6">
                <div className="flex w-full items-center justify-between font-mono text-[11px] tracking-[0.14em]">
                  <button
                    type="button"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="flex items-center gap-2 rounded-sm border border-line-strong px-4 py-2.5 text-text transition-colors duration-200 hover:border-text hover:bg-text/5 disabled:cursor-not-allowed disabled:border-line disabled:text-faint"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> {t('briefs.newer')}
                  </button>
                  <span className="text-faint tnum">
                    {tpl(t('briefs.page'), { p: page, tp: totalPages })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(page + 1)}
                    disabled={!canOlder}
                    className="flex items-center gap-2 rounded-sm border border-line-strong px-4 py-2.5 text-text transition-colors duration-200 hover:border-text hover:bg-text/5 disabled:cursor-not-allowed disabled:border-line disabled:text-faint"
                  >
                    {t('briefs.older')} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                {canOlder && (
                  <CBBButton variant="ghost" onClick={() => setPage(page + 1)}>
                    {t('briefs.loadMore')}
                  </CBBButton>
                )}
              </div>
            )}
          </div>

          {/* S4 · Sidebar */}
          <ArchiveSidebar
            issues={allIssues}
            pillarCounts={counts}
            onPillarSelect={(p) => setPillar(p)}
            onCompanySelect={(name) => {
              setSearch(name)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        </div>
      </div>
    </div>
  )
}

function ArchiveSkeleton({ view }: { view: ViewMode }) {
  const rows = Array.from({ length: 6 }, (_, i) => i)
  if (view === 'grid') {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
        {rows.map((i) => (
          <div key={i} className="h-72 animate-pulse border border-line bg-ink-900" />
        ))}
      </div>
    )
  }
  return (
    <div className="border-t border-line">
      {rows.map((i) => (
        <div key={i} className="h-24 animate-pulse border-b border-line bg-ink-900/40" />
      ))}
    </div>
  )
}

/** briefs.md S6 — empty state */
function EmptyState({ onClear }: { onClear: () => void }) {
  const { t } = useLang()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative flex flex-col items-center gap-6 py-24 text-center"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-[120px] leading-none text-text/[0.06]"
      >
        ∅
      </span>
      <p className="relative font-mono text-[13px] uppercase tracking-[0.16em] text-text-muted">
        {t('briefs.empty')}
      </p>
      <CBBButton variant="ghost" onClick={onClear} className="relative">
        {t('briefs.clearFilters')}
      </CBBButton>
    </motion.div>
  )
}
