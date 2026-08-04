import { useRef } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import RubberStamp from '@/components/RubberStamp'
import { cn } from '@/lib/utils'
import { planCodeFor, useCheckout } from '@/components/growth/useCheckout'
import type { Billing } from '@/components/growth/useCheckout'
import { useLang } from '@/i18n/lang'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

type Feature = { labelKey: string; included: boolean }

type Tier = {
  code: string
  tierKey: 'free' | 'pro' | 'desk'
  nameKey: string
  epithetKey: string
  monthly: { price: string; unitKey: string; noteKey: string }
  annual: { price: string; unitKey: string; noteKey: string; struck?: string }
  features: Feature[]
  ctaKey: string
  featured: boolean
}

const TIERS: Tier[] = [
  {
    code: 'T-01',
    tierKey: 'free',
    nameKey: 'pricing.free.name',
    epithetKey: 'pricing.free.epithet',
    monthly: { price: '$0', unitKey: 'pricing.free.unit', noteKey: 'pricing.free.note' },
    annual: { price: '$0', unitKey: 'pricing.free.unit', noteKey: 'pricing.free.note' },
    features: [
      { labelKey: 'pricing.free.f1', included: true },
      { labelKey: 'pricing.free.f2', included: true },
      { labelKey: 'pricing.free.f3', included: true },
      { labelKey: 'pricing.free.f4', included: false },
      { labelKey: 'pricing.free.f5', included: false },
      { labelKey: 'pricing.free.f6', included: false },
    ],
    ctaKey: 'pricing.free.cta',
    featured: false,
  },
  {
    code: 'T-02',
    tierKey: 'pro',
    nameKey: 'pricing.pro.name',
    epithetKey: 'pricing.pro.epithet',
    monthly: { price: '$19', unitKey: 'pricing.unitMo', noteKey: 'pricing.pro.noteMo' },
    annual: {
      price: '$190',
      unitKey: 'pricing.unitYr',
      noteKey: 'pricing.pro.noteYr',
      struck: '$19/MO',
    },
    features: [
      { labelKey: 'pricing.pro.f1', included: true },
      { labelKey: 'pricing.pro.f2', included: true },
      { labelKey: 'pricing.pro.f3', included: true },
      { labelKey: 'pricing.pro.f4', included: true },
      { labelKey: 'pricing.pro.f5', included: true },
      { labelKey: 'pricing.pro.f6', included: false },
    ],
    ctaKey: 'pricing.pro.cta',
    featured: true,
  },
  {
    code: 'T-03',
    tierKey: 'desk',
    nameKey: 'pricing.desk.name',
    epithetKey: 'pricing.desk.epithet',
    monthly: { price: '$499', unitKey: 'pricing.unitMo', noteKey: 'pricing.desk.noteMo' },
    annual: {
      price: '$4,990',
      unitKey: 'pricing.unitYr',
      noteKey: 'pricing.desk.noteYr',
      struck: '$499/MO',
    },
    features: [
      { labelKey: 'pricing.desk.f1', included: true },
      { labelKey: 'pricing.desk.f2', included: true },
      { labelKey: 'pricing.desk.f3', included: true },
      { labelKey: 'pricing.desk.f4', included: true },
      { labelKey: 'pricing.desk.f5', included: true },
      { labelKey: 'pricing.desk.f6', included: true },
    ],
    ctaKey: 'pricing.desk.cta',
    featured: false,
  },
]

/** 150ms count-flicker on price change (Framer popLayout, pricing.md §S1) */
function FlickerPrice({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn('relative inline-flex overflow-hidden', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="inline-block tnum"
          initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(2px)' }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function PriceCard({
  tier,
  billing,
  index,
  onFreeCta,
}: {
  tier: Tier
  billing: Billing
  index: number
  onFreeCta: () => void
}) {
  const { t } = useLang()
  const { startCheckout, pendingPlan, isProcessing, checkoutError } = useCheckout()
  const price = billing === 'annual' ? tier.annual : tier.monthly
  const planCode = tier.tierKey === 'free' ? null : planCodeFor(tier.tierKey, billing)
  const isPendingThis = planCode !== null && pendingPlan === planCode && isProcessing

  // Hover tilt — ±2° toward cursor via motion values (spring 260/28, design.md §6.1)
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(my, [0, 1], [2, -2]), { stiffness: 260, damping: 28 })
  const rotateY = useSpring(useTransform(mx, [0, 1], [-2, 2]), { stiffness: 260, damping: 28 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouse = (e: React.MouseEvent) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    mx.set((e.clientX - rect.left) / rect.width)
    my.set((e.clientY - rect.top) / rect.height)
  }

  const onCta = () => {
    if (tier.tierKey === 'free') {
      onFreeCta()
      return
    }
    if (planCode) startCheckout(planCode)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: EASE }}
      className={cn(tier.featured && 'lg:order-none lg:scale-[1.03]', tier.tierKey === 'pro' && 'max-lg:order-first')}
      style={{ perspective: 900 }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouse}
        onMouseLeave={() => {
          mx.set(0.5)
          my.set(0.5)
        }}
        whileHover={{ y: -6 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className={cn(
          'group relative flex h-full flex-col border bg-ink-850 px-7 py-8 transition-colors duration-300',
          tier.featured
            ? 'border-volt/70 shadow-[0_0_80px_-16px_rgba(201,242,75,0.35)] hover:border-volt'
            : 'border-line hover:border-line-strong',
        )}
      >
        {/* Featured: volt perimeter draw */}
        {tier.featured && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
            <motion.rect
              x="0.75"
              y="0.75"
              fill="none"
              stroke="var(--volt)"
              strokeWidth="1.5"
              style={{ width: 'calc(100% - 1.5px)', height: 'calc(100% - 1.5px)' }}
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.9, delay: 0.3 + index * 0.1, ease: EASE }}
            />
          </svg>
        )}

        {/* Featured stamp — slams after the border draws */}
        {tier.featured && (
          <motion.div
            className="absolute -top-3 right-5"
            initial={{ opacity: 0, scale: 1.6, rotate: -14 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: '-15% 0px' }}
            transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 1.15 + index * 0.1 }}
          >
            <RubberStamp color="var(--volt)" rotate={-6}>
              {t('stamp.mostChosen')}
            </RubberStamp>
          </motion.div>
        )}

        {/* Tier code + epithet */}
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[11px] tracking-[0.16em] text-faint">{tier.code}</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-muted">
            {t(tier.epithetKey)}
          </span>
        </div>

        <h3 className="mt-4 font-display text-[30px] font-medium leading-none text-text">
          {t(tier.nameKey)}
        </h3>

        {/* Price row — Fraunces 64px numeral + mono unit */}
        <div className="mt-5 flex items-baseline gap-2">
          <FlickerPrice
            value={price.price}
            className="font-display text-[64px] font-light leading-none text-text"
          />
          <FlickerPrice
            value={t(price.unitKey)}
            className="font-mono text-[13px] font-medium tracking-[0.12em] text-text-muted"
          />
          {billing === 'annual' && tier.annual.struck && (
            <span className="font-mono text-[12px] text-faint line-through">{tier.annual.struck}</span>
          )}
        </div>

        {/* Billing note */}
        <div className="mt-2 h-4">
          <FlickerPrice
            value={t(price.noteKey)}
            className="font-mono text-[11px] tracking-[0.1em] text-faint"
          />
        </div>

        <div className="my-6 h-px bg-line" />

        {/* Features */}
        <ul className="flex flex-1 flex-col gap-3">
          {tier.features.map((f) => (
            <li key={f.labelKey} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className={cn(
                  'mt-px font-mono text-[12.5px] font-semibold leading-[1.5]',
                  f.included ? 'text-volt' : 'text-faint',
                )}
              >
                {f.included ? '+' : '−'}
              </span>
              <span
                className={cn(
                  'font-mono text-[12.5px] leading-[1.5] tracking-[0.04em]',
                  f.included ? 'text-text-muted' : 'text-faint',
                )}
              >
                {t(f.labelKey)}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA — full width */}
        <button
          type="button"
          onClick={onCta}
          disabled={isPendingThis}
          className={cn(
            'mt-8 inline-flex w-full items-center justify-center gap-2 rounded-sm px-6 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.1em] transition-all duration-200 ease-out [&_svg]:h-3.5 [&_svg]:w-3.5',
            tier.featured
              ? 'bg-volt text-ink-950 hover:-translate-y-0.5 hover:shadow-volt-pop active:translate-y-0 active:shadow-none'
              : 'border border-line-strong bg-transparent text-text hover:border-text hover:bg-text/5',
            isPendingThis && 'cursor-wait opacity-80',
          )}
        >
          {isPendingThis ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              {t('pricing.processing')}
            </>
          ) : (
            <>
              {t(tier.ctaKey)}
              <ArrowRight aria-hidden />
            </>
          )}
        </button>

        {checkoutError && (
          <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-signal">
            {t('pricing.checkoutFailed')}
          </p>
        )}

        {tier.tierKey === 'desk' && (
          <a
            href="mailto:desk@cbbrief.com?subject=Desk%20inquiry"
            className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-faint transition-colors hover:text-volt"
          >
            {t('pricing.bookCall')}
          </a>
        )}
      </motion.div>
    </motion.div>
  )
}

/** pricing.md S1 + S2 — billing toggle + three tier cards */
export default function TierCards({
  billing,
  onBillingChange,
}: {
  billing: Billing
  onBillingChange: (b: Billing) => void
}) {
  const { t } = useLang()
  const scrollToCapture = () => {
    document.getElementById('start-free')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section className="mx-auto max-w-container px-[clamp(20px,4vw,48px)] pb-24 pt-16">
      {/* S1 — billing toggle */}
      <motion.div
        className="flex items-center justify-center gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.9, ease: EASE }}
      >
        <span
          className={cn(
            'font-mono text-[12px] uppercase tracking-[0.14em] transition-colors',
            billing === 'monthly' ? 'text-text' : 'text-faint',
          )}
        >
          {t('pricing.monthly')}
        </span>
        <Switch
          checked={billing === 'annual'}
          onCheckedChange={(checked) => onBillingChange(checked ? 'annual' : 'monthly')}
          aria-label={t('pricing.toggleAria')}
          className="h-6 w-11 data-[state=checked]:bg-ink-700 data-[state=unchecked]:bg-ink-700 [&_[data-slot=switch-thumb]]:!bg-volt [&_[data-slot=switch-thumb]]:size-5"
        />
        <span
          className={cn(
            'font-mono text-[12px] uppercase tracking-[0.14em] transition-colors',
            billing === 'annual' ? 'text-text' : 'text-faint',
          )}
        >
          {t('pricing.annual')}
        </span>
        <span className="rounded-sm bg-volt-dim px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-volt">
          {t('pricing.twoFree')}
        </span>
      </motion.div>

      {/* S2 — tier cards */}
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {TIERS.map((tier, i) => (
          <PriceCard key={tier.code} tier={tier} billing={billing} index={i} onFreeCta={scrollToCapture} />
        ))}
      </div>
    </section>
  )
}
