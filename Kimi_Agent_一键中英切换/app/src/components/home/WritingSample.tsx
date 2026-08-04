import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import CornerTicks from '@/components/CornerTicks'
import CBBButton from '@/components/Buttons'
import { useLang } from '@/i18n/lang'

/** home.md S7 — "How It Reads" writing sample on paper */
export default function WritingSample() {
  const { t } = useLang()
  const rootRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      gsap.fromTo(
        '.sample-paper',
        { y: 40, rotation: 1.5, opacity: 0 },
        {
          y: 0,
          rotation: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 75%', once: true },
        },
      )
      // Pull-quote word-level split reveal
      gsap.fromTo(
        '.quote-word',
        { y: 14, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.02,
          ease: 'expo.out',
          scrollTrigger: { trigger: '.sample-quote', start: 'top 82%', once: true },
        },
      )
      // Subtle scroll parallax — paper moves at 0.95× scroll speed
      gsap.to('.sample-paper', {
        y: -24,
        ease: 'none',
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6,
        },
      })
    },
    { scope: rootRef },
  )

  const QUOTE = t('sample.quote')

  return (
    <section ref={rootRef} className="py-24">
      <div className="mx-auto max-w-[720px] px-[clamp(20px,4vw,48px)]">
        <div className="sample-paper paper-grain paper-ledger relative rounded-sm bg-paper p-8 opacity-0 shadow-paper-hard md:p-12">
          <CornerTicks color="var(--paper-ink)" />
          <p className="kicker text-paper-muted">{t('sample.kicker')}</p>

          <div className="mt-6 flex flex-col gap-5 font-serif text-[20px] leading-[1.78] text-paper-ink">
            <p>{t('sample.p1')}</p>
            <p>{t('sample.p2')}</p>
            <p>{t('sample.p3')}</p>
          </div>

          <blockquote className="sample-quote mt-8 border-l-2 border-volt pl-6">
            <p className="font-display text-[26px] italic leading-snug text-paper-ink">
              {QUOTE.split(' ').map((word, i) => (
                <span key={i} className="quote-word inline-block opacity-0">
                  {word}&nbsp;
                </span>
              ))}
            </p>
          </blockquote>

          <div className="mt-10 flex flex-wrap gap-3">
            <CBBButton variant="paper" to="/briefs/feoc-round-two-decoded">
              {t('sample.ctaRead')}
            </CBBButton>
            <CBBButton
              variant="ghost"
              to="/about#methodology"
              className="border-paper-ink/30 text-paper-ink hover:border-paper-ink hover:bg-paper-ink/5"
            >
              {t('sample.ctaStandards')}
            </CBBButton>
          </div>
        </div>
      </div>
    </section>
  )
}
