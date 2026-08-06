import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import StatusPill from '@/components/intel/StatusPill'
import type { FactoryRow } from '@/components/intel/intel-utils'
import { STATUS_ORDER, fmtMonoShort, formatGwh } from '@/components/intel/intel-utils'
import { cn } from '@/lib/utils'
import { useLang, tpl } from '@/i18n/lang'

/* ------------------------------------------------------------------ */
/* tracker.md S5 — hairline database table, sortable, 10/page.         */
/* ------------------------------------------------------------------ */

type SortKey = 'site' | 'company' | 'country' | 'status' | 'gwh' | 'chemistry' | 'sop' | 'updated'

const COLUMNS: { key: SortKey; labelKey: string; align?: 'right' }[] = [
  { key: 'site', labelKey: 'ft.site' },
  { key: 'company', labelKey: 'ft.company' },
  { key: 'country', labelKey: 'ft.country' },
  { key: 'status', labelKey: 'ft.status' },
  { key: 'gwh', labelKey: 'ft.gwh', align: 'right' },
  { key: 'chemistry', labelKey: 'ft.chemistry' },
  { key: 'sop', labelKey: 'ft.sop' },
  { key: 'updated', labelKey: 'ft.updated' },
]

const PAGE_SIZE = 10

function sortRows(rows: FactoryRow[], key: SortKey, dir: 1 | -1): FactoryRow[] {
  const statusRank = (s: FactoryRow['status']) => STATUS_ORDER.indexOf(s)
  const cmp = (a: FactoryRow, b: FactoryRow): number => {
    switch (key) {
      case 'site':
        return a.siteName.localeCompare(b.siteName)
      case 'company':
        return a.company.localeCompare(b.company)
      case 'country':
        return a.country.localeCompare(b.country)
      case 'status':
        return statusRank(a.status) - statusRank(b.status)
      case 'gwh':
        // nulls always last
        if (a.capacityGwh == null && b.capacityGwh == null) return 0
        if (a.capacityGwh == null) return 1
        if (b.capacityGwh == null) return -1
        return a.capacityGwh - b.capacityGwh
      case 'chemistry':
        return (a.chemistry?.join('/') ?? '').localeCompare(b.chemistry?.join('/') ?? '')
      case 'sop':
        return (a.sopDate ?? '9999').localeCompare(b.sopDate ?? '9999')
      case 'updated': {
        const da = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)
        const db = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)
        return da.getTime() - db.getTime()
      }
    }
  }
  return [...rows].sort((a, b) => cmp(a, b) * dir)
}

export default function FactoryTable({
  rows,
  onOpen,
}: {
  rows: FactoryRow[]
  onOpen: (f: FactoryRow) => void
}) {
  const { t } = useLang()
  const [sortKey, setSortKey] = useState<SortKey>('gwh')
  const [sortDir, setSortDir] = useState<1 | -1>(-1) // default: GWH desc
  const [page, setPage] = useState(0)
  const [showAll, setShowAll] = useState(false)

  const sorted = useMemo(() => sortRows(rows, sortKey, sortDir), [rows, sortKey, sortDir])
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)
  const visible = showAll ? sorted : sorted.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortKey(key)
      setSortDir(key === 'gwh' || key === 'updated' ? -1 : 1)
    }
    setPage(0)
  }

  return (
    <div>
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-ink-900">
              {COLUMNS.map((col) => {
                const active = sortKey === col.key
                return (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em]',
                      col.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        'inline-flex items-center gap-1 transition-colors duration-200',
                        active ? 'text-volt' : 'text-faint hover:text-text',
                      )}
                    >
                      {t(col.labelKey)}
                      <span
                        className={cn(
                          'inline-block text-[8px] transition-transform duration-200',
                          active ? 'opacity-100' : 'opacity-0',
                          active && sortDir === 1 && 'rotate-180',
                        )}
                      >
                        ▼
                      </span>
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((f, i) => (
              <motion.tr
                key={f.id}
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3), ease: 'easeOut' }}
                onClick={() => onOpen(f)}
                className="group cursor-pointer border-b border-line bg-ink-950 transition-colors last:border-b-0 hover:bg-ink-800"
              >
                <td className="px-4 py-3.5">
                  <p className="font-display text-[15px] leading-tight text-text">{f.siteName}</p>
                  <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-faint">
                    {f.city ?? ''}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <span className="rounded-sm border border-line-strong px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-muted">
                    {t(`company.${f.company}`)}
                  </span>
                </td>
                <td className="px-4 py-3.5 font-mono text-[12px] text-text-muted">{f.country}</td>
                <td className="px-4 py-3.5">
                  <StatusPill status={f.status} />
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-[13px] tnum text-text">
                  {formatGwh(f.capacityGwh)}
                </td>
                <td className="px-4 py-3.5 font-mono text-[11.5px] text-text-muted">
                  {f.chemistry?.length ? f.chemistry.join(' / ') : '—'}
                </td>
                <td className="px-4 py-3.5 font-mono text-[12px] tnum text-text-muted">
                  {f.sopDate ?? '—'}
                </td>
                <td className="relative px-4 py-3.5 font-mono text-[11.5px] tnum text-faint">
                  {fmtMonoShort(f.updatedAt)}
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] tracking-[0.12em] text-volt opacity-0 transition-opacity duration-200 group-hover:opacity-100 max-xl:hidden">
                    {t('ft.open')}
                  </span>
                </td>
              </motion.tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-12 text-center font-mono text-[12px] tracking-[0.12em] text-faint">
                  {t('ft.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pager */}
      <div className="mt-4 flex items-center justify-between font-mono text-[11px] tracking-[0.12em] text-faint">
        <span>
          {showAll
            ? tpl(t('ft.showingAll'), { n: sorted.length })
            : tpl(t('ft.pager'), { p: clampedPage + 1, tp: pageCount, n: PAGE_SIZE })}
        </span>
        <div className="flex items-center gap-2">
          {!showAll && pageCount > 1 && (
            <>
              <button
                type="button"
                disabled={clampedPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-sm border border-line-strong px-2.5 py-1 transition-colors hover:border-volt hover:text-volt disabled:opacity-30 disabled:hover:border-line-strong disabled:hover:text-faint"
              >
                ‹
              </button>
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  className={cn(
                    'rounded-sm border px-2.5 py-1 tnum transition-colors',
                    i === clampedPage
                      ? 'border-volt text-volt'
                      : 'border-line-strong hover:border-volt hover:text-volt',
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={clampedPage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                className="rounded-sm border border-line-strong px-2.5 py-1 transition-colors hover:border-volt hover:text-volt disabled:opacity-30 disabled:hover:border-line-strong disabled:hover:text-volt"
              >
                ›
              </button>
            </>
          )}
          {sorted.length > PAGE_SIZE && (
            <button
              type="button"
              onClick={() => {
                setShowAll((s) => !s)
                setPage(0)
              }}
              className="rounded-sm border border-line-strong px-3 py-1 transition-colors hover:border-volt hover:text-volt"
            >
              {showAll ? t('ft.paginate') : t('ft.showAll')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
