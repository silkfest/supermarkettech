'use client'
import { useState } from 'react'
import { Zap, Lock, CheckCircle2, XCircle, Activity, ShieldAlert } from 'lucide-react'
import type { Instrument, Option } from '@/lib/game/types'

type MeterInstrument = Extract<Instrument, { kind: 'meter' }>

interface Props {
  inst: MeterInstrument
  /** This fault is electrical work, so the ohms bench will not open until it is dead. */
  needsLoto: boolean
  lotoDone: boolean
  onLoto: () => void
  /** Readings and wrong verdicts cost shift time. */
  onSpend: (minutes: number) => void
  onSolved: () => void
}

/** The meter, on the readings this call actually calls for. Take them, then say
 *  what they tell you — the verdict feeds the diagnosis, it is not the diagnosis. */
export default function MeterBench({ inst, needsLoto, lotoDone, onLoto, onSpend, onSolved }: Props) {
  const ohms = inst.mode === 'ohms'
  const [taken, setTaken] = useState<string[]>([])
  const [wrong, setWrong] = useState<string[]>([])
  const [feedback, setFeedback] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)
  const [solved, setSolved] = useState(false)

  // An ohmmeter across a live circuit reads through everything else on it and
  // usually ends the meter. The bench does not open until the power is off.
  const blocked = ohms && needsLoto && !lotoDone

  function take(id: string) {
    if (taken.includes(id) || blocked) return
    setTaken(t => [...t, id])
    onSpend(1)
  }

  function pick(v: Option) {
    if (solved) return
    if (v.correct) {
      setSolved(true)
      setFeedback({ tone: 'good', text: v.why })
      onSolved()
    } else {
      setWrong(w => [...w, v.id])
      onSpend(5)
      setFeedback({ tone: 'bad', text: v.why })
    }
  }

  return (
    <div className="space-y-3">
      {/* What state the circuit has to be in, and why */}
      <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-[12px] ${ohms
        ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
        : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200'}`}>
        {ohms ? <Lock size={13} className="flex-shrink-0 mt-0.5" /> : <Zap size={13} className="flex-shrink-0 mt-0.5" />}
        <span>
          <b>{ohms ? 'Resistance — circuit dead' : 'Voltage — circuit live'}.</b>{' '}
          {ohms
            ? 'Power off and locked out. An ohmmeter on a live circuit reads through everything else connected to it, and usually does not survive the experience.'
            : 'The equipment is running. One hand, know what you are touching, and read across the points rather than to ground where you can.'}
        </span>
      </div>

      <p className="text-[12.5px] text-slate-700 dark:text-slate-300 leading-relaxed">{inst.prompt}</p>

      {blocked ? (
        <div className="px-3 py-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 space-y-2">
          <p className="flex items-start gap-2 text-[12px] text-red-700 dark:text-red-200">
            <ShieldAlert size={13} className="flex-shrink-0 mt-0.5" />
            <span>You are about to put an ohmmeter on a circuit that is still energised. Lock it out and prove it dead first.</span>
          </p>
          <button onClick={onLoto}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold">
            <Lock size={12} /> Lock out, tag and verify dead
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            1 · Take your readings <span className="normal-case tracking-normal font-normal">— each one costs a minute</span>
          </p>
          {inst.points.map(pt => {
            const done = taken.includes(pt.id)
            return (
              <button key={pt.id} onClick={() => take(pt.id)} disabled={done}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${done
                  ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 cursor-default'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-400'}`}>
                <div className="flex items-center gap-2">
                  {done
                    ? <Activity size={12} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    : <span className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-500 flex-shrink-0" />}
                  <span className={`text-[12px] flex-1 ${done ? 'text-slate-600 dark:text-slate-300' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>{pt.label}</span>
                  {done && <span className="text-[13px] font-bold tabular-nums text-slate-900 dark:text-white flex-shrink-0">{pt.reading}</span>}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 ml-5">expect {pt.expect}</p>
              </button>
            )
          })}
        </div>
      )}

      {taken.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">2 · What do these readings tell you?</p>
          <div className="space-y-1.5">
            {inst.verdicts.map(v => {
              const isWrong = wrong.includes(v.id)
              const isRight = solved && v.correct
              return (
                <button key={v.id} onClick={() => pick(v)} disabled={isWrong || solved}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-[12px] transition-colors ${
                    isRight ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : isWrong ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 line-through cursor-default'
                    : solved ? 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-medium hover:border-blue-400 dark:hover:border-blue-400'}`}>
                  {v.label}
                </button>
              )
            })}
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
