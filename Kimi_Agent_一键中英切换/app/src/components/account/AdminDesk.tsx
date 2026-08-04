import { useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import RubberStamp from '@/components/RubberStamp'
import { cn } from '@/lib/utils'
import { useToast } from './Toasts'
import { SectionSkeleton } from './Skeletons'
import { PILLAR_META, PILLAR_ORDER, fmtDate, fmtMoney } from './utils'
import type { PillarSlug } from './utils'
import { useLang, tpl } from '@/i18n/lang'

const inputCls =
  'w-full rounded-sm border border-line bg-ink-900 px-3.5 py-3 font-mono text-[13px] text-text caret-volt placeholder:uppercase placeholder:tracking-[0.08em] placeholder:text-faint focus:border-volt focus:outline-none'

const COVERS = ['/cover-044.png', '/cover-045.png', '/cover-046.png', '/cover-047.png']

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <label className={cn('block', span && 'sm:col-span-2')}>
      <span className="kicker mb-2 block text-faint">{label}</span>
      {children}
    </label>
  )
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const initialForm = {
  number: '',
  slug: '',
  title: '',
  dek: '',
  publishedAt: toDatetimeLocal(new Date()),
  isFree: false,
  pillars: [] as PillarSlug[],
  readingMinutes: '8',
  coverAsset: COVERS[3],
  content: '',
  sources: '',
}

/** Two-step delete for issue rows. */
function DeleteIssueButton({ onConfirm, pending }: { onConfirm: () => void; pending: boolean }) {
  const { t } = useLang()
  const [armed, setArmed] = useState(false)
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else {
          setArmed(true)
          window.setTimeout(() => setArmed(false), 3000)
        }
      }}
      className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors disabled:opacity-40"
      style={{ color: armed ? 'var(--signal)' : 'var(--muted)' }}
    >
      <Trash2 className="h-3 w-3" /> {pending ? t('acct.deleting') : armed ? t('acct.confirm') : t('acct.delete')}
    </button>
  )
}

/**
 * Admin-lite DESK CONTROL panel (admin role only) — stats, minimal
 * issue-publishing form, and the issues index with delete. Same dossier
 * aesthetic; no new routes.
 */
export default function AdminDesk() {
  const { t } = useLang()
  const toast = useToast()
  const utils = trpc.useUtils()
  const statsQuery = trpc.admin.stats.useQuery()
  const issuesQuery = trpc.admin['issues.list'].useQuery()

  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const invalidateIssues = () => {
    utils.admin['issues.list'].invalidate()
    utils.content['issues.list'].invalidate()
    utils.admin.stats.invalidate()
  }

  const create = trpc.admin['issues.create'].useMutation({
    onSuccess: (_d, vars) => {
      toast(tpl(t('acct.filePublished'), { n: vars.number }))
      setForm(initialForm)
      setError(null)
      invalidateIssues()
    },
    onError: (e) => setError(e.message.toUpperCase()),
  })

  const del = trpc.admin['issues.delete'].useMutation({
    onSuccess: () => {
      toast(t('acct.fileDeleted'), { tone: 'amber' })
      invalidateIssues()
    },
    onError: (e) => toast(e.message.toUpperCase() || t('acct.deleteFailed'), { tone: 'signal' }),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const number = Number(form.number)
    const readingMinutes = Number(form.readingMinutes)
    if (!Number.isInteger(number) || number <= 0) return setError(t('acct.errNumber'))
    if (!form.slug.trim()) return setError(t('acct.errSlug'))
    if (!form.title.trim()) return setError(t('acct.errTitle'))
    if (form.pillars.length === 0) return setError(t('acct.errPillars'))
    if (!form.content.trim()) return setError(t('acct.errContent'))
    const publishedAt = new Date(form.publishedAt)
    if (Number.isNaN(publishedAt.getTime())) return setError(t('acct.errDate'))

    create.mutate({
      number,
      slug: form.slug.trim(),
      title: form.title.trim(),
      dek: form.dek.trim() || undefined,
      publishedAt,
      isFree: form.isFree,
      pillars: form.pillars,
      readingMinutes: Number.isInteger(readingMinutes) && readingMinutes > 0 ? readingMinutes : 8,
      coverAsset: form.coverAsset || undefined,
      content: form.content,
      sources: form.sources
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        // One source per line: Outlet | Title | URL | Date(optional)
        .map((line) => {
          const [outlet = '', title = '', url = '', date = ''] = line.split('|').map((p) => p.trim())
          return { outlet, title, url, date }
        }),
    })
  }

  const stats = statsQuery.data

  return (
    <div className="border border-amber/30 bg-ink-900">
      {/* Panel header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-5">
        <p className="kicker text-amber">{t('acct.nav.desk')}</p>
        <RubberStamp color="var(--amber)" rotate={-4} className="text-[10px]">
          {t('acct.adminOnly')}
        </RubberStamp>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 border-b border-line lg:grid-cols-4">
        {[
          { label: t('acct.statUsers'), value: stats ? String(stats.users) : '—' },
          { label: t('acct.statIssues'), value: stats ? String(stats.issues) : '—' },
          { label: t('acct.statEmailSubs'), value: stats ? String(stats.emailSubscribers) : '—' },
          { label: t('acct.statRevenue'), value: stats ? fmtMoney(stats.revenueCents) : '—' },
        ].map((s, i) => (
          <div
            key={s.label}
            className={cn('border-line px-6 py-5', i % 2 === 1 && 'border-l', i >= 2 && 'border-t lg:border-t-0', i > 0 && 'lg:border-l')}
          >
            <p className="font-display text-[28px] leading-none text-text tnum">{s.value}</p>
            <p className="kicker mt-2 text-faint">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Publish form */}
      <form onSubmit={submit} className="border-b border-line px-6 py-6">
        <p className="kicker mb-5 text-text-muted">{t('acct.fileNewIssue')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('acct.fIssueNo')}>
            <input
              className={inputCls}
              inputMode="numeric"
              placeholder="048"
              value={form.number}
              onChange={(e) => set('number', e.target.value)}
            />
          </Field>
          <Field label="SLUG">
            <input
              className={inputCls}
              placeholder="048-casl-portugal-plant"
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
            />
          </Field>
          <Field label={t('acct.fTitle')} span>
            <input
              className={inputCls}
              placeholder={t('acct.fTitlePh')}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </Field>
          <Field label={t('acct.fDek')} span>
            <input
              className={inputCls}
              placeholder={t('acct.fDekPh')}
              value={form.dek}
              onChange={(e) => set('dek', e.target.value)}
            />
          </Field>
          <Field label={t('acct.fPublishAt')}>
            <input
              type="datetime-local"
              className={inputCls}
              value={form.publishedAt}
              onChange={(e) => set('publishedAt', e.target.value)}
            />
          </Field>
          <Field label={t('acct.fReadMins')}>
            <input
              className={inputCls}
              inputMode="numeric"
              value={form.readingMinutes}
              onChange={(e) => set('readingMinutes', e.target.value)}
            />
          </Field>
          <Field label={t('acct.fCover')}>
            <select
              className={inputCls}
              value={form.coverAsset}
              onChange={(e) => set('coverAsset', e.target.value)}
            >
              {COVERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={(e) => set('isFree', e.target.checked)}
                className="h-4 w-4 rounded-sm border border-line-strong bg-ink-900 accent-[#C9F24B]"
              />
              {t('acct.fFreeIssue')}
            </label>
          </div>
          <Field label={t('acct.fPillars')} span>
            <div className="flex flex-wrap gap-4">
              {PILLAR_ORDER.map((slug) => {
                const meta = PILLAR_META[slug]
                const checked = form.pillars.includes(slug)
                return (
                  <label
                    key={slug}
                    className="flex cursor-pointer items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em]"
                    style={{ color: checked ? meta.color : 'var(--muted)' }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        set(
                          'pillars',
                          e.target.checked
                            ? [...form.pillars, slug]
                            : form.pillars.filter((p) => p !== slug),
                        )
                      }
                      className="h-4 w-4 rounded-sm border border-line-strong bg-ink-900"
                      style={{ accentColor: meta.color }}
                    />
                    {t(`pillar.${slug}`)}
                  </label>
                )
              })}
            </div>
          </Field>
          <Field label={t('acct.fContent')} span>
            <textarea
              className={cn(inputCls, 'min-h-[180px] resize-y leading-relaxed')}
              placeholder={'## THE SITUATION\n\n…'}
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
            />
          </Field>
          <Field label={t('acct.fSources')} span>
            <textarea
              className={cn(inputCls, 'min-h-[72px] resize-y')}
              placeholder={'CnEVPost | Gotion to build $1.3B plant in Morocco | https://… | 2024-06-07'}
              value={form.sources}
              onChange={(e) => set('sources', e.target.value)}
            />
          </Field>
        </div>

        {error && <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-signal">{error}</p>}

        <button
          type="submit"
          disabled={create.isPending}
          className="mt-6 rounded-sm bg-volt px-6 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-volt-pop active:translate-y-0 active:shadow-none disabled:opacity-40"
        >
          {create.isPending ? t('acct.filing') : t('acct.publishIssue')}
        </button>
      </form>

      {/* Issues index */}
      <div className="px-6 py-6">
        <p className="kicker mb-4 text-text-muted">
          {t('acct.issuesOnFile')} <span className="text-volt">· {issuesQuery.data?.length ?? 0}</span>
        </p>
        {issuesQuery.isLoading ? (
          <SectionSkeleton rows={3} />
        ) : (
          <ul className="border-t border-line">
            <AnimatePresence initial={false}>
              {(issuesQuery.data ?? []).map((issue) => (
                <motion.li
                  key={issue.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                  className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-line py-3 transition-colors hover:bg-ink-800/50"
                >
                  <span className="font-mono text-[12px] font-semibold tracking-[0.1em] text-faint">
                    №{String(issue.number).padStart(3, '0')}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display text-[15px] text-text">{issue.title}</span>
                  {issue.isFree && (
                    <span className="rounded-sm border border-volt/50 px-1.5 py-[1px] font-mono text-[9.5px] uppercase tracking-[0.14em] text-volt">
                      {t('acct.freeTag')}
                    </span>
                  )}
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-faint tnum">
                    {fmtDate(issue.publishedAt)}
                  </span>
                  <DeleteIssueButton pending={del.isPending} onConfirm={() => del.mutate({ id: issue.id })} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}
