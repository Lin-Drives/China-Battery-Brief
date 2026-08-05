import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Share2, SunMoon, Type } from 'lucide-react'
import SaveButton from './SaveButton'
import { cn } from '@/lib/utils'
import { useLang, tpl } from '@/i18n/lang'
import { pillarColor } from './pillar'
import type { Kicker, TocHeading } from './ReaderMarkdown'

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number]

/** rAF-throttled scroll fraction (0–1) of the whole document. */
function useScrollFraction() {
  const [frac, setFrac] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight
        setFrac(max > 0 ? Math.min(1, window.scrollY / max) : 0)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
  return frac
}

function useScrolledPast(px: number) {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > px)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [px])
  return past
}

/**
 * brief-detail.md S0.1 — 3px volt progress rail fixed above the navbar,
 * scaleX = article scroll progress; mono percentage at the right end.
 */
export function ProgressRail() {
  const frac = useScrollFraction()
  return (
    <div className="fixed left-0 top-0 z-[70] h-[3px] w-full bg-ink-900/60">
      <div
        className="h-full origin-left bg-volt transition-transform duration-75 ease-linear"
        style={{ transform: `scaleX(${frac})` }}
      />
      {frac > 0.02 && (
        <span className="absolute right-2 top-1.5 font-mono text-[10px] text-volt tnum">
          {Math.round(frac * 100)}%
        </span>
      )}
    </div>
  )
}

/**
 * brief-detail.md S3 — fixed left TOC rail (xl+), scrollspy with pillar-colored
 * active bar. Fades in after 400px scroll. Click → smooth-scroll (offset -96).
 */
export function TocRail({
  headings,
  activeId,
  pillars,
  hasSources,
  kickers,
}: {
  headings: TocHeading[]
  activeId: string | null
  pillars: string[]
  hasSources: boolean
  kickers: Map<string, Kicker>
}) {
  const visible = useScrolledPast(400)

  const jump = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 96,
      behavior: 'smooth',
    })
  }

  const { t } = useLang()
  type TocItem = { id: string; label: string; kicker?: string; color?: string }
  // Mirror the body's PART signposts: each section takes its part's color, and
  // the kicker label is shown only at the first section of each part.
  const items: TocItem[] = [
    { id: 'reader-top', label: t('reading.tocLead') },
    ...(function () {
      const out: TocItem[] = []
      let last = ''
      headings.forEach((h, i) => {
        const k = kickers.get(h.text)
        const partStart = !!k && k.label !== last
        if (k) last = k.label
        out.push({
          id: h.id,
          label: h.text.toUpperCase(),
          kicker: partStart ? k.label : undefined,
          color: k?.color ?? pillarColor(pillars[i % Math.max(1, pillars.length)] ?? ''),
        })
      })
      return out
    })(),
    ...(hasSources ? [{ id: 'sources', label: t('reading.tocSources') }] : []),
  ]

  return (
    <nav
      aria-label="Table of contents"
      className={cn(
        'fixed left-6 top-32 z-40 hidden w-[220px] transition-opacity duration-500 xl:block',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = activeId === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => jump(item.id)}
                className={cn(
                  'flex flex-col gap-0.5 border-l-2 py-1.5 pl-3 text-left font-mono text-[11px] leading-[1.45] tracking-[0.08em] transition-all duration-200',
                  active ? 'opacity-100' : 'opacity-40 hover:opacity-80',
                )}
                style={{ borderColor: active ? (item.color ?? 'var(--volt)') : 'transparent' }}
              >
                {item.kicker && (
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: item.color }}
                  >
                    {item.kicker}
                  </span>
                )}
                <span className="text-text">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export const READER_SIZES = [17, 19, 21] as const
export const PAPER_TONES = ['cream', 'sepia', 'night'] as const
export type PaperTone = (typeof PAPER_TONES)[number]

/**
 * brief-detail.md S0.3 — fixed right-edge utility dock (lg+, after 600px):
 * font-size cycle, paper tone, save, share (copy link), back to top.
 */
export function UtilityDock({
  issueId,
  sizeIdx,
  onCycleSize,
  tone,
  onCycleTone,
  onShare,
}: {
  issueId: number
  sizeIdx: number
  onCycleSize: () => void
  tone: PaperTone
  onCycleTone: () => void
  onShare: () => void
}) {
  const { t } = useLang()
  const visible = useScrolledPast(600)

  const tools = [
    {
      key: 'font',
      label: tpl(t('reading.dockSize'), { n: READER_SIZES[sizeIdx] }),
      active: sizeIdx !== 1,
      onClick: onCycleSize,
      icon: <Type className="h-4 w-4" />,
    },
    {
      key: 'tone',
      label: tpl(t('reading.dockTone'), { tone: t(`reading.tone.${tone}`) }),
      active: tone !== 'cream',
      onClick: onCycleTone,
      icon: <SunMoon className="h-4 w-4" />,
    },
    {
      key: 'share',
      label: t('reading.dockShare'),
      active: false,
      onClick: onShare,
      icon: <Share2 className="h-4 w-4" />,
    },
    {
      key: 'top',
      label: t('reading.dockTop'),
      active: false,
      onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      icon: <ArrowUp className="h-4 w-4" />,
    },
  ]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial="closed"
          animate="open"
          exit="closed"
          variants={{
            open: { transition: { staggerChildren: 0.04 } },
            closed: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
          }}
          className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 lg:flex"
        >
          {tools.map((t) => (
            <motion.button
              key={t.key}
              type="button"
              variants={{
                closed: { x: 32, opacity: 0 },
                open: { x: 0, opacity: 1, transition: { duration: 0.4, ease: EASE } },
              }}
              onClick={t.onClick}
              title={t.label}
              aria-label={t.label}
              className="relative flex h-10 w-10 items-center justify-center rounded-sm border border-line-strong text-text transition-colors hover:border-text hover:bg-text/5"
            >
              {t.icon}
              {t.active && (
                <span aria-hidden className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-volt" />
              )}
            </motion.button>
          ))}
          <motion.div
            variants={{
              closed: { x: 32, opacity: 0 },
              open: { x: 0, opacity: 1, transition: { duration: 0.4, ease: EASE } },
            }}
          >
            <SaveButton issueId={issueId} variant="icon" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
