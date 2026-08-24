import { useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, Send } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { useToast } from './Toasts'
import { SectionSkeleton } from './Skeletons'
import { fmtDate } from './utils'
import { useLang, tpl } from '@/i18n/lang'

const inputCls =
  'w-full rounded-sm border border-line bg-ink-900 px-3.5 py-3 font-mono text-[13px] text-text caret-volt placeholder:uppercase placeholder:tracking-[0.08em] placeholder:text-faint focus:border-volt focus:outline-none'

const STATUS_COLOR: Record<string, string> = {
  verified: 'var(--volt)',
  pending: 'var(--amber)',
  unsubscribed: 'var(--muted)',
}

const KIND_LABEL: Record<string, string> = {
  confirm: 'acct.sendKindConfirm',
  welcome: 'acct.sendKindWelcome',
  weekly: 'acct.sendKindWeekly',
  test: 'acct.sendKindTest',
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border border-line px-4 py-4">
      <p className="font-display text-[22px] leading-none text-text tnum" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      <p className="kicker mt-2 text-faint">{label}</p>
    </div>
  )
}

/**
 * ADMIN EMAIL DESK — double opt-in subscriber stats + test send + weekly
 * blast. Wired to admin.email.* (see api/admin-router.ts). Forced log-mode
 * (MAIL_DISABLED=1 / no SMTP) is surfaced as an amber toast, not an error.
 */
export default function EmailDesk() {
  const { t } = useLang()
  const toast = useToast()
  const utils = trpc.useUtils()

  const statsQuery = trpc.admin['email.stats'].useQuery()
  const listQuery = trpc.admin['email.list'].useQuery()
  const issuesQuery = trpc.admin['issues.list'].useQuery()

  const [testEmail, setTestEmail] = useState('')
  const [testError, setTestError] = useState<string | null>(null)
  const [blastIssueId, setBlastIssueId] = useState<number | null>(null)

  const invalidate = () => {
    utils.admin['email.stats'].invalidate()
    utils.admin['email.list'].invalidate()
  }

  const test = trpc.admin['email.test'].useMutation({
    onSuccess: (res) => {
      if (res.sent) toast(t('acct.testSent'))
      else if (res.error) toast(t('acct.testFailed'), { tone: 'signal' })
      else toast(t('acct.testLogMode'), { tone: 'amber' })
      invalidate()
    },
    onError: (e) => setTestError(e.message.toUpperCase()),
  })

  const blast = trpc.admin['email.blast'].useMutation({
    onSuccess: (_d) => {
      toast(tpl(t('acct.blastDone'), { sent: _d.sent, failed: _d.failed, skipped: _d.skipped }))
      invalidate()
    },
    onError: (e) => toast(e.message.toUpperCase(), { tone: 'signal' }),
  })

  const submitTest = (e: FormEvent) => {
    e.preventDefault()
    setTestError(null)
    if (!testEmail.trim()) return setTestError(t('acct.subiEmail'))
    test.mutate({ email: testEmail.trim() })
  }

  const stats = statsQuery.data
  const subscribers = listQuery.data
  const issues = issuesQuery.data ?? []

  const pending = stats?.byStatus['pending'] ?? 0
  const verified = stats?.byStatus['verified'] ?? 0
  const unsubscribed = stats?.byStatus['unsubscribed'] ?? 0
  const total = pending + verified + unsubscribed
  const sendKinds = (['confirm', 'welcome', 'weekly', 'test'] as const).map((k) => ({
    key: k,
    label: t(KIND_LABEL[k]),
    n: stats?.sends[k] ?? 0,
  }))

  return (
    <div className="border-b border-line px-6 py-6">
      <p className="kicker mb-4 text-text-muted">
        {t('acct.emailDesk')} <span className="text-volt">· {subscribers?.length ?? 0}</span>
      </p>

      {/* Subscriber status + send totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t('acct.emailPending')} value={String(pending)} accent={STATUS_COLOR.pending} />
        <StatTile label={t('acct.emailVerified')} value={String(verified)} accent={STATUS_COLOR.verified} />
        <StatTile label={t('acct.emailUnsubscribed')} value={String(unsubscribed)} accent={STATUS_COLOR.unsubscribed} />
        <StatTile label={t('acct.emailTotal')} value={String(total)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {sendKinds.map((s) => (
          <div key={s.key} className="flex items-center justify-between border border-line px-4 py-3">
            <span className="kicker text-faint">{s.label}</span>
            <span className="font-mono text-[15px] text-text tnum">{s.n}</span>
          </div>
        ))}
      </div>

      {/* Actions: test send + weekly blast */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <form onSubmit={submitTest} className="border border-line p-4">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
            <Mail className="h-3.5 w-3.5 text-volt" /> {t('acct.sendTest')}
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className={inputCls}
              type="email"
              placeholder={t('acct.testEmailPh')}
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <button
              type="submit"
              disabled={test.isPending}
              className="shrink-0 rounded-sm bg-volt px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all hover:-translate-y-0.5 disabled:opacity-40"
            >
              {test.isPending ? t('acct.testSending') : t('acct.sendTest')}
            </button>
          </div>
          {testError && <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-signal">{testError}</p>}
        </form>

        <div className="border border-line p-4">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
            <Send className="h-3.5 w-3.5 text-volt" /> {t('acct.weeklyBlast')}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-faint">{t('acct.blastHint')}</p>
          <div className="mt-3 flex gap-2">
            <select
              className={inputCls}
              value={blastIssueId ?? ''}
              onChange={(e) => setBlastIssueId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t('acct.blastIssue')} —</option>
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  No. {String(issue.number).padStart(3, '0')} · {issue.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={blast.isPending || !blastIssueId}
              onClick={() => blastIssueId && blast.mutate({ issueId: blastIssueId })}
              className="shrink-0 rounded-sm bg-volt px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all hover:-translate-y-0.5 disabled:opacity-40"
            >
              {blast.isPending ? t('acct.blastSending') : t('acct.blastSend')}
            </button>
          </div>
        </div>
      </div>

      {/* Subscribers index */}
      <div className="mt-6">
        <p className="kicker mb-3 text-text-muted">
          {t('acct.subscribers')} <span className="text-volt">· {subscribers?.length ?? 0}</span>
        </p>
        {listQuery.isLoading ? (
          <SectionSkeleton rows={3} />
        ) : !subscribers?.length ? (
          <p className="py-6 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
            {t('acct.noSubscribers')}
          </p>
        ) : (
          <ul className="border-t border-line">
            <AnimatePresence initial={false}>
              {subscribers.map((s) => (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                  className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-line py-3 transition-colors hover:bg-ink-800/50"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-text">{s.email}</span>
                  <span
                    className="rounded-sm border px-1.5 py-[1px] font-mono text-[9.5px] uppercase tracking-[0.14em]"
                    style={{ color: STATUS_COLOR[s.status] ?? 'var(--muted)', borderColor: STATUS_COLOR[s.status] ?? 'var(--muted)' }}
                  >
                    {t(`acct.email${s.status[0].toUpperCase()}${s.status.slice(1)}`)}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">{String(s.lang).toUpperCase()}</span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-faint tnum">
                    {fmtDate(s.createdAt)}
                    {s.verifiedAt ? ` · ${fmtDate(s.verifiedAt)}` : ''}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}
