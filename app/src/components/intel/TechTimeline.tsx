import { useRef } from 'react'
import { Link } from 'react-router'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import PillarTag from '@/components/PillarTag'
import { cn } from '@/lib/utils'
import { useLang, tpl } from '@/i18n/lang'

/* ------------------------------------------------------------------ */
/* tech.md S3 — "The Road to 2030" vertical timeline. Rail center on   */
/* lg (left on mobile), volt progress fill scrubbed by section scroll. */
/* ------------------------------------------------------------------ */

interface TimelineNode {
  date: string
  title: string
  body: string
  tag: string
  projected?: boolean
  brief?: { num: string; to: string }
}

export default function TechTimeline() {
  const { t } = useLang()
  const rootRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)

  const NODES: TimelineNode[] = [
    {
      date: '2020',
      title: t('techTl.n1.title'),
      body: t('techTl.n1.body'),
      tag: t('techTl.n1.tag'),
    },
    {
      date: '2021',
      title: t('techTl.n2.title'),
      body: t('techTl.n2.body'),
      tag: t('techTl.n2.tag'),
    },
    {
      date: '2023',
      title: t('techTl.n3.title'),
      body: t('techTl.n3.body'),
      tag: t('techTl.n3.tag'),
    },
    {
      date: '2024',
      title: t('techTl.n4.title'),
      body: t('techTl.n4.body'),
      tag: t('techTl.n4.tag'),
    },
    {
      date: '2026',
      title: t('techTl.n5.title'),
      body: t('techTl.n5.body'),
      tag: t('techTl.n5.tag'),
      projected: true,
      brief: { num: 'No. 046', to: '/briefs/solid-state-2027-consensus' },
    },
    {
      date: '2027–28',
      title: t('techTl.n6.title'),
      body: t('techTl.n6.body'),
      tag: t('techTl.n6.tag'),
      projected: true,
    },
    {
      date: '2030',
      title: t('techTl.n7.title'),
      body: t('techTl.n7.body'),
      tag: t('techTl.n7.tag'),
      projected: true,
    },
  ]

  useGSAP(
    () => {
      // rail progress fill scrubbed across the section
      if (fillRef.current) {
        gsap.fromTo(
          fillRef.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: rootRef.current,
              start: 'top 70%',
              end: 'bottom 60%',
              scrub: 0.6,
            },
          },
        )
      }
      // node cards slide in from their side; rail dot pops
      const cards = gsap.utils.toArray<HTMLElement>('.tl-node', rootRef.current)
      cards.forEach((card, i) => {
        const fromLeft = i % 2 === 0
        const isMobile = window.matchMedia('(max-width: 1023px)').matches
        gsap.fromTo(
          card,
          { x: isMobile ? 24 : fromLeft ? -40 : 40, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'expo.out',
            scrollTrigger: { trigger: card, start: 'top 85%', once: true },
          },
        )
        const dot = card.querySelector('.tl-dot')
        if (dot) {
          gsap.fromTo(
            dot,
            { scale: 0 },
            {
              scale: 1,
              duration: 0.5,
              ease: 'back.out(2.5)',
              scrollTrigger: { trigger: card, start: 'top 85%', once: true },
            },
          )
        }
      })
    },
    { scope: rootRef },
  )

  return (
    <div ref={rootRef} className="relative">
      {/* rail */}
      <div className="absolute inset-y-0 left-4 w-[2px] bg-line lg:left-1/2 lg:-translate-x-1/2">
        <div ref={fillRef} className="h-full w-full origin-top bg-volt" style={{ transform: 'scaleY(0)' }} />
      </div>

      <div className="flex flex-col gap-10 lg:gap-14">
        {NODES.map((n, i) => {
          const left = i % 2 === 0
          return (
            <div
              key={n.date}
              className={cn(
                'tl-node relative pl-12 lg:w-1/2 lg:pl-0',
                left ? 'lg:pr-14 lg:text-right' : 'lg:ml-auto lg:pl-14',
              )}
            >
              {/* rail dot */}
              <span
                className={cn(
                  'tl-dot absolute left-4 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 bg-ink-950',
                  n.projected ? 'border-dashed border-faint' : 'border-volt',
                  left ? 'lg:left-auto lg:right-0 lg:translate-x-1/2' : 'lg:left-0 lg:-translate-x-1/2',
                )}
                style={{ transform: 'scale(0)' }}
              />
              <div
                className={cn(
                  'group rounded-sm border p-5 transition-colors duration-200 hover:border-line-strong',
                  n.projected ? 'border-dashed border-line opacity-70' : 'border-line bg-ink-900',
                )}
              >
                <div className={cn('flex items-center gap-3', left && 'lg:flex-row-reverse')}>
                  <span className="rounded-sm border border-line-strong px-2 py-0.5 font-mono text-[11px] tnum tracking-[0.1em] text-volt">
                    {n.date}
                  </span>
                  {n.projected && (
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-faint">
                      {t('pt.projected')}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-[20px] leading-snug text-text">{n.title}</h3>
                <p className="mt-2 font-sans text-[14px] leading-relaxed text-text-muted">{n.body}</p>
                <div className={cn('mt-3', left && 'lg:text-right')}>
                  <PillarTag pillar="tech">{n.tag}</PillarTag>
                </div>
                {n.brief && (
                  <Link
                    to={n.brief.to}
                    className="mt-3 inline-block font-mono text-[11px] tracking-[0.12em] text-lithium hover:underline"
                  >
                    {tpl(t('tt.readBrief'), { no: n.brief.num })}
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
