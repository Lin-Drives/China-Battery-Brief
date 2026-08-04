import { motion } from 'framer-motion'
import CBBButton from '@/components/Buttons'
import { useLang } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

const CONTACTS = [
  { labelKey: 'about.contact1', value: 'TIPS@CBBRIEF.COM (PGP AVAILABLE)', href: 'mailto:tips@cbbrief.com' },
  { labelKey: 'about.contact2', value: 'CORRECTIONS@CBBRIEF.COM', href: 'mailto:corrections@cbbrief.com' },
  { labelKey: 'about.contact3', value: 'DESK@CBBRIEF.COM', href: 'mailto:desk@cbbrief.com' },
]

/** about.md S6 — contact + CTA */
export default function AboutContact() {
  const { t } = useLang()
  return (
    <section className="relative overflow-hidden py-28">
      {/* Seal watermark at 4% opacity */}
      <img
        aria-hidden
        src="/seal-cbb.svg"
        alt=""
        className="pointer-events-none absolute -right-24 top-1/2 h-[420px] w-[420px] -translate-y-1/2 opacity-[0.04]"
      />

      <div className="relative z-10 mx-auto flex max-w-[760px] flex-col items-center px-[clamp(20px,4vw,48px)] text-center">
        {/* Contact lines — stagger */}
        <div className="flex flex-col gap-2.5">
          {CONTACTS.map((c, i) => (
            <motion.p
              key={c.labelKey}
              className="font-mono text-[12px] tracking-[0.1em]"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
            >
              <span className="text-faint">{t(c.labelKey)} — </span>
              <a href={c.href} className="text-text-muted transition-colors hover:text-volt">
                {c.value}
              </a>
            </motion.p>
          ))}
        </div>

        <motion.h2
          className="mt-16 font-display text-[clamp(2rem,4vw,2.5rem)] font-normal leading-[1.15] text-text"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20% 0px' }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          {t('about.contactHA')}
          <em className="italic text-volt">{t('about.contactHEm')}</em>
          {t('about.contactHB')}
        </motion.h2>

        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
        >
          <CBBButton variant="primary" to="/briefs/debrecen-sold-out">
            {t('about.readFreeIssue')}
          </CBBButton>
          <CBBButton variant="ghost" to="/pricing">
            {t('about.seePricing')}
          </CBBButton>
        </motion.div>
      </div>
    </section>
  )
}
