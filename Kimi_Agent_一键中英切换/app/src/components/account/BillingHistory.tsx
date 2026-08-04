import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import { SectionSkeleton } from './Skeletons'
import { fmtDate, fmtMoney } from './utils'
import { useLang } from '@/i18n/lang'

const EASE_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

const statusStyle: Record<string, { labelKey: string; color: string }> = {
  succeeded: { labelKey: 'acct.paySucceeded', color: 'var(--volt)' },
  pending: { labelKey: 'acct.payPending', color: 'var(--amber)' },
  failed: { labelKey: 'acct.payFailed', color: 'var(--signal)' },
}

/**
 * account.md B6 — billing history hairline table. Payments are mock-checkout
 * records, so the reference column is labeled `MOCK REF` per the dossier
 * aesthetic (no Stripe-hosted invoices in v1).
 */
export default function BillingHistory() {
  const { t } = useLang()
  const historyQuery = trpc.billing.history.useQuery()

  if (historyQuery.isLoading) return <SectionSkeleton rows={3} />

  const rows = historyQuery.data ?? []

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-start gap-5 border border-dashed border-line-strong p-8">
        <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-text-muted">{t('acct.noInvoices')}</p>
        <Link
          to="/pricing"
          className="inline-flex items-center gap-2 rounded-sm border border-line-strong px-5 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-text transition-colors duration-200 hover:border-text hover:bg-text/5"
        >
          {t('acct.seePlans')} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-line bg-ink-900">
      <table className="w-full min-w-[680px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            {[t('acct.colDate'), t('acct.colDesc'), t('acct.colAmount'), t('acct.colStatus'), t('acct.colMockRef')].map((h) => (
              <th key={h} className="kicker px-5 py-3 font-medium text-faint">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ payment, plan }, i) => {
            const st = statusStyle[payment.status] ?? statusStyle.pending
            return (
              <motion.tr
                key={payment.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.04, ease: EASE_EXPO }}
                className="border-b border-line last:border-b-0 hover:bg-ink-800/60"
              >
                <td className="px-5 py-3.5 font-mono text-[12px] uppercase tracking-[0.08em] text-text-muted tnum">
                  {fmtDate(payment.createdAt)}
                </td>
                <td className="px-5 py-3.5 font-mono text-[12px] uppercase tracking-[0.08em] text-text">
                  {plan.name.toUpperCase()}
                </td>
                <td className="px-5 py-3.5 font-mono text-[12px] tracking-[0.08em] text-text tnum">
                  {fmtMoney(payment.amountCents, payment.currency)}
                </td>
                <td className="px-5 py-3.5 font-mono text-[12px] tracking-[0.08em]" style={{ color: st.color }}>
                  {t(st.labelKey)}
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-2">
                    <span className="font-mono text-[11px] tracking-[0.06em] text-faint tnum">
                      {payment.mockRef ?? '—'}
                    </span>
                    <span className="rounded-sm border border-line-strong px-1 py-[1px] font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                      MOCK
                    </span>
                  </span>
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
