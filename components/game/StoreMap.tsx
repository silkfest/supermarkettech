'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Snowflake, Zap, Droplets, Wind, BookOpen, Check } from 'lucide-react'
import { NavGrid } from '@/lib/game/grid'
import { useIsMobile } from '@/components/simulation/useIsMobile'
import type { Character, EquipmentNode, GameMap, Obstacle, Point, SystemKey } from '@/lib/game/types'

export const SYSTEM_COLOR: Record<SystemKey, string> = {
  refrigeration: '#06b6d4',
  electrical: '#f59e0b',
  plumbing: '#3b82f6',
  hvac: '#8b5cf6',
}
export const LESSON_COLOR = '#10b981'

const ICONS = { refrigeration: Snowflake, electrical: Zap, plumbing: Droplets, hvac: Wind, lesson: BookOpen }

export interface Hotspot {
  id: string
  equipmentId: string
  color: string
  icon: keyof typeof ICONS
  /** Draws a floor cue (fog / sparks / puddle / shimmer) for this system. */
  cue?: SystemKey
  done?: boolean
  flagged?: boolean
}

const WALK_SPEED = 150
const ARRIVE_RADIUS = 30
const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
}

interface Props {
  map: GameMap
  character: Character
  hotspots: Hotspot[]
  walkTo: { hotspotId: string; nonce: number } | null
  paused: boolean
  onArrive: (hotspotId: string) => void
  onNearChange: (hotspotId: string | null) => void
}

export default function StoreMap({ map, character, hotspots, walkTo, paused, onArrive, onNearChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile(768)
  const grid = useMemo(() => new NavGrid(map), [map])

  const posRef = useRef<Point>({ ...map.spawn })
  const pathRef = useRef<Point[]>([])
  const targetRef = useRef<string | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const nearRef = useRef<string | null>(null)
  const facingRef = useRef(0)
  const hotspotsRef = useRef(hotspots)
  hotspotsRef.current = hotspots
  const [pos, setPos] = useState<Point>({ ...map.spawn })
  const [facing, setFacing] = useState(0)
  const [walking, setWalking] = useState(false)
  const [tapMark, setTapMark] = useState<Point | null>(null)
  const [box, setBox] = useState({ w: 960, h: 560 })

  const nodeOf = useCallback((id: string) => map.equipment.find(e => e.id === id)!, [map])
  const nodeForHotspot = useCallback((h: Hotspot) => nodeOf(h.equipmentId), [nodeOf])

  const walkToPoint = useCallback((p: Point, hotspotId: string | null) => {
    pathRef.current = grid.findPath(posRef.current, p)
    targetRef.current = hotspotId
    setTapMark(hotspotId ? null : p)
  }, [grid])

  useEffect(() => {
    if (!walkTo) return
    const h = hotspotsRef.current.find(x => x.id === walkTo.hotspotId)
    if (h) walkToPoint(nodeForHotspot(h).stand, h.id)
  }, [walkTo, walkToPoint, nodeForHotspot])

  // Container size drives the camera
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect
      if (r.width && r.height) setBox({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (paused) return
      if (KEYS[e.key]) { keysRef.current.add(e.key); pathRef.current = []; targetRef.current = null; e.preventDefault() }
      if ((e.key === 'Enter' || e.key === ' ') && nearRef.current) { onArrive(nearRef.current); e.preventDefault() }
    }
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [paused, onArrive])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (paused) return
      const p = posRef.current
      let moved = false
      let vx = 0, vy = 0

      let kx = 0, ky = 0
      for (const k of keysRef.current) { const v = KEYS[k]; if (v) { kx += v[0]; ky += v[1] } }
      if (kx || ky) {
        const len = Math.hypot(kx, ky)
        const nx = p.x + (kx / len) * WALK_SPEED * dt
        const ny = p.y + (ky / len) * WALK_SPEED * dt
        if (grid.isWalkable({ x: nx, y: p.y })) { vx = nx - p.x; p.x = nx; moved = true }
        if (grid.isWalkable({ x: p.x, y: ny })) { vy = ny - p.y; p.y = ny; moved = true }
      } else if (pathRef.current.length) {
        const t = pathRef.current[0]
        const dx = t.x - p.x, dy = t.y - p.y
        const dist = Math.hypot(dx, dy)
        const stepLen = WALK_SPEED * dt
        vx = dx; vy = dy
        if (dist <= stepLen) {
          p.x = t.x; p.y = t.y
          pathRef.current.shift()
          if (pathRef.current.length === 0) {
            setTapMark(null)
            const target = targetRef.current
            targetRef.current = null
            if (target && hotspotsRef.current.some(h => h.id === target)) onArrive(target)
          }
        } else {
          p.x += (dx / dist) * stepLen
          p.y += (dy / dist) * stepLen
        }
        moved = true
      }

      let near: string | null = null
      let best = ARRIVE_RADIUS
      for (const h of hotspotsRef.current) {
        const n = map.equipment.find(e => e.id === h.equipmentId)
        if (!n) continue
        const d = Math.hypot(n.stand.x - p.x, n.stand.y - p.y)
        if (d < best) { best = d; near = h.id }
      }
      if (near !== nearRef.current) { nearRef.current = near; onNearChange(near) }

      if (moved && (vx || vy)) {
        const ang = Math.atan2(vy, vx) * 180 / Math.PI + 90
        if (Math.abs(ang - facingRef.current) > 1) { facingRef.current = ang; setFacing(ang) }
      }
      setWalking(moved)
      if (moved) setPos({ x: p.x, y: p.y })
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [paused, onArrive, onNearChange, grid, map])

  function toMap(e: React.PointerEvent): Point | null {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: pt.x, y: pt.y }
  }
  function handleFloorTap(e: React.PointerEvent) {
    if (paused) return
    const p = toMap(e)
    if (p) walkToPoint(p, null)
  }
  function handleHotspotTap(e: React.PointerEvent, h: Hotspot) {
    e.stopPropagation()
    if (paused) return
    walkToPoint(nodeForHotspot(h).stand, h.id)
  }

  // Camera: whole map when there is room, follow-cam on narrow screens
  const follow = isMobile || box.w < 640
  let viewBox = `0 0 ${map.w} ${map.h}`
  if (follow) {
    const aspect = box.w / Math.max(1, box.h)
    let vw = Math.min(map.w, 440)
    let vh = vw / aspect
    if (vh > map.h) { vh = map.h; vw = Math.min(map.w, vh * aspect) }
    const cx = Math.min(map.w - vw / 2, Math.max(vw / 2, pos.x))
    const cy = Math.min(map.h - vh / 2, Math.max(vh / 2, pos.y))
    viewBox = `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`
  }

  const t = performance.now()
  const bob = walking ? Math.sin(t / 80) * 1.2 : 0
  const legPhase = walking ? Math.sin(t / 80) * 3 : 0

  return (
    <div ref={wrapRef} className="relative w-full h-full min-h-[260px] bg-slate-200 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full select-none touch-none"
        onPointerDown={handleFloorTap}
        role="application"
        aria-label="Floor plan"
      >
        <MapDefs />
        <rect x="0" y="0" width={map.w} height={map.h} fill={`url(#floor-${map.floor})`} />

        {map.zones.map(z => (
          <text key={z.label} x={z.x} y={z.y} textAnchor="middle" fontSize="10" fontWeight="700" letterSpacing="1.5"
            className="fill-slate-500 dark:fill-slate-500 pointer-events-none" opacity="0.8">{z.label}</text>
        ))}

        {map.obstacles.map((o, i) => <ObstacleGlyph key={i} o={o} seed={i} />)}
        {map.equipment.map(e => <EquipmentGlyph key={e.id} node={e} />)}

        {tapMark && (
          <circle cx={tapMark.x} cy={tapMark.y} r="6" fill="none" stroke={character.color} strokeWidth="1.5" opacity="0.7" className="pointer-events-none">
            <animate attributeName="r" values="4;10;4" dur="1s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Floor cues sit under the avatar */}
        {hotspots.map(h => {
          if (!h.cue || h.done) return null
          const n = nodeForHotspot(h)
          return <FaultCue key={`cue-${h.id}`} system={h.cue} at={{ x: (n.pin.x + n.stand.x) / 2, y: (n.pin.y + n.stand.y) / 2 }} />
        })}

        <Avatar pos={pos} bob={bob} legPhase={legPhase} facing={facing} color={character.color} />

        {hotspots.map(h => {
          const n = nodeForHotspot(h)
          const Icon = h.done ? Check : ICONS[h.icon]
          const color = h.done ? '#64748b' : h.color
          return (
            <g key={h.id} onPointerDown={ev => handleHotspotTap(ev, h)} className="cursor-pointer" transform={`translate(${n.pin.x} ${n.pin.y})`}>
              {!h.done && (
                <circle r="14" fill={color} opacity="0.25">
                  <animate attributeName="r" values="10;26;10" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.35;0;0.35" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              <g>
                {!h.done && <animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="1.4s" repeatCount="indefinite" />}
                <ellipse cy="2" rx="6" ry="2.5" fill="#000" opacity="0.2" />
                <path d="M0 0 C-7 -8 -12 -13 -12 -20 A12 12 0 1 1 12 -20 C12 -13 7 -8 0 0 Z" fill={color} stroke="#fff" strokeWidth="1.5" />
                <Icon x={-6} y={-26} width={12} height={12} stroke="#fff" strokeWidth={2.5} />
                {h.flagged && <circle cx="10" cy="-30" r="4" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />}
              </g>
            </g>
          )
        })}
      </svg>

      <div className="absolute bottom-2 left-2 text-[10px] text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-2 py-1 rounded-md pointer-events-none">
        {follow ? 'Tap the floor to walk · tap a pin to take it' : 'Click to walk or WASD · click a pin · Enter when you arrive'}
      </div>
    </div>
  )
}

/** Static thumbnail of a map for level cards. */
export function MapThumb({ map, className }: { map: GameMap; className?: string }) {
  return (
    <svg viewBox={`0 0 ${map.w} ${map.h}`} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <MapDefs />
      <rect x="0" y="0" width={map.w} height={map.h} fill={`url(#floor-${map.floor})`} />
      {map.obstacles.map((o, i) => <ObstacleGlyph key={i} o={o} seed={i} />)}
      {map.equipment.map(e => <EquipmentGlyph key={e.id} node={e} />)}
    </svg>
  )
}

// ── Defs ────────────────────────────────────────────────────────────────────
function MapDefs() {
  return (
    <defs>
      <pattern id="floor-tile" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect width="40" height="40" className="fill-stone-100 dark:fill-slate-900" />
        <path d="M40 0 H0 V40" fill="none" className="stroke-stone-200 dark:stroke-slate-800" strokeWidth="1" />
      </pattern>
      <pattern id="floor-concrete" width="60" height="60" patternUnits="userSpaceOnUse">
        <rect width="60" height="60" className="fill-stone-200 dark:fill-slate-900" />
        <path d="M60 0 H0 V60" fill="none" className="stroke-stone-300 dark:stroke-slate-800" strokeWidth="1" />
      </pattern>
      <pattern id="floor-shop" width="60" height="60" patternUnits="userSpaceOnUse">
        <rect width="60" height="60" className="fill-zinc-200 dark:fill-zinc-900" />
        <path d="M60 0 H0 V60" fill="none" className="stroke-zinc-300 dark:stroke-zinc-800" strokeWidth="1" />
        <circle cx="14" cy="22" r="1" className="fill-zinc-300 dark:fill-zinc-800" />
        <circle cx="41" cy="47" r="1.2" className="fill-zinc-300 dark:fill-zinc-800" />
      </pattern>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="45%" stopColor="#ffffff" stopOpacity="0.08" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
      </linearGradient>
      <radialGradient id="frost">
        <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.2" />
      </radialGradient>
      <radialGradient id="fog">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

// ── Obstacles ──────────────────────────────────────────────────────────────
const SHELF_PRODUCT = ['#f59e0b', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#14b8a6']
const PRODUCE = ['#22c55e', '#84cc16', '#f97316', '#ef4444', '#eab308', '#16a34a']

function Extruded({ x, y, w, h, rx = 3, top, front, stroke }: { x: number; y: number; w: number; h: number; rx?: number; top: string; front: string; stroke?: string }) {
  const d = Math.min(6, h * 0.25)
  return (
    <g>
      <rect x={x + 2} y={y + 3} width={w} height={h} rx={rx} fill="#000" opacity="0.12" />
      <rect x={x} y={y + h - d} width={w} height={d} rx={rx} className={front} />
      <rect x={x} y={y} width={w} height={h - d + 1} rx={rx} className={`${top} ${stroke ?? ''}`} strokeWidth={stroke ? 1 : 0} />
    </g>
  )
}

function ObstacleGlyph({ o, seed }: { o: Obstacle; seed: number }) {
  const { x, y, w, h } = o
  const vertical = h > w * 1.4
  switch (o.kind) {
    case 'wall':
      return (
        <g className="pointer-events-none">
          <rect x={x} y={y} width={w} height={h} className="fill-slate-400 dark:fill-slate-700" />
          <rect x={x} y={y} width={w} height={Math.min(4, h)} className="fill-slate-300 dark:fill-slate-600" />
        </g>
      )
    case 'shelf': {
      const rows = vertical ? Math.floor((h - 10) / 18) : 1
      const cols = vertical ? 2 : Math.floor((w - 10) / 18)
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top="fill-slate-200 dark:fill-slate-700" front="fill-slate-400 dark:fill-slate-900" />
          {Array.from({ length: rows }).map((_, r) => Array.from({ length: cols }).map((_, c) => {
            const color = SHELF_PRODUCT[(seed * 7 + r * 3 + c * 5) % SHELF_PRODUCT.length]
            const px = vertical ? x + 6 + c * ((w - 12) / cols) : x + 6 + c * 18
            const py = vertical ? y + 6 + r * 18 : y + 6
            const pw = vertical ? (w - 12) / cols - 3 : 14
            return <rect key={`${r}-${c}`} x={px} y={py} width={pw} height={vertical ? 12 : h - 18} rx="1.5" fill={color} opacity="0.75" />
          }))}
          {o.label && (
            <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fontSize="8" fontWeight="700" letterSpacing="1"
              className="fill-slate-700 dark:fill-slate-200" transform={vertical ? `rotate(-90 ${x + w / 2} ${y + h / 2})` : undefined}
              stroke="#ffffff" strokeWidth="2.5" paintOrder="stroke" strokeOpacity="0.6">{o.label}</text>
          )}
        </g>
      )
    }
    case 'checkout':
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top="fill-amber-100 dark:fill-amber-500/25" front="fill-amber-300 dark:fill-amber-700/60" />
          {Array.from({ length: Math.floor(w / 70) }).map((_, i) => (
            <g key={i}>
              <rect x={x + 10 + i * 70} y={y + 8} width="40" height={h - 22} rx="2" className="fill-slate-700 dark:fill-slate-900" opacity="0.5" />
              <rect x={x + 52 + i * 70} y={y + 10} width="10" height="10" rx="2" className="fill-slate-500 dark:fill-slate-400" />
            </g>
          ))}
          <text x={x + w / 2} y={y + h - 9} textAnchor="middle" fontSize="8" fontWeight="700" letterSpacing="1" className="fill-amber-800 dark:fill-amber-200">{o.label}</text>
        </g>
      )
    case 'produce':
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top="fill-emerald-100 dark:fill-emerald-500/25" front="fill-emerald-400 dark:fill-emerald-800/70" />
          {Array.from({ length: Math.floor((w - 10) / 12) }).map((_, i) => (
            <circle key={i} cx={x + 10 + i * 12} cy={y + 12 + (i % 2) * 8} r="4" fill={PRODUCE[(seed + i) % PRODUCE.length]} opacity="0.85" />
          ))}
        </g>
      )
    case 'desk':
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top="fill-amber-200 dark:fill-amber-900/60" front="fill-amber-400 dark:fill-amber-950" />
          <rect x={x + 8} y={y + 6} width="16" height="11" rx="1" className="fill-white dark:fill-slate-300" opacity="0.8" />
          <circle cx={x + w / 2} cy={y + h + 10} r="6" className="fill-slate-400 dark:fill-slate-600" />
        </g>
      )
    default:
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top="fill-slate-300 dark:fill-slate-700" front="fill-slate-500 dark:fill-slate-900" />
          {o.label && <text x={x + w / 2} y={y + h / 2 + 2} textAnchor="middle" fontSize="8" fontWeight="700" letterSpacing="1" className="fill-slate-700 dark:fill-slate-200">{o.label}</text>}
        </g>
      )
  }
}

// ── Equipment ──────────────────────────────────────────────────────────────
const DRINKS = ['#ef4444', '#3b82f6', '#f97316', '#22c55e', '#facc15']
const FROZEN = ['#bfdbfe', '#e0f2fe', '#fbcfe8', '#fde68a', '#ffffff']
const DAIRY = ['#ffffff', '#fef3c7', '#dbeafe', '#fce7f3']
const MEAT = ['#ef4444', '#f87171', '#fb7185', '#dc2626']
const DELI = ['#fbbf24', '#f59e0b', '#fde68a', '#d97706']

function Fan({ cx, cy, r, className, dur = '0.6s' }: { cx: number; cy: number; r: number; className: string; dur?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" className={className} strokeWidth="1.5" />
      <g>
        <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur={dur} repeatCount="indefinite" />
        <path d={`M${cx} ${cy} l0 ${-r * 0.85} M${cx} ${cy} l${r * 0.74} ${r * 0.42} M${cx} ${cy} l${-r * 0.74} ${r * 0.42}`} className={className} strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r={r * 0.2} className={className.replace(/stroke-/g, 'fill-')} />
    </g>
  )
}

function Doors({ x, y, w, h, vertical, colors, seed }: { x: number; y: number; w: number; h: number; vertical: boolean; colors: string[]; seed: number }) {
  const n = Math.max(1, Math.floor((vertical ? h : w) / 30))
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const dx = vertical ? x + 4 : x + 4 + i * ((w - 8) / n)
        const dy = vertical ? y + 4 + i * ((h - 8) / n) : y + 4
        const dw = vertical ? w - 8 : (w - 8) / n - 2
        const dh = vertical ? (h - 8) / n - 2 : h - 8
        return (
          <g key={i}>
            <rect x={dx} y={dy} width={dw} height={dh} rx="2" className="fill-slate-800 dark:fill-slate-950" opacity="0.35" />
            {[0, 1, 2].map(k => (
              <rect key={k} x={dx + 3 + (vertical ? k * ((dw - 6) / 3) : 0)} y={dy + 3 + (vertical ? 0 : k * ((dh - 6) / 3))}
                width={vertical ? (dw - 6) / 3 - 1 : dw - 6} height={vertical ? dh - 6 : (dh - 6) / 3 - 1} rx="1"
                fill={colors[(seed + i + k) % colors.length]} opacity="0.85" />
            ))}
            <rect x={dx} y={dy} width={dw} height={dh} rx="2" fill="url(#glass)" />
            <rect x={dx} y={dy} width={dw} height={dh} rx="2" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1" />
          </g>
        )
      })}
    </g>
  )
}

function Shelves({ x, y, w, h, vertical, colors, seed }: { x: number; y: number; w: number; h: number; vertical: boolean; colors: string[]; seed: number }) {
  const rows = Math.max(1, Math.floor((vertical ? h : w) / 14))
  return (
    <g>
      {Array.from({ length: rows }).map((_, i) => (
        <rect key={i}
          x={vertical ? x + 5 : x + 4 + i * 14} y={vertical ? y + 4 + i * 14 : y + 5}
          width={vertical ? w - 10 : 10} height={vertical ? 10 : h - 10} rx="1.5"
          fill={colors[(seed + i) % colors.length]} opacity="0.9" />
      ))}
    </g>
  )
}

function EquipmentGlyph({ node }: { node: EquipmentNode }) {
  const { x, y, w, h } = node.rect
  const vertical = h > w * 1.4
  const seed = node.id.charCodeAt(node.id.length - 1)
  const label = (
    <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fontSize="8" fontWeight="700"
      className="fill-slate-800 dark:fill-white" stroke="#ffffff" strokeWidth="2.5" paintOrder="stroke" strokeOpacity="0.7"
      transform={vertical ? `rotate(-90 ${x + w / 2} ${y + h / 2})` : undefined}>{node.id}</text>
  )
  switch (node.kind) {
    case 'reach-in-freezer':
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top="fill-cyan-200 dark:fill-cyan-900" front="fill-cyan-500 dark:fill-cyan-950" />
          <Doors x={x} y={y} w={w} h={h - 5} vertical={vertical} colors={FROZEN} seed={seed} />
        </g>
      )
    case 'reach-in-cooler':
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top="fill-sky-200 dark:fill-sky-900" front="fill-sky-500 dark:fill-sky-950" />
          <Doors x={x} y={y} w={w} h={h - 5} vertical={vertical} colors={DRINKS} seed={seed} />
        </g>
      )
    case 'dairy-case':
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top="fill-sky-100 dark:fill-sky-900/70" front="fill-sky-400 dark:fill-sky-950" />
          <Shelves x={x} y={y} w={w} h={h - 5} vertical={vertical} colors={DAIRY} seed={seed} />
          {label}
        </g>
      )
    case 'produce-case':
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top="fill-emerald-100 dark:fill-emerald-900/60" front="fill-emerald-500 dark:fill-emerald-950" />
          {Array.from({ length: Math.floor((vertical ? h : w) / 14) }).map((_, i) => (
            <circle key={i} cx={vertical ? x + w / 2 + (i % 2 ? 5 : -5) : x + 8 + i * 14} cy={vertical ? y + 8 + i * 14 : y + h / 2} r="4" fill={PRODUCE[(seed + i) % PRODUCE.length]} opacity="0.9" />
          ))}
        </g>
      )
    case 'deli-case':
    case 'meat-case':
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top="fill-rose-100 dark:fill-rose-900/60" front="fill-rose-400 dark:fill-rose-950" />
          <Shelves x={x + 2} y={y + 6} w={w - 4} h={h - 16} vertical={false} colors={node.kind === 'meat-case' ? MEAT : DELI} seed={seed} />
          <rect x={x + 2} y={y + 2} width={w - 4} height={h * 0.45} rx="3" fill="url(#glass)" />
          {label}
        </g>
      )
    case 'bunker':
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} rx={8} top="fill-cyan-100 dark:fill-cyan-900/70" front="fill-cyan-500 dark:fill-cyan-950" />
          <rect x={x + 6} y={y + 6} width={w - 12} height={h - 17} rx="5" fill="url(#frost)" />
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={i} x={x + 10 + (i % 3) * ((w - 20) / 3)} y={y + 12 + Math.floor(i / 3) * ((h - 30) / 2)} width={(w - 20) / 3 - 4} height={(h - 30) / 2 - 4} rx="2" fill={FROZEN[(seed + i) % FROZEN.length]} opacity="0.9" />
          ))}
          <rect x={x + 6} y={y + 6} width={w - 12} height={h - 17} rx="5" fill="url(#glass)" />
          {label}
        </g>
      )
    case 'chest-freezer':
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} rx={4} top="fill-slate-50 dark:fill-slate-300" front="fill-slate-400 dark:fill-slate-600" />
          <rect x={x + 4} y={y + 4} width={w - 8} height={h - 15} rx="3" fill="url(#frost)" />
          <line x1={x + w / 2} x2={x + w / 2} y1={y + 4} y2={y + h - 11} className="stroke-slate-400" strokeWidth="1" />
          {label}
        </g>
      )
    case 'floor-drain':
      return (
        <g className="pointer-events-none">
          <rect x={x} y={y} width={w} height={h} rx="2" className="fill-slate-400 dark:fill-slate-600" />
          {[4, 8, 12].map(k => <line key={k} x1={x + 3} x2={x + w - 3} y1={y + k} y2={y + k} className="stroke-slate-600 dark:stroke-slate-900" strokeWidth="1.2" />)}
        </g>
      )
    case 'walk-in-freezer':
    case 'walk-in-cooler': {
      const cold = node.kind === 'walk-in-freezer'
      const doorSide = node.stand.y > y + h ? 'bottom' : node.stand.y < y ? 'top' : node.stand.x < x ? 'left' : 'right'
      return (
        <g className="pointer-events-none">
          <rect x={x + 2} y={y + 3} width={w} height={h} rx="3" fill="#000" opacity="0.12" />
          <rect x={x} y={y} width={w} height={h} rx="3" className={cold ? 'fill-cyan-50 dark:fill-cyan-950 stroke-cyan-500 dark:stroke-cyan-600' : 'fill-sky-50 dark:fill-sky-950 stroke-sky-500 dark:stroke-sky-600'} strokeWidth="4" />
          <rect x={x + 10} y={y + 10} width={w - 20} height={14} rx="2" className="fill-slate-300 dark:fill-slate-700" />
          {[0, 1].map(i => <Fan key={i} cx={x + w / 2 + (i ? 14 : -14)} cy={y + 17} r={5} className={cold ? 'stroke-cyan-600 dark:stroke-cyan-300' : 'stroke-sky-600 dark:stroke-sky-300'} dur="0.9s" />)}
          {doorSide === 'bottom' && <rect x={x + w / 2 - 14} y={y + h - 5} width="28" height="6" rx="1" className="fill-slate-500 dark:fill-slate-400" />}
          {doorSide === 'top' && <rect x={x + w / 2 - 14} y={y - 1} width="28" height="6" rx="1" className="fill-slate-500 dark:fill-slate-400" />}
          {doorSide === 'left' && <rect x={x - 1} y={y + h / 2 - 14} width="6" height="28" rx="1" className="fill-slate-500 dark:fill-slate-400" />}
          {doorSide === 'right' && <rect x={x + w - 5} y={y + h / 2 - 14} width="6" height="28" rx="1" className="fill-slate-500 dark:fill-slate-400" />}
          <text x={x + w / 2} y={y + h / 2 + 8} textAnchor="middle" fontSize="8" fontWeight="700" className="fill-slate-700 dark:fill-slate-200">WALK-IN</text>
          <text x={x + w / 2} y={y + h / 2 + 18} textAnchor="middle" fontSize="7" className="fill-slate-500 dark:fill-slate-400">{cold ? 'FREEZER' : 'COOLER'}</text>
        </g>
      )
    }
    case 'rack':
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top="fill-slate-300 dark:fill-slate-700" front="fill-slate-500 dark:fill-slate-900" />
          <rect x={x + 8} y={y + 8} width={w - 16} height="4" rx="2" className="fill-red-400 dark:fill-red-500" opacity="0.7" />
          <rect x={x + 8} y={y + 14} width={w - 16} height="4" rx="2" className="fill-blue-400 dark:fill-blue-500" opacity="0.7" />
          {[0, 1, 2, 3].map(i => (
            <g key={i}>
              <circle cx={x + 20 + i * 27} cy={y + h / 2 + 6} r="9" className="fill-slate-500 dark:fill-slate-500" />
              <circle cx={x + 20 + i * 27} cy={y + h / 2 + 6} r="6" className="fill-slate-700 dark:fill-slate-800" />
              <circle cx={x + 20 + i * 27} cy={y + h / 2 + 6} r="2" fill="#10b981">
                <animate attributeName="opacity" values="1;0.3;1" dur={`${1.2 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))}
          <rect x={x + w - 22} y={y + 24} width="14" height="20" rx="1.5" className="fill-slate-200 dark:fill-slate-900 stroke-slate-500" strokeWidth="1" />
          <circle cx={x + w - 15} cy={y + 30} r="1.5" fill="#22c55e" />
        </g>
      )
    case 'rtu':
    case 'condensing-unit':
    case 'split-ac': {
      const top = node.kind === 'rtu' ? 'fill-violet-200 dark:fill-violet-900/70' : 'fill-slate-300 dark:fill-slate-700'
      const front = node.kind === 'rtu' ? 'fill-violet-500 dark:fill-violet-950' : 'fill-slate-500 dark:fill-slate-900'
      const fan = node.kind === 'rtu' ? 'stroke-violet-700 dark:stroke-violet-300' : 'stroke-slate-700 dark:stroke-slate-200'
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top={top} front={front} />
          {[0, 1, 2, 3, 4].map(k => <line key={k} x1={x + 5} x2={x + w - 5} y1={y + 7 + k * 3} y2={y + 7 + k * 3} className="stroke-slate-500 dark:stroke-slate-400" strokeWidth="1" opacity="0.6" />)}
          <Fan cx={x + w / 2} cy={y + h / 2 + 8} r={Math.min(w, h) * 0.28} className={fan} />
          <text x={x + w / 2} y={y + h - 9} textAnchor="middle" fontSize="7" fontWeight="700" className="fill-slate-700 dark:fill-slate-100">{node.id}</text>
        </g>
      )
    }
    case 'ice-machine':
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top="fill-slate-100 dark:fill-slate-300" front="fill-slate-400 dark:fill-slate-600" />
          <rect x={x + 5} y={y + 5} width={w - 10} height={h * 0.4} rx="2" className="fill-slate-300 dark:fill-slate-500" />
          {[0, 1, 2, 3].map(k => <line key={k} x1={x + 8} x2={x + w - 8} y1={y + 9 + k * 4} y2={y + 9 + k * 4} className="stroke-slate-500 dark:stroke-slate-700" strokeWidth="1" />)}
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={x + 8 + (i % 4) * 12} y={y + h * 0.5 + Math.floor(i / 4) * 9} width="8" height="6" rx="1.5" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="0.8" />
          ))}
          {label}
        </g>
      )
    case 'station':
      if (node.id === 'WB') {
        return (
          <g className="pointer-events-none">
            <rect x={x} y={y} width={w} height={h} rx="2" className="fill-white dark:fill-slate-200 stroke-slate-400" strokeWidth="2" />
            <path d={`M${x + 20} ${y + 8} q12 -6 24 0 t24 0 t24 0`} fill="none" stroke="#2563eb" strokeWidth="1.5" />
            <path d={`M${x + 120} ${y + 14} h60`} stroke="#dc2626" strokeWidth="1.5" />
            <circle cx={x + 210} cy={y + 12} r="6" fill="none" stroke="#16a34a" strokeWidth="1.5" />
          </g>
        )
      }
      return (
        <g className="pointer-events-none">
          <Extruded x={x} y={y} w={w} h={h} top="fill-teal-100 dark:fill-teal-900/60" front="fill-teal-500 dark:fill-teal-950" />
          {vertical
            ? [0, 1, 2].map(k => <rect key={k} x={x + 8} y={y + 12 + k * 30} width={w - 16} height="18" rx="2" className="fill-slate-400 dark:fill-slate-500" opacity="0.7" />)
            : [0, 1, 2, 3].map(k => <rect key={k} x={x + 12 + k * 32} y={y + 8} width="22" height={h - 20} rx="2" className="fill-slate-400 dark:fill-slate-500" opacity="0.7" />)}
        </g>
      )
    case 'entrance':
      return (
        <g className="pointer-events-none">
          <rect x={x} y={y} width={w} height={h} className="fill-slate-100 dark:fill-slate-800" />
          <rect x={x + 4} y={y + 3} width={w / 2 - 6} height={h - 6} rx="1" fill="url(#glass)" stroke="#94a3b8" strokeWidth="1" />
          <rect x={x + w / 2 + 2} y={y + 3} width={w / 2 - 6} height={h - 6} rx="1" fill="url(#glass)" stroke="#94a3b8" strokeWidth="1" />
        </g>
      )
  }
}

// ── Fault cues ─────────────────────────────────────────────────────────────
function FaultCue({ system, at }: { system: SystemKey; at: Point }) {
  switch (system) {
    case 'refrigeration':
      return (
        <g className="pointer-events-none" transform={`translate(${at.x} ${at.y})`}>
          {[0, 1, 2].map(i => (
            <ellipse key={i} cx={(i - 1) * 9} cy="0" rx="12" ry="7" fill="url(#fog)">
              <animate attributeName="cy" values="4;-10;4" dur={`${2.4 + i * 0.5}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0.2;0.9" dur={`${2.4 + i * 0.5}s`} repeatCount="indefinite" />
            </ellipse>
          ))}
        </g>
      )
    case 'electrical':
      return (
        <g className="pointer-events-none" transform={`translate(${at.x} ${at.y})`} stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M-8 -4 l4 -6 l-2 6 l5 -4">
            <animate attributeName="opacity" values="0;1;0;0;0" dur="0.9s" repeatCount="indefinite" />
          </path>
          <path d="M6 2 l3 -7 l-1 5 l4 -3">
            <animate attributeName="opacity" values="0;0;1;0;0" dur="1.3s" repeatCount="indefinite" />
          </path>
          <path d="M-2 8 l-4 -5 l3 1 l-2 -5">
            <animate attributeName="opacity" values="0;0;0;1;0" dur="1.1s" repeatCount="indefinite" />
          </path>
        </g>
      )
    case 'plumbing':
      return (
        <g className="pointer-events-none" transform={`translate(${at.x} ${at.y})`}>
          <ellipse rx="18" ry="9" fill="#3b82f6" opacity="0.35">
            <animate attributeName="rx" values="16;20;16" dur="3s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="-4" cy="-2" rx="6" ry="2.5" fill="#ffffff" opacity="0.4" />
          <circle cy="-16" r="2" fill="#3b82f6" opacity="0.8">
            <animate attributeName="cy" values="-18;-4" dur="0.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0" dur="0.8s" repeatCount="indefinite" />
          </circle>
        </g>
      )
    case 'hvac':
      return (
        <g className="pointer-events-none" transform={`translate(${at.x} ${at.y})`} stroke="#a78bfa" strokeWidth="1.5" fill="none" strokeLinecap="round">
          {[0, 1, 2].map(i => (
            <path key={i} d={`M${(i - 1) * 8} 8 q3 -4 0 -8 t0 -8`}>
              <animate attributeName="transform" attributeType="XML" type="translate" values="0 6;0 -6" dur={`${1.6 + i * 0.3}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.9;0" dur={`${1.6 + i * 0.3}s`} repeatCount="indefinite" />
            </path>
          ))}
        </g>
      )
  }
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ pos, bob, legPhase, facing, color }: { pos: Point; bob: number; legPhase: number; facing: number; color: string }) {
  return (
    <g transform={`translate(${pos.x} ${pos.y})`} className="pointer-events-none">
      <ellipse cy="3" rx="10" ry="5" fill="#000" opacity="0.2" />
      <g transform={`rotate(${facing}) translate(0 ${bob})`}>
        <ellipse cx="-4" cy={6 + legPhase} rx="3" ry="2.2" fill="#1e293b" />
        <ellipse cx="4" cy={6 - legPhase} rx="3" ry="2.2" fill="#1e293b" />
        <rect x="-9" y="-6" width="18" height="14" rx="6" fill={color} stroke="#fff" strokeWidth="1.2" />
        <rect x="-9" y="-1" width="18" height="3" fill="#fde047" opacity="0.9" />
        <rect x="8" y="-2" width="5" height="8" rx="1.5" fill="#78350f" stroke="#fff" strokeWidth="0.8" />
        <circle cy="-3" r="5" fill="#f1c27d" />
        <ellipse cy="-4" rx="7.5" ry="6" fill="#facc15" />
        <ellipse cy="-4" rx="7.5" ry="6" fill="url(#glass)" />
        <ellipse cy="1" rx="8" ry="2.2" fill="#eab308" />
      </g>
    </g>
  )
}
