import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Download, Search, SlidersHorizontal, X } from 'lucide-react'
import type { FactoryStatus, Region, TrackerFilters } from '@/components/intel/intel-utils'
import { REGIONS, STATUS_META, STATUS_ORDER, countActiveFilters } from '@/components/intel/intel-utils'
import { cn } from '@/lib/utils'
import { useLang, tpl } from '@/i18n/lang'

/* ------------------------------------------------------------------ */
/* tracker.md S4 — sticky filter bar above the database table.         */
/* ------------------------------------------------------------------ */

const CHEMISTRIES = ['LFP', 'LMFP', 'NMC', 'NA-ION', 'SEMI-SOLID', 'SOLID-STATE'] as const

const REGION_KEYS: Record<Region, string> = {
  Europe: 'tf.region.europe',
  'SE Asia': 'tf.region.se-asia',
  'N. America': 'tf.region.n-america',
  'S. America': 'tf.region.s-america',
  MENA: 'tf.region.mena',
  UK: 'tf.region.uk',
}

export default function FilterBar({
  companies,
  filters,
  onChange,
  shown,
  total,
}: {
  companies: string[]
  filters: TrackerFilters
  onChange: (f: TrackerFilters) => void
  shown: number
  total: number
}) {
  const { t } = useLang()
  const [expanded, setExpanded] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const active = countActiveFilters(filters)

  const toggleCompany = (c: string) =>
    onChange({
      ...filters,
      companies: filters.companies.includes(c)
        ? filters.companies.filter((x) => x !== c)
        : [...filters.companies, c],
    })

  const toggleStatus = (s: FactoryStatus) =>
    onChange({
      ...filters,
      statuses: filters.statuses.includes(s)
        ? filters.statuses.filter((x) => x !== s)
        : [...filters.statuses, s],
    })

  const set = (patch: Partial<TrackerFilters>) => onChange({ ...filters, ...patch })

  const groups = (
    <div className="flex flex-col gap-4">
      {/* company chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="kicker mr-2 w-20 shrink-0 text-faint">{t('tf.company')}</span>
        {companies.map((c) => {
          const on = filters.companies.includes(c)
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleCompany(c)}
              className={cn(
                'rounded-sm border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-all duration-[180ms]',
                on
                  ? 'scale-100 border-volt bg-volt-dim text-volt'
                  : 'scale-95 border-line-strong text-text-muted hover:border-text hover:text-text',
              )}
            >
              {c}
            </button>
          )
        })}
      </div>

      {/* chemistry segmented */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="kicker mr-2 w-20 shrink-0 text-faint">{t('tf.chemistry')}</span>
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-line-strong">
          {CHEMISTRIES.map((c) => {
            const on = filters.chemistry === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => set({ chemistry: on ? null : c })}
                className={cn(
                  'border-r border-line-strong px-2.5 py-1.5 font-mono text-[11px] tracking-[0.08em] transition-colors duration-[180ms] last:border-r-0',
                  on ? 'bg-volt-dim text-volt' : 'text-text-muted hover:bg-ink-800 hover:text-text',
                )}
              >
                {c}
              </button>
            )
          })}
        </div>
      </div>

      {/* status pills + region + search */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="kicker mr-2 w-20 shrink-0 text-faint">{t('tf.status')}</span>
          {STATUS_ORDER.map((s) => {
            const on = filters.statuses.includes(s)
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                className={cn(
                  'flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-all duration-[180ms]',
                  on ? 'scale-100 border-current' : 'scale-95 border-line-strong text-text-muted hover:text-text',
                )}
                style={on ? { color: STATUS_META[s].color, backgroundColor: 'rgba(237,235,227,0.03)' } : undefined}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_META[s].color }} />
                {t(`status.${s}`)}
              </button>
            )
          })}
        </div>

        {/* region select */}
        <div className="relative">
          <select
            value={filters.region ?? ''}
            onChange={(e) => set({ region: (e.target.value || null) as Region | null })}
            aria-label={t('tf.region')}
            className="appearance-none rounded-sm border border-line-strong bg-ink-900 py-1.5 pl-3 pr-8 font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted focus:border-volt focus:outline-none"
          >
            <option value="">{t('tf.allRegions')}</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {t(REGION_KEYS[r])}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
        </div>

        {/* search */}
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder={t('tf.searchPh')}
            className="w-full rounded-sm border border-line bg-ink-900 py-1.5 pl-9 pr-3 font-mono text-[12px] text-text placeholder:text-faint focus:border-volt focus:outline-none"
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className="sticky top-16 z-30 border-y border-line bg-ink-950/85 backdrop-blur-[12px]">
      <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] py-4">
        {/* top row: mobile toggle + result count + export */}
        <div className="mb-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-2 rounded-sm border border-line-strong px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] text-text lg:hidden"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t('tf.filter')}{active > 0 ? ` (${active})` : ''}
          </button>
          <p className="font-mono text-[11px] tnum tracking-[0.12em] text-faint">
            {tpl(t('tf.shown'), { shown, total })}
          </p>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-2 rounded-sm border border-line-strong px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] text-text transition-colors hover:border-volt hover:text-volt"
          >
            <Download className="h-3.5 w-3.5" />
            {t('tf.exportCsv')}
          </button>
        </div>

        {/* country chip (deep-linked from Risk Radar) */}
        {filters.country && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => set({ country: null })}
              className="flex items-center gap-2 rounded-sm border border-signal px-2 py-1 font-mono text-[10.5px] tracking-[0.12em] text-signal"
            >
              {tpl(t('tf.countryChip'), { v: filters.country })}
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* filter groups: always on lg, toggleable below */}
        <div className="hidden lg:block">{groups}</div>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="overflow-hidden lg:hidden"
            >
              {groups}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* export gating modal (Pro/Desk only — entitlement checked server-side) */}
      <AnimatePresence>
        {exportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/70 px-4 backdrop-blur-[4px]"
            onClick={() => setExportOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-sm rounded-sm border border-line-strong bg-ink-900 p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-mono text-[12px] tracking-[0.16em] text-signal">{t('tf.exportProK')}</p>
              <p className="mt-3 font-sans text-[14px] leading-relaxed text-text-muted">
                {tpl(t('tf.exportProB'), { total })}
              </p>
              <Link
                to="/pricing"
                className="mt-5 inline-block rounded-sm bg-volt px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-volt-pop"
              >
                {t('tracker.ctaButton')}
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
