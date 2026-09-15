'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Snowflake, Zap, Droplets, Wind } from 'lucide-react'
import { EQUIPMENT, OBSTACLES, ZONES, MAP_W, MAP_H, SPAWN_POINT, findPath, isWalkable } from '@/lib/game/store'
import { FAULT_BY_ID } from '@/lib/game/faults'
import { useIsMobile } from '@/components/simulation/useIsMobile'
import type { ActiveCall, Character, EquipmentNode, Point, SystemKey } from '@/lib/game/types'

export const SYSTEM_COLOR: Record<SystemKey, string> = {
  refrigeration: '#06b6d4',
  electrical: '#f59e0b',
  plumbing: '#3b82f6',
  hvac: '#8b5cf6',
}
const SYSTEM_ICON: Record<SystemKey, typeof Snowflake> = {
  refrigeration: Snowflake, electrical: Zap, plumbing: Droplets, hvac: Wind,
}

const WALK_SPEED = 150          // map px per second
const ARRIVE_RADIUS = 30
const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
}

interface Props {
  character: Character
  calls: ActiveCall[]
  /** Walk target requested from outside (e.g. tapping an open call in the HUD). */
  walkTo: { callId: string; nonce: number } | null
  paused: boolean
  onArrive: (callId: string) => void
  onNearChange: (callId: string | null) => void
}

export default function StoreMap({ character, calls, walkTo, paused, onArrive, onNearChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const isMobile = useIsMobile(768)

  // Movement state lives in refs (rAF loop); `pos` mirrors it for rendering.
  const posRef = useRef<Point>({ ...SPAWN_POINT })
  const pathRef = useRef<Point[]>([])
  const targetCallRef = useRef<string | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const nearRef = useRef<string | null>(null)
  const callsRef = useRef(calls)
  callsRef.current = calls
  const [pos, setPos] = useState<Point>({ ...SPAWN_POINT })
  const [walking, setWalking] = useState(false)
  const [tapMark, setTapMark] = useState<Point | null>(null)

  const nodeFor = useCallback((call: ActiveCall) => EQUIPMENT.find(e => e.id === call.equipmentId)!, [])

  const walkToPoint = useCallback((p: Point, callId: string | null) => {
    pathRef.current = findPath(posRef.current, p)
    targetCallRef.current = callId
    setTapMark(callId ? null : p)
  }, [])

  useEffect(() => {
    if (!walkTo) return
    const call = callsRef.current.find(c => c.id === walkTo.callId)
    if (call) walkToPoint(nodeFor(call).stand, call.id)
  }, [walkTo, walkToPoint, nodeFor])

  // ── Keyboard ──
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (paused) return
      if (KEYS[e.key]) { keysRef.current.add(e.key); pathRef.current = []; targetCallRef.current = null; e.preventDefault() }
      if ((e.key === 'Enter' || e.key === ' ') && nearRef.current) { onArrive(nearRef.current); e.preventDefault() }
    }
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [paused, onArrive])

  // ── Movement loop ──
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

      // Keyboard steering takes priority over a tapped path
      let kx = 0, ky = 0
      for (const k of keysRef.current) { const v = KEYS[k]; if (v) { kx += v[0]; ky += v[1] } }
      if (kx || ky) {
        const len = Math.hypot(kx, ky)
        const nx = p.x + (kx / len) * WALK_SPEED * dt
        const ny = p.y + (ky / len) * WALK_SPEED * dt
        if (isWalkable({ x: nx, y: p.y })) { p.x = nx; moved = true }
        if (isWalkable({ x: p.x, y: ny })) { p.y = ny; moved = true }
      } else if (pathRef.current.length) {
        const t = pathRef.current[0]
        const dx = t.x - p.x, dy = t.y - p.y
        const dist = Math.hypot(dx, dy)
        const stepLen = WALK_SPEED * dt
        if (dist <= stepLen) {
          p.x = t.x; p.y = t.y
          pathRef.current.shift()
          if (pathRef.current.length === 0) {
            setTapMark(null)
            const target = targetCallRef.current
            targetCallRef.current = null
            if (target && callsRef.current.some(c => c.id === target)) onArrive(target)
          }
        } else {
          p.x += (dx / dist) * stepLen
          p.y += (dy / dist) * stepLen
        }
        moved = true
      }

      // Proximity to an open call's work position
      let near: string | null = null
      let best = ARRIVE_RADIUS
      for (const c of callsRef.current) {
        const n = EQUIPMENT.find(e => e.id === c.equipmentId)!
        const d = Math.hypot(n.stand.x - p.x, n.stand.y - p.y)
        if (d < best) { best = d; near = c.id }
      }
      if (near !== nearRef.current) { nearRef.current = near; onNearChange(near) }

      setWalking(moved)
      if (moved) setPos({ x: p.x, y: p.y })
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [paused, onArrive, onNearChange])

  // ── Pointer → map coords ──
  function toMap(e: React.PointerEvent): Point | null {
    const svg = svgRef.current
    if (!svg) return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return { x: pt.x, y: pt.y }
  }
  function handleFloorTap(e: React.PointerEvent) {
    if (paused) return
    const p = toMap(e)
    if (p) walkToPoint(p, null)
  }
  function handleHotspotTap(e: React.PointerEvent, call: ActiveCall) {
    e.stopPropagation()
    if (paused) return
    walkToPoint(nodeFor(call).stand, call.id)
  }

  // ── Camera: full map on desktop, follow-cam on phones ──
  let viewBox = `0 0 ${MAP_W} ${MAP_H}`
  if (isMobile) {
    const vw = 480, vh = 400
    const cx = Math.min(MAP_W - vw / 2, Math.max(vw / 2, pos.x))
    const cy = Math.min(MAP_H - vh / 2, Math.max(vh / 2, pos.y))
    viewBox = `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`
  }

  const bob = walking ? Math.sin(performance.now() / 90) * 1.2 : 0

  return (
    <div className={`relative w-full bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 ${isMobile ? 'aspect-[6/5]' : 'aspect-[960/560]'}`}>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="w-full h-full select-none touch-none"
        onPointerDown={handleFloorTap}
        role="application"
        aria-label="Store floor plan"
      >
        <defs>
          <pattern id="floorTile" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" className="fill-slate-100 dark:fill-slate-900" />
            <path d="M40 0 H0 V40" fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" />
          </pattern>
        </defs>

        <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#floorTile)" />

        {/* Zone labels */}
        {ZONES.map(z => (
          <text key={z.label} x={z.x} y={z.y} textAnchor="middle" fontSize="10" fontWeight="700" letterSpacing="1.5"
            className="fill-slate-400 dark:fill-slate-600 pointer-events-none">{z.label}</text>
        ))}

        {/* Walls, shelving, checkout */}
        {OBSTACLES.map((o, i) => {
          const cls = o.kind === 'wall'
            ? 'fill-slate-300 dark:fill-slate-700'
            : o.kind === 'checkout'
            ? 'fill-amber-100 dark:fill-amber-500/20 stroke-amber-300 dark:stroke-amber-500/40'
            : o.kind === 'produce'
            ? 'fill-emerald-100 dark:fill-emerald-500/20 stroke-emerald-300 dark:stroke-emerald-500/40'
            : 'fill-slate-200 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600'
          return (
            <g key={i} className="pointer-events-none">
              <rect x={o.x} y={o.y} width={o.w} height={o.h} rx={o.kind === 'wall' ? 0 : 4} className={cls} strokeWidth="1" />
              {o.kind === 'shelf' && Array.from({ length: Math.floor(o.h / 24) }).map((_, j) => (
                <line key={j} x1={o.x + 6} x2={o.x + o.w - 6} y1={o.y + 14 + j * 24} y2={o.y + 14 + j * 24} className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="2" strokeLinecap="round" />
              ))}
              {o.label && o.kind !== 'wall' && (
                <text x={o.x + o.w / 2} y={o.y + o.h / 2 + 3} textAnchor="middle" fontSize="8" fontWeight="600" letterSpacing="1"
                  className="fill-slate-500 dark:fill-slate-400"
                  transform={o.kind === 'shelf' ? `rotate(-90 ${o.x + o.w / 2} ${o.y + o.h / 2})` : undefined}>{o.label}</text>
              )}
            </g>
          )
        })}

        {/* Entrance mat */}
        <rect x="340" y="0" width="80" height="20" className="fill-slate-50 dark:fill-slate-800 pointer-events-none" />
        <text x="380" y="13" textAnchor="middle" fontSize="8" fontWeight="700" letterSpacing="1.5" className="fill-slate-400 dark:fill-slate-500 pointer-events-none">ENTRANCE</text>

        {/* Equipment */}
        {EQUIPMENT.map(e => <EquipmentGlyph key={e.id} node={e} />)}

        {/* Tap marker */}
        {tapMark && (
          <g className="pointer-events-none">
            <circle cx={tapMark.x} cy={tapMark.y} r="6" fill="none" stroke={character.color} strokeWidth="1.5" opacity="0.7">
              <animate attributeName="r" values="4;10;4" dur="1s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* Hotspots */}
        {calls.map(c => {
          const node = nodeFor(c)
          const fault = FAULT_BY_ID[c.faultId]
          const color = SYSTEM_COLOR[fault.system]
          const Icon = SYSTEM_ICON[fault.system]
          return (
            <g key={c.id} onPointerDown={ev => handleHotspotTap(ev, c)} className="cursor-pointer">
              <circle cx={node.pin.x} cy={node.pin.y} r="14" fill={color} opacity="0.25">
                <animate attributeName="r" values="12;24;12" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.35;0;0.35" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle cx={node.pin.x} cy={node.pin.y} r="11" fill={color} stroke="#fff" strokeWidth="2" />
              <Icon x={node.pin.x - 6} y={node.pin.y - 6} width={12} height={12} stroke="#fff" strokeWidth={2.5} />
              {c.complained && (
                <circle cx={node.pin.x + 9} cy={node.pin.y - 9} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
              )}
            </g>
          )
        })}

        {/* Tech avatar */}
        <g transform={`translate(${pos.x} ${pos.y + bob})`} className="pointer-events-none">
          <ellipse cx="0" cy="10" rx="8" ry="3" fill="#000" opacity="0.18" />
          <circle cx="0" cy="2" r="8" fill={character.color} stroke="#fff" strokeWidth="1.5" />
          <circle cx="0" cy="-7" r="5" fill="#f1c27d" stroke="#fff" strokeWidth="1" />
          <path d="M-5.5 -8 A5.5 5.5 0 0 1 5.5 -8 Z" fill="#facc15" />
          <rect x="-6.5" y="-8.5" width="13" height="1.8" rx="0.9" fill="#facc15" />
        </g>
      </svg>

      <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-2 py-1 rounded-md pointer-events-none">
        {isMobile ? 'Tap the floor to walk · tap a pin to take the call' : 'Click to walk or use WASD · click a pin to take the call · Enter when you arrive'}
      </div>
    </div>
  )
}

function EquipmentGlyph({ node }: { node: EquipmentNode }) {
  const { x, y, w, h } = node.rect
  const label = (
    <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fontSize="8" fontWeight="700" className="fill-slate-600 dark:fill-slate-300"
      transform={h > w * 1.6 ? `rotate(-90 ${x + w / 2} ${y + h / 2})` : undefined}>{node.id}</text>
  )
  switch (node.kind) {
    case 'reach-in-freezer':
    case 'dairy-case':
    case 'produce-case': {
      const cold = node.kind === 'reach-in-freezer'
      const panes = Math.floor(h / 28)
      return (
        <g className="pointer-events-none">
          <rect x={x} y={y} width={w} height={h} rx="3" className={cold ? 'fill-cyan-100 dark:fill-cyan-500/20 stroke-cyan-300 dark:stroke-cyan-500/40' : node.kind === 'produce-case' ? 'fill-emerald-100 dark:fill-emerald-500/20 stroke-emerald-300 dark:stroke-emerald-500/40' : 'fill-sky-100 dark:fill-sky-500/20 stroke-sky-300 dark:stroke-sky-500/40'} strokeWidth="1" />
          {cold && Array.from({ length: panes }).map((_, i) => (
            <rect key={i} x={x + 4} y={y + 4 + i * 28} width={w - 8} height={22} rx="2" fill="none" className="stroke-cyan-400/70 dark:stroke-cyan-400/40" strokeWidth="1" />
          ))}
          {label}
        </g>
      )
    }
    case 'bunker':
      return (
        <g className="pointer-events-none">
          <rect x={x} y={y} width={w} height={h} rx="8" className="fill-cyan-100 dark:fill-cyan-500/20 stroke-cyan-300 dark:stroke-cyan-500/40" strokeWidth="1" />
          <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx="5" fill="none" className="stroke-cyan-400/70 dark:stroke-cyan-400/40" strokeWidth="1" strokeDasharray="3 3" />
          {label}
        </g>
      )
    case 'deli-case':
    case 'meat-case':
      return (
        <g className="pointer-events-none">
          <rect x={x} y={y} width={w} height={h} rx="3" className="fill-rose-100 dark:fill-rose-500/20 stroke-rose-300 dark:stroke-rose-500/40" strokeWidth="1" />
          <path d={`M${x + 4} ${y + 8} Q${x + w / 2} ${y - 2} ${x + w - 4} ${y + 8}`} fill="none" className="stroke-rose-300 dark:stroke-rose-500/50" strokeWidth="1" />
          {label}
        </g>
      )
    case 'floor-drain':
      return (
        <g className="pointer-events-none">
          <rect x={x} y={y} width={w} height={h} rx="2" className="fill-slate-300 dark:fill-slate-700 stroke-slate-400 dark:stroke-slate-500" strokeWidth="1" />
          <line x1={x + 4} x2={x + w - 4} y1={y + 6} y2={y + 6} className="stroke-slate-500" strokeWidth="1" />
          <line x1={x + 4} x2={x + w - 4} y1={y + 10} y2={y + 10} className="stroke-slate-500" strokeWidth="1" />
        </g>
      )
    case 'walk-in-freezer':
    case 'walk-in-cooler': {
      const cold = node.kind === 'walk-in-freezer'
      return (
        <g className="pointer-events-none">
          <rect x={x} y={y} width={w} height={h} rx="3" className={cold ? 'fill-cyan-50 dark:fill-cyan-500/10 stroke-cyan-400 dark:stroke-cyan-500/50' : 'fill-sky-50 dark:fill-sky-500/10 stroke-sky-400 dark:stroke-sky-500/50'} strokeWidth="2" />
          <rect x={x + w / 2 - 12} y={y + h - 4} width="24" height="4" className="fill-slate-400 dark:fill-slate-500" />
          <text x={x + w / 2} y={y + h / 2 - 2} textAnchor="middle" fontSize="8" fontWeight="700" className="fill-slate-600 dark:fill-slate-300">WALK-IN</text>
          <text x={x + w / 2} y={y + h / 2 + 8} textAnchor="middle" fontSize="7" className="fill-slate-500 dark:fill-slate-400">{cold ? 'FREEZER' : 'COOLER'}</text>
        </g>
      )
    }
    case 'rack':
      return (
        <g className="pointer-events-none">
          <rect x={x} y={y} width={w} height={h} rx="3" className="fill-slate-200 dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-600" strokeWidth="1.5" />
          {[0, 1, 2, 3].map(i => (
            <circle key={i} cx={x + 20 + i * 27} cy={y + h / 2 + 6} r="8" className="fill-slate-300 dark:fill-slate-700 stroke-slate-500 dark:stroke-slate-500" strokeWidth="1" />
          ))}
          <text x={x + w / 2} y={y + 13} textAnchor="middle" fontSize="8" fontWeight="700" className="fill-slate-600 dark:fill-slate-300">RACK A</text>
        </g>
      )
    case 'rtu':
      return (
        <g className="pointer-events-none">
          <rect x={x} y={y} width={w} height={h} rx="3" className="fill-violet-100 dark:fill-violet-500/20 stroke-violet-300 dark:stroke-violet-500/40" strokeWidth="1" />
          <circle cx={x + w / 2} cy={y + h / 2 + 6} r="13" fill="none" className="stroke-violet-400 dark:stroke-violet-400/60" strokeWidth="1.5" />
          <path d={`M${x + w / 2} ${y + h / 2 + 6} l0 -11 M${x + w / 2} ${y + h / 2 + 6} l9.5 5.5 M${x + w / 2} ${y + h / 2 + 6} l-9.5 5.5`} className="stroke-violet-400 dark:stroke-violet-400/60" strokeWidth="2" strokeLinecap="round" />
          <text x={x + w / 2} y={y + 12} textAnchor="middle" fontSize="8" fontWeight="700" className="fill-slate-600 dark:fill-slate-300">{node.id}</text>
        </g>
      )
    case 'entrance':
      return null
  }
}
