import { motion } from 'framer-motion'
import { useLang } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

const ANCHORS = [
  { key: 'pricing.anchor1', volt: false },
  { key: 'pricing.anchor2', volt: false },
  { key: 'pricing.anchor3', volt: false },
  { key: 'pricing.anchor4', volt: true },
]

/** pricing.md S0 — header: kicker, display-1 H1, sub, competitor anchor strip */
export default function PricingHero() {
  const { t } = useLang()
  const kicker = t('pricing.kicker')
  return (
    <header className="relative overflow-hidden border-b border-line">
      {/* faint graph-grid backdrop */}
      <div aria-hidden className="graph-grid absolute inset-0" />
      <div className="relative z-10 mx-auto max-w-[880px] px-[clamp(20px,4vw,48px)] pb-12 pt-24 text-center">
        {/* Kicker — char stagger */}
        <p className="kicker text-text-muted" aria-label={kicker}>
          {kicker.split('').map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="inline-block"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.012 * i, ease: EASE }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </p>

        {/* H1 — line-mask reveal, italic accent on "decision" */}
        <h1 className="mt-8 font-display text-[clamp(2.75rem,6vw,5.5rem)] font-normal leading-[0.98] tracking-[-0.02em] text-text">
          <span className="block overflow-hidden pb-[0.12em]">
            <motion.span
              className="block"
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
            >
              {t('pricing.h1a')}
            </motion.span>
          </span>
          <span className="block overflow-hidden pb-[0.14em]">
            <motion.span
              className="block"
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.9, delay: 0.37, ease: EASE }}
            >
              {t('pricing.h1bA')}
              <em className="italic text-volt">{t('pricing.h1bEm')}</em>
              {t('pricing.h1bB')}
            </motion.span>
          </span>
        </h1>

        <motion.p
          className="mx-auto mt-6 max-w-[58ch] font-sans text-[16px] leading-[1.65] text-text-muted"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
        >
          {t('pricing.sub')}
        </motion.p>
      </div>

      {/* Anchor strip — top hairline draws scaleX, items stagger, CBB item pops volt */}
      <div className="relative z-10">
        <motion.div
          aria-hidden
          className="absolute left-0 top-0 h-px w-full bg-line"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, delay: 0.6, ease: EASE }}
          style={{ transformOrigin: 'left center' }}
        />
        <div className="mx-auto flex max-w-container flex-wrap items-center justify-center gap-x-5 gap-y-2 px-[clamp(20px,4vw,48px)] py-2">
          {ANCHORS.map((a, i) => (
            <motion.span
              key={a.key}
              className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.14em]"
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: 1,
                y: 0,
                ...(a.volt ? { scale: [1, 1.08, 1] } : {}),
              }}
              transition={{
                duration: 0.4,
                delay: 0.8 + i * 0.06,
                ease: EASE,
                ...(a.volt ? { scale: { duration: 0.5, delay: 0.8 + i * 0.06 + 0.35 } } : {}),
              }}
            >
              {i > 0 && (
                <span aria-hidden className="hidden text-faint sm:inline">
                  ·
                </span>
              )}
              <span className={a.volt ? 'font-semibold text-volt' : 'text-faint'}>{t(a.key)}</span>
            </motion.span>
          ))}
        </div>
      </div>
    </header>
  )
}
