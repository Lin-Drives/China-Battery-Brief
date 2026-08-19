import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import RubberStamp from '@/components/RubberStamp'
import { useLang } from '@/i18n/lang'

const COLUMNS: { titleKey: string; links: { labelKey: string; to: string }[] }[] = [
  {
    titleKey: 'footer.col.sections',
    links: [
      { labelKey: 'footer.link.briefs', to: '/briefs' },
      { labelKey: 'footer.link.tracker', to: '/tracker' },
      { labelKey: 'footer.link.techRoutes', to: '/tech' },
      { labelKey: 'footer.link.policy', to: '/policy' },
      { labelKey: 'footer.link.markets', to: '/markets' },
      { labelKey: 'footer.link.pricing', to: '/pricing' },
    ],
  },
  {
    titleKey: 'footer.col.company',
    links: [
      { labelKey: 'footer.link.about', to: '/about' },
      { labelKey: 'footer.link.manifesto', to: '/about#manifesto' },
      { labelKey: 'footer.link.methodology', to: '/about#methodology' },
      { labelKey: 'footer.link.corrections', to: '/about#corrections' },
    ],
  },
  {
    titleKey: 'footer.col.legal',
    links: [
      { labelKey: 'footer.link.terms', to: '/about#terms' },
      { labelKey: 'footer.link.privacy', to: '/about#privacy' },
      { labelKey: 'footer.link.refunds', to: '/about#refunds' },
      { labelKey: 'footer.link.imprint', to: '/about#imprint' },
    ],
  },
]

const WORDMARK = 'China Battery Brief'

/** design.md §8.3 — footer on all pages */
export default function Footer() {
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <footer className="border-t border-line bg-ink-950">
      {/* Top row: mini newsletter capture */}
      <div className="mx-auto flex max-w-container flex-col gap-6 px-[clamp(20px,4vw,48px)] py-14 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-md">
          <p className="kicker mb-3 text-volt">{t('footer.kicker')}</p>
          {sent ? (
            <p className="data-text text-text">{t('footer.confirm')}</p>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (email.trim()) setSent(true)
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footer.placeholder')}
                className="w-full rounded-sm border border-line bg-ink-900 px-3.5 py-3 font-mono text-[13px] text-text caret-volt placeholder:uppercase placeholder:tracking-[0.08em] placeholder:text-faint focus:border-volt focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 rounded-sm bg-volt px-4 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-volt-pop"
              >
                <ArrowRight aria-hidden />
              </button>
            </form>
          )}
        </div>
        <img src="/logo.svg" alt="China Battery Brief" className="h-8 w-auto text-text-muted opacity-70" />
      </div>

      {/* Middle: giant outline wordmark, letters slide up staggered on entry */}
      <div className="overflow-hidden border-t border-line px-[clamp(20px,4vw,48px)] py-10">
        <motion.div
          initial="closed"
          whileInView="open"
          viewport={{ once: true, amount: 0.4 }}
          variants={{ open: { transition: { staggerChildren: 0.04 } } }}
          className="group flex flex-wrap justify-center"
          aria-label={WORDMARK}
        >
          {WORDMARK.split('').map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden
              variants={{
                closed: { y: 24, opacity: 0 },
                open: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
              }}
              className="font-display text-[clamp(2.5rem,7vw,6.5rem)] font-light leading-none text-transparent transition-[color] duration-[800ms] group-hover:text-text"
              style={{ WebkitTextStroke: '1px var(--line-strong)' }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </motion.div>
      </div>

      {/* Link columns */}
      <div className="mx-auto grid max-w-container grid-cols-2 gap-10 border-t border-line px-[clamp(20px,4vw,48px)] py-12 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.titleKey}>
            <p className="kicker mb-4 text-faint">{t(col.titleKey)}</p>
            <ul className="flex flex-col gap-2.5">
              {col.links.map((link) => (
                <li key={link.labelKey}>
                  <Link
                    to={link.to}
                    className="font-sans text-[14px] text-text-muted transition-colors duration-200 hover:text-text"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-container flex-col items-start justify-between gap-4 px-[clamp(20px,4vw,48px)] py-6 md:flex-row md:items-center">
          <p className="font-mono text-[11px] tracking-wide text-faint">{t('footer.bottom')}</p>
          <RubberStamp color="var(--faint)" rotate={-4} className="text-[10px]">
            {t('stamp.notAdvice')}
          </RubberStamp>
        </div>
      </div>
    </footer>
  )
}
