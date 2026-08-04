import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutGrid, Rows3, Search, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PILLAR_ORDER, pillarColor } from './pillar'
import { useLang, tpl } from '@/i18n/lang'
import type { ApiPillar } from './pillar'

export type PillarFilter = ApiPillar | 'all'
export type SortKey = 'newest' | 'oldest' | 'most-read'
export type ViewMode = 'list' | 'grid'

export const REGIONS = [
  { value: 'all', key: 'filter.region.all' },
  { value: 'europe', key: 'filter.region.europe' },
  { value: 'se-asia', key: 'filter.region.se-asia' },
  { value: 'n-america', key: 'filter.region.n-america' },
  { value: 's-america', key: 'filter.region.s-america' },
  { value: 'africa', key: 'filter.region.africa' },
  { value: 'middle-east', key: 'filter.region.middle-east' },
] as const

export const SORTS: { value: SortKey; key: string }[] = [
  { value: 'newest', key: 'filter.sort.newest' },
  { value: 'oldest', key: 'filter.sort.oldest' },
  { value: 'most-read', key: 'filter.sort.most-read' },
]

const selectTriggerCls =
  'h-9 w-auto min-w-[132px] gap-2 rounded-sm border-line bg-ink-900 px-3 font-mono text-[12px] uppercase tracking-[0.08em] text-text-muted shadow-none hover:border-line-strong focus:ring-0 focus:ring-offset-0'
const selectContentCls =
  'rounded-sm border-line-strong bg-ink-900 font-mono text-[12px] uppercase tracking-[0.08em] text-text'

/**
 * briefs.md S1 — sticky filter bar: pillar tabs (layoutId indicator, counts),
 * REGION / SORT selects, debounced ⌘K search, result count, LIST/GRID toggle,
 * removable active-filter chips.
 */
export default function FilterBar({
  pillar,
  onPillarChange,
  counts,
  region,
  onRegionChange,
  sort,
  onSortChange,
  search,
  onSearchChange,
  resultCount,
  view,
  onViewChange,
  onClearFilters,
}: {
  pillar: PillarFilter
  onPillarChange: (p: PillarFilter) => void
  counts: Record<PillarFilter, number>
  region: string
  onRegionChange: (r: string) => void
  sort: SortKey
  onSortChange: (s: SortKey) => void
  search: string
  onSearchChange: (q: string) => void
  resultCount: number
  view: ViewMode
  onViewChange: (v: ViewMode) => void
  onClearFilters: () => void
}) {
  const { t } = useLang()
  const [input, setInput] = useState(search)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep local input in sync when filters are cleared externally
  useEffect(() => setInput(search), [search])

  // 300ms live-filter debounce (S1)
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (input !== search) onSearchChange(input)
    }, 300)
    return () => window.clearTimeout(id)
  }, [input, search, onSearchChange])

  // ⌘K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const tabs: { key: PillarFilter; label: string; color: string }[] = [
    { key: 'all', label: t('pillar.all'), color: 'var(--text)' },
    ...PILLAR_ORDER.map((p) => ({ key: p as PillarFilter, label: t(`pillar.${p}`), color: pillarColor(p) })),
  ]

  const hasChips = region !== 'all' || search.trim() !== ''
  const regionLabel = t(REGIONS.find((r) => r.value === region)?.key ?? 'filter.region.all')

  return (
    <motion.div
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-16 z-30 border-y border-line bg-ink-950/85 backdrop-blur-[12px]"
    >
      <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)]">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 py-3">
          {/* Pillar tabs */}
          <div className="flex items-center gap-1 overflow-x-auto" role="tablist" aria-label="Filter by pillar">
            {tabs.map((t) => {
              const active = pillar === t.key
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => onPillarChange(t.key)}
                  className={cn(
                    'relative whitespace-nowrap px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-200',
                    active ? 'text-text' : 'text-faint hover:text-text-muted',
                  )}
                >
                  {t.label} <span className="tnum text-faint">· {counts[t.key]}</span>
                  {active && (
                    <motion.span
                      layoutId="pillar-tab-indicator"
                      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                      className="absolute inset-x-2 bottom-0 h-[2px]"
                      style={{ backgroundColor: t.color }}
                    />
                  )}
                </button>
              )
            })}
            {/* Result count, crossfades on change */}
            <AnimatePresence mode="wait">
              <motion.span
                key={resultCount}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="ml-2 hidden whitespace-nowrap font-mono text-[11px] tracking-[0.14em] text-volt tnum md:block"
              >
                {tpl(t(resultCount === 1 ? 'filter.file' : 'filter.files'), { n: resultCount })}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Dropdowns */}
          <div className="flex items-center gap-2">
            <Select value={region} onValueChange={onRegionChange}>
              <SelectTrigger className={selectTriggerCls} aria-label="Filter by region">
                <span className="text-faint">{t('filter.region')}</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentCls}>
                {REGIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="font-mono text-[12px] uppercase">
                    {t(r.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
              <SelectTrigger className={selectTriggerCls} aria-label="Sort issues">
                <span className="text-faint">{t('filter.sort')}</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentCls}>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="font-mono text-[12px] uppercase">
                    {t(s.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('filter.searchPh')}
              aria-label={t('filter.searchAria')}
              className="h-9 w-[260px] max-w-full rounded-sm border border-line bg-ink-900 pl-9 pr-12 font-mono text-[13px] tracking-wide text-text caret-volt placeholder:text-[11px] placeholder:uppercase placeholder:tracking-[0.08em] placeholder:text-faint focus:border-volt focus:outline-none"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm border border-line px-1.5 py-0.5 font-mono text-[9px] text-faint">
              ⌘K
            </kbd>
          </div>

          {/* View toggle */}
          <div className="ml-auto flex items-center gap-1" role="group" aria-label="View mode">
            {(
              [
                { key: 'list', Icon: Rows3, label: t('filter.list') },
                { key: 'grid', Icon: LayoutGrid, label: t('filter.grid') },
              ] as const
            ).map(({ key, Icon, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                title={label}
                onClick={() => onViewChange(key)}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-sm border px-3 font-mono text-[10.5px] tracking-[0.12em] transition-colors duration-200',
                  view === key
                    ? 'border-volt/60 bg-volt-dim text-volt'
                    : 'border-line text-faint hover:border-line-strong hover:text-text-muted',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active filter chips */}
        <AnimatePresence>
          {hasChips && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-wrap items-center gap-2 overflow-hidden pb-3"
            >
              {region !== 'all' && (
                <FilterChip label={tpl(t('filter.chipRegion'), { v: regionLabel })} onRemove={() => onRegionChange('all')} />
              )}
              {search.trim() !== '' && (
                <FilterChip label={tpl(t('filter.chipSearch'), { v: search.trim() })} onRemove={() => onSearchChange('')} />
              )}
              <button
                type="button"
                onClick={onClearFilters}
                className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint underline-offset-2 transition-colors hover:text-signal hover:underline"
              >
                {t('filter.clearAll')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-1.5 rounded-sm border border-line-strong bg-ink-800 px-2 py-1 font-mono text-[10.5px] tracking-[0.1em] text-text-muted"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="text-faint transition-colors hover:text-signal"
      >
        <X className="h-3 w-3" />
      </button>
    </motion.span>
  )
}
