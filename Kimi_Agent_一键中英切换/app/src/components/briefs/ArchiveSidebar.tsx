import { Link } from 'react-router'
import { motion } from 'framer-motion'
import EmailCapture from '@/components/EmailCapture'
import { useAuth } from '@/hooks/useAuth'
import { useLang, tpl } from '@/i18n/lang'
import { fmtReadTimeLong } from '@/i18n/format'
import { PILLAR_ORDER, fmtIssueNo, pillarColor } from './pillar'
import type { ApiPillar, IssueMeta } from './pillar'
import type { PillarFilter } from './FilterBar'

const COMPANIES: { name: string; pillar: ApiPillar }[] = [
  { name: 'CATL', pillar: 'overseas-capacity' },
  { name: 'BYD', pillar: 'overseas-capacity' },
  { name: 'EVE', pillar: 'overseas-capacity' },
  { name: 'GOTION', pillar: 'overseas-capacity' },
  { name: 'SVOLT', pillar: 'tech-routes' },
  { name: 'CALB', pillar: 'overseas-capacity' },
  { name: 'SUNWODA', pillar: 'overseas-capacity' },
  { name: 'QINGTAO', pillar: 'tech-routes' },
  { name: 'WELION', pillar: 'tech-routes' },
  { name: '宁德时代', pillar: 'overseas-capacity' },
]

/** Deterministic 8-point sparkline data seeded from the pillar index (decorative). */
function sparkPoints(seed: number): string {
  const pts: string[] = []
  let v = 8 + ((seed * 7) % 9)
  for (let i = 0; i < 8; i++) {
    v = Math.max(3, Math.min(21, v + ((seed * (i + 3) * 13) % 11) - 5))
    pts.push(`${i * 10},${24 - v}`)
  }
  return pts.join(' ')
}

function ModuleTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="kicker text-text-muted">{children}</span>
      <span aria-hidden className="h-px flex-1 bg-line" />
    </div>
  )
}

/**
 * briefs.md S4 — archive sidebar: Pillar Index (sparklines), Most Read,
 * Companies Watched chip cloud, newsletter capture (hidden when logged in).
 */
export default function ArchiveSidebar({
  issues,
  pillarCounts,
  onPillarSelect,
  onCompanySelect,
}: {
  issues: IssueMeta[]
  pillarCounts: Record<PillarFilter, number>
  onPillarSelect: (p: ApiPillar) => void
  onCompanySelect: (name: string) => void
}) {
  const { isAuthenticated } = useAuth()
  const { lang, t } = useLang()

  // Most-read proxy: longest reads first (no read-count telemetry in v1)
  const mostRead = [...issues].sort((a, b) => b.readingMinutes - a.readingMinutes).slice(0, 5)

  return (
    <aside className="flex flex-col gap-12">
      {/* 1 · Pillar index */}
      <section aria-label="Pillar index">
        <ModuleTitle>{t('sidebar.pillarIndex')}</ModuleTitle>
        <div className="border-t border-line">
          {PILLAR_ORDER.map((p, i) => {
            const color = pillarColor(p)
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPillarSelect(p)}
                className="group flex w-full items-center gap-3 border-b border-line py-3.5 text-left transition-colors hover:bg-ink-800"
              >
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="flex flex-col">
                  <span className="font-sans text-[14px] font-medium text-text transition-colors group-hover:text-volt">
                    {t(`pillar.label.${p}`)}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                    {t(`pillar.${p}`)} · {tpl(t('sidebar.files'), { n: pillarCounts[p] })}
                  </span>
                </span>
                <svg
                  aria-hidden
                  viewBox="0 0 70 24"
                  className="ml-auto h-6 w-[70px] overflow-visible"
                >
                  <motion.polyline
                    points={sparkPoints(i + 3)}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </svg>
              </button>
            )
          })}
        </div>
      </section>

      {/* 2 · Most read */}
      {mostRead.length > 0 && (
        <section aria-label="Most read">
          <ModuleTitle>{t('sidebar.mostRead')}</ModuleTitle>
          <ol className="flex flex-col">
            {mostRead.map((issue, i) => (
              <li key={issue.id}>
                <Link
                  to={`/briefs/${issue.slug}`}
                  className="group flex items-baseline gap-3 border-b border-line py-3 transition-transform duration-200 hover:translate-x-1"
                >
                  <span className="font-display text-[20px] font-light leading-none text-faint tnum">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-sans text-[14px] text-text transition-colors group-hover:text-volt">
                      {lang === 'zh' ? (issue.titleZh ?? issue.title) : issue.title}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint tnum">
                      {fmtIssueNo(issue.number)} · {fmtReadTimeLong(issue.readingMinutes, lang)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 3 · Companies watched */}
      <section aria-label="Companies watched">
        <ModuleTitle>{t('sidebar.companies')}</ModuleTitle>
        <div className="flex flex-wrap gap-2">
          {COMPANIES.map((c) => {
            const color = pillarColor(c.pillar)
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onCompanySelect(c.name)}
                title={`Search the archive for ${c.name}`}
                className="rounded-sm border border-line px-2.5 py-1.5 font-mono text-[11px] tracking-[0.1em] text-text-muted transition-colors duration-200 hover:text-text"
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${color}1A`)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
              >
                {c.name}
              </button>
            )
          })}
        </div>
      </section>

      {/* 4 · Newsletter capture (hidden when logged in, S4.4) */}
      {!isAuthenticated && (
        <section aria-label="Newsletter signup" className="border border-line bg-ink-900 p-5">
          <ModuleTitle>{t('sidebar.newsletter')}</ModuleTitle>
          <EmailCapture />
        </section>
      )}
    </aside>
  )
}
