'use client'
import React, { useId } from 'react'

// ── Shared SVG primitives for the rack schematics ──────────────────────────────
// Fixed mid-tone palette chosen to stay legible on both white (light mode) and
// slate-800 (dark mode) card backgrounds.

export const C = {
  suction:   '#3b82f6',   // MT suction — blue
  ltSuction: '#06b6d4',   // LT suction — cyan
  discharge: '#ef4444',   // discharge / hot gas — red
  liquid:    '#f59e0b',   // liquid line — amber
  flashGas:  '#a78bfa',   // flash gas / vapor — violet
  metal:     '#94a3b8',
  metalDark: '#475569',
  stroke:    '#64748b',
  text:      '#64748b',
  textStrong:'#7c8ba1',
  ok:        '#10b981',
  warn:      '#f59e0b',
  crit:      '#ef4444',
}

/** Gradient + filter defs — include once per <svg>. */
export function Defs() {
  return (
    <defs>
      <linearGradient id="simMetal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#cbd5e1" />
        <stop offset="55%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <linearGradient id="simCoil" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#b8c4d4" />
        <stop offset="100%" stopColor="#8494a8" />
      </linearGradient>
      <linearGradient id="simVessel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#aab8c8" />
        <stop offset="50%" stopColor="#d4dde6" />
        <stop offset="100%" stopColor="#8a99ac" />
      </linearGradient>
    </defs>
  )
}

// ── Pipe with animated refrigerant flow ─────────────────────────────────────────
interface PipeProps { d: string; color: string; w?: number; flowing?: boolean; speed?: number; dim?: boolean }
export function Pipe({ d, color, w = 3.5, flowing = true, speed = 1, dim = false }: PipeProps) {
  return (
    <g>
      <path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={dim ? 0.3 : 0.85} />
      {flowing && !dim && (
        <path d={d} stroke="#ffffff" strokeWidth={Math.max(1.1, w - 2.2)} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={0.5} strokeDasharray="3 9">
          <animate attributeName="stroke-dashoffset" from="24" to="0" dur={`${(1.1 / speed).toFixed(2)}s`} repeatCount="indefinite" />
        </path>
      )}
    </g>
  )
}

// ── Condenser / gas cooler fan ──────────────────────────────────────────────────
interface FanProps { x: number; y: number; r?: number; spinning?: boolean; failed?: boolean }
export function Fan({ x, y, r = 20, spinning = true, failed = false }: FanProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={r} fill={C.metal} fillOpacity={0.18} stroke={C.stroke} strokeWidth={1.4} />
      <circle r={r * 0.92} fill="none" stroke={C.stroke} strokeWidth={0.5} opacity={0.5} strokeDasharray="2 4" />
      <g>
        {[0, 120, 240].map(a => (
          <ellipse key={a} cx={0} cy={-r * 0.46} rx={r * 0.22} ry={r * 0.4} fill={C.metalDark} transform={`rotate(${a})`} />
        ))}
        <circle r={r * 0.17} fill="#334155" stroke="#94a3b8" strokeWidth={0.7} />
        {spinning && (
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.85s" repeatCount="indefinite" />
        )}
      </g>
      {failed && (
        <g>
          <circle r={r * 0.62} fill={C.crit} opacity={0.16} />
          <path d={`M${-r * 0.38},${-r * 0.38} L${r * 0.38},${r * 0.38} M${r * 0.38},${-r * 0.38} L${-r * 0.38},${r * 0.38}`}
            stroke={C.crit} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      )}
    </g>
  )
}

// ── Finned coil block (condenser / gas cooler body) ─────────────────────────────
interface CoilProps { x: number; y: number; w: number; h: number; fouled?: boolean; label?: string }
export function Coil({ x, y, w, h, fouled = false, label }: CoilProps) {
  const fins = Math.floor(w / 9)
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5} fill="url(#simCoil)" stroke={C.stroke} strokeWidth={1.4} />
      {Array.from({ length: fins }, (_, i) => (
        <line key={i} x1={x + 6 + i * 9} y1={y + 4} x2={x + 6 + i * 9} y2={y + h - 4} stroke={C.metalDark} strokeWidth={0.7} opacity={0.55} />
      ))}
      {fouled && <rect x={x} y={y} width={w} height={h} rx={5} fill="#92400e" opacity={0.32} />}
      {fouled && (
        <text x={x + w / 2} y={y + h + 12} textAnchor="middle" fontSize={8.5} fill={C.warn} fontWeight={600}>fouled coil</text>
      )}
      {label && <text x={x + w / 2} y={y - 6} textAnchor="middle" fontSize={9} fill={C.text} fontWeight={600}>{label}</text>}
    </g>
  )
}

// ── Compressor ─────────────────────────────────────────────────────────────────
export type CompVisStatus = 'run' | 'standby' | 'trip'
interface CompProps { x: number; y: number; w?: number; h?: number; label: string; sub?: string; status: CompVisStatus; amps?: number }
export function Comp({ x, y, w = 54, h = 46, label, sub, status, amps }: CompProps) {
  const led = status === 'run' ? C.ok : status === 'trip' ? C.crit : C.metal
  return (
    <g>
      {/* shell */}
      <rect x={x} y={y + 6} width={w} height={h - 6} rx={7} fill="url(#simMetal)" stroke={status === 'trip' ? C.crit : C.stroke} strokeWidth={status === 'trip' ? 1.8 : 1.3} />
      {/* head */}
      <rect x={x + w * 0.18} y={y} width={w * 0.64} height={10} rx={3} fill={C.metalDark} stroke={C.stroke} strokeWidth={0.8} />
      {/* status LED */}
      <circle cx={x + 9} cy={y + 15} r={3.2} fill={led}>
        {status === 'run' && <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />}
      </circle>
      <text x={x + w / 2 + 3} y={y + 18} textAnchor="middle" fontSize={9} fontWeight={700} fill="#1e293b">{label}</text>
      <text x={x + w / 2} y={y + 30} textAnchor="middle" fontSize={8} fill="#334155">
        {status === 'trip' ? 'TRIPPED' : status === 'standby' ? 'STANDBY' : amps !== undefined ? `${amps.toFixed(1)} A` : 'RUN'}
      </text>
      {sub && <text x={x + w / 2} y={y + 40} textAnchor="middle" fontSize={7.5} fill="#475569">{sub}</text>}
    </g>
  )
}

// ── Vessel (receiver / flash tank) with liquid level ────────────────────────────
interface VesselProps { x: number; y: number; w: number; h: number; level: number; label?: string; liquidColor?: string }
export function Vessel({ x, y, w, h, level, label, liquidColor = '#f59e0b' }: VesselProps) {
  const id = useId().replace(/[:]/g, '')
  const lvl = Math.min(0.95, Math.max(0.04, level))
  const liqH = (h - 8) * lvl
  return (
    <g>
      <clipPath id={`vclip${id}`}>
        <rect x={x + 2.5} y={y + 2.5} width={w - 5} height={h - 5} rx={Math.min(12, w / 2 - 3)} />
      </clipPath>
      <rect x={x} y={y} width={w} height={h} rx={Math.min(14, w / 2)} fill="url(#simVessel)" stroke={C.stroke} strokeWidth={1.5} />
      <g clipPath={`url(#vclip${id})`}>
        <rect x={x} y={y + h - 4 - liqH} width={w} height={liqH + 4} fill={liquidColor} opacity={0.6}>
          <animate attributeName="y" values={`${y + h - 4 - liqH};${y + h - 6 - liqH};${y + h - 4 - liqH}`} dur="3.4s" repeatCount="indefinite" />
        </rect>
      </g>
      {/* sight glass ticks */}
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1={x + w} y1={y + h * t} x2={x + w + 4} y2={y + h * t} stroke={C.stroke} strokeWidth={1} opacity={0.6} />
      ))}
      {label && <text x={x + w / 2} y={y + h + 13} textAnchor="middle" fontSize={9} fill={C.text} fontWeight={600}>{label}</text>}
    </g>
  )
}

// ── Valve (bow-tie symbol) ──────────────────────────────────────────────────────
export type ValveVisState = 'auto' | 'closed' | 'open'
interface ValveProps { x: number; y: number; label?: string; state?: ValveVisState; labelBelow?: boolean }
export function Valve({ x, y, label, state = 'auto', labelBelow = false }: ValveProps) {
  const fill = state === 'closed' ? C.crit : state === 'open' ? '#22c55e' : C.metalDark
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M-10,-7 L0,0 L-10,7 Z" fill={fill} stroke={C.stroke} strokeWidth={0.8} />
      <path d="M10,-7 L0,0 L10,7 Z" fill={fill} stroke={C.stroke} strokeWidth={0.8} />
      <line x1={0} y1={0} x2={0} y2={-10} stroke={C.stroke} strokeWidth={1.6} />
      <circle cx={0} cy={-12} r={3.4} fill={fill} stroke={C.stroke} strokeWidth={0.8} />
      {label && (
        <text x={0} y={labelBelow ? 19 : -19} textAnchor="middle" fontSize={8.5} fill={C.text} fontWeight={600}>{label}</text>
      )}
      {state !== 'auto' && (
        <text x={0} y={labelBelow ? 29 : 30} textAnchor="middle" fontSize={8} fontWeight={700} fill={state === 'closed' ? C.crit : '#16a34a'}>
          stuck {state}
        </text>
      )}
    </g>
  )
}

// ── Display case ────────────────────────────────────────────────────────────────
interface CaseProps {
  x: number; y: number; w?: number; h?: number
  label: string; temp: number; tempColor: string; sub?: string
  doors?: number; doorsOpen?: boolean; defrost?: boolean; frozen?: boolean
  iced?: boolean; fanOut?: boolean
}
export function CaseBox({ x, y, w = 130, h = 66, label, temp, tempColor, sub, doors = 4, doorsOpen = false, defrost = false, frozen = false, iced = false, fanOut = false }: CaseProps) {
  const dw = (w - 12) / doors
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={C.metal} fillOpacity={0.13} stroke={C.stroke} strokeWidth={1.3} />
      {/* doors */}
      {Array.from({ length: doors }, (_, i) => {
        const dx = x + 6 + i * dw
        const open = doorsOpen && i === doors - 1
        return open ? (
          <g key={i}>
            <line x1={dx} y1={y + h - 6} x2={dx + dw * 0.8} y2={y + h - 16} stroke={C.warn} strokeWidth={1.6} />
            <text x={dx + dw / 2} y={y + h + 11} textAnchor="middle" fontSize={7.5} fill={C.warn} fontWeight={700}>door open</text>
          </g>
        ) : (
          <rect key={i} x={dx} y={y + 22} width={dw - 3} height={h - 28} rx={2} fill="none" stroke={C.stroke} strokeWidth={0.8} opacity={0.55} />
        )
      })}
      <text x={x + 8} y={y + 14} fontSize={9} fontWeight={700} fill={C.text}>{frozen ? '❄ ' : ''}{label}</text>
      <text x={x + w - 8} y={y + 15} textAnchor="end" fontSize={11.5} fontWeight={800} fill={tempColor}>{temp.toFixed(0)}°F</text>
      {sub && <text x={x + 8} y={y + h - 8} fontSize={7.5} fill={C.text} opacity={0.85}>{sub}</text>}
      {defrost && (
        <g>
          {[0, 1, 2].map(i => (
            <path key={i} d={`M${x + w * 0.3 + i * 14},${y + h - 12} q3,-5 0,-10 q-3,-5 0,-10`} stroke="#fb923c" strokeWidth={1.5} fill="none" opacity={0.9}>
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.8s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
            </path>
          ))}
          <text x={x + w * 0.3 + 14} y={y + h + 11} textAnchor="middle" fontSize={7.5} fill="#fb923c" fontWeight={700}>defrost</text>
        </g>
      )}
      {iced && (
        <g>
          <path d={`M${x + 8},${y + h - 11} ${Array.from({ length: Math.floor((w - 20) / 10) }, () => 'l5,-5 l5,5').join(' ')}`}
            stroke="#22d3ee" strokeWidth={1.6} fill="none" strokeLinejoin="round" />
          <text x={x + 30} y={y + h + 11} textAnchor="middle" fontSize={7.5} fill="#0891b2" fontWeight={700}>coil iced</text>
        </g>
      )}
      {fanOut && (
        <g transform={`translate(${x + w - 17},${y + h - 16})`}>
          <circle r={7} fill="none" stroke={C.crit} strokeWidth={1.2} />
          {[0, 120, 240].map(a => (
            <ellipse key={a} cx={0} cy={-3} rx={1.6} ry={2.8} fill={C.crit} opacity={0.7} transform={`rotate(${a})`} />
          ))}
          <path d="M-5,-5 L5,5 M5,-5 L-5,5" stroke={C.crit} strokeWidth={1.8} strokeLinecap="round" />
          <text x={0} y={20} textAnchor="middle" fontSize={7.5} fill={C.crit} fontWeight={700}>evap fan</text>
        </g>
      )}
    </g>
  )
}

// ── Small reading label tag ─────────────────────────────────────────────────────
interface TagProps { x: number; y: number; text: string; color: string; anchor?: 'start' | 'middle' | 'end' }
export function Tag({ x, y, text, color, anchor = 'middle' }: TagProps) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={9.5} fontWeight={700} fill={color}>{text}</text>
  )
}

// ── Tap-to-inspect hotspot — invisible hit area + selection ring ────────────────
// Rendered in a layer above the artwork so existing drawing code stays untouched.
interface HotspotProps { x: number; y: number; w: number; h: number; selected: boolean; onSelect: () => void }
export function Hotspot({ x, y, w, h, selected, onSelect }: HotspotProps) {
  return (
    <g onClick={onSelect} style={{ cursor: 'pointer' }}>
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={8}
        fill="transparent"
        stroke={selected ? '#3b82f6' : 'transparent'}
        strokeWidth={1.8}
        strokeDasharray={selected ? '5 3' : undefined} />
    </g>
  )
}
