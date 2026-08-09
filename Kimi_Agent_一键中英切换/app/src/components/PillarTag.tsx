import { cn } from '@/lib/utils'

export type Pillar = 'capacity' | 'tech' | 'risk' | 'markets'

const pillarColor: Record<Pillar, string> = {
  capacity: '#C9F24B', // volt
  tech: '#5ADFC3', // lithium
  risk: '#FF5B45', // signal
  markets: '#F0A832', // amber (copper)
}

/**
 * design.md §4.3 — pillar tag: mono 10.5px uppercase, 1px border at 60% alpha,
 * text in pillar color, background at 8% alpha, padding 3px 8px, radius 2px.
 */
export default function PillarTag({
  pillar,
  children,
  className,
}: {
  pillar: Pillar
  children: React.ReactNode
  className?: string
}) {
  const c = pillarColor[pillar]
  return (
    <span
      className={cn(
        'inline-block rounded-sm px-2 py-[3px] font-mono text-[10.5px] font-medium uppercase tracking-[0.12em]',
        className,
      )}
      style={{ color: c, border: `1px solid ${c}99`, backgroundColor: `${c}14` }}
    >
      {children}
    </span>
  )
}
