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
      { id: 'metering-device', x: 60, y: 120 },
      { id: 'evaporator', x: 200, y: 210 },
      { id: 'compressor', x: 340, y: 120 },
    ],
    render: () => (
      <g>
        {/* Loop pipe */}
        <rect x="90" y="15" width="220" height="30" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        <rect x="20" y="95" width="80" height="50" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        <rect x="90" y="195" width="220" height="30" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        <rect x="300" y="95" width="80" height="50" rx="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="2" />
        {/* Connecting lines forming the loop with arrows */}
        <path d="M310 30 H340 V95" fill="none" stroke="#94a3b8" strokeWidth="3" markerEnd="url(#hsArrow)" />
        <path d="M340 145 V190 H310" fill="none" stroke="#ef4444" strokeWidth="3" markerEnd="url(#hsArrow)" />
        <path d="M90 210 H100" fill="none" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#hsArrow)" />
        <path d="M60 195 V145" fill="none" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#hsArrow)" />
        <path d="M60 95 V45 H90" fill="none" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#hsArrow)" />
        <defs>
          <marker id="hsArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
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
