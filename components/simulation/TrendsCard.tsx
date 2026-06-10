'use client'
import { useEffect, useRef, useState } from 'react'
import { Activity } from 'lucide-react'

// ── Smoothed readings history ─────────────────────────────────────────────────
// The sims compute readings instantly from fault toggles. To teach trend-based
// diagnosis, this hook drifts displayed values toward their targets (first-order
// lag, ~15 s to settle) and keeps a rolling history for sparklines.

const TICK_MS = 1000
const SMOOTHING = 0.22          // fraction of remaining gap closed per tick
const HISTORY_LEN = 90          // ≈ 90 s of history

export interface TrendSpec {
  key: string
  label: string
  unit: string
  value: number                  // current target from the sim model
  decimals?: number
}

export function useTrendHistory(specs: TrendSpec[]) {
  const [history, setHistory] = useState<Record<string, number[]>>({})
  const targetsRef = useRef<Record<string, number>>({})
  targetsRef.current = Object.fromEntries(specs.map(s => [s.key, s.value]))

  useEffect(() => {
    const id = setInterval(() => {
      setHistory(prev => {
        const next: Record<string, number[]> = {}
        for (const [key, target] of Object.entries(targetsRef.current)) {
          const series = prev[key] ?? []
          const last = series.length > 0 ? series[series.length - 1] : target
          const smoothed = last + (target - last) * SMOOTHING
          next[key] = [...series, smoothed].slice(-HISTORY_LEN)
        }
        return next
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  return history
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ points, rising }: { points: number[]; rising: boolean | null }) {
  const W = 96, H = 28, PAD = 2
  if (points.length < 2) {
    return <svg width={W} height={H} className="flex-shrink-0"><line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" strokeDasharray="3 3" /></svg>
  }
  const min = Math.min(...points), max = Math.max(...points)
  const span = Math.max(max - min, 0.0001)
  const flat = max - min < 0.05 * Math.max(Math.abs(max), 1)
  const path = points
    .map((v, i) => {
      const x = PAD + (i / (points.length - 1)) * (W - PAD * 2)
      const y = H - PAD - ((v - min) / span) * (H - PAD * 2)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const colour = flat
    ? 'stroke-slate-400 dark:stroke-slate-500'
    : rising
      ? 'stroke-amber-500 dark:stroke-amber-400'
      : 'stroke-blue-500 dark:stroke-blue-400'
  return (
    <svg width={W} height={H} className="flex-shrink-0">
      <path d={path} fill="none" strokeWidth="1.5" className={colour} />
    </svg>
  )
}

// ── Trends card ───────────────────────────────────────────────────────────────
export default function TrendsCard({ specs, history }: { specs: TrendSpec[]; history: Record<string, number[]> }) {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={13} className="text-slate-500 dark:text-slate-400" />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Trends</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">last 90 s — readings drift toward new values</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
        {specs.map(spec => {
          const series = history[spec.key] ?? []
          const current = series.length > 0 ? series[series.length - 1] : spec.value
          const prev = series.length > 6 ? series[series.length - 6] : null
          const rising = prev === null ? null : current - prev > 0.05
          return (
            <div key={spec.key} className="flex items-center gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{spec.label}</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                  {current.toFixed(spec.decimals ?? 1)}
                  <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 ml-0.5">{spec.unit}</span>
                </p>
              </div>
              <Sparkline points={series} rising={rising} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
