import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import TickerBar from '@/components/TickerBar'
import StatBlock from '@/components/StatBlock'
import KickerLine from '@/components/KickerLine'
import CornerTicks from '@/components/CornerTicks'
import CBBButton from '@/components/Buttons'
import FilterBar from '@/components/intel/FilterBar'
import FactoryTable from '@/components/intel/FactoryTable'
import FactoryDrawer from '@/components/intel/FactoryDrawer'
import type { FactoryRow, TrackerFilters } from '@/components/intel/intel-utils'
import { EMPTY_FILTERS, regionOf } from '@/components/intel/intel-utils'
import { trpc } from '@/providers/trpc'
import { useLang } from '@/i18n/lang'

/* tracker.md — Global Factory Tracker (/tracker) */

const WorldMap = lazy(() => import('@/components/intel/WorldMap'))

function applyFilters(rows: FactoryRow[], f: TrackerFilters): FactoryRow[] {
  const q = f.search.trim().toLowerCase()
  return rows.filter((r) => {
    if (f.country && r.countryCode !== f.country) return false
    if (f.companies.length > 0 && !f.companies.includes(r.company)) return false
    if (f.statuses.length > 0 && !f.statuses.includes(r.status)) return false
    if (f.chemistry && !(r.chemistry ?? []).some((c) => c.toUpperCase().includes(f.chemistry!))) return false
    if (f.region && regionOf(r.countryCode) !== f.region) return false
    if (q) {
      const hay = `${r.siteName} ${r.city ?? ''} ${r.country}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export default function Tracker() {
  const { t } = useLang()
  const headerRef = useRef<HTMLDivElement>(null)
  const [searchParams] = useSearchParams()
  const countryParam = searchParams.get('country')

  // Deep link from Risk Radar exposure cards: /tracker?country=US (initial filter)
  const [filters, setFilters] = useState<TrackerFilters>(() => ({
    ...EMPTY_FILTERS,
    country: countryParam,
  }))
  const [selected, setSelected] = useState<FactoryRow | null>(null)

  // Live data (19 seeded sites); falls back to empty while loading
  const { data } = trpc.content['factories.list'].useQuery()
  const { data: stats } = trpc.content['factories.stats'].useQuery()

  const factories = useMemo(() => (data ?? []) as FactoryRow[], [data])
  const filtered = useMemo(() => applyFilters(factories, filters), [factories, filters])

  const companies = useMemo(() => {
    const fromStats = stats?.companies ?? []
    const set = new Set<string>([...fromStats, ...factories.map((f) => f.company)])
    return [...set].sort()
  }, [stats, factories])

  const countryCount = useMemo(
    () => new Set(factories.map((f) => f.countryCode).filter(Boolean)).size,
    [factories],
  )

  useEffect(() => {
    document.title = 'Global Factory Tracker — China Battery Brief'
  }, [])

  /* S0 header band entrance (tracker.md): image 1.08→1, kicker/H1/sub reveals */
  useGSAP(
    () => {
      gsap.fromTo(
        '.tracker-hero-img',
        { scale: 1.08 },
        { scale: 1, duration: 1.2, ease: 'expo.out' },
      )
      gsap.fromTo(
        '.tracker-hero-el',
        { y: 36, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'expo.out', delay: 0.1 },
      )
    },
    { scope: headerRef },
  )

  const totalSites = stats?.totalSites ?? 47
  const totalGwh = Math.round(stats?.totalGwh ?? 1240)

  return (
    <>
      {/* ---------------- S0 · Header band ---------------- */}
      <div ref={headerRef} className="relative -mt-16 h-[440px] overflow-hidden">
        <img
          src="/tracker-header.png"
          alt=""
          className="tracker-hero-img absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(7,9,13,0.25) 0%, rgba(7,9,13,0.55) 55%, var(--ink-950) 100%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] pb-10">
            <p className="tracker-hero-el kicker text-volt">{t('tracker.kicker')}</p>
            <h1 className="tracker-hero-el mt-4 font-display text-[clamp(2.5rem,5.5vw,5rem)] font-normal leading-[0.98] tracking-[-0.02em] text-text">
              {t('tracker.h1A')}
              <em className="italic text-volt">{t('tracker.h1Em')}</em>
              {t('tracker.h1B')}
            </h1>
            <p className="tracker-hero-el mt-4 max-w-[56ch] font-sans text-[15px] leading-relaxed text-text-muted">
              {t('tracker.sub')}
            </p>
          </div>
        </div>
      </div>

      <TickerBar />

      {/* ---------------- S1 · Stats band ---------------- */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-container grid-cols-2 gap-px bg-line lg:grid-cols-4">
          {[
            <StatBlock key="a" value={totalSites} label={t('tracker.stat1')} />,
            <StatBlock key="b" value={totalGwh} label={t('tracker.stat2')} />,
            <StatBlock key="c" value={countryCount || 23} label={t('tracker.stat3')} />,
            <StatBlock key="d" value={61} prefix="$" suffix="B" label={t('tracker.stat4')} />,
          ].map((el, i) => (
            <div key={i} className="bg-ink-950 px-6 py-8">
              {el}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- S2 · The Map ---------------- */}
      <section className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] pt-16">
        <KickerLine chapter="02" label={t('tracker.mapKicker')} />
        <div className="relative mt-6 h-[70vh] min-h-[480px] border border-line lg:h-[calc(100dvh-8rem)] lg:min-h-[640px]">
          <CornerTicks color="var(--line-strong)" />
          <Suspense
            fallback={
              <div className="graph-grid flex h-full items-center justify-center bg-ink-950">
                <span className="font-mono text-[11px] tracking-[0.16em] text-faint animate-pulse-dot">
                  {t('tracker.mapLoading')}
                </span>
              </div>
            }
          >
            <WorldMap
              factories={filtered}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
          </Suspense>
        </div>
      </section>

      {/* ---------------- S4 · Filter bar (sticky) ---------------- */}
      <div className="mt-16">
        <FilterBar
          companies={companies}
          filters={filters}
          onChange={setFilters}
          shown={filtered.length}
          total={factories.length}
        />
      </div>

      {/* ---------------- S5 · Database table ---------------- */}
      <section className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-12">
        <FactoryTable rows={filtered} onOpen={setSelected} />
      </section>

      {/* ---------------- S6 · Methodology & trust strip ---------------- */}
      <section className="border-t border-line">
        <div className="mx-auto grid max-w-container gap-10 px-[clamp(20px,4vw,48px)] py-20 lg:grid-cols-3">
          {[
            {
              k: t('tracker.verifyK'),
              b: t('tracker.verifyB'),
            },
            {
              k: t('tracker.cadenceK'),
              b: t('tracker.cadenceB'),
            },
            {
              k: t('tracker.correctionsK'),
              b: t('tracker.correctionsB'),
              link: { label: t('tracker.seeLog'), to: '/about#corrections' },
            },
          ].map((col) => (
            <div key={col.k}>
              <div className="flex items-center gap-3">
                <span className="kicker text-volt">{col.k}</span>
                <span aria-hidden className="h-px w-10 bg-line-strong" />
              </div>
              <p className="mt-4 font-sans text-[14px] leading-relaxed text-text-muted">{col.b}</p>
              {col.link && (
                <a
                  href={col.link.to}
                  className="mt-3 inline-block font-mono text-[11px] tracking-[0.12em] text-volt hover:underline"
                >
                  {col.link.label}
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- S7 · CTA strip ---------------- */}
      <section className="border-t border-line bg-volt-dim">
        <div className="mx-auto flex max-w-container flex-col items-start justify-between gap-6 px-[clamp(20px,4vw,48px)] py-16 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-display text-[30px] leading-tight text-text">
              {t('tracker.ctaA')}
              <em className="italic text-volt">{t('tracker.ctaEm')}</em>
              {t('tracker.ctaB')}
            </h2>
            <p className="mt-2 font-mono text-[11px] tracking-[0.14em] text-text-muted">
              {t('tracker.ctaSub')}
            </p>
          </div>
          <CBBButton to="/pricing">{t('tracker.ctaButton')}</CBBButton>
        </div>
      </section>

      {/* ---------------- S3 · Detail drawer ---------------- */}
      <FactoryDrawer factory={selected} onClose={() => setSelected(null)} />
    </>
  )
}
