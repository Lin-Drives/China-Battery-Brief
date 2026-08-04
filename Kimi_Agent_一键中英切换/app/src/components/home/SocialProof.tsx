import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { motion } from 'framer-motion'
import { gsap } from '@/lib/gsap'
import KickerLine from '@/components/KickerLine'
import RubberStamp from '@/components/RubberStamp'
import CBBButton from '@/components/Buttons'
import Reveal from '@/components/Reveal'
import { useLang } from '@/i18n/lang'

const TESTIMONIALS = [
  { quoteKey: 'proof.t1quote', attrKey: 'proof.t1attr' },
  { quoteKey: 'proof.t2quote', attrKey: 'proof.t2attr' },
  { quoteKey: 'proof.t3quote', attrKey: 'proof.t3attr' },
]

const TIERS = [
  {
    name: 'FREE',
    price: '$0',
    period: '',
    dekKey: 'proof.free.dek',
    featureKeys: ['proof.free.f1', 'proof.free.f2', 'proof.free.f3'],
    ctaKey: 'proof.free.cta',
    to: '/pricing',
    featured: false,
  },
  {
    name: 'PRO',
    price: '$19',
    period: '/MO',
    dekKey: 'proof.pro.dek',
    featureKeys: ['proof.pro.f1', 'proof.pro.f2', 'proof.pro.f3', 'proof.pro.f4'],
    ctaKey: 'proof.pro.cta',
    to: '/pricing',
    featured: true,
  },
  {
    name: 'DESK',
    price: '$499',
    period: '/MO',
    dekKey: 'proof.desk.dek',
    featureKeys: ['proof.desk.f1', 'proof.desk.f2', 'proof.desk.f3', 'proof.desk.f4'],
    ctaKey: 'proof.desk.cta',
    to: '/pricing',
    featured: false,
  },
]

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const [transform, setTransform] = useState('')
  return (
    <div
      className={className}
      style={{ transform, transition: 'transform 300ms cubic-bezier(0.16,1,0.3,1)', transformStyle: 'preserve-3d' }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const rx = ((e.clientY - rect.top) / rect.height - 0.5) * -6
        const ry = ((e.clientX - rect.left) / rect.width - 0.5) * 6
        setTransform(`perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`)
      }}
      onMouseLeave={() => setTransform('')}
    >
      {children}
    </div>
  )
}

/** home.md S8 + S9 — testimonials and pricing teaser */
export default function SocialProof() {
  const { t } = useLang()
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.fromTo(
        '.tst-card',
        { y: 36, rotation: 0.8, opacity: 0 },
        {
          y: 0,
          rotation: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.09,
          ease: 'expo.out',
          scrollTrigger: { trigger: '.tst-grid', start: 'top 80%', once: true },
        },
      )
      gsap.fromTo(
        '.tst-border',
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 0.6,
          stagger: 0.09,
          transformOrigin: 'top center',
          ease: 'expo.out',
          scrollTrigger: { trigger: '.tst-grid', start: 'top 80%', once: true },
        },
      )
      gsap.fromTo(
        '.price-card',
        { y: 36, opacity: 0, scale: 0.96 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: 'expo.out',
          scrollTrigger: { trigger: '.price-grid', start: 'top 80%', once: true },
        },
      )
    },
    { scope: rootRef },
  )

  return (
    <div ref={rootRef}>
      {/* S8 · Testimonials */}
      <section className="border-t border-line py-24">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)]">
          <Reveal>
            <KickerLine chapter="04" label={t('proof.kicker')} />
          </Reveal>
          <div className="tst-grid mt-12 grid gap-6 lg:grid-cols-3">
            {TESTIMONIALS.map((tst) => (
              <div
                key={tst.attrKey}
                className="tst-card group relative border border-line bg-ink-850 p-7 opacity-0 transition-transform duration-300 hover:-translate-y-1"
              >
                <span
                  aria-hidden
                  className="tst-border absolute left-0 top-0 h-full w-[2px] bg-volt"
                />
                <span
                  aria-hidden
                  className="font-display text-[64px] leading-none text-ink-700 transition-colors duration-300 group-hover:text-volt"
                >
                  &ldquo;
                </span>
                <p className="mt-2 font-display text-[22px] italic leading-snug text-text">
                  {t(tst.quoteKey)}
                </p>
                <p className="mt-6 font-mono text-[11px] tracking-[0.14em] text-faint">
                  {t(tst.attrKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* S9 · Pricing teaser */}
      <section className="py-28">
        <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)]">
          <Reveal>
            <KickerLine chapter="05" label={t('proof.pkicker')} />
            <h2 className="mt-6 max-w-3xl font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.015em] text-text">
              {t('proof.ptitleA')}
              <em className="italic text-volt">{t('proof.ptitleEm')}</em>
              {t('proof.ptitleB')}
            </h2>
          </Reveal>

          <div className="price-grid mt-14 grid gap-6 lg:grid-cols-3">
            {TIERS.map((tier) => (
              <TiltCard key={tier.name} className="price-card opacity-0">
                <div
                  className={
                    tier.featured
                      ? 'relative flex h-full flex-col border border-volt bg-ink-900 p-7'
                      : 'relative flex h-full flex-col border border-line bg-ink-900 p-7'
                  }
                >
                  {tier.featured && (
                    <div className="absolute -top-3 right-4">
                      <RubberStamp color="var(--volt)" rotate={-4} className="bg-ink-950 text-[10px]">
                        {t('stamp.mostChosen')}
                      </RubberStamp>
                    </div>
                  )}
                  <p className="kicker" style={{ color: tier.featured ? 'var(--volt)' : 'var(--muted)' }}>
                    {tier.name}
                  </p>
                  <div className="mt-4 flex items-baseline">
                    <motion.span
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      className="font-display text-[clamp(2.5rem,4.5vw,4rem)] font-light leading-none text-text tnum"
                    >
                      {tier.price}
                    </motion.span>
                    <span className="font-mono text-[13px] text-faint">{tier.period}</span>
                  </div>
                  <p className="mt-2 font-sans text-[14px] text-text-muted">{t(tier.dekKey)}</p>
                  <ul className="mt-6 flex flex-1 flex-col gap-2.5 border-t border-line pt-6">
                    {tier.featureKeys.map((fk) => (
                      <li key={fk} className="flex items-baseline gap-2 font-sans text-[14px] text-text-muted">
                        <span aria-hidden className="text-volt">
                          ·
                        </span>
                        {t(fk)}
                      </li>
                    ))}
                  </ul>
                  <CBBButton
                    variant={tier.featured ? 'primary' : 'ghost'}
                    to={tier.to}
                    className="mt-8 w-full"
                  >
                    {t(tier.ctaKey)}
                  </CBBButton>
                </div>
              </TiltCard>
            ))}
          </div>

          <p className="mt-10 text-center font-mono text-[11px] tracking-wide text-faint">
            {t('proof.pfoot')}
          </p>
        </div>
      </section>
    </div>
  )
}
