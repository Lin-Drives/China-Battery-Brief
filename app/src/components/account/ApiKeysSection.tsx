import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Copy, Lock, Plus, X } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import RubberStamp from '@/components/RubberStamp'
import { useToast } from './Toasts'
import AccountModal from './Modal'
import { SectionSkeleton } from './Skeletons'
import { fmtDate } from './utils'
import { useLang } from '@/i18n/lang'

const inputCls =
  'w-full rounded-sm border border-line bg-ink-900 px-3.5 py-3 font-mono text-[13px] text-text caret-volt placeholder:uppercase placeholder:tracking-[0.08em] placeholder:text-faint focus:border-volt focus:outline-none'

/** Two-step inline confirm (✕ REVOKE → CONFIRM?) */
function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  pending,
}: {
  label: string
  confirmLabel: string
  onConfirm: () => void
  pending?: boolean
}) {
  const { t } = useLang()
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 3000)
    return () => window.clearTimeout(t)
  }, [armed])

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors disabled:opacity-40"
      style={{ color: armed ? 'var(--signal)' : 'var(--muted)' }}
    >
      <X className="h-3 w-3" /> {pending ? t('acct.working') : armed ? confirmLabel : label}
    </button>
  )
}

/**
 * account.md B5 — API keys (Desk tier). Non-desk readers see the locked
 * upsell; the create call 403s server-side and is handled with a toast.
 */
export default function ApiKeysSection() {
  const { t } = useLang()
  const toast = useToast()
  const utils = trpc.useUtils()
  const myQuery = trpc.billing.my.useQuery()
  const isDesk = myQuery.data?.plan.tier === 'desk'

  const listQuery = trpc.me['apiKeys.list'].useQuery(undefined, { enabled: isDesk })

  const [createOpen, setCreateOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [freshKey, setFreshKey] = useState<string | null>(null)
  const [flashId, setFlashId] = useState<number | null>(null)

  const create = trpc.me['apiKeys.create'].useMutation({
    onSuccess: async (data) => {
      setFreshKey(data.key)
      const rows = await utils.me['apiKeys.list'].fetch()
      setFlashId(rows[0]?.id ?? null)
      window.setTimeout(() => setFlashId(null), 1400)
      await utils.me['apiKeys.list'].invalidate()
    },
    onError: (e) => {
      // e.g. FORBIDDEN when the plan dropped below Desk mid-session
      toast(e.message.toUpperCase() || t('acct.keyCreateFailed'), { tone: 'signal' })
      setCreateOpen(false)
    },
  })

  const remove = trpc.me['apiKeys.remove'].useMutation({
    onSuccess: () => {
      utils.me['apiKeys.list'].invalidate()
      toast(t('acct.keyRevoked'), { tone: 'amber' })
    },
    onError: () => toast(t('acct.revokeFailed'), { tone: 'signal' }),
  })

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      toast(t('acct.keyCopied'))
    } catch {
      toast(t('acct.copyFailed'), { tone: 'signal' })
    }
  }

  if (myQuery.isLoading) return <SectionSkeleton rows={3} />

  /* Locked upsell state (non-Desk) */
  if (!isDesk) {
    return (
      <div className="relative flex flex-col items-start gap-5 border border-dashed border-line-strong p-8">
        <span className="flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-text">
          <Lock className="h-4 w-4 text-volt" /> {t('acct.nav.api')}
        </span>
        <p className="max-w-md font-mono text-[11.5px] uppercase leading-relaxed tracking-[0.1em] text-text-muted">
          {t('acct.apiDeskOnly')}
        </p>
        <Link
          to="/pricing"
          className="inline-flex items-center gap-2 rounded-sm bg-volt px-6 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-volt-pop active:translate-y-0 active:shadow-none"
        >
          {t('acct.seeDesk')}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="kicker text-text-muted">
          {t('acct.nav.api')} <span className="text-volt">· {listQuery.data?.length ?? 0}</span>
        </p>
        <button
          type="button"
          onClick={() => {
            setLabel('')
            setFreshKey(null)
            setCreateOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-sm border border-line-strong px-4 py-2.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-text transition-colors duration-200 hover:border-text hover:bg-text/5"
        >
          <Plus className="h-3.5 w-3.5" /> {t('acct.newKey')}
        </button>
      </div>

      {listQuery.isLoading ? (
        <SectionSkeleton rows={2} />
      ) : (listQuery.data?.length ?? 0) === 0 ? (
        <div className="border border-dashed border-line-strong p-8">
          <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-text-muted">
            {t('acct.noKeys')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-line bg-ink-900">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                {[t('acct.colLabel'), t('acct.colKey'), t('acct.colScopes'), t('acct.colLastUsed'), ''].map((h, hi) => (
                  <th key={hi} className="kicker px-5 py-3 font-medium text-faint">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {listQuery.data!.map((k) => (
                  <motion.tr
                    key={k.id}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      backgroundColor: flashId === k.id ? 'rgba(201,242,75,0.12)' : 'rgba(201,242,75,0)',
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: flashId === k.id ? 1.2 : 0.3 }}
                    className="border-b border-line last:border-b-0 hover:bg-ink-800/60"
                  >
                    <td className="px-5 py-3.5 font-mono text-[12px] uppercase tracking-[0.08em] text-text">
                      {k.label ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[12px] tracking-[0.08em] text-faint">
                      cbb_············
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">
                      {(k.scopes ?? []).map((s) => `${s}:read`).join(' · ') || '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted tnum">
                      {k.lastUsedAt ? fmtDate(k.lastUsedAt) : t('acct.never')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ConfirmButton
                        label={t('acct.revoke')}
                        confirmLabel={t('acct.confirm')}
                        pending={remove.isPending}
                        onConfirm={() => remove.mutate({ id: k.id })}
                      />
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal — full key shown ONCE */}
      <AccountModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false)
          setFreshKey(null)
        }}
        labelledBy="apikey-title"
      >
        {!freshKey ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (label.trim()) create.mutate({ label: label.trim() })
            }}
          >
            <p id="apikey-title" className="font-display text-[20px] text-text">
              {t('acct.mintTitle')}
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted">
              {t('acct.mintSub')}
            </p>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('acct.mintPh')}
              maxLength={120}
              autoFocus
              className={`${inputCls} mt-5`}
            />
            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={!label.trim() || create.isPending}
                className="rounded-sm bg-volt px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-volt-pop active:translate-y-0 active:shadow-none disabled:opacity-40"
              >
                {create.isPending ? t('acct.minting') : t('acct.generateKey')}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <p className="font-display text-[20px] text-text">{t('acct.keyMinted')}</p>
            <div className="mt-5 break-all rounded-sm border border-volt/40 bg-volt-dim p-4 font-mono text-[12.5px] leading-relaxed text-volt">
              {freshKey}
            </div>
            <div className="mt-5">
              <RubberStamp color="var(--amber)" rotate={-3}>
                {t('acct.storeNow')}
              </RubberStamp>
            </div>
            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => copyKey(freshKey)}
                className="inline-flex items-center gap-2 rounded-sm bg-volt px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-volt-pop active:translate-y-0 active:shadow-none"
              >
                <Copy className="h-3.5 w-3.5" /> {t('acct.copy')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(false)
                  setFreshKey(null)
                }}
                className="rounded-sm border border-line-strong px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-text transition-colors duration-200 hover:border-text hover:bg-text/5"
              >
                {t('acct.done')}
              </button>
            </div>
          </div>
        )}
      </AccountModal>
    </div>
  )
}
