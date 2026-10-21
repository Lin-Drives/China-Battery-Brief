import { motion } from 'framer-motion'
import KickerLine from '@/components/KickerLine'
import { useLang } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

const FACTS = [
  { labelKey: 'about.authorFact1L', valueKey: 'about.authorFact1V' },
  { labelKey: 'about.authorFact2L', valueKey: 'about.authorFact2V' },
  { labelKey: 'about.authorFact3L', valueKey: 'about.authorFact3V' },
  { labelKey: 'about.authorFact4L', valueKey: 'about.authorFact4V' },
  { labelKey: 'about.authorFact5L', valueKey: 'about.authorFact5V' },
  { labelKey: 'about.authorFact6L', valueKey: 'about.authorFact6V' },
]

const PRINCIPLES = [
  { labelKey: 'about.authorPrinc1L', valueKey: 'about.authorPrinc1V' },
  { labelKey: 'about.authorPrinc2L', valueKey: 'about.authorPrinc2V' },
  { labelKey: 'about.authorPrinc3L', valueKey: 'about.authorPrinc3V' },
  { labelKey: 'about.authorPrinc4L', valueKey: 'about.authorPrinc4V' },
  { labelKey: 'about.authorPrinc5L', valueKey: 'about.authorPrinc5V' },
]

/** About S2 — who is writing: a real byline, real limits, no invented desk. */
export default function AboutAuthor() {
  const { t } = useLang()

  return (
    <section id="author" className="border-b border-line py-28">
      <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)]">
        <KickerLine chapter="02" label={t('about.authorKicker')} />
        <motion.h2
          className="mt-6 max-w-[22ch] font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.015em] text-text"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          {t('about.authorHA')}
          <em className="italic text-volt">{t('about.authorHEm')}</em>
          {t('about.authorHB')}
        </motion.h2>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <motion.div
            className="relative overflow-hidden border border-line bg-ink-850 p-7 lg:p-9"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <img
              aria-hidden
              src="/seal-cbb.svg"
              alt=""
              className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 opacity-[0.06]"
            />

            <p className="font-mono text-[12px] font-semibold tracking-[0.16em] text-volt">
              {t('about.authorRole')}
            </p>
            <p className="mt-6 max-w-[46ch] font-sans text-[16px] leading-[1.75] text-text-muted">
              {t('about.authorBio')}
            </p>

            <dl className="mt-8 border-t border-line">
              {FACTS.map(row => (
                <div
                  key={row.labelKey}
                  className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-line py-3 last:border-b-0"
                >
                  <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
                    {t(row.labelKey)}
                  </dt>
                  <dd className="font-sans text-[14px] leading-[1.6] text-text-muted">
                    {t(row.valueKey)}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>

          <div className="lg:pt-2">
            <p className="kicker text-faint">{t('about.authorPrincKicker')}</p>

            <motion.div
              className="mt-5 border border-line"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
            >
              {PRINCIPLES.map(row => (
                <div
                  key={row.labelKey}
                  className="flex items-baseline justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0"
                >
                  <span className="font-mono text-[11px] tracking-[0.1em] text-text-muted">
                    {t(row.labelKey)}
                  </span>
                  <span className="text-right font-mono text-[11px] tracking-[0.08em] text-text">
                    {t(row.valueKey)}
                  </span>
                </div>
              ))}
            </motion.div>

            <motion.blockquote
              className="mt-10 border-l-2 border-volt pl-5 font-display text-[24px] font-normal italic leading-[1.35] text-text"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
            >
              {t('about.authorQuote')}
            </motion.blockquote>
          </div>
        </div>
      </div>
    </section>
  )
}
