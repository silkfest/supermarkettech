'use client'
import { useState } from 'react'
import { X, Zap, Gauge, CheckCircle2, ArrowRight } from 'lucide-react'
import MeterBench from './MeterBench'
import PTChartTool from './PTChartTool'
import type { Check } from '@/lib/game/types'

interface Props {
  check: Check
  /** Ohming means dead-circuit work, so the bench stays shut until it is locked out. */
  needsLoto: boolean
  lotoDone: boolean
  onLoto: () => void
  /** Wrong readings and dead ends cost shift time, same as anything else. */
  onSpend: (minutes: number) => void
  /** The instrument gave up its answer — the check can complete. */
  onDone: () => void
  onClose: () => void
}

/** The check you have to actually perform. Sits over the call panel until the
 *  instrument gives you a number, then hands the finding back. */
export default function InstrumentPanel({ check, needsLoto, lotoDone, onLoto, onSpend, onDone, onClose }: Props) {
  const inst = check.instrument!
  const [solved, setSolved] = useState(false)
  const electrical = inst.kind === 'meter'

  return (
    <div className="absolute inset-0 z-30 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-3">
      <div className="w-full sm:max-w-xl max-h-full sm:max-h-[94%] flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-t-xl sm:rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-start gap-3"
          style={{ borderTopColor: electrical ? '#f59e0b' : '#06b6d4', borderTopWidth: 3 }}>
          <div className="min-w-0 flex-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white flex items-center gap-1 w-fit ${electrical ? 'bg-amber-500' : 'bg-cyan-500'}`}>
              {inst.kind === 'meter'
                ? <><Zap size={9} /> {inst.mode === 'ohms' ? 'METER — RESISTANCE' : 'METER — VOLTAGE'}</>
                : <><Gauge size={9} /> GAUGES + PT CHART</>}
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mt-1">{check.label}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{check.tool}</p>
          </div>
          <button onClick={onClose} className="p-1.5 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" title="Put the instrument away">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {inst.kind === 'meter' ? (
            <MeterBench inst={inst} needsLoto={needsLoto} lotoDone={lotoDone} onLoto={onLoto}
              onSpend={onSpend} onSolved={() => setSolved(true)} />
          ) : (
            <PTChartTool
              refrigerant={inst.refrigerant} psig={inst.psig} lineTempF={inst.lineTempF}
              ask={inst.ask} prompt={inst.prompt}
              onWrongAttempt={onSpend} onSolved={() => setSolved(true)} />
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          {solved ? (
            <button onClick={onDone}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
              <CheckCircle2 size={13} /> Take the reading <ArrowRight size={13} />
            </button>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
              {electrical ? 'Take your readings and call what they mean before you put the meter away.' : 'Work the chart. The clock is still running.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
