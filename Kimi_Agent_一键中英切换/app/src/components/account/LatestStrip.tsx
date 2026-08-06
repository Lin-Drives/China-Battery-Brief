import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Lock } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { getReadLedger, markIssueRead, pillarMeta } from './utils'
import { SkeletonBlock } from './Skeletons'
import { useLang } from '@/i18n/lang'
import { fmtReadTime } from '@/i18n/format'

const EASE_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

/**
 * account.md B2 — latest files strip: 4 compact cards with per-user read
 * state. Unread: volt `NEW` chip + full opacity; read: 60% + `READ ✓`,
 * hover restores + `REREAD →`.
 */
export default function LatestStrip() {
  const { t, lang } = useLang()
  const listQuery = trpc.content['issues.list'].useQuery({ limit: 4 })
  const [ledger, setLedger] = useState(getReadLedger)

  if (listQuery.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-40" />
        ))}
      </div>
    )
  }

  const issues = listQuery.data?.issues ?? []
  if (issues.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {issues.map((issue, i) => {
        const isRead = Boolean(ledger[issue.id])
        return (
          <motion.div
            key={issue.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.5, delay: i * 0.07, ease: EASE_EXPO }}
          >
            <Link
              to={`/briefs/${issue.slug}`}
              onClick={() => {
                markIssueRead(issue.id)
                setLedger(getReadLedger())
              }}
              className="group relative flex h-full flex-col border border-line bg-ink-800 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-volt/40"
            >
              <div className={isRead ? 'opacity-60 transition-opacity duration-200 group-hover:opacity-100' : undefined}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] font-semibold tracking-[0.1em] text-text">
                    No. {String(issue.number).padStart(3, '0')}
                  </span>
                  {!isRead ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0.25, 1] }}
                      transition={{ duration: 0.9, delay: 0.4 + i * 0.07, times: [0, 0.4, 0.7, 1] }}
                      className="rounded-sm bg-volt px-1.5 py-[2px] font-mono text-[10px] font-semibold tracking-[0.14em] text-ink-950"
                    >
                      {t('acct.new')}
                    </motion.span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{t('acct.readDone')}</span>
                  )}
                </div>
                <p className="mt-3 line-clamp-3 font-display text-[16px] leading-snug text-text">{issue.title}</p>
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <span className="flex items-center gap-1.5">
                  {issue.pillars.slice(0, 3).map((p) => (
                    <span
                      key={p}
                      title={t(`pillar.${p}`)}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: pillarMeta(p).color }}
                    />
                  ))}
                  <span className="ml-1 font-mono text-[10.5px] tnum text-faint">{fmtReadTime(issue.readingMinutes, lang)}</span>
                  {!issue.isFree && <Lock className="h-3 w-3 text-faint" />}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-volt">
                  {isRead ? t('acct.reread') : t('acct.read')}
                  <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
