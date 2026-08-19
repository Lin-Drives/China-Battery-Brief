import { motion } from 'framer-motion'
import RubberStamp from '@/components/RubberStamp'
import { useLang } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

const CELLS = [
  { titleKey: 'pricing.trust1T', bodyKey: 'pricing.trust1B', stampKey: null },
  { titleKey: 'pricing.trust2T', bodyKey: 'pricing.trust2B', stampKey: null },
  { titleKey: 'pricing.trust3T', bodyKey: 'pricing.trust3B', stampKey: 'pricing.stampIndependent' },
] as const

/** pricing.md S4 — guarantees & trust row */
export default function TrustRow() {
  const { t } = useLang()
  return (
    <section className="border-t border-line">
      <div className="mx-auto grid max-w-container lg:grid-cols-3">
        {CELLS.map((cell, i) => (
          <motion.div
            key={cell.titleKey}
            className="relative border-b border-line px-[clamp(20px,4vw,48px)] py-12 lg:border-b-0 lg:border-r lg:last:border-r-0"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
          >
            <h3 className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-volt">
              {t(cell.titleKey)}
            </h3>
            <p className="mt-3 max-w-[38ch] font-sans text-[14px] leading-[1.65] text-text-muted">
              {t(cell.bodyKey)}
            </p>
            {cell.stampKey && (
              <motion.div
                className="absolute right-8 top-8"
                initial={{ opacity: 0, scale: 1.7, rotate: -16 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true, margin: '-15% 0px' }}
                transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.35 + i * 0.1 }}
              >
                <RubberStamp color="var(--volt)" rotate={-6}>
                  {t(cell.stampKey)}
                </RubberStamp>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  )
}
