import { motion } from 'framer-motion'
import CBBButton from '@/components/Buttons'
import KickerLine from '@/components/KickerLine'
import { useLang } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

const STEPS = [
  {
    num: '01',
    labelKey: 'about.synSignalLabel',
    titleKey: 'about.synSignalTitle',
    bodyKey: 'about.synSignalBody',
  },
  {
    num: '02',
    labelKey: 'about.synCheckLabel',
    titleKey: 'about.synCheckTitle',
    bodyKey: 'about.synCheckBody',
  },
  {
    num: '03',
    labelKey: 'about.synJudgeLabel',
    titleKey: 'about.synJudgeTitle',
    bodyKey: 'about.synJudgeBody',
  },
]

/** About S3 — synthesis: one real file, from raw signal to structural judgment. */
export default function AboutSynthesis() {
  const { t } = useLang()

  return (
    <section id="synthesis" className="border-b border-line py-28">
      <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)]">
        <KickerLine chapter="03" label={t('about.synKicker')} />
        <motion.h2
          className="mt-6 max-w-[24ch] font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.015em] text-text"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          {t('about.synHA')}
          <em className="italic text-volt">{t('about.synHEm')}</em>
          {t('about.synHB')}
        </motion.h2>

        <motion.p
          className="mt-6 max-w-[62ch] font-sans text-[16px] leading-[1.7] text-text-muted"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
        >
          {t('about.synLead')}
        </motion.p>

        <div className="mt-14 grid gap-px border border-line bg-line md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.article
              key={step.num}
              className="flex flex-col bg-ink-900 p-6 lg:p-7"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-12% 0px' }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-[11px] tracking-[0.16em] text-faint">
                  {step.num}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-volt">
                  {t(step.labelKey)}
                </span>
              </div>
              <h3 className="mt-5 font-display text-[22px] font-medium leading-[1.2] text-text">
                {t(step.titleKey)}
              </h3>
              <p className="mt-4 font-sans text-[14px] leading-[1.7] text-text-muted">
                {t(step.bodyKey)}
              </p>
            </motion.article>
          ))}
        </div>

        <motion.div
          className="mt-8 border-l-2 border-volt bg-ink-850 px-6 py-6 lg:px-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-12% 0px' }}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
        >
          <p className="font-mono text-[11px] font-semibold tracking-[0.16em] text-volt">
            {t('about.synSoWhatLabel')}
          </p>
          <p className="mt-3 max-w-[76ch] font-sans text-[15px] leading-[1.75] text-text">
            {t('about.synSoWhatBody')}
          </p>
          <div className="mt-6">
            <CBBButton variant="ghost" to="/briefs/from-scale-to-spec">
              {t('about.synReadIssue')}
            </CBBButton>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
