'use client'
import { useState } from 'react'
import type { Measurement } from '@/lib/game/inspection/types'

/** InstrumentPanel's shared measurement surface: function, leads, then sampling.
 * Results are owned by the call, never by this disposable instrument view. */
export default function ToolInteraction({
  measurement,
  reading,
  onSample
}: {
  measurement: Measurement
  reading?: string
  onSample: (mode: string, terminals: string[]) => void
}) {
  const [mode, setMode] = useState('volts')
  const [terminals, setTerminals] = useState<string[]>([])
  return (
    <div className="rounded-xl border-2 border-amber-400 bg-slate-900 text-white p-3 space-y-3">
      <output
        aria-live="polite"
        className="block rounded bg-[#bccab0] text-slate-950 font-mono text-xl p-3 min-h-14"
      >
        {reading ?? '— — —'}
      </output>
      <p className="text-xs font-semibold">{measurement.label}</p>
      {measurement.mode && (
        <label className="block text-xs">
          Instrument function
          <select
            aria-label="Instrument function"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value)
              setTerminals([])
            }}
            className="block w-full bg-slate-700 rounded p-2 mt-1"
          >
            <option value="volts">V — voltage</option>
            <option value="ohms">Ω — resistance</option>
            <option value="amps">A~ — clamp current</option>
          </select>
        </label>
      )}
      {measurement.terminals && (
        <div className="grid grid-cols-2 gap-2">
          {measurement.terminals.map((t, i) => (
            <button
              key={t}
              aria-pressed={terminals.includes(t)}
              onClick={() =>
                setTerminals((old) =>
                  old.includes(t) ? old.filter((v) => v !== t) : [...old, t]
                )
              }
              className={`min-h-12 p-2 border-2 rounded text-xs ${terminals.includes(t) ? 'border-emerald-400 bg-emerald-900' : i === 0 ? 'border-red-400' : 'border-slate-400'}`}
            >
              {measurement.mode === 'amps'
                ? i === 0
                  ? 'Position around: '
                  : 'Close: '
                : i === 0
                  ? 'Red lead: '
                  : 'Black lead: '}
              {t}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => onSample(mode, terminals)}
        className="w-full min-h-11 bg-amber-400 text-slate-950 font-bold rounded text-xs"
      >
        {measurement.mode ? 'Read instrument' : 'Place probe and sample'}
      </button>
    </div>
  )
}
