import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { gsap } from '@/lib/gsap'
import { Pause, Play, Plus, Minus, RotateCcw } from 'lucide-react'
import landUrl from 'world-atlas/land-110m.json?url'
import type { FactoryRow, FactoryStatus } from '@/components/intel/intel-utils'
import { STATUS_META, STATUS_ORDER, announceYear, formatGwh, nodeRadius } from '@/components/intel/intel-utils'
import { cn } from '@/lib/utils'
import { useLang, tpl } from '@/i18n/lang'

/* ------------------------------------------------------------------ */
/* tracker.md S2 — dark mission-control world map.                     */
/* SVG equirectangular projection (d3-geo + Natural Earth topojson),   */
/* pan/zoom 1–6×, glowing status nodes, hover tooltip, timeline        */
/* scrubber, legend dimming, zoom chrome. Lazy-loaded by the page.     */
/* ------------------------------------------------------------------ */

const W = 960
const H = 520
const MIN_YEAR = 2019
const MAX_YEAR = 2028

type ViewTransform = { x: number; y: number; k: number }

type GeoPolygon = { type: string; coordinates: number[][][] | number[][][][] }

export default function WorldMap({
  factories,
  selectedId,
  onSelect,
}: {
  factories: FactoryRow[]
  selectedId: number | null
  onSelect: (f: FactoryRow) => void
}) {
  const { t: tt } = useLang()
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [landPath, setLandPath] = useState<string | null>(null)
  const [t, setT] = useState<ViewTransform>({ x: 0, y: 0, k: 1 })
  const tRef = useRef(t)
  tRef.current = t
  const [hover, setHover] = useState<{ f: FactoryRow; px: number; py: number } | null>(null)
  const [dimStatus, setDimStatus] = useState<FactoryStatus | null>(null)
  const [year, setYear] = useState(MAX_YEAR)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; base: ViewTransform; moved: boolean } | null>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  /* Equirectangular projection, deterministic full-world fit */
  const projection = useMemo(
    () => geoEquirectangular().translate([W / 2, H / 2]).scale(W / (2 * Math.PI)),
    [],
  )
  const pathGen = useMemo(() => geoPath(projection), [projection])
  const graticulePath = useMemo(() => pathGen(geoGraticule10()) ?? '', [pathGen])

  /* Load Natural Earth landmasses (Antarctica clipped) */
  useEffect(() => {
    let alive = true
    fetch(landUrl)
      .then((r) => r.json())
      .then((topo) => {
        if (!alive) return
        // objects.land is a GeometryCollection → feature() yields a
        // FeatureCollection (.features), not a single Feature (.geometry).
        const geo = feature(topo, topo.objects.land) as unknown as
          | { type: 'FeatureCollection'; features: { geometry: GeoPolygon }[] }
          | { type: 'Feature'; geometry: GeoPolygon }
        const polys: GeoPolygon[] =
          geo.type === 'FeatureCollection'
            ? geo.features.map((f) => f.geometry)
            : [geo.geometry]
        // Drop polygons lying entirely below 60°S (Antarctica)
        const clipped = {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'MultiPolygon' as const,
            coordinates: polys.flatMap((p) => {
              const rings = (p.type === 'MultiPolygon' ? p.coordinates : [p.coordinates]) as number[][][][]
              return rings.filter((ring) =>
                ring[0]?.some((pt) => pt[1] > -60),
              )
            }),
          },
        }
        setLandPath(pathGen(clipped as never) ?? null)
      })
      .catch(() => {
        /* nodes + graticule still render without land */
      })
    return () => {
      alive = false
    }
  }, [pathGen])

  /* Entrance: nodes pop in staggered by longitude after 300ms */
  useEffect(() => {
    const id = window.setTimeout(() => setLoaded(true), 300)
    return () => window.clearTimeout(id)
  }, [])

  /* ---- pan / zoom ---- */
  /** viewBox→container-px mapping under preserveAspectRatio="meet" (letterbox-aware) */
  const getMeet = useCallback((): { scale: number; ox: number; oy: number } => {
    const svg = svgRef.current
    if (!svg) return { scale: 1, ox: 0, oy: 0 }
    const rect = svg.getBoundingClientRect()
    const scale = Math.min(rect.width / W, rect.height / H)
    return { scale, ox: (rect.width - W * scale) / 2, oy: (rect.height - H * scale) / 2 }
  }, [])

  const toSvgPoint = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const svg = svgRef.current
      if (!svg) return [0, 0]
      const rect = svg.getBoundingClientRect()
      const { scale, ox, oy } = getMeet()
      return [(clientX - rect.left - ox) / scale, (clientY - rect.top - oy) / scale]
    },
    [getMeet],
  )

  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number) => {
      tweenRef.current?.kill()
      setT((prev) => {
        const k = Math.min(6, Math.max(1, prev.k * factor))
        const s = k / prev.k
        return { k, x: cx - (cx - prev.x) * s, y: cy - (cy - prev.y) * s }
      })
    },
    [],
  )

  const animateTo = useCallback((target: ViewTransform, duration = 0.6) => {
    tweenRef.current?.kill()
    const proxy = { ...tRef.current }
    tweenRef.current = gsap.to(proxy, {
      ...target,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => setT({ x: proxy.x, y: proxy.y, k: proxy.k }),
    })
  }, [])

  const centerOn = useCallback(
    (lng: number, lat: number) => {
      const p = projection([lng, lat])
      if (!p) return
      const k = Math.max(tRef.current.k, 2.2)
      animateTo({ k, x: W / 2 - p[0] * k, y: H / 2 - p[1] * k }, 0.6)
    },
    [projection, animateTo],
  )

  const resetView = useCallback(() => animateTo({ x: 0, y: 0, k: 1 }), [animateTo])

  /* Non-passive wheel listener (React attaches wheel as passive) */
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const [cx, cy] = toSvgPoint(e.clientX, e.clientY)
      zoomAt(cx, cy, e.deltaY < 0 ? 1.18 : 1 / 1.18)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [toSvgPoint, zoomAt])

  /* Center the map on the externally selected factory (table row click) */
  const lastSelectedRef = useRef<number | null>(null)
  useEffect(() => {
    if (selectedId == null || selectedId === lastSelectedRef.current) return
    lastSelectedRef.current = selectedId
    const f = factories.find((x) => x.id === selectedId)
    if (f && f.lat != null && f.lng != null) centerOn(f.lng, f.lat)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  /* Scrubber auto-play: 1yr / 800ms */
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setYear((y) => {
        if (y >= MAX_YEAR) {
          setPlaying(false)
          return y
        }
        return y + 1
      })
    }, 800)
    return () => window.clearInterval(id)
  }, [playing])

  const startPlay = () => {
    if (year >= MAX_YEAR) setYear(MIN_YEAR)
    setPlaying((p) => !p)
  }

  /* ---- nodes ---- */
  const nodes = useMemo(
    () =>
      factories
        .filter((f) => f.lat != null && f.lng != null)
        .map((f) => {
          const p = projection([f.lng as number, f.lat as number]) as [number, number]
          return { f, x: p[0], y: p[1], r: nodeRadius(f.capacityGwh), yr: announceYear(f) }
        })
        .sort((a, b) => a.x - b.x),
    [factories, projection],
  )

  const visibleNodes = useMemo(() => nodes.filter((n) => n.yr <= year), [nodes, year])

  const presentStatuses = useMemo(
    () => STATUS_ORDER.filter((s) => nodes.some((n) => n.f.status === s)),
    [nodes],
  )

  const hoverInContainer = useCallback(
    (f: FactoryRow, x: number, y: number) => {
      const { scale, ox, oy } = getMeet()
      const cur = tRef.current
      setHover({
        f,
        px: (x * cur.k + cur.x) * scale + ox,
        py: (y * cur.k + cur.y) * scale + oy,
      })
    },
    [getMeet],
  )

  /* ---- drag handlers ---- */
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const [sx, sy] = toSvgPoint(e.clientX, e.clientY)
    dragRef.current = { startX: sx, startY: sy, base: { ...tRef.current }, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current
    if (!d) return
    const [sx, sy] = toSvgPoint(e.clientX, e.clientY)
    const dx = sx - d.startX
    const dy = sy - d.startY
    if (Math.abs(dx) + Math.abs(dy) > 3) {
      d.moved = true
      setDragging(true)
    }
    if (d.moved) {
      tweenRef.current?.kill()
      setHover(null)
      setT({ k: d.base.k, x: d.base.x + dx, y: d.base.y + dy })
    }
  }
  const onPointerUp = () => {
    setDragging(false)
    // keep dragRef.current.moved readable during the click event that follows
    window.setTimeout(() => {
      dragRef.current = null
    }, 0)
  }

  const k = t.k

  return (
    <div ref={containerRef} className="graph-grid absolute inset-0 overflow-hidden bg-ink-950">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className={cn('h-full w-full touch-none select-none', dragging ? 'cursor-grabbing' : 'cursor-grab')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="application"
        aria-label={tt('wm.aria')}
      >
        <g transform={`translate(${t.x} ${t.y}) scale(${t.k})`}>
          {/* graticule at 6% opacity */}
          <path d={graticulePath} fill="none" stroke="rgba(237,235,227,0.06)" strokeWidth={1 / k} />
          {/* landmasses */}
          {landPath && (
            <path d={landPath} fill="#1A2230" stroke="rgba(237,235,227,0.25)" strokeWidth={1 / k} />
          )}
          {/* factory nodes */}
          {nodes.map((n, i) => {
            const isVisible = n.yr <= year
            const dimmed = dimStatus != null && n.f.status !== dimStatus
            const color = STATUS_META[n.f.status].color
            const rr = n.r / k
            return (
              <g key={n.f.id} transform={`translate(${n.x} ${n.y})`}>
                {/* entrance + scrubber pop (staggered by longitude) */}
                <g
                  style={{
                    opacity: loaded && isVisible ? 1 : 0,
                    transform: loaded && isVisible ? 'scale(1)' : 'scale(0)',
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    transition: `opacity 400ms ease-out ${Math.min(i * 12, 240)}ms, transform 400ms cubic-bezier(0.34,1.56,0.64,1) ${Math.min(i * 12, 240)}ms`,
                  }}
                >
                {/* legend dimming layer */}
                <g
                  style={{
                    opacity: dimmed ? 0.15 : 1,
                    transition: 'opacity 200ms',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => hoverInContainer(n.f, n.x, n.y)}
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (dragRef.current?.moved) return
                    onSelect(n.f)
                    centerOn(n.f.lng as number, n.f.lat as number)
                  }}
                >
                  {/* pulse ring */}
                  {!reducedMotion && (
                    <circle r={rr} fill="none" stroke={color} strokeWidth={1.2 / k}>
                      <animate
                        attributeName="r"
                        values={`${rr};${rr * 2.5}`}
                        dur="2.4s"
                        begin={`${(i % 8) * 0.3}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.5;0"
                        dur="2.4s"
                        begin={`${(i % 8) * 0.3}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                  {/* second slow sonar ring for operating nodes */}
                  {!reducedMotion && n.f.status === 'operating' && (
                    <circle r={rr} fill="none" stroke={color} strokeWidth={1 / k}>
                      <animate
                        attributeName="r"
                        values={`${rr};${rr * 3.4}`}
                        dur="4.8s"
                        begin="1.2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.35;0"
                        dur="4.8s"
                        begin="1.2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                  <circle
                    r={rr}
                    fill={color}
                    style={{ filter: `drop-shadow(0 0 ${6 / k}px ${color})` }}
                  />
                  {/* generous hit area */}
                  <circle r={Math.max(rr, 14 / k)} fill="transparent" />
                </g>
                </g>
              </g>
            )
          })}
        </g>
      </svg>

      {/* hover tooltip card */}
      {hover && (
        <div
          className="pointer-events-none absolute z-20 w-[240px] -translate-x-1/2 rounded-sm border border-line bg-ink-800 p-4"
          style={{ left: hover.px, top: hover.py - 14, transform: 'translate(-50%, -100%)' }}
        >
          <p className="font-display text-[16px] leading-snug text-text">{hover.f.siteName}</p>
          <p className="mt-1.5">
            <span className="rounded-sm border border-line-strong px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted">
              {hover.f.company}
            </span>
          </p>
          <p className="mt-2 font-mono text-[11px] tnum text-faint">
            {tpl(tt('wm.capacity'), { v: formatGwh(hover.f.capacityGwh) })}
            {hover.f.chemistry?.length ? ` · ${hover.f.chemistry.join('/')}` : ''}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em]" style={{ color: STATUS_META[hover.f.status].color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_META[hover.f.status].color }} />
            {tt(`status.${hover.f.status}`)}
          </p>
          <p className="mt-2 font-mono text-[10px] tracking-[0.12em] text-volt">{tt('wm.clickForFile')}</p>
        </div>
      )}

      {/* top-left chrome: live view */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-text-muted">
        <span className="h-2 w-2 rounded-full bg-volt animate-pulse-dot" />
        {tpl(tt('wm.live'), { n: visibleNodes.length })}
      </div>

      {/* top-right: legend */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-1.5 rounded-sm border border-line bg-ink-950/80 p-3 backdrop-blur-sm">
        {presentStatuses.map((s) => (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setDimStatus(s)}
            onMouseLeave={() => setDimStatus(null)}
            className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors"
            style={{ color: dimStatus === s ? STATUS_META[s].color : 'var(--muted)' }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_META[s].color }} />
            {tt(`status.${s}`)}
          </button>
        ))}
      </div>

      {/* bottom-left: timeline scrubber */}
      <div className="absolute bottom-4 left-4 z-10 w-[min(320px,calc(100%-2rem))] rounded-sm border border-line bg-ink-950/80 p-3 backdrop-blur-sm">
        <div className="flex items-center justify-between font-mono text-[10.5px] tracking-[0.14em] text-faint">
          <span>{MIN_YEAR}</span>
          <span className="text-[13px] tnum text-volt">{year}</span>
          <span>{MAX_YEAR}</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            step={1}
            value={year}
            onChange={(e) => {
              setPlaying(false)
              setYear(Number(e.target.value))
            }}
            aria-label={tt('wm.ariaYear')}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-ink-700 accent-volt [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-volt"
          />
          <button
            type="button"
            onClick={startPlay}
            aria-label={playing ? tt('wm.ariaPause') : tt('wm.ariaPlay')}
            className="flex items-center gap-1.5 rounded-sm border border-line-strong px-2 py-1 font-mono text-[10px] tracking-[0.12em] text-text transition-colors hover:border-volt hover:text-volt"
          >
            {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {playing ? tt('wm.pause') : tt('wm.play')}
          </button>
        </div>
      </div>

      {/* bottom-right: zoom chrome */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5">
        <button
          type="button"
          aria-label={tt('wm.zoomIn')}
          onClick={() => zoomAt(W / 2, H / 2, 1.4)}
          className="rounded-sm border border-line-strong bg-ink-950/80 p-2 text-text backdrop-blur-sm transition-colors hover:border-volt hover:text-volt"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label={tt('wm.zoomOut')}
          onClick={() => zoomAt(W / 2, H / 2, 1 / 1.4)}
          className="rounded-sm border border-line-strong bg-ink-950/80 p-2 text-text backdrop-blur-sm transition-colors hover:border-volt hover:text-volt"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="flex items-center gap-1.5 rounded-sm border border-line-strong bg-ink-950/80 px-2.5 py-2 font-mono text-[10px] tracking-[0.12em] text-text backdrop-blur-sm transition-colors hover:border-volt hover:text-volt"
        >
          <RotateCcw className="h-3 w-3" />
          {tt('wm.reset')}
        </button>
      </div>
    </div>
  )
}
