'use client'
import React, { useId } from 'react'

// ── Shared SVG primitives for the rack schematics ──────────────────────────────
// Fixed mid-tone palette chosen to stay legible on both white (light mode) and
// slate-800 (dark mode) card backgrounds. Font sizes are deliberately generous:
// the wide layouts render at ~0.45× on phones, so anything under ~10 units
// becomes unreadable. No SVG filters — they're expensive on mobile GPUs.

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

/** Gradient defs — include once per <svg>. */
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
        <stop offset="0%" stopColor="#8a99ac" />
        <stop offset="30%" stopColor="#d4dde6" />
        <stop offset="55%" stopColor="#aab8c8" />
        <stop offset="100%" stopColor="#7e8da0" />
      </linearGradient>
      <linearGradient id="simCompBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d7dee8" />
        <stop offset="45%" stopColor="#a5b2c2" />
        <stop offset="100%" stopColor="#6b7a8e" />
      </linearGradient>
      {/* status LED glows — cheap radial gradients, no filters */}
      <radialGradient id="simGlowOk">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="simGlowCrit">
        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

// ── Pipe with casing + animated refrigerant flow ────────────────────────────────
interface PipeProps { d: string; color: string; w?: number; flowing?: boolean; speed?: number; dim?: boolean }
export function Pipe({ d, color, w = 4.5, flowing = true, speed = 1, dim = false }: PipeProps) {
  return (
    <g>
      {/* dark casing gives the pipe depth on both light and dark backgrounds */}
      <path d={d} stroke="#334155" strokeWidth={w + 2} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={dim ? 0.12 : 0.28} />
      <path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={dim ? 0.3 : 0.9} />
      {flowing && !dim && (
        <path d={d} stroke="#ffffff" strokeWidth={Math.max(1.3, w - 2.6)} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={0.55} strokeDasharray="4 10">
          <animate attributeName="stroke-dashoffset" from="28" to="0" dur={`${(1.1 / speed).toFixed(2)}s`} repeatCount="indefinite" />
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
      <circle r={r} fill="#1e293b" fillOpacity={0.10} stroke={C.stroke} strokeWidth={1.6} />
      <circle r={r * 0.92} fill="none" stroke={C.stroke} strokeWidth={0.6} opacity={0.5} strokeDasharray="2 4" />
      <g>
        {[0, 90, 180, 270].map(a => (
          <ellipse key={a} cx={0} cy={-r * 0.48} rx={r * 0.20} ry={r * 0.40} fill={C.metalDark} opacity={0.9} transform={`rotate(${a})`} />
        ))}
        <circle r={r * 0.18} fill="#334155" stroke="#94a3b8" strokeWidth={0.9} />
        {spinning && (
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="0.8s" repeatCount="indefinite" />
        )}
      </g>
      {failed && (
        <g>
          <circle r={r * 0.66} fill={C.crit} opacity={0.15} />
          <path d={`M${-r * 0.4},${-r * 0.4} L${r * 0.4},${r * 0.4} M${r * 0.4},${-r * 0.4} L${-r * 0.4},${r * 0.4}`}
            stroke={C.crit} strokeWidth={3} strokeLinecap="round" />
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
      <rect x={x} y={y} width={w} height={h} rx={6} fill="url(#simCoil)" stroke={C.stroke} strokeWidth={1.6} />
      {Array.from({ length: fins }, (_, i) => (
        <line key={i} x1={x + 6 + i * 9} y1={y + 4} x2={x + 6 + i * 9} y2={y + h - 4} stroke={C.metalDark} strokeWidth={0.8} opacity={0.5} />
      ))}
      {/* top highlight */}
      <rect x={x + 3} y={y + 2.5} width={w - 6} height={3} rx={1.5} fill="#ffffff" opacity={0.35} />
      {fouled && <rect x={x} y={y} width={w} height={h} rx={6} fill="#92400e" opacity={0.35} />}
      {fouled && (
        <text x={x + w / 2} y={y + h + 14} textAnchor="middle" fontSize={11} fill={C.warn} fontWeight={700}>fouled coil</text>
      )}
      {label && <text x={x + w / 2} y={y - 7} textAnchor="middle" fontSize={11.5} fill={C.text} fontWeight={700}>{label}</text>}
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
      <rect x={x} y={y + 7} width={w} height={h - 7} rx={8} fill="url(#simCompBody)" stroke={status === 'trip' ? C.crit : C.stroke} strokeWidth={status === 'trip' ? 2 : 1.4} />
      {/* shell highlight */}
      <rect x={x + 3} y={y + 10} width={w - 6} height={4} rx={2} fill="#ffffff" opacity={0.3} />
      {/* head */}
      <rect x={x + w * 0.16} y={y} width={w * 0.68} height={11} rx={3.5} fill={C.metalDark} stroke={C.stroke} strokeWidth={0.9} />
      {/* status LED + glow */}
      {status !== 'standby' && <circle cx={x + 10} cy={y + 17} r={8} fill={status === 'run' ? 'url(#simGlowOk)' : 'url(#simGlowCrit)'} />}
      <circle cx={x + 10} cy={y + 17} r={3.6} fill={led}>
        {status === 'run' && <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />}
      </circle>
      <text x={x + w / 2 + 4} y={y + 21} textAnchor="middle" fontSize={11} fontWeight={800} fill="#1e293b">{label}</text>
      <text x={x + w / 2} y={y + 34} textAnchor="middle" fontSize={10} fontWeight={600} fill={status === 'trip' ? '#7f1d1d' : '#1e293b'}>
        {status === 'trip' ? 'TRIPPED' : status === 'standby' ? 'STANDBY' : amps !== undefined ? `${amps.toFixed(1)} A` : 'RUN'}
      </text>
      {sub && <text x={x + w / 2} y={y + 44} textAnchor="middle" fontSize={9} fill="#334155">{sub}</text>}
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
      <rect x={x} y={y} width={w} height={h} rx={Math.min(14, w / 2)} fill="url(#simVessel)" stroke={C.stroke} strokeWidth={1.6} />
      <g clipPath={`url(#vclip${id})`}>
        <rect x={x} y={y + h - 4 - liqH} width={w} height={liqH + 4} fill={liquidColor} opacity={0.65}>
          <animate attributeName="y" values={`${y + h - 4 - liqH};${y + h - 6 - liqH};${y + h - 4 - liqH}`} dur="3.4s" repeatCount="indefinite" />
        </rect>
        {/* gloss stripe */}
        <rect x={x + w * 0.18} y={y + 3} width={w * 0.14} height={h - 6} rx={3} fill="#ffffff" opacity={0.25} />
      </g>
      {/* sight glass ticks */}
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1={x + w} y1={y + h * t} x2={x + w + 5} y2={y + h * t} stroke={C.stroke} strokeWidth={1.2} opacity={0.6} />
      ))}
      {label && <text x={x + w / 2} y={y + h + 15} textAnchor="middle" fontSize={11} fill={C.text} fontWeight={700}>{label}</text>}
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
      <path d="M-11,-8 L0,0 L-11,8 Z" fill={fill} stroke={C.stroke} strokeWidth={0.9} />
      <path d="M11,-8 L0,0 L11,8 Z" fill={fill} stroke={C.stroke} strokeWidth={0.9} />
      <line x1={0} y1={0} x2={0} y2={-11} stroke={C.stroke} strokeWidth={1.8} />
      <circle cx={0} cy={-13} r={3.8} fill={fill} stroke={C.stroke} strokeWidth={0.9} />
      {label && (
        <text x={0} y={labelBelow ? 22 : -21} textAnchor="middle" fontSize={11} fill={C.text} fontWeight={700}>{label}</text>
      )}
      {state !== 'auto' && (
        <text x={0} y={labelBelow ? 34 : 33} textAnchor="middle" fontSize={10} fontWeight={800} fill={state === 'closed' ? C.crit : '#16a34a'}>
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
      <rect x={x} y={y} width={w} height={h} rx={7} fill={C.metal} fillOpacity={0.14} stroke={C.stroke} strokeWidth={1.5} />
      {/* doors */}
      {Array.from({ length: doors }, (_, i) => {
        const dx = x + 6 + i * dw
        const open = doorsOpen && i === doors - 1
        return open ? (
          <g key={i}>
            <line x1={dx} y1={y + h - 6} x2={dx + dw * 0.8} y2={y + h - 18} stroke={C.warn} strokeWidth={2} />
            <text x={dx + dw / 2} y={y + h + 13} textAnchor="middle" fontSize={9.5} fill={C.warn} fontWeight={700}>door open</text>
          </g>
        ) : (
          <g key={i}>
            <rect x={dx} y={y + 24} width={dw - 3.5} height={h - 31} rx={2.5} fill={frozen ? '#67e8f9' : '#93c5fd'} opacity={0.13} />
            <rect x={dx} y={y + 24} width={dw - 3.5} height={h - 31} rx={2.5} fill="none" stroke={C.stroke} strokeWidth={0.9} opacity={0.6} />
          </g>
        )
      })}
      <text x={x + 8} y={y + 16} fontSize={11.5} fontWeight={800} fill={C.text}>{frozen ? '❄ ' : ''}{label}</text>
      <text x={x + w - 8} y={y + 17} textAnchor="end" fontSize={15} fontWeight={800} fill={tempColor}>{temp.toFixed(0)}°F</text>
      {sub && <text x={x + 8} y={y + h - 9} fontSize={9.5} fill={C.text} opacity={0.9}>{sub}</text>}
      {defrost && (
        <g>
          {[0, 1, 2].map(i => (
            <path key={i} d={`M${x + w * 0.3 + i * 14},${y + h - 12} q3,-5 0,-10 q-3,-5 0,-10`} stroke="#fb923c" strokeWidth={1.8} fill="none" opacity={0.9}>
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.8s" begin={`${i * 0.4}s`} repeatCount="indefinite" />
            </path>
          ))}
          <text x={x + w * 0.3 + 14} y={y + h + 13} textAnchor="middle" fontSize={9.5} fill="#fb923c" fontWeight={700}>defrost</text>
        </g>
      )}
      {iced && (
        <g>
          <path d={`M${x + 8},${y + h - 11} ${Array.from({ length: Math.floor((w - 20) / 10) }, () => 'l5,-5 l5,5').join(' ')}`}
            stroke="#22d3ee" strokeWidth={1.8} fill="none" strokeLinejoin="round" />
          <text x={x + 32} y={y + h + 13} textAnchor="middle" fontSize={9.5} fill="#0891b2" fontWeight={700}>coil iced</text>
        </g>
      )}
      {fanOut && (
        <g transform={`translate(${x + w - 18},${y + h - 17})`}>
          <circle r={7.5} fill="none" stroke={C.crit} strokeWidth={1.4} />
          {[0, 120, 240].map(a => (
            <ellipse key={a} cx={0} cy={-3} rx={1.7} ry={3} fill={C.crit} opacity={0.7} transform={`rotate(${a})`} />
          ))}
          <path d="M-5.5,-5.5 L5.5,5.5 M5.5,-5.5 L-5.5,5.5" stroke={C.crit} strokeWidth={2} strokeLinecap="round" />
          <text x={0} y={22} textAnchor="middle" fontSize={9.5} fill={C.crit} fontWeight={700}>evap fan</text>
        </g>
      )}
    </g>
  )
}

// ── Gauge pill — reading badge with background so values pop off the pipework ───
interface TagProps { x: number; y: number; text: string; color: string; anchor?: 'start' | 'middle' | 'end' }
export function Tag({ x, y, text, color, anchor = 'middle' }: TagProps) {
  const fs = 12
  const padX = 7
  const wEst = text.length * fs * 0.60 + padX * 2
  const rx = anchor === 'start' ? x - padX : anchor === 'end' ? x - wEst + padX : x - wEst / 2
  return (
    <g>
      <rect x={rx} y={y - fs + 1} width={wEst} height={fs + 7} rx={(fs + 7) / 2}
        fill="#64748b" fillOpacity={0.14} stroke={color} strokeOpacity={0.45} strokeWidth={1} />
      <text x={x} y={y + 3} textAnchor={anchor} fontSize={fs} fontWeight={800} fill={color}>{text}</text>
    </g>
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
        strokeWidth={2}
        strokeDasharray={selected ? '5 3' : undefined} />
    </g>
  )
}
