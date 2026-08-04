import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { trpc } from '@/providers/trpc'
import { useLang } from '@/i18n/lang'

type TickerItem = {
  text: string
  delta?: 'up' | 'down'
  to?: string
}

// Fallback while trpc.content["ticker.items"] loads (design.md §8.2)
const FALLBACK_KEYS: { key: string; delta?: 'up' | 'down'; to?: string }[] = [
  { key: 'ticker.f1', delta: 'down' },
  { key: 'ticker.f2', delta: 'up' },
  { key: 'ticker.f3', to: '/briefs' },
  { key: 'ticker.f4' },
  { key: 'ticker.f5' },
  { key: 'ticker.f6', delta: 'up' },
]

function TickerEntry({ item, flash }: { item: TickerItem; flash: boolean }) {
  const cls = cn(
    'inline-block whitespace-nowrap font-mono text-[12px] tnum tracking-wide transition-transform duration-300',
    item.delta === 'up' && 'text-volt',
    item.delta === 'down' && 'text-signal',
    !item.delta && 'text-text-muted',
    item.to && 'hover:text-volt',
    flash && 'scale-[1.08] text-volt',
  )
  const body = <span className={cls}>{item.text}</span>
  return item.to ? (
    <Link to={item.to} className="inline-block">
      {body}
    </Link>
  ) : (
    body
  )
}

/**
 * Signature element §7.1 — infinite mono marquee, hairline top+bottom.
 * Pauses on hover and when off-screen. Values "flash" volt on mock updates.
 */
export default function TickerBar({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [flashIdx, setFlashIdx] = useState(-1)
  const { t } = useLang()

  // Live items from the backend; fall back to static while loading/error
  const { data } = trpc.content['ticker.items'].useQuery()
  const ITEMS: TickerItem[] =
    data && data.length > 0
      ? data.map((it) => ({
          text: it.label,
          delta: it.delta === 'none' ? undefined : it.delta,
        }))
      : FALLBACK_KEYS.map((f) => ({ text: t(f.key), delta: f.delta, to: f.to }))

  // Pause marquee when off-screen (design.md §6.3)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Mock a value "update" every 12s (home.md S0)
  useEffect(() => {
    const id = window.setInterval(() => {
      const idx = Math.floor(Math.random() * ITEMS.length)
      setFlashIdx(idx)
      window.setTimeout(() => setFlashIdx(-1), 300)
    }, 12000)
    return () => window.clearInterval(id)
  }, [])

  const strip = (key: string) => (
    <div key={key} className="flex shrink-0 items-center">
      {ITEMS.map((item, i) => (
        <span key={`${key}-${i}`} className="flex items-center">
          <TickerEntry item={item} flash={flashIdx === i} />
          <span aria-hidden className="mx-6 text-[10px] text-faint">
            ◆
          </span>
        </span>
      ))}
    </div>
  )

  return (
    <div
      ref={rootRef}
      className={cn(
        'group h-9 overflow-hidden border-y border-line bg-ink-950',
        className,
      )}
      aria-label="Live market ticker"
    >
      <div
        className="flex h-full w-max items-center animate-marquee group-hover:[animation-play-state:paused]"
        style={visible ? undefined : { animationPlayState: 'paused' }}
      >
        {strip('a')}
        {strip('b')}
      </div>
    </div>
  )
}
