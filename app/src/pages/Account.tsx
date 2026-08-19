import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { LOGIN_PATH } from '@/const'
import KickerLine from '@/components/KickerLine'
import { cn } from '@/lib/utils'
import { ToastProvider } from '@/components/account/Toasts'
import { DashboardSkeleton } from '@/components/account/Skeletons'
import WelcomeBanner from '@/components/account/WelcomeBanner'
import OverviewSection from '@/components/account/OverviewSection'
import LatestStrip from '@/components/account/LatestStrip'
import SavedBriefs from '@/components/account/SavedBriefs'
import AlertsMatrix from '@/components/account/AlertsMatrix'
import ApiKeysSection from '@/components/account/ApiKeysSection'
import BillingHistory from '@/components/account/BillingHistory'
import AdminDesk from '@/components/account/AdminDesk'
import { firstNameOf, timeGreetingKey } from '@/components/account/utils'
import { useLang, tpl } from '@/i18n/lang'
import { fmtDateShort } from '@/i18n/format'

const EASE_EXPO = [0.16, 1, 0.3, 1] as [number, number, number, number]

type SectionDef = { id: string; label: string }

function useActiveSection(idsKey: string) {
  const [active, setActive] = useState(idsKey.split('|')[0])
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    idsKey.split('|').forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [idsKey])
  return active
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Dashboard() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const welcome = params.get('welcome') === '1'
  const fromSlug = params.get('from')
  const [welcomeDismissed, setWelcomeDismissed] = useState(false)

  const isAdmin = user?.role === 'admin'

  const sections: SectionDef[] = [
    { id: 'overview', label: t('acct.nav.overview') },
    { id: 'latest', label: t('acct.nav.latest') },
    { id: 'saved', label: t('acct.nav.saved') },
    { id: 'alerts', label: t('acct.nav.alerts') },
    { id: 'api', label: t('acct.nav.api') },
    { id: 'billing', label: t('acct.nav.billing') },
    ...(isAdmin ? [{ id: 'desk-control', label: t('acct.nav.desk') }] : []),
  ]
  const active = useActiveSection(sections.map((s) => s.id).join('|'))

  // Post-checkout welcome: auto-scroll to the latest files strip (account.md shared states)
  useEffect(() => {
    if (!welcome) return
    const t = window.setTimeout(() => scrollToId('latest'), 1100)
    return () => window.clearTimeout(t)
  }, [welcome])

  const dismissWelcome = () => {
    setWelcomeDismissed(true)
    const next = new URLSearchParams(params)
    next.delete('welcome')
    next.delete('from')
    setParams(next, { replace: true })
  }

  const name = firstNameOf(user?.name, user?.email)

  return (
    <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] pb-24 pt-16">
      {welcome && !welcomeDismissed && <WelcomeBanner fromSlug={fromSlug} onDismiss={dismissWelcome} />}

      {/* Header (account.md B): greeting + member metadata */}
      <motion.header
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_EXPO }}
        className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-10"
      >
        <div>
          <KickerLine label={t('acct.kicker')} />
          <h1 className="mt-6 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-normal leading-[1.08] text-text">
            {t(timeGreetingKey())}, <em className="italic text-volt">{name}</em>.
          </h1>
        </div>
        <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-faint tnum sm:text-right">
          {tpl(t('acct.memberSince'), { d: user?.createdAt ? fmtDateShort(user.createdAt, lang) : '—' })}
          <br />
          {tpl(t('acct.readerId'), { n: String(user?.id ?? 0).padStart(4, '0') })}
        </p>
      </motion.header>

      {/* Rail nav — horizontal chips on mobile, sticky left rail on lg */}
      <nav aria-label="Dashboard sections" className="sticky top-16 z-40 -mx-1 mt-6 flex gap-1 overflow-x-auto bg-ink-950/90 px-1 py-3 backdrop-blur-[8px] lg:hidden">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollToId(s.id)}
            className={cn(
              'shrink-0 rounded-sm border px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors duration-200',
              active === s.id ? 'border-volt/50 text-volt' : 'border-line text-text-muted hover:text-text',
            )}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="mt-10 lg:grid lg:grid-cols-[150px_minmax(0,1fr)] lg:gap-12">
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE_EXPO }}
          className="sticky top-24 hidden self-start lg:block"
        >
          <ul className="space-y-1">
            {sections.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.04, ease: EASE_EXPO }}
              >
                <button
                  type="button"
                  onClick={() => scrollToId(s.id)}
                  className={cn(
                    'block w-full border-l-2 py-2 pl-4 text-left font-mono text-[12px] uppercase tracking-[0.14em] transition-colors duration-200',
                    active === s.id
                      ? 'border-volt text-volt'
                      : 'border-transparent text-text-muted hover:border-line-strong hover:text-text',
                  )}
                >
                  {s.label}
                </button>
              </motion.li>
            ))}
          </ul>
        </motion.aside>

        <div className="space-y-20">
          <motion.section
            id="overview"
            className="scroll-mt-32"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.6, ease: EASE_EXPO }}
          >
            <OverviewSection />
          </motion.section>

          <section id="latest" className="scroll-mt-32">
            <p className="kicker mb-5 text-text-muted">{t('acct.latestFiles')}</p>
            <LatestStrip />
          </section>

          <motion.section
            id="saved"
            className="scroll-mt-32"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.6, ease: EASE_EXPO }}
          >
            <SavedBriefs />
          </motion.section>

          <motion.section
            id="alerts"
            className="scroll-mt-32"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.6, ease: EASE_EXPO }}
          >
            <p className="kicker mb-5 text-text-muted">{t('acct.alertsControl')}</p>
            <AlertsMatrix />
          </motion.section>

          <motion.section
            id="api"
            className="scroll-mt-32"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.6, ease: EASE_EXPO }}
          >
            <ApiKeysSection />
          </motion.section>

          <motion.section
            id="billing"
            className="scroll-mt-32"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.6, ease: EASE_EXPO }}
          >
            <p className="kicker mb-5 text-text-muted">{t('acct.billingHistory')}</p>
            <BillingHistory />
          </motion.section>

          {isAdmin && (
            <motion.section
              id="desk-control"
              className="scroll-mt-32"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.6, ease: EASE_EXPO }}
            >
              <AdminDesk />
            </motion.section>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * /account — subscriber dashboard (account.md PART B). Auth-gated; the
 * platform Login page owns authentication.
 */
export default function Account() {
  const { user, isLoading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: LOGIN_PATH })

  useEffect(() => {
    document.title = 'Account — China Battery Brief'
  }, [])

  // Neutral hairline skeletons while the session resolves (or the redirect fires)
  if (isLoading || !user) return <DashboardSkeleton />

  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  )
}
