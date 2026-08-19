import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import KickerLine from '@/components/KickerLine'
import CBBButton from '@/components/Buttons'
import Reveal from '@/components/Reveal'
import { useLang } from '@/i18n/lang'

const NODES = [
  { left: '70%', top: '38%', status: 'operating' }, // Debrecen
  { left: '66%', top: '30%', status: 'construction' }, // Germany
  { left: '74%', top: '55%', status: 'operating' }, // Indonesia
  { left: '30%', top: '48%', status: 'announced' }, // Brazil
  { left: '63%', top: '42%', status: 'construction' }, // Morocco
  { left: '20%', top: '32%', status: 'announced' }, // US Midwest
  { left: '78%', top: '26%', status: 'operating' }, // Japan partner
  { left: '45%', top: '60%', status: 'construction' }, // South Africa
]

const NODE_COLOR: Record<string, string> = {
  operating: 'var(--volt)',
  construction: 'var(--amber)',
  announced: 'var(--muted)',
}

const UPDATES = [
  '+ EVE DEBRECEN — BIPOLAR CYLINDER LINE 2 INSTALLED',
  '+ GOTION KENITRA — GROUNDBREAK, 20 GWH PHASE 1',
  '+ CATL CIKARANG — SOP PULLED FORWARD TO Q3',
]

const METRICS = [
  { label: 'COST $/KWH', lfp: 52, ssb: 180 },
  { label: 'WH/KG', lfp: 205, ssb: 350 },
  { label: 'CYCLE LIFE', lfp: 6000, ssb: 1200 },
]

/** home.md S5 — "The Machine Room" data products band */
export default function DataProducts() {
  const { t } = useLang()
  const rootRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      // Tug-of-war bars animate 0 → share on scroll into view
      gsap.utils.toArray<HTMLElement>('.tug-fill').forEach((el, i) => {
        gsap.fromTo(
          el,
          { width: '0%' },
          {
            width: el.dataset.share + '%',
            duration: 1,
            delay: (i % 2) * 0.15 + Math.floor(i / 2) * 0.15,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          },
        )
      })
    },
    { scope: rootRef },
  )

  return (
    <section ref={rootRef} className="border-t border-line py-24">
      <div className="mx-auto max-w-container px-[clamp(20px,4vw,48px)]">
        <Reveal>
          <KickerLine chapter="02" label={t('data.kicker')} />
          <h2 className="mt-6 max-w-4xl font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.015em] text-text">
            {t('data.titleA')}
            <em className="italic text-volt">{t('data.titleEm')}</em>
            {t('data.titleB')}
          </h2>
        </Reveal>

        <Reveal className="mt-14 grid gap-6 lg:grid-cols-2" stagger={0.12}>
          {/* Left panel — Tracker preview */}
          <div className="group border border-line bg-ink-900">
            <div className="relative h-64 overflow-hidden border-b border-line">
              <img
                src="/hero-bg-map.png"
                alt="Global factory tracker map preview"
                className="h-full w-full object-cover object-[60%_40%] opacity-70 transition-transform duration-[600ms] group-hover:scale-[1.04]"
              />
              {NODES.map((node, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-node-pulse"
                  style={{
                    left: node.left,
                    top: node.top,
                    backgroundColor: NODE_COLOR[node.status],
                    boxShadow: `0 0 8px ${NODE_COLOR[node.status]}`,
                    animationDelay: `${i * 0.25}s`,
                  }}
                />
              ))}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-ink-950/80 px-4 py-2 backdrop-blur-sm">
                <span className="data-text text-[11px] text-text">{t('data.trackerStrip')}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 p-5">
              {UPDATES.map((u) => (
                <p key={u} className="font-mono text-[11px] tracking-wide text-text-muted">
                  {u}
                </p>
              ))}
              <CBBButton variant="ghost" to="/tracker" className="mt-4 self-start">
                {t('data.ctaTracker')}
              </CBBButton>
            </div>
          </div>

          {/* Right panel — LFP vs SSB tug-of-war */}
          <div className="border border-line bg-ink-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <span className="kicker text-volt">{t('data.lfp')}</span>
              <span className="kicker text-faint">{t('data.vs')}</span>
              <span className="kicker text-lithium">{t('data.ssb')}</span>
            </div>
            <div className="flex flex-col gap-7">
              {METRICS.map((m) => {
                const total = m.lfp + m.ssb
                const lfpShare = Math.round((m.lfp / total) * 100)
                const ssbShare = 100 - lfpShare
                return (
                  <div key={m.label} className="group/row">
                    <div className="mb-2 flex items-baseline justify-between font-mono text-[12px] tnum">
                      <span className="text-volt transition-colors duration-200 group-hover/row:text-text">
                        {m.lfp.toLocaleString('en-US')}
                      </span>
                      <span className="kicker text-faint">{m.label}</span>
                      <span className="text-lithium transition-colors duration-200 group-hover/row:text-text">
                        {m.ssb.toLocaleString('en-US')}
                      </span>
                    </div>
                    <div className="flex h-2.5 w-full gap-px">
                      <div
                        className="tug-fill h-full rounded-l-[2px] bg-volt"
                        data-share={lfpShare}
                        style={{ width: 0 }}
                      />
                      <div
                        className="tug-fill h-full rounded-r-[2px] bg-lithium"
                        data-share={ssbShare}
                        style={{ width: 0 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-8 font-mono text-[11px] tracking-wide text-faint">{t('data.footnote')}</p>
            <CBBButton variant="ghost" to="/tech" className="mt-4">
              {t('data.ctaTech')}
            </CBBButton>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
