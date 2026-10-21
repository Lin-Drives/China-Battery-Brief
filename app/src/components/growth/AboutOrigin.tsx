import { motion } from 'framer-motion'
import KickerLine from '@/components/KickerLine'
import { useLang } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** About S1 — the origin: why a personal brief exists at all. */
export default function AboutOrigin() {
  const { t } = useLang()

  return (
    <section id="origin" className="border-b border-line py-28">
      <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)]">
        <KickerLine chapter="01" label={t('about.originKicker')} />
        <motion.h2
          className="mt-6 max-w-[34ch] font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.015em] text-text"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          {t('about.originHA')}
          <em className="italic text-volt">{t('about.originHEm')}</em>
          {t('about.originHB')}
        </motion.h2>

        <div className="mt-12 grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="max-w-[58ch] space-y-5 font-sans text-[16px] leading-[1.75] text-text-muted">
            {['about.originP1', 'about.originP2', 'about.originP3'].map(
              (key, i) => (
                <motion.p
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-15% 0px' }}
                  transition={{
                    duration: 0.7,
                    delay: 0.1 + i * 0.08,
                    ease: EASE,
                  }}
                >
                  {t(key)}
                </motion.p>
              )
            )}
          </div>

          <motion.aside
            className="self-start border border-line bg-ink-850 lg:sticky lg:top-28"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
          >
            <div className="border-b border-line px-6 py-4">
              <p className="kicker text-faint">{t('about.fitKicker')}</p>
              <h3 className="mt-2 font-display text-[22px] font-medium leading-[1.2] text-text">
                {t('about.fitTitle')}
              </h3>
            </div>
            <div className="border-b border-line px-6 py-5">
              <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-volt">
                {t('about.fitGood')}
              </p>
              <p className="mt-2 font-sans text-[14px] leading-[1.7] text-text-muted">
                {t('about.fitGoodBody')}
              </p>
            </div>
            <div className="px-6 py-5">
              <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-signal">
                {t('about.fitBad')}
              </p>
              <p className="mt-2 font-sans text-[14px] leading-[1.7] text-text-muted">
                {t('about.fitBadBody')}
              </p>
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  )
}
