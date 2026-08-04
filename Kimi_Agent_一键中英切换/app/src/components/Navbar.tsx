import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Menu, X } from 'lucide-react'
import LangToggle from '@/components/LangToggle'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useLang } from '@/i18n/lang'
import { LOGIN_PATH } from '@/const'

const LINKS = [
  { key: 'nav.briefs', to: '/briefs' },
  { key: 'nav.tracker', to: '/tracker' },
  { key: 'nav.tech', to: '/tech' },
  { key: 'nav.risk', to: '/risk' },
  { key: 'nav.pricing', to: '/pricing' },
  { key: 'nav.about', to: '/about' },
]

/**
 * design.md §8.1 — fixed navbar (64px).
 * Layout owns the matching top offset on the content slot.
 */
export default function Navbar() {
  const { pathname } = useLocation()
  const { t } = useLang()
  const [scrolled, setScrolled] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24)
      setPastHero(window.scrollY > window.innerHeight)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile drawer on route change (§8.1)
  useEffect(() => setOpen(false), [pathname])

  const routeSeg = pathname.split('/')[1] ?? ''
  const routeLabel = `/${routeSeg === '' ? t('route.home') : t(`route.${routeSeg}`)}`

  return (
    <header className="fixed top-0 left-0 z-50 w-full">
      <nav
        className={cn(
          'flex h-16 items-center justify-between border-b px-[clamp(20px,4vw,48px)] transition-colors duration-300',
          scrolled ? 'border-line bg-ink-950/80 backdrop-blur-[12px]' : 'border-transparent bg-transparent',
        )}
      >
        {/* Left: seal + wordmark */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3" aria-label="China Battery Brief home">
            <img src="/seal-cbb.svg" alt="" className="h-7 w-7 text-text" />
            <span className="font-mono text-[12px] font-semibold tracking-[0.14em] text-text">
              CHINA BATTERY BRIEF
            </span>
          </Link>
          <span aria-hidden className="hidden h-4 w-px bg-line-strong lg:block" />
          <span className="kicker hidden text-faint lg:block">{t('nav.est')}</span>
          {/* Route indicator (§8.1): shows current page label after scrolling past a viewport */}
          {pastHero && (
            <span className="kicker ml-2 hidden text-volt md:block">{routeLabel}</span>
          )}
        </div>

        {/* Center: section links (lg+) */}
        <div className="hidden items-center gap-7 lg:flex">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'group relative font-sans text-[14px] font-medium transition-colors duration-200',
                  isActive ? 'text-text' : 'text-text-muted hover:text-text',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {t(link.key)}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute -bottom-1.5 left-0 h-[2px] w-full origin-left bg-volt transition-transform duration-200',
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Right: language toggle + auth slot + subscribe */}
        <div className="flex items-center gap-4">
          <LangToggle className="hidden sm:flex" />
          <AuthSlot />
          <Link
            to="/pricing"
            className="rounded-sm bg-volt px-4 py-2 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-volt-pop active:translate-y-0 active:shadow-none"
          >
            {t('nav.subscribe')}
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="text-text lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile drawer (§8.1): full-screen ink overlay, Fraunces links staggering up */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] flex flex-col bg-ink-950 lg:hidden"
          >
            <div className="flex h-16 items-center justify-between border-b border-line px-[clamp(20px,4vw,48px)]">
              <span className="font-mono text-[12px] font-semibold tracking-[0.14em] text-text">
                CHINA BATTERY BRIEF
              </span>
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="text-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2 px-[clamp(20px,4vw,48px)]">
              <motion.div
                initial="closed"
                animate="open"
                variants={{ open: { transition: { staggerChildren: 0.06 } } }}
              >
                {LINKS.map((link) => (
                  <motion.div
                    key={link.to}
                    variants={{
                      closed: { y: 24, opacity: 0 },
                      open: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
                    }}
                  >
                    <Link
                      to={link.to}
                      className="block py-2 font-display text-[40px] leading-tight text-text"
                    >
                      {t(link.key)}
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-[clamp(20px,4vw,48px)] py-5">
              <p className="data-text text-faint">{t('nav.drawerContact')}</p>
              <LangToggle id="lang-toggle-pill-mobile" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

/**
 * Auth-aware account area (backend Phase-5 wiring).
 * isLoading → neutral placeholder; anon → Sign in (LOGIN_PATH);
 * authed → avatar initials + account link + logout.
 */
function AuthSlot() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { t } = useLang()

  if (isLoading) {
    return <div aria-hidden className="hidden h-9 w-20 animate-pulse rounded-sm bg-ink-800 sm:block" />
  }

  if (!isAuthenticated || !user) {
    return (
      <Link
        to={LOGIN_PATH}
        className="hidden rounded-sm border border-line-strong px-4 py-2 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-text transition-colors duration-200 hover:border-text hover:bg-text/5 sm:block"
      >
        {t('nav.signin')}
      </Link>
    )
  }

  const initials = (user.name ?? user.email ?? 'R')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="hidden items-center gap-3 sm:flex">
      <Link
        to="/account"
        title={user.name ?? t('nav.account')}
        className="flex h-9 w-9 items-center justify-center rounded-sm border border-line-strong bg-ink-800 font-mono text-[12px] font-semibold text-volt transition-colors hover:border-volt"
      >
        {initials}
      </Link>
      <button
        type="button"
        onClick={() => logout()}
        aria-label={t('nav.signout')}
        className="text-muted transition-colors hover:text-signal"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}
