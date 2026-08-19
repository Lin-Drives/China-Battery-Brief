import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Bookmark, X } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import PillarTag from '@/components/PillarTag'
import { useToast } from './Toasts'
import { SectionSkeleton } from './Skeletons'
import { fmtShort, pillarMeta } from './utils'
import { useLang, tpl } from '@/i18n/lang'

const EASE_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

/**
 * account.md B3 — saved briefs. Rows: No. + title + pillar tags + saved date +
 * READ → + ✕ REMOVE (fade+slide out 200ms, undo toast 4s).
 */
export default function SavedBriefs() {
  const { t } = useLang()
  const toast = useToast()
  const utils = trpc.useUtils()
  const listQuery = trpc.me['saved.list'].useQuery()
  const [removingId, setRemovingId] = useState<number | null>(null)

  const invalidate = () => utils.me['saved.list'].invalidate()

  const add = trpc.me['saved.add'].useMutation({ onSuccess: invalidate })
  const remove = trpc.me['saved.remove'].useMutation({
    onSuccess: (_d, vars) => {
      setRemovingId(null)
      invalidate()
      toast(t('acct.fileRemoved'), {
        tone: 'amber',
        action: { label: t('acct.undo'), onClick: () => add.mutate({ issueId: vars.issueId }) },
      })
    },
    onError: () => {
      setRemovingId(null)
      toast(t('acct.removeFailed'), { tone: 'signal' })
    },
  })

  if (listQuery.isLoading) return <SectionSkeleton rows={4} />

  const rows = listQuery.data ?? []

  return (
    <div>
      <p className="kicker mb-5 text-text-muted">
        {t('acct.savedFiles')} <span className="text-volt">· {rows.length}</span>
      </p>

      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-5 border border-dashed border-line-strong p-8">
          <p className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] text-text-muted">
            {t('acct.nothingSavedA')} <Bookmark className="h-3.5 w-3.5 text-volt" /> {t('acct.nothingSavedB')}
          </p>
          <Link
            to="/briefs"
            className="inline-flex items-center gap-2 rounded-sm border border-line-strong px-5 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-text transition-colors duration-200 hover:border-text hover:bg-text/5"
          >
            {t('acct.browseArchive')} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <ul className="border-t border-line">
          <AnimatePresence initial={false}>
            {rows.map(({ savedAt, issue }) => (
              <motion.li
                key={issue.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, ease: EASE_EXPO }}
                className="flex flex-col gap-3 border-b border-line py-4 transition-colors hover:bg-ink-800/50 sm:flex-row sm:items-center sm:gap-6 sm:px-3"
              >
                <span className="shrink-0 font-mono text-[12px] font-semibold tracking-[0.1em] text-faint">
                  No. {String(issue.number).padStart(3, '0')}
                </span>
                <Link
                  to={`/briefs/${issue.slug}`}
                  className="min-w-0 flex-1 font-display text-[18px] leading-snug text-text transition-colors hover:text-volt"
                >
                  {issue.title}
                </Link>
                <span className="hidden shrink-0 gap-1.5 md:flex">
                  {issue.pillars.slice(0, 3).map((p) => (
                    <PillarTag key={p} pillar={pillarMeta(p).tag}>
                      {t(`pillar.${p}`)}
                    </PillarTag>
                  ))}
                </span>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-faint tnum">
                  {tpl(t('acct.savedAt'), { d: fmtShort(savedAt) })}
                </span>
                <span className="flex shrink-0 items-center gap-4">
                  <Link
                    to={`/briefs/${issue.slug}`}
                    className="group inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-volt"
                  >
                    {t('acct.read')}
                    <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                  <button
                    type="button"
                    disabled={removingId === issue.id}
                    onClick={() => {
                      setRemovingId(issue.id)
                      remove.mutate({ issueId: issue.id })
                    }}
                    className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:text-signal disabled:opacity-40"
                  >
                    <X className="h-3 w-3" /> {t('acct.remove')}
                  </button>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
