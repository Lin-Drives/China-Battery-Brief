import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import Countdown from '@/components/growth/Countdown'
import EmailCapture from '@/components/EmailCapture'
import { planCodeFor, useCheckout } from '@/components/growth/useCheckout'
import type { Billing } from '@/components/growth/useCheckout'
import { useLang } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** pricing.md S6 — final strip: countdown + subscribe CTA + free email capture anchor */
export default function PricingFinalCta({ billing }: { billing: Billing }) {
  const { t } = useLang()
  const { startCheckout, pendingPlan, isProcessing } = useCheckout()
  const planCode = planCodeFor('pro', billing)
  const pending = pendingPlan === planCode && isProcessing

  return (
    <section className="relative overflow-hidden border-t border-line py-28">
      {/* volt-dim radial glow */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[480px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full animate-breathe"
        style={{ background: 'radial-gradient(ellipse, var(--volt-dim) 0%, transparent 65%)' }}
      />

      <motion.div
        className="relative z-10 mx-auto flex max-w-[880px] flex-col items-center px-[clamp(20px,4vw,48px)] text-center"
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20% 0px' }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <h2 className="font-display text-[clamp(1.9rem,3.4vw,2.25rem)] font-normal leading-[1.15] text-text">
          {t('pricing.finalHA')}
          <em className="italic text-volt">{t('pricing.finalHEm')}</em>
          {t('pricing.finalHB')}
        </h2>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
          {t('pricing.finalNext')}
        </p>
        <Countdown className="mt-4" />

        <button
          type="button"
          onClick={() => startCheckout(planCode)}
          disabled={pending}
          className="mt-10 inline-flex items-center justify-center gap-2 rounded-sm bg-volt px-6 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-950 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-volt-pop active:translate-y-0 active:shadow-none disabled:cursor-wait disabled:opacity-80 [&_svg]:h-3.5 [&_svg]:w-3.5"
        >
          {pending ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              {t('pricing.processing')}
            </>
          ) : (
            <>
              {billing === 'annual' ? t('pricing.finalCtaAnnual') : t('pricing.finalCtaMonthly')}
              <ArrowRight aria-hidden />
            </>
          )}
        </button>

        {/* Free tier email-capture anchor — FREE card CTA scrolls here */}
        <div id="start-free" className="mt-16 flex w-full flex-col items-center border-t border-line pt-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            {t('pricing.finalFree')}
          </p>
          <EmailCapture className="mt-5 flex w-full flex-col items-center" />
        </div>
      </motion.div>
    </section>
  )
}
