import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import KickerLine from '@/components/KickerLine'
import PillarTag from '@/components/PillarTag'
import RedactedText from '@/components/RedactedText'
import CBBButton from '@/components/Buttons'
import Reveal from '@/components/Reveal'
import { useLang } from '@/i18n/lang'
import { trpc } from '@/providers/trpc'

const LEDGER_ROWS: { tag: 'capacity' | 'tech' | 'risk'; titleKey: string; noteKey: string | null }[] = [
  { tag: 'capacity', titleKey: 'latest.r1title', noteKey: 'latest.r1note' },
  { tag: 'tech', titleKey: 'latest.r2title', noteKey: 'latest.r2note' },
  { tag: 'risk', titleKey: 'latest.r3title', noteKey: null }, // redacted row, rendered separately
]

/** home.md S3 — "This Week's File" latest brief preview */
export default function LatestBrief() {
  const { lang, t } = useLang()
  // Live latest issue — zh mode prefers the translated title when present
  const { data: latest } = trpc.content['issues.latest'].useQuery()
  const sheetTitle = lang === 'zh' && latest?.titleZh ? latest.titleZh : t('latest.sheetTitle')
  const rootRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      // Paper sheet slides up + de-tilts; ledger rows stagger; redaction draws in
      gsap.fromTo(
        '.dossier-sheet',
        { y: 48, rotation: 1.5, opacity: 0 },
        {
          y: 0,
          rotation: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: { trigger: rootRef.current, start: 'top 75%', once: true },
        },
      )
      gsap.fromTo(
        '.ledger-row',
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.06,
          ease: 'expo.out',
          scrollTrigger: { trigger: '.dossier-ledger', start: 'top 80%', once: true },
        },
      )
      gsap.fromTo(
        '.redact-line',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.4,
          transformOrigin: 'left center',
          ease: 'expo.out',
          scrollTrigger: { trigger: '.redact-line', start: 'top 85%', once: true },
        },
      )
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} className="border-t border-line py-28">
      <div className="mx-auto grid max-w-container gap-16 px-[clamp(20px,4vw,48px)] lg:grid-cols-[40%_60%]">
        {/* Left: sticky intro */}
        <Reveal className="self-start lg:sticky lg:top-32">
          <KickerLine chapter="01" label={t('latest.kicker')} />
          <h2 className="mt-6 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.015em] text-text">
            {t('latest.titleA')}
            <em className="italic text-volt">{t('latest.titleEm')}</em>
            {t('latest.titleB')}
          </h2>
          <p className="mt-6 font-sans text-base leading-[1.65] text-text-muted">{t('latest.body')}</p>
          <p className="data-text mt-6 text-faint">{t('latest.meta')}</p>
          <CBBButton variant="ghost" to="/briefs" className="mt-8">
            {t('latest.cta')}
          </CBBButton>
        </Reveal>

        {/* Right: paper dossier sheet */}
        <div className="dossier-sheet paper-grain paper-ledger relative rounded-sm bg-paper p-8 opacity-0 shadow-paper-hard md:p-10">
          {/* seal watermark at 4% */}
          <img
            src="/seal-cbb.svg"
            alt=""
            aria-hidden
            className="pointer-events-none absolute right-6 top-6 h-40 w-40 text-paper-ink opacity-[0.04]"
          />
          <div className="flex items-center justify-between border-b-2 border-paper-ink pb-4">
            <span className="font-mono text-[13px] font-semibold tracking-[0.14em] text-paper-ink">
              CHINA BATTERY BRIEF
            </span>
            <span className="font-mono text-[11px] tracking-wide text-paper-muted">{t('latest.sheetTag')}</span>
          </div>

          <h3 className="mt-6 font-display text-[clamp(1.6rem,2.6vw,2.25rem)] font-medium leading-[1.15] text-paper-ink">
            {sheetTitle}
          </h3>

          <div className="dossier-ledger mt-6 flex flex-col">
            {LEDGER_ROWS.map((row) => (
              <div
                key={row.titleKey}
                className="ledger-row flex flex-col gap-2 border-b border-paper-ink/10 py-4 opacity-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-sans text-[15px] font-medium text-paper-ink">{t(row.titleKey)}</p>
                  {row.noteKey ? (
                    <p className="mt-1 font-mono text-[11px] tracking-wide text-paper-muted">{t(row.noteKey)}</p>
                  ) : (
                    <p className="redact-line mt-1 font-mono text-[11px] tracking-wide text-paper-muted">
                      {t('latest.redactA')}
                      <RedactedText>{t('latest.redactB')}</RedactedText>
                      {t('latest.redactC')}
                    </p>
                  )}
                </div>
                <PillarTag pillar={row.tag}>{t(`latest.tag.${row.tag}`)}</PillarTag>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <span className="font-mono text-[11px] tracking-wide text-paper-muted">{t('latest.stats')}</span>
            <CBBButton variant="paper" to="/briefs/debrecen-sold-out">
              {t('latest.readCta')}
            </CBBButton>
          </div>
        </div>
      </div>
    </section>
  )
}
