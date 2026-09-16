'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Gauge, CheckCircle2, XCircle, Thermometer, ArrowRight } from 'lucide-react'
import { REFRIGERANTS, satTemp, type RefrigerantId } from '@/lib/game/pt'

interface Props {
  refrigerant: RefrigerantId
  psig: number
  lineTempF: number
  ask: 'superheat' | 'subcooling'
  prompt: string
  /** Minutes burned by a wrong reading. */
  onWrongAttempt: (minutes: number) => void
  onSolved: () => void
}

/** Blends below this much glide are read off one column in the field. */
const GLIDE_MATTERS = 2
const TOLERANCE = 1.5

export default function PTChartTool({ refrigerant, psig, lineTempF, ask, prompt, onWrongAttempt, onSolved }: Props) {
  const ref = REFRIGERANTS[refrigerant]
  // Superheat is read off dew, subcooling off bubble. That is the whole lesson.
  const side: 'bubble' | 'dew' = ask === 'subcooling' ? 'bubble' : 'dew'
  const askColumn = ref.glide >= GLIDE_MATTERS
  const sat = satTemp(refrigerant, psig, side)
  const answer = ask === 'superheat' ? lineTempF - sat : sat - lineTempF

  const [column, setColumn] = useState<'bubble' | 'dew' | null>(askColumn ? null : side)
  const [entry, setEntry] = useState('')
  const [tries, setTries] = useState(0)
  const [feedback, setFeedback] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)
  const [solved, setSolved] = useState(false)
  const rowsRef = useRef<HTMLDivElement>(null)

  const col = column === 'bubble' ? 1 : 2
  // The pair of rows the gauge reading falls between, in the column they chose.
  const bracket = useMemo(() => {
    if (!column) return null
    const t = ref.table
    for (let i = 1; i < t.length; i++) if (psig <= t[i][col]) return [i - 1, i]
    return [t.length - 2, t.length - 1]
  }, [column, col, psig, ref.table])

  const shownSat = column ? satTemp(refrigerant, psig, column) : null

  useEffect(() => {
    if (!bracket || !rowsRef.current) return
    const el = rowsRef.current.children[bracket[0]] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [bracket])

  function pickColumn(c: 'bubble' | 'dew') {
    if (c === side) {
      setColumn(c)
      setFeedback({ tone: 'good', text: ask === 'superheat'
        ? `Right — superheat comes off the dew column. On ${ref.name} the two are ${ref.glide} °F apart, so the other column would put you that far out.`
        : `Right — subcooling comes off the bubble column, where the liquid starts to flash.` })
    } else {
      setTries(t => t + 1)
      onWrongAttempt(3)
      setFeedback({ tone: 'bad', text: ask === 'superheat'
        ? 'That is the liquid side. Superheat is vapour leaving the coil, so you want the dew column.'
        : 'That is the vapour side. Subcooling is liquid, so you want the bubble column.' })
    }
  }

  function submit() {
    const v = Number(entry)
    if (entry.trim() === '' || Number.isNaN(v)) return
    if (Math.abs(v - answer) <= TOLERANCE) {
      setSolved(true)
      setFeedback({ tone: 'good', text: `${answer.toFixed(1)} °F. That is the number that decides this call.` })
      onSolved()
      return
    }
    const next = tries + 1
    setTries(next)
    onWrongAttempt(5)
    if (next >= 3) {
      setSolved(true)
      setFeedback({ tone: 'bad', text: `It is ${answer.toFixed(1)} °F — ${lineTempF.toFixed(1)} °F line against ${sat.toFixed(1)} °F saturation. Take the reading and move on; the time is already spent.` })
      onSolved()
      return
    }
    const hint = Math.abs(v - Math.abs(answer)) <= TOLERANCE
      ? 'Right size, wrong sign — check which way round you subtracted.'
      : `Saturation at ${psig} psig is ${shownSat?.toFixed(1)} °F. ${ask === 'superheat' ? 'Line temperature minus saturation.' : 'Saturation minus line temperature.'}`
    setFeedback({ tone: 'bad', text: hint })
  }

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-slate-700 dark:text-slate-300 leading-relaxed">{prompt}</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><Gauge size={10} /> Gauge</p>
          <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white leading-tight">
            {psig.toFixed(1)}<span className="text-[10px] font-medium ml-0.5 text-slate-400">psig</span>
          </p>
        </div>
        <div className="px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><Thermometer size={10} /> Line temperature</p>
          <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white leading-tight">
            {lineTempF.toFixed(1)}<span className="text-[10px] font-medium ml-0.5 text-slate-400">°F</span>
          </p>
        </div>
      </div>

      {/* Step 1 — which column, on a blend where it matters */}
      {askColumn && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            1 · {ref.name} glides {ref.glide} °F — which column?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['bubble', 'dew'] as const).map(c => (
              <button key={c} onClick={() => pickColumn(c)} disabled={column !== null}
                className={`px-3 py-2 rounded-lg border text-[12px] font-medium transition-colors ${
                  column === c ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  : column !== null ? 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:border-blue-400'}`}>
                {c === 'bubble' ? 'Bubble — liquid' : 'Dew — vapour'}
              </button>
            ))}
          </div>
        </div>
      )}
      {!askColumn && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
          {ref.glide === 0
            ? `${ref.name} is a single component — bubble and dew are the same number, so there is only one column to read.`
            : `${ref.name} glides only ${ref.glide} °F, so the field reads it off one column.`}
        </p>
      )}

      {/* Step 2 — the chart */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {askColumn ? '2' : '1'} · Find {psig.toFixed(1)} psig on the chart
        </p>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="grid grid-cols-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 px-2 py-1">
            <span>°F</span>
            <span className={`text-right ${column === 'bubble' ? 'text-blue-600 dark:text-blue-400' : ''}`}>Bubble</span>
            <span className={`text-right ${column === 'dew' ? 'text-blue-600 dark:text-blue-400' : ''}`}>Dew</span>
          </div>
          <div ref={rowsRef} className="max-h-40 overflow-y-auto">
            {ref.table.map((row, i) => {
              const inBracket = bracket ? i === bracket[0] || i === bracket[1] : false
              return (
                <div key={row[0]} className={`grid grid-cols-3 px-2 py-0.5 text-[11px] tabular-nums ${
                  inBracket ? 'bg-blue-50 dark:bg-blue-500/15 font-semibold text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'}`}>
                  <span>{row[0]}</span>
                  <span className={`text-right ${column === 'dew' ? 'opacity-40' : ''}`}>{row[1].toFixed(1)}</span>
                  <span className={`text-right ${column === 'bubble' ? 'opacity-40' : ''}`}>{row[2].toFixed(1)}</span>
                </div>
              )
            })}
          </div>
        </div>
        {shownSat !== null && (
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Between those rows, {psig.toFixed(1)} psig is a saturation temperature of{' '}
            <b className="text-slate-900 dark:text-white tabular-nums">{shownSat.toFixed(1)} °F</b>.
          </p>
        )}
      </div>

      {/* Step 3 — the arithmetic */}
      {column !== null && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {askColumn ? '3' : '2'} · {ask === 'superheat' ? 'Superheat' : 'Subcooling'}
          </p>
          <div className="flex gap-2">
            <input
              type="number" step="0.1" inputMode="decimal" value={entry} disabled={solved}
              onChange={e => setEntry(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="°F"
              className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white tabular-nums focus:outline-none focus:border-blue-400 disabled:opacity-60" />
            <button onClick={submit} disabled={solved || entry.trim() === ''}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold">
              Read it <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-[12px] ${feedback.tone === 'good'
          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
          : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-200'}`}>
          {feedback.tone === 'good' ? <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" /> : <XCircle size={13} className="flex-shrink-0 mt-0.5" />}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  )
}
