'use client'
import { useMemo } from 'react'

export interface HotspotPoint { id: string; label: string }
interface MarkerLayout { id: string; x: number; y: number }
interface DiagramLayout { viewBox: string; markers: MarkerLayout[]; render: () => React.ReactNode }

// ── Diagram registry ────────────────────────────────────────────────────────────
// Each diagram defines fixed marker positions (percent of viewBox) and a background
// drawing. `hotspot_points` from the DB supplies the correct label for each marker id.
const DIAGRAMS: Record<string, DiagramLayout> = {
  'basic-cycle': {
    viewBox: '0 0 400 240',
    markers: [
      { id: 'condenser', x: 200, y: 30 },
      { id: 'compressor', x: 60, y: 120 },
      { id: 'evaporator', x: 200, y: 210 },
      { id: 'metering-device', x: 340, y: 120 },
    ],
    render: () => (
      <g>
        {/* Loop pipe */}
        <rect x="90" y="15" width="220" height="30" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        <rect x="20" y="95" width="80" height="50" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        <rect x="90" y="195" width="220" height="30" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        <rect x="300" y="95" width="80" height="50" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* Connecting lines forming the loop with arrows (clockwise:
            compressor → condenser → metering device → evaporator → compressor) */}
        {/* compressor → condenser (hot discharge) */}
        <path d="M60 95 V45 H90" fill="none" stroke="#ef4444" strokeWidth="3" markerEnd="url(#hsArrow)" />
        {/* condenser → metering device (subcooled liquid line) */}
        <path d="M310 30 H340 V95" fill="none" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#hsArrow)" />
        {/* metering device → evaporator (low-pressure mix) */}
        <path d="M340 145 V190 H310" fill="none" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#hsArrow)" />
        {/* evaporator → compressor (low-pressure suction vapor) */}
        <path d="M90 210 H60 V145" fill="none" stroke="#06b6d4" strokeWidth="3" markerEnd="url(#hsArrow)" />
        <defs>
          <marker id="hsArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#94a3b8" />
          </marker>
        </defs>
      </g>
    ),
  },

  // Parallel rack: high-side path (compressors → condenser → receiver → liquid header)
  // and low-side path (cases → suction manifold → compressors).
  'parallel-rack': {
    viewBox: '0 0 480 280',
    markers: [
      { id: 'compressors',     x: 60,  y: 140 },
      { id: 'condenser',       x: 200, y: 30  },
      { id: 'receiver',        x: 360, y: 30  },
      { id: 'liquid-header',   x: 420, y: 140 },
      { id: 'display-cases',   x: 300, y: 240 },
      { id: 'suction-manifold',x: 120, y: 240 },
    ],
    render: () => (
      <g>
        {/* Compressor bank */}
        <rect x="20"  y="110" width="80" height="60" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* Condenser */}
        <rect x="130" y="10"  width="140" height="40" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* Receiver */}
        <rect x="310" y="10"  width="100" height="40" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* Liquid header */}
        <rect x="390" y="110" width="60" height="60" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* Display cases */}
        <rect x="210" y="220" width="180" height="40" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* Suction manifold */}
        <rect x="60"  y="220" width="120" height="40" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* Hot gas: compressors → condenser */}
        <path d="M60 110 V50 H130" fill="none" stroke="#ef4444" strokeWidth="3" markerEnd="url(#prArrow)" />
        {/* condenser → receiver */}
        <path d="M270 30 H310" fill="none" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#prArrow)" />
        {/* receiver → liquid header */}
        <path d="M410 50 V110" fill="none" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#prArrow)" />
        {/* liquid header → display cases */}
        <path d="M420 170 V220 H390" fill="none" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#prArrow)" />
        {/* display cases → suction manifold */}
        <path d="M210 240 H180" fill="none" stroke="#06b6d4" strokeWidth="3" markerEnd="url(#prArrow)" />
        {/* suction manifold → compressors */}
        <path d="M60 240 V170 H60" fill="none" stroke="#06b6d4" strokeWidth="3" markerEnd="url(#prArrow)" />
        <defs>
          <marker id="prArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#94a3b8" />
          </marker>
        </defs>
      </g>
    ),
  },

  // Single-phase hermetic compressor terminal board: Common, Run, Start.
  // Markers sit on the three lugs; student drags the labels to identify each.
  'compressor-terminals': {
    viewBox: '0 0 320 220',
    markers: [
      { id: 'common', x: 80,  y: 130 },
      { id: 'run',    x: 160, y: 90  },
      { id: 'start',  x: 240, y: 130 },
    ],
    render: () => (
      <g>
        {/* Compressor dome (top cap) */}
        <ellipse cx="160" cy="170" rx="130" ry="50" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
        <rect x="30" y="130" width="260" height="50" fill="#e2e8f0" stroke="none" />
        {/* Terminal board plate */}
        <rect x="60" y="100" width="200" height="55" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* Label */}
        <text x="160" y="170" textAnchor="middle" fontSize="11" fill="#64748b">Hermetic Terminal Board</text>
        {/* Wiring stubs going into dome */}
        <line x1="80"  y1="155" x2="80"  y2="175" stroke="#374151" strokeWidth="2" />
        <line x1="160" y1="155" x2="160" y2="175" stroke="#374151" strokeWidth="2" />
        <line x1="240" y1="155" x2="240" y2="175" stroke="#374151" strokeWidth="2" />
        {/* Ohm-value hints (resistance between terminals) */}
        <text x="120" y="118" textAnchor="middle" fontSize="9" fill="#94a3b8">lowest Ω</text>
        <text x="200" y="118" textAnchor="middle" fontSize="9" fill="#94a3b8">mid Ω</text>
      </g>
    ),
  },

  // CO₂ booster system: LT boosters → flash tank → MT/main compressors → gas cooler → HPV → expansion.
  'co2-booster': {
    viewBox: '0 0 460 260',
    markers: [
      { id: 'lt-boosters',    x: 60,  y: 200 },
      { id: 'flash-tank',     x: 200, y: 200 },
      { id: 'mt-compressors', x: 60,  y: 80  },
      { id: 'gas-cooler',     x: 240, y: 30  },
      { id: 'hpv',            x: 380, y: 30  },
      { id: 'expansion',      x: 380, y: 200 },
    ],
    render: () => (
      <g>
        {/* LT boosters */}
        <rect x="20"  y="170" width="80" height="50" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* Flash tank */}
        <rect x="155" y="165" width="90" height="60" rx="10" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* MT / main compressors */}
        <rect x="20"  y="50"  width="80" height="50" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* Gas cooler */}
        <rect x="170" y="10"  width="140" height="40" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* HPV (high-pressure valve) */}
        <rect x="340" y="10"  width="80" height="40" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* Expansion / LT evaporators */}
        <rect x="340" y="170" width="80" height="50" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* LT boosters → flash tank suction */}
        <path d="M100 195 H155" fill="none" stroke="#06b6d4" strokeWidth="3" markerEnd="url(#co2Arrow)" />
        {/* Flash tank vapor → MT compressors */}
        <path d="M200 165 V100" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 3" markerEnd="url(#co2Arrow)" />
        <path d="M60 165 V100" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 3" />
        {/* MT compressors → gas cooler */}
        <path d="M60 50 V30 H170" fill="none" stroke="#ef4444" strokeWidth="3" markerEnd="url(#co2Arrow)" />
        {/* Gas cooler → HPV */}
        <path d="M310 30 H340" fill="none" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#co2Arrow)" />
        {/* HPV → flash tank */}
        <path d="M380 50 V165" fill="none" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#co2Arrow)" />
        {/* Flash tank liquid → expansion */}
        <path d="M245 225 H340" fill="none" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#co2Arrow)" />
        {/* Expansion → LT boosters (suction) */}
        <path d="M340 200 H100" fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="5 3" markerEnd="url(#co2Arrow)" />
        <defs>
          <marker id="co2Arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#94a3b8" />
          </marker>
        </defs>
      </g>
    ),
  },

  // Single-phase motor capacitor wiring: run cap, start cap, potential relay.
  'motor-capacitor': {
    viewBox: '0 0 360 240',
    markers: [
      { id: 'common',    x: 60,  y: 120 },
      { id: 'run',       x: 180, y: 50  },
      { id: 'start',     x: 300, y: 120 },
      { id: 'run-cap',   x: 180, y: 120 },
      { id: 'start-cap', x: 240, y: 190 },
      { id: 'relay',     x: 300, y: 190 },
    ],
    render: () => (
      <g>
        {/* Motor body */}
        <ellipse cx="180" cy="120" rx="50" ry="50" fill="#f1f5f9" stroke="#64748b" strokeWidth="2" />
        <text x="180" y="118" textAnchor="middle" fontSize="10" fontWeight="600" fill="#475569">Motor</text>
        <text x="180" y="130" textAnchor="middle" fontSize="9" fill="#64748b">C / R / S</text>
        {/* Common terminal (C) → left */}
        <line x1="130" y1="120" x2="88" y2="120" stroke="#374151" strokeWidth="2" />
        {/* Run terminal (R) → top */}
        <line x1="180" y1="70"  x2="180" y2="78" stroke="#374151" strokeWidth="2" />
        {/* Start terminal (S) → right */}
        <line x1="230" y1="120" x2="272" y2="120" stroke="#374151" strokeWidth="2" />
        {/* Run cap symbol */}
        <rect x="165" y="90" width="30" height="12" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
        <rect x="165" y="108" width="30" height="12" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
        {/* Start cap symbol */}
        <rect x="215" y="180" width="30" height="12" rx="2" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <rect x="215" y="198" width="30" height="12" rx="2" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        {/* Potential relay box */}
        <rect x="272" y="170" width="60" height="40" rx="4" fill="#f0fdf4" stroke="#10b981" strokeWidth="1.5" />
        <text x="302" y="192" textAnchor="middle" fontSize="9" fill="#065f46">Relay</text>
        {/* Start cap to relay wiring */}
        <line x1="245" y1="180" x2="272" y2="180" stroke="#374151" strokeWidth="1.5" />
        <line x1="245" y1="210" x2="272" y2="210" stroke="#374151" strokeWidth="1.5" />
        {/* Start terminal to start cap */}
        <path d="M300 120 V175" fill="none" stroke="#374151" strokeWidth="1.5" />
        <path d="M300 175 H245" fill="none" stroke="#374151" strokeWidth="1.5" />
        {/* Common to run cap bottom */}
        <path d="M60 120 H165 V120" fill="none" stroke="#374151" strokeWidth="1.5" />
        {/* Run terminal to run cap top */}
        <line x1="180" y1="70" x2="180" y2="90" stroke="#374151" strokeWidth="1.5" />
      </g>
    ),
  },

  // Where each diagnostic reading is taken on the loop. Same layout as basic-cycle,
  // but markers sit on the pipe segments (not the components) so students learn the
  // measurement location for head pressure, subcooling, superheat, and box temp.
  'measurement-points': {
    viewBox: '0 0 400 240',
    markers: [
      { id: 'head-pressure', x: 60,  y: 70 },   // discharge/hot-gas line
      { id: 'subcooling',    x: 340, y: 70 },   // liquid line
      { id: 'superheat',     x: 60,  y: 175 },  // suction line
      { id: 'box-temp',      x: 200, y: 210 },  // evaporator / case
    ],
    render: () => (
      <g>
        {/* Loop pipe */}
        <rect x="90" y="15" width="220" height="30" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        <rect x="20" y="95" width="80" height="50" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        <rect x="90" y="195" width="220" height="30" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        <rect x="300" y="95" width="80" height="50" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* Component labels */}
        <text x="200" y="34" textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="600" fill="#475569">Condenser</text>
        <text x="60"  y="120" textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill="#475569">Comp</text>
        <text x="200" y="214" textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="600" fill="#475569">Evaporator</text>
        <text x="340" y="120" textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill="#475569">TXV</text>
        {/* Flow lines (clockwise) */}
        <path d="M60 95 V45 H90" fill="none" stroke="#ef4444" strokeWidth="3" markerEnd="url(#hsArrow2)" />
        <path d="M310 30 H340 V95" fill="none" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#hsArrow2)" />
        <path d="M340 145 V190 H310" fill="none" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#hsArrow2)" />
        <path d="M90 210 H60 V145" fill="none" stroke="#06b6d4" strokeWidth="3" markerEnd="url(#hsArrow2)" />
        <defs>
          <marker id="hsArrow2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#94a3b8" />
          </marker>
        </defs>
      </g>
    ),
  },
}

interface HotspotDiagramProps {
  diagram: string
  points: HotspotPoint[]
  value: Record<string, string>
  onChange: (next: Record<string, string>) => void
  disabled?: boolean
  /** per-marker-id correctness, shown after submission */
  result?: Record<string, boolean>
  selectedWord: string | null
  onSelectWord: (word: string | null) => void
}

export default function HotspotDiagram({
  diagram, points, value, onChange, disabled, result, selectedWord, onSelectWord,
}: HotspotDiagramProps) {
  const layout = DIAGRAMS[diagram]

  const bank = useMemo(() => {
    const used = new Set(Object.values(value))
    return points.map(p => p.label).filter(label => !used.has(label))
  }, [points, value])

  if (!layout) {
    return <p className="text-sm text-red-600 dark:text-red-400">Unknown diagram: {diagram}</p>
  }

  function markerClick(markerId: string) {
    if (disabled) return
    const current = value[markerId]
    if (current) {
      // Unassign — return word to bank
      const next = { ...value }
      delete next[markerId]
      onChange(next)
      return
    }
    if (selectedWord) {
      onChange({ ...value, [markerId]: selectedWord })
      onSelectWord(null)
    }
  }

  function wordClick(word: string) {
    if (disabled) return
    onSelectWord(selectedWord === word ? null : word)
  }

  return (
    <div className="space-y-3">
      <svg viewBox={layout.viewBox} className="w-full max-w-md mx-auto bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700">
        {layout.render()}
        {layout.markers.map(m => {
          const assigned = value[m.id]
          const correctness = result?.[m.id]
          let fill = '#ffffff'
          let stroke = '#94a3b8'
          if (correctness === true) { fill = '#d1fae5'; stroke = '#10b981' }
          else if (correctness === false) { fill = '#fee2e2'; stroke = '#ef4444' }
          else if (assigned) { fill = '#dbeafe'; stroke = '#3b82f6' }
          return (
            <g key={m.id} onClick={() => markerClick(m.id)} className={disabled ? '' : 'cursor-pointer'}>
              <circle cx={m.x} cy={m.y} r={28} fill={fill} stroke={stroke} strokeWidth={2} opacity={0.95} />
              <text x={m.x} y={m.y} textAnchor="middle" dominantBaseline="middle" fontSize={assigned ? 10 : 14} fontWeight={600} fill="#334155">
                {assigned || '?'}
              </text>
            </g>
          )
        })}
      </svg>

      {!disabled && (
        <div className="flex flex-wrap gap-2 justify-center">
          {bank.length === 0 && <p className="text-xs text-slate-400">All labels placed. Tap a marker to remove a label.</p>}
          {bank.map(word => (
            <button
              key={word}
              onClick={() => wordClick(word)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedWord === word
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300'
              }`}
            >
              {word}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
