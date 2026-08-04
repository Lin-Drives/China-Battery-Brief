import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import CornerTicks from '@/components/CornerTicks'
import KickerLine from '@/components/KickerLine'
import { cn } from '@/lib/utils'
import { useLang } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

const LEDGER: { labelKey: string; valueKey: string; zero: boolean }[] = [
  { labelKey: 'about.ledger1L', valueKey: 'about.ledger1V', zero: false },
  { labelKey: 'about.ledger2L', valueKey: 'about.ledger2V', zero: true },
  { labelKey: 'about.ledger3L', valueKey: 'about.ledger3V', zero: true },
  { labelKey: 'about.ledger4L', valueKey: 'about.ledger4V', zero: true },
  { labelKey: 'about.ledger5L', valueKey: 'about.ledger5V', zero: false },
]

/** about.md S2 — the model: "Mode A, in the open" */
export default function AboutModel() {
  const { t } = useLang()
  const imgWrapRef = useRef<HTMLDivElement>(null)

  // Parallax scrub ±20px on the newsroom still
  const { scrollYProgress } = useScroll({
    target: imgWrapRef,
    offset: ['start end', 'end start'],
  })
  const parallaxY = useTransform(scrollYProgress, [0, 1], [20, -20])

  return (
    <section id="model" className="border-b border-line py-28">
      <div className="mx-auto grid max-w-container gap-14 px-[clamp(20px,4vw,48px)] lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        {/* Left — sticky text block */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <KickerLine chapter="02" label={t('about.modelKicker')} />
          <motion.h2
            className="mt-6 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.015em] text-text"
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20% 0px' }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            {t('about.modelHA')}
            <em className="italic text-volt">{t('about.modelHEm')}</em>
            {t('about.modelHB')}
          </motion.h2>
          <motion.p
            className="mt-6 max-w-[52ch] font-sans text-[16px] leading-[1.65] text-text-muted"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20% 0px' }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
          >
            {t('about.modelBody')}
          </motion.p>

          {/* Funding ledger — hairline mini-table; $0 cells flash volt-dim on hover */}
          <motion.div
            className="mt-10 border border-line"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
          >
            {LEDGER.map((row, i) => (
              <motion.div
                key={row.labelKey}
                className="group flex items-baseline justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0"
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.45, delay: 0.2 + i * 0.08, ease: EASE }}
              >
                <span className="font-mono text-[12px] tracking-[0.1em] text-text-muted">
                  {t(row.labelKey)}
                </span>
                <span
                  className={cn(
                    'rounded-sm px-1.5 py-0.5 text-right font-mono text-[12px] font-medium tracking-[0.08em] transition-colors duration-200 tnum',
                    row.zero
                      ? 'text-volt group-hover:bg-volt-dim'
                      : 'text-text',
                  )}
                >
                  {t(row.valueKey)}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Pull quote — words stagger */}
          <motion.blockquote
            className="mt-10 border-l-2 border-volt pl-5 font-display text-[24px] font-normal italic leading-[1.35] text-text"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
          >
            {t('about.modelQuote')}
          </motion.blockquote>
        </div>

        {/* Right — newsroom still: clip-path reveal + parallax */}
        <div ref={imgWrapRef} className="max-lg:order-first">
          <motion.figure
            className="relative"
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
            viewport={{ once: true, margin: '-20% 0px' }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <div className="relative overflow-hidden border border-line">
              <motion.img
                src="/about-newsroom.png"
                alt={t('about.modelImgAlt')}
                className="aspect-video w-full object-cover"
                style={{ y: parallaxY, scale: 1.08 }}
              />
            </div>
            <CornerTicks color="var(--volt)" />
          </motion.figure>
          <motion.figcaption
            className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-faint"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {t('about.modelCaption')}
          </motion.figcaption>
        </div>
      </div>
    </section>
  )
}
