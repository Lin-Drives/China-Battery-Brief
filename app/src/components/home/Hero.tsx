import { lazy, Suspense, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import CornerTicks from '@/components/CornerTicks'
import ChargeGauge from '@/components/ChargeGauge'
import RubberStamp from '@/components/RubberStamp'
import EmailCapture from '@/components/EmailCapture'
import { useLang } from '@/i18n/lang'

const HeroCanvas = lazy(() => import('@/components/home/HeroCanvas'))

const CHAPTER_KEYS = [
  { pillarKey: 'hero.ch1pillar', color: 'var(--volt)', textKey: 'hero.ch1text' },
  { pillarKey: 'hero.ch2pillar', color: 'var(--lithium)', textKey: 'hero.ch2text' },
  { pillarKey: 'hero.ch3pillar', color: 'var(--signal)', textKey: 'hero.ch3text' },
]

/** home.md S2 — "The Night Desk" hero */
export default function Hero() {
  const { t } = useLang()
  const KICKER = t('hero.kicker')
  const rootRef = useRef<HTMLElement>(null)
  const [showCanvas] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      // 1. background map fades in
      tl.to('.hero-bg', { opacity: 0.6, duration: 0.8 }, 0)
      // 2. kicker character split-reveal
      tl.fromTo(
        '.kicker-char',
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.012 },
        0.1,
      )
      // 3. H1 per-line masked reveal
      tl.fromTo(
        '.h1-line',
        { y: '110%' },
        { y: '0%', duration: 0.9, stagger: 0.12 },
        0.15,
      )
      // italic "brief" color-wipe
      tl.to('.h1-brief', { color: 'var(--volt)', duration: 0.4 }, 0.9)
      // 4. sub
      tl.fromTo('.hero-sub', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, 0.7)
      // 5. email form
      tl.fromTo('.hero-form', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.9)
      // 6. proof row
      tl.fromTo(
        '.hero-proof-line',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.7, transformOrigin: 'left center' },
        1.1,
      )
      tl.fromTo('.hero-proof-text', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.15)
      // 7. issue card drop-in, then idle float
      tl.fromTo(
        '.hero-card-drop',
        { y: -60, rotation: -8, opacity: 0 },
        { y: 0, rotation: 0, opacity: 1, duration: 1 },
        0.4,
      )
      tl.to(
        '.hero-card-float',
        { y: 8, duration: 2.5, yoyo: true, repeat: -1, ease: 'sine.inOut' },
        1.5,
      )
    },
    { scope: rootRef },
  )

  return (
    <section
      ref={rootRef}
      className="relative -mt-16 flex min-h-[100dvh] min-h-[720px] flex-col overflow-hidden"
    >
      {/* Background: map image (static fallback) + particle canvas + graph grid */}
      <img
        src="/hero-bg-map.png"
        alt=""
        className="hero-bg absolute inset-0 h-full w-full object-cover opacity-0"
        style={{
          maskImage: 'radial-gradient(ellipse 85% 75% at 55% 45%, black 35%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 85% 75% at 55% 45%, black 35%, transparent 100%)',
        }}
      />
      {showCanvas && (
        <Suspense fallback={null}>
          <div className="absolute inset-0">
            <HeroCanvas />
          </div>
        </Suspense>
      )}
      <div aria-hidden className="graph-grid absolute inset-0" />

      <div className="relative z-10 mx-auto grid w-full max-w-container flex-1 items-center gap-12 px-[clamp(20px,4vw,48px)] pb-24 pt-[130px] lg:grid-cols-[55%_45%]">
        {/* Left column: copy block */}
        <div>
          {/* Kicker with live volt dot */}
          <p className="kicker mb-6 flex items-center gap-2.5 text-volt">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-volt animate-pulse-dot" />
            <span aria-label={KICKER}>
              {KICKER.split('').map((ch, i) => (
                <span key={i} aria-hidden className="kicker-char inline-block">
                  {ch === ' ' ? ' ' : ch}
                </span>
              ))}
            </span>
          </p>

          {/* H1 — per-line masked reveal */}
          <h1 className="font-display text-[clamp(3.25rem,7.5vw,7rem)] font-normal leading-[0.98] tracking-[-0.02em] text-text">
            <span className="block overflow-hidden">
              <span className="h1-line block">{t('hero.h1a')}</span>
            </span>
            <span className="block overflow-hidden">
              <span className="h1-line block">{t('hero.h1b')}</span>
            </span>
            <span className="block overflow-hidden">
              <span className="h1-line block">
                <em className="h1-brief font-normal italic">{t('hero.h1em')}</em>
                {t('hero.h1tail')}
              </span>
            </span>
          </h1>

          <p className="hero-sub mt-7 max-w-[52ch] font-sans text-base leading-[1.65] text-text-muted opacity-0">
            {t('hero.sub')}
          </p>

          <div className="hero-form mt-8 opacity-0">
            <EmailCapture />
          </div>

          <div className="mt-8 max-w-[520px]">
            <div aria-hidden className="hero-proof-line h-px w-full bg-line-strong" />
            <p className="hero-proof-text pt-4 font-mono text-[11px] tracking-wide text-faint opacity-0">
              {t('hero.proof')}
            </p>
          </div>
        </div>

        {/* Right column: floating latest-issue card */}
        <div className="flex justify-center lg:justify-end">
          <div className="hero-card-drop opacity-0">
            <div className="transition-transform duration-300 ease-out lg:-rotate-4 lg:hover:rotate-0 lg:hover:-translate-y-1.5">
              <div className="hero-card-float">
                <Link
                  to="/briefs/debrecen-sold-out"
                  data-cursor="READ"
                  className="paper-grain relative block w-[340px] rounded-sm bg-paper p-5 shadow-paper-hard"
                >
                  <CornerTicks color="var(--paper-ink)" />
                  <div className="absolute right-3 top-3 z-10">
                    <RubberStamp color="var(--paper-ink)" className="text-[10px]">
                      {t('hero.cardStamp')}
                    </RubberStamp>
                  </div>
                  <div className="relative mb-4 mt-8 overflow-hidden rounded-[2px]">
                    <img
                      src="/cover-047.png"
                      alt="Issue No. 047 cover — Debrecen gigafactory at dusk"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                  <h2 className="font-display text-[24px] leading-tight text-paper-ink">
                    {t('hero.cardTitle')}
                  </h2>
                  <ul className="mt-4 flex flex-col gap-2 border-t border-paper-ink/15 pt-4">
                    {CHAPTER_KEYS.map((c) => (
                      <li key={c.pillarKey} className="flex items-baseline gap-2 font-mono text-[11px] tracking-wide text-paper-ink">
                        <span aria-hidden style={{ color: c.color }}>
                          ●
                        </span>
                        <span className="font-semibold">{t(c.pillarKey)}</span>
                        <span className="text-paper-muted">— {t(c.textKey)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    <ChargeGauge value={68} color="var(--volt)" showLabel />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="relative z-10 flex flex-col items-center gap-2 pb-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">{t('hero.scroll')}</span>
        <span aria-hidden className="block h-10 w-px bg-volt animate-scroll-cue" />
      </div>
    </section>
  )
}
