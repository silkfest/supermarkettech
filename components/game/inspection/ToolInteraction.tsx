'use client'
import { useState } from 'react'
import type { Measurement } from '@/lib/game/inspection/types'

const FUNCTIONS = [
  { mode: 'volts', glyph: 'V', label: 'Voltage' },
  { mode: 'ohms', glyph: 'Ω', label: 'Resistance' },
  { mode: 'amps', glyph: 'A~', label: 'Clamp current' }
] as const

/** InstrumentPanel's shared measurement surface. Choosing the function is the
 * decision that matters — ohms on a live circuit is the mistake this teaches —
 * so that stays a real choice, while the leads go to the labelled points with
 * it rather than being toggled one at a time. Results are owned by the call. */
export default function ToolInteraction({
  measurement,
  reading,
  onSample
}: {
  measurement: Measurement
  reading?: string
  onSample: (mode: string, terminals: string[]) => void
}) {
  const [mode, setMode] = useState('')
  const needsMode = !!measurement.mode
  const terminals = measurement.terminals ? [...measurement.terminals] : []
  const clamp = mode === 'amps'
  const ready = !needsMode || !!mode
  return (
    <div className="rounded-xl border-2 border-amber-400 bg-slate-900 text-white p-3 space-y-3">
      <output
        aria-live="polite"
        className="block rounded bg-[#bccab0] text-slate-950 font-mono text-xl p-3 min-h-14"
      >
        {reading ?? '— — —'}
      </output>
      <p className="text-xs font-semibold">{measurement.label}</p>
      {needsMode && (
        <div role="radiogroup" aria-label="Instrument function" className="grid grid-cols-3 gap-2">
          {FUNCTIONS.map((f) => (
            <button
              key={f.mode}
              role="radio"
              aria-checked={mode === f.mode}
              aria-label={f.label}
              onClick={() => setMode(f.mode)}
              className={`min-h-12 rounded border-2 px-1 py-2 leading-tight ${mode === f.mode ? 'border-amber-300 bg-amber-400 text-slate-950' : 'border-slate-500 bg-slate-800 text-slate-200'}`}
            >
              <span className="block font-mono text-base font-bold">{f.glyph}</span>
              <span className="block text-[10px]">{f.label}</span>
            </button>
          ))}
        </div>
      )}
      {!!terminals.length && (
        <p className={`text-[11px] rounded border p-2 ${ready ? 'border-emerald-500 bg-emerald-950 text-emerald-200' : 'border-slate-600 text-slate-400'}`}>
          {ready ? (
            clamp ? (
              <>Jaw around <b>{terminals[0]}</b>, closed on <b>{terminals[1]}</b>.</>
            ) : (
              <>Red lead on <b>{terminals[0]}</b>, black on <b>{terminals[1]}</b>.</>
            )
          ) : (
            'Choose the instrument function and the leads go to the labelled test points.'
          )}
        </p>
      )}
      <button
        disabled={!ready}
        onClick={() => onSample(needsMode ? mode : '', terminals)}
        className="w-full min-h-12 bg-amber-400 text-slate-950 font-bold rounded text-sm disabled:opacity-40 disabled:bg-slate-700 disabled:text-slate-400"
      >
        {ready ? 'Read it' : 'Select a function first'}
      </button>
    </div>
  )
}
