import { Fragment, useState } from 'react'
import { motion } from 'framer-motion'
import KickerLine from '@/components/KickerLine'
import { cn } from '@/lib/utils'
import { useLang } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

type Cell = '+' | '-' | string

type Group = { labelKey: string; rows: { featureKey: string; cells: [Cell, Cell, Cell] }[] }

const GROUPS: Group[] = [
  {
    labelKey: 'pricing.cg.content',
    rows: [
      { featureKey: 'pricing.cf.weeklyBrief', cells: ['-', '+', '+'] },
      { featureKey: 'pricing.cf.openMonthly', cells: ['+', '+', '+'] },
      { featureKey: 'pricing.cf.archive', cells: ['-', '+', '+'] },
      { featureKey: 'pricing.cf.annotations', cells: ['-', '+', '+'] },
    ],
  },
  {
    labelKey: 'pricing.cg.data',
    rows: [
      { featureKey: 'pricing.cf.trackerBrowse', cells: ['+', '+', '+'] },
      { featureKey: 'pricing.cf.timelines', cells: ['-', '+', '+'] },
      { featureKey: 'pricing.cf.csv', cells: ['-', '+', '+'] },
      { featureKey: 'pricing.cf.api', cells: ['-', '-', '+'] },
      { featureKey: 'pricing.cf.memo', cells: ['-', '-', '+'] },
    ],
  },
  {
    labelKey: 'pricing.cg.alerts',
    rows: [
      { featureKey: 'pricing.cf.digest', cells: ['+', '+', '+'] },
      { featureKey: 'pricing.cf.riskAlerts', cells: ['-', '+', '+'] },
      { featureKey: 'pricing.cf.factoryAlerts', cells: ['-', '+', '+'] },
    ],
  },
  {
    labelKey: 'pricing.cg.team',
    rows: [
      { featureKey: 'pricing.cf.seats', cells: ['1', '1', '5'] },
      { featureKey: 'pricing.cf.analystCall', cells: ['-', '-', '+'] },
      { featureKey: 'pricing.cf.priorityCorrections', cells: ['-', '-', '+'] },
    ],
  },
]

const COLUMNS = ['pricing.col.free', 'pricing.col.pro', 'pricing.col.desk'] as const

function Mark({ cell }: { cell: Cell }) {
  if (cell === '+') {
    return <span className="font-mono text-[14px] font-semibold text-volt">+</span>
  }
  if (cell === '-') {
    return <span className="font-mono text-[14px] text-faint">−</span>
  }
  return <span className="font-mono text-[13px] text-text tnum">{cell}</span>
}

/** pricing.md S3 — "Everything, Side by Side" sticky comparison table */
export default function ComparisonTable() {
  const { t } = useLang()
  const [hoverCol, setHoverCol] = useState<number | null>(null)

  return (
    <section className="border-t border-line py-24">
      <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)]">
        <KickerLine chapter="03" label={t('pricing.compareKicker')} />
        <motion.h2
          className="mt-6 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.015em] text-text"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          {t('pricing.compareHA')}
          <em className="italic text-volt">{t('pricing.compareHEm')}</em>
          {t('pricing.compareHB')}
        </motion.h2>

        {/* Horizontal scroll on mobile; sticky first column */}
        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="sticky top-16 z-20">
              <tr className="border-b border-line-strong bg-ink-950/85 backdrop-blur-md">
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-ink-950/95 py-4 pr-6 text-left font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-faint backdrop-blur-md"
                >
                  {t('pricing.compareFeature')}
                </th>
                {COLUMNS.map((col, ci) => (
                  <th
                    key={col}
                    scope="col"
                    onMouseEnter={() => setHoverCol(ci)}
                    onMouseLeave={() => setHoverCol(null)}
                    className={cn(
                      'cursor-default px-4 py-4 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors duration-200',
                      ci === 1 ? 'text-volt' : 'text-text-muted',
                      hoverCol === ci && 'bg-volt/[0.04]',
                    )}
                  >
                    {t(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((group) => (
                <Fragment key={group.labelKey}>
                  {/* Group label row — hairline draws */}
                  <tr>
                    <td colSpan={4} className="border-b border-line pb-2 pt-8">
                      <motion.span
                        className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-faint"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true, margin: '-10% 0px' }}
                        transition={{ duration: 0.5, ease: EASE }}
                      >
                        {t(group.labelKey)}
                      </motion.span>
                    </td>
                  </tr>
                  {group.rows.map((row, ri) => (
                    <motion.tr
                      key={row.featureKey}
                      className="group border-b border-line transition-colors duration-200 hover:bg-ink-800"
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-5% 0px' }}
                      transition={{ duration: 0.45, delay: ri * 0.04, ease: EASE }}
                    >
                      <td className="sticky left-0 bg-ink-950 py-3.5 pr-6 font-sans text-[14px] text-text-muted transition-colors duration-200 group-hover:bg-ink-800 group-hover:text-text">
                        {t(row.featureKey)}
                      </td>
                      {row.cells.map((cell, ci) => (
                        <td
                          key={ci}
                          className={cn(
                            'px-4 py-3.5 text-center transition-colors duration-200',
                            hoverCol === ci && 'bg-volt/[0.04]',
                          )}
                        >
                          <motion.span
                            className="inline-block"
                            initial={{ scale: 0.4, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true, margin: '-5% 0px' }}
                            transition={{
                              type: 'spring',
                              stiffness: 380,
                              damping: 20,
                              delay: ri * 0.04 + ci * 0.05,
                            }}
                          >
                            <Mark cell={cell} />
                          </motion.span>
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
