import { useEffect, useState } from 'react'
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

const PAGE_SIZE = 50

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

type StatusFilter = 'all' | 'pending' | 'verified' | 'unsubscribed'
type LangFilter = 'all' | 'en' | 'zh'

/**
 * ADMIN EMAIL DESK — double opt-in subscriber stats + test send + weekly
 * blast. Wired to admin.email.* (see api/admin-router.ts). Forced log-mode
 * (MAIL_DISABLED=1 / no SMTP) is surfaced as an amber toast, not an error.
 */
export default function EmailDesk() {
  const { t } = useLang()
  const toast = useToast()
  const utils = trpc.useUtils()

  const [testEmail, setTestEmail] = useState('')
  const [testLang, setTestLang] = useState<'en' | 'zh'>('en')
  const [testError, setTestError] = useState<string | null>(null)
  const [testLogMode, setTestLogMode] = useState(false)
  const [blastIssueId, setBlastIssueId] = useState<number | null>(null)

  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [langFilter, setLangFilter] = useState<LangFilter>('all')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const filters = {
    q: debouncedQ || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    lang: langFilter === 'all' ? undefined : langFilter,
  }

  const statsQuery = trpc.admin['email.stats'].useQuery()
  const listQuery = trpc.admin['email.list'].useQuery({ ...filters, page, pageSize: PAGE_SIZE })
  const issuesQuery = trpc.admin['issues.list'].useQuery()

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    setPage(1)
  }, [debouncedQ, statusFilter, langFilter])

  const invalidate = () => {
    utils.admin['email.stats'].invalidate()
    utils.admin['email.list'].invalidate()
  }

  const test = trpc.admin['email.test'].useMutation({
    onSuccess: (res) => {
      if (res.sent) {
        setTestLogMode(false)
        toast(t('acct.testSent'))
      } else if (res.error) {
        setTestLogMode(false)
        toast(t('acct.testFailed'), { tone: 'signal' })
      } else {
        setTestLogMode(true)
        toast(t('acct.testLogMode'), { tone: 'amber' })
      }
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

  const resend = trpc.admin['email.resendConfirm'].useMutation({
    onSuccess: (res) => {
      toast(res.state === 'already' ? t('acct.emailAlreadyVerified') : t('acct.emailResent'))
      invalidate()
    },
    onError: (e) => toast(e.message.toUpperCase(), { tone: 'signal' }),
  })

  const remove = trpc.admin['email.remove'].useMutation({
    onSuccess: () => {
      toast(t('acct.emailRemoved'))
      invalidate()
    },
    onError: (e) => toast(e.message.toUpperCase(), { tone: 'signal' }),
  })

  const submitTest = (e: FormEvent) => {
    e.preventDefault()
    setTestError(null)
    if (!testEmail.trim()) return setTestError(t('acct.subiEmail'))
    test.mutate({ email: testEmail.trim(), lang: testLang })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await utils.admin['email.export'].fetch(filters)
      const blob = new Blob(['\uFEFF' + res.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cbb-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast(tpl(t('acct.emailExported'), { n: res.total }))
    } catch (e) {
      toast((e as Error).message.toUpperCase(), { tone: 'signal' })
    } finally {
      setExporting(false)
    }
  }

  const handleRemove = (id: number, email: string) => {
    if (!window.confirm(tpl(t('acct.emailRemoveConfirm'), { email }))) return
    remove.mutate({ id })
  }

  const stats = statsQuery.data
  const subscribers = listQuery.data?.rows ?? []
  const total = listQuery.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const issues = issuesQuery.data ?? []

  const pending = stats?.byStatus['pending'] ?? 0
  const verified = stats?.byStatus['verified'] ?? 0
  const unsubscribed = stats?.byStatus['unsubscribed'] ?? 0
  const grandTotal = pending + verified + unsubscribed
  const sendKinds = (['confirm', 'welcome', 'weekly', 'test'] as const).map((k) => ({
    key: k,
    label: t(KIND_LABEL[k]),
    n: stats?.sends[k] ?? 0,
  }))

  const handleBlast = () => {
    if (!blastIssueId) return
    if (!window.confirm(tpl(t('acct.blastConfirm'), { n: verified }))) return
    blast.mutate({ issueId: blastIssueId })
  }

  return (
    <div className="border-b border-line px-6 py-6">
      <p className="kicker mb-4 text-text-muted">
        {t('acct.emailDesk')} <span className="text-volt">· {grandTotal}</span>
      </p>

      {/* Subscriber status + send totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t('acct.emailPending')} value={String(pending)} accent={STATUS_COLOR.pending} />
        <StatTile label={t('acct.emailVerified')} value={String(verified)} accent={STATUS_COLOR.verified} />
        <StatTile label={t('acct.emailUnsubscribed')} value={String(unsubscribed)} accent={STATUS_COLOR.unsubscribed} />
        <StatTile label={t('acct.emailTotal')} value={String(grandTotal)} />
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
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">{t('acct.emailTestLang')}</span>
            {(['en', 'zh'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setTestLang(l)}
                className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                  testLang === l ? 'border-volt text-volt' : 'border-line text-faint hover:text-text'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {testError && <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-signal">{testError}</p>}
          {testLogMode && (
            <p className="mt-3 border border-signal/50 bg-signal/10 px-3 py-2.5 font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.08em] text-signal">
              {t('acct.testLogMode')} — {t('acct.testLogModeHint')}
            </p>
          )}
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
              onClick={handleBlast}
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
          {t('acct.subscribers')} <span className="text-volt">· {total}</span>
        </p>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            className={`${inputCls} max-w-[240px]`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('acct.emailSearchPh')}
            aria-label={t('acct.emailSearchPh')}
          />
          <select
            className={`${inputCls} max-w-[160px]`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label={t('acct.emailFilterStatus')}
          >
            <option value="all">{t('acct.emailAll')} · {t('acct.emailFilterStatus')}</option>
            <option value="pending">{t('acct.emailPending')}</option>
            <option value="verified">{t('acct.emailVerified')}</option>
            <option value="unsubscribed">{t('acct.emailUnsubscribed')}</option>
          </select>
          <select
            className={`${inputCls} max-w-[140px]`}
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value as LangFilter)}
            aria-label={t('acct.emailFilterLang')}
          >
            <option value="all">{t('acct.emailAll')} · {t('acct.emailFilterLang')}</option>
            <option value="en">EN</option>
            <option value="zh">ZH</option>
          </select>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="ml-auto rounded-sm border border-line px-3 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:border-volt hover:text-volt disabled:opacity-40"
          >
            {exporting ? t('acct.emailExporting') : t('acct.emailExport')}
          </button>
        </div>

        {listQuery.isLoading ? (
          <SectionSkeleton rows={3} />
        ) : !subscribers.length ? (
          <p className="py-6 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
            {total === 0 && !filters.q && !filters.status && !filters.lang
              ? t('acct.noSubscribers')
              : t('acct.emailNoResults')}
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
                  <span className="flex items-center gap-3">
                    {s.status !== 'verified' && (
                      <button
                        type="button"
                        onClick={() => resend.mutate({ id: s.id })}
                        disabled={resend.isPending}
                        className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-faint transition-colors hover:text-volt disabled:opacity-40"
                      >
                        {t('acct.emailResend')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(s.id, s.email)}
                      disabled={remove.isPending}
                      className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-faint transition-colors hover:text-signal disabled:opacity-40"
                    >
                      {t('acct.emailRemove')}
                    </button>
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint tnum">
            {tpl(t('acct.emailPageInfo'), { page, pages, total })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-sm border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:border-volt hover:text-volt disabled:opacity-40"
            >
              {t('acct.emailPrev')}
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="rounded-sm border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:border-volt hover:text-volt disabled:opacity-40"
            >
              {t('acct.emailNext')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
