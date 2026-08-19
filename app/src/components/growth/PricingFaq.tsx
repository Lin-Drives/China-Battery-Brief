import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import KickerLine from '@/components/KickerLine'
import { useLang } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

const FAQS = [
  { qKey: 'pricing.faq1q', aKey: 'pricing.faq1a' },
  { qKey: 'pricing.faq2q', aKey: 'pricing.faq2a' },
  { qKey: 'pricing.faq3q', aKey: 'pricing.faq3a' },
  { qKey: 'pricing.faq4q', aKey: 'pricing.faq4a' },
  { qKey: 'pricing.faq5q', aKey: 'pricing.faq5a' },
  { qKey: 'pricing.faq6q', aKey: 'pricing.faq6a' },
  { qKey: 'pricing.faq7q', aKey: 'pricing.faq7a' },
]

/** pricing.md S5 — FAQ accordion; first item auto-opens on scroll into view */
export default function PricingFaq() {
  const { t } = useLang()
  const [open, setOpen] = useState<string>('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { once: true, margin: '-25% 0px' })

  useEffect(() => {
    if (inView) {
      const id = window.setTimeout(() => setOpen('item-0'), 350)
      return () => window.clearTimeout(id)
    }
  }, [inView])

  return (
    <section className="border-t border-line py-24">
      <div ref={rootRef} className="mx-auto max-w-[760px] px-[clamp(20px,4vw,48px)]">
        <KickerLine chapter="04" label={t('pricing.faqKicker')} />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15% 0px' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <Accordion
            type="single"
            collapsible
            value={open}
            onValueChange={setOpen}
            className="mt-8 border-t border-line"
          >
            {FAQS.map((faq, i) => (
              <AccordionItem key={faq.qKey} value={`item-${i}`} className="border-b border-line">
                <AccordionTrigger className="rounded-sm py-5 font-display text-[18px] font-medium leading-[1.35] text-text hover:text-volt hover:no-underline [&>svg]:text-volt">
                  {t(faq.qKey)}
                </AccordionTrigger>
                <AccordionContent className="pb-5 pr-8 font-mono text-[13px] leading-[1.7] text-text-muted">
                  {t(faq.aKey)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}
