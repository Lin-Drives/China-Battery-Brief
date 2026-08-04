import { useRef } from 'react'
import { Link } from 'react-router'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import KickerLine from '@/components/KickerLine'
import RubberStamp from '@/components/RubberStamp'
import Reveal from '@/components/Reveal'
import { useLang } from '@/i18n/lang'

const ROWS: { labelKey: string; genKey: string; termKey: string; cbbKey: string | null }[] = [
  { labelKey: 'gap.r1label', genKey: 'gap.r1gen', termKey: 'gap.r1term', cbbKey: null },
  { labelKey: 'gap.r2label', genKey: 'gap.r2gen', termKey: 'gap.r2term', cbbKey: null },
  { labelKey: 'gap.r3label', genKey: 'gap.r3gen', termKey: 'gap.r3term', cbbKey: null },
  { labelKey: 'gap.r4label', genKey: 'gap.r4gen', termKey: 'gap.r4term', cbbKey: 'gap.r4cbb' },
]

/** home.md S6 — "Why We Exist" comparison table */
export default function Gap() {
  const { t } = useLang()
  const rootRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      // Rows slide in staggered; CBB column cascades volt-dim; stamp slams in
      const tl = gsap.timeline({
        scrollTrigger: { trigger: '.gap-table', start: 'top 75%', once: true },
      })
      tl.fromTo(
        '.gap-row',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'expo.out' },
      )
      tl.fromTo(
        '.gap-cbb',
        { backgroundColor: 'rgba(201,242,75,0)' },
        { backgroundColor: 'rgba(201,242,75,0.12)', duration: 0.3, stagger: 0.3 },
        0.4,
      )
      tl.fromTo(
        '.gap-stamp',
        { scale: 1.6, rotation: -12, opacity: 0 },
        { scale: 1, rotation: -6, opacity: 1, duration: 0.3, ease: 'power2.out' },
      )
      // slight shake after the slam
      tl.to('.gap-stamp', { x: 1.5, duration: 0.05, yoyo: true, repeat: 3 })
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} className="py-28">
      <div className="mx-auto max-w-[880px] px-[clamp(20px,4vw,48px)]">
        <Reveal className="text-center">
          <KickerLine chapter="03" label={t('gap.kicker')} className="justify-center" />
          <h2 className="mt-6 font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.015em] text-text">
            {t('gap.titleA')}
            <em className="italic text-volt">{t('gap.titleEm')}</em>
            {t('gap.titleB')}
          </h2>
        </Reveal>

        <div className="gap-table relative mt-14">
          <div className="gap-stamp absolute -top-5 right-2 z-10 opacity-0">
            <RubberStamp color="var(--volt)" rotate={-6} className="text-[10px]">
              {t('stamp.missingMiddle')}
            </RubberStamp>
          </div>
          <table className="w-full border-collapse border border-line">
            <thead>
              <tr className="gap-row opacity-0">
                <th className="border border-line bg-ink-900 p-4 text-left font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-faint" />
                <th className="border border-line bg-ink-900 p-4 text-left font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
                  {t('gap.th1')}
                  <span className="mt-1 block normal-case tracking-normal text-faint">
                    Bloomberg · FT · The Information
                  </span>
                </th>
                <th className="border border-line bg-ink-900 p-4 text-left font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
                  {t('gap.th2')}
                  <span className="mt-1 block normal-case tracking-normal text-faint">
                    Benchmark · Rho · S&amp;P
                  </span>
                </th>
                <th className="gap-cbb border border-line p-4 text-left">
                  <Link
                    to="/pricing"
                    className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-volt hover:underline"
                  >
                    CHINA BATTERY BRIEF
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.labelKey} className="gap-row opacity-0 transition-colors duration-200 hover:bg-ink-800">
                  <td className="border border-line p-4 font-sans text-[14px] text-text">{t(row.labelKey)}</td>
                  <td className="border border-line p-4 font-mono text-[13px] text-text-muted">
                    {t(row.genKey)}
                  </td>
                  <td className="border border-line p-4 font-mono text-[13px] text-text-muted">
                    {t(row.termKey)}
                  </td>
                  <td className="gap-cbb border border-line p-4 font-mono text-[13px] font-semibold text-volt">
                    {row.cbbKey ? t(row.cbbKey) : '✓'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
