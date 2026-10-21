import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import KickerLine from '@/components/KickerLine'
import PillarTag from '@/components/PillarTag'
import CBBButton from '@/components/Buttons'
import Reveal from '@/components/Reveal'
import { useLang } from '@/i18n/lang'
import { fmtDateLong, fmtReadTimeLong, pick } from '@/i18n/format'
import { fmtIssueNo } from '@/components/briefs/pillar'
import { trpc } from '@/providers/trpc'

/** home.md S3 — "This Week's File" latest brief preview */
export default function LatestBrief() {
  const { lang, t } = useLang()
  const { data: latest } = trpc.content['issues.latest'].useQuery()
  const rootRef = useRef<HTMLElement>(null)

  const title = latest ? pick(lang, latest.titleZh, latest.title) : t('latest.fallbackTitle')
  const dek = latest ? pick(lang, latest.dekZh, latest.dek ?? '') : ''
  const highlights = (latest ? pick(lang, latest.highlightsZh, latest.highlights) : []).slice(0, 3)
  const sources = latest?.sources?.length ?? 0
  const meta = latest
    ? [
        fmtIssueNo(latest.number),
        fmtDateLong(latest.publishedAt, lang),
        fmtReadTimeLong(latest.readingMinutes, lang),
      ].join(' · ')
    : ''
  const sheetTag = latest
    ? `${fmtIssueNo(latest.number)} · ${latest.isFree ? t('latest.sheetTagFree') : t('latest.sheetTagPaid')}`
    : ''
  const stats = [
    sources > 0 ? `${sources} ${t('latest.sources')}` : null,
    highlights.length > 0 ? `${highlights.length} ${t('latest.keyPoints')}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const href = latest ? `/briefs/${latest.slug}` : '/briefs'

  useGSAP(
    () => {
      // Paper sheet slides up + de-tilts; ledger rows stagger
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
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} className="border-t border-line py-28">
      <div className="mx-auto grid max-w-container gap-16 px-[clamp(20px,4vw,48px)] lg:grid-cols-[40%_60%]">
        {/* Left: sticky intro */}
        <Reveal className="self-start lg:sticky lg:top-32">
          <KickerLine chapter="01" label={t('latest.kicker')} />
          <h2 className="mt-6 max-w-[22ch] font-display text-[clamp(2.25rem,4vw,3.5rem)] font-normal leading-[1.04] tracking-[-0.015em] text-text text-balance">
            {title}
          </h2>
          <p className="mt-6 font-sans text-base leading-[1.65] text-text-muted">{dek}</p>
          <p className="data-text mt-6 text-faint">{meta}</p>
          <CBBButton variant="ghost" to="/briefs" className="mt-8">
            {t('latest.cta')}
          </CBBButton>
        </Reveal>

        {/* Right: paper dossier sheet */}
        <div className="dossier-sheet paper-grain paper-ledger relative self-start rounded-sm bg-paper p-8 opacity-0 shadow-paper-hard md:p-10">
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
            <span className="font-mono text-[12.5px] tracking-wide text-paper-muted">{sheetTag}</span>
          </div>

          <h3 className="mt-6 font-display text-[clamp(1.6rem,2.6vw,2.25rem)] font-medium leading-[1.15] text-paper-ink">
            {title}
          </h3>

          <div className="dossier-ledger mt-6 flex flex-col">
            {highlights.map((item) => (
              <div
                key={`${item.tag}-${item.text}`}
                className="ledger-row flex flex-col gap-2 border-b border-paper-ink/10 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="font-sans text-[15px] font-medium leading-[1.5] text-paper-ink">
                  {item.text}
                </p>
                <PillarTag pillar={item.tag} className="shrink-0 whitespace-nowrap">
                  {t(`latest.tag.${item.tag}`)}
                </PillarTag>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <span className="font-mono text-[12.5px] tracking-wide text-paper-muted">{stats}</span>
            {latest && (
              <CBBButton variant="paper" to={href}>
                {latest.isFree ? t('latest.readFreeCta') : t('latest.readIssueCta')}
              </CBBButton>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
