'use client'
import { Trophy, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react'
import { shiftGrade } from '@/lib/game/engine'
import { FAULT_BY_ID, SYSTEM_META } from '@/lib/game/faults'
import { EQUIPMENT } from '@/lib/game/store'
import { SYSTEM_COLOR } from './StoreMap'
import type { ActiveCall, CallResult, Character, SystemKey } from '@/lib/game/types'

interface Props {
  character: Character
  results: CallResult[]
  unfinished: ActiveCall[]
  shrink: number
  complaints: number
  isBest: boolean
  onAgain: () => void
}

const GRADE_TONE: Record<string, string> = {
  A: 'text-emerald-600 dark:text-emerald-400', B: 'text-emerald-600 dark:text-emerald-400',
  C: 'text-amber-600 dark:text-amber-400', D: 'text-red-600 dark:text-red-400', F: 'text-red-600 dark:text-red-400',
}

export default function ShiftReport({ character, results, unfinished, shrink, complaints, isBest, onAgain }: Props) {
  const g = shiftGrade(results, results.length + unfinished.length, complaints, shrink)
  const systems = (Object.keys(SYSTEM_META) as SystemKey[]).map(s => {
    const rs = results.filter(r => r.system === s)
    return { s, n: rs.length, avg: rs.length ? Math.round(rs.reduce((a, r) => a + r.points, 0) / rs.length) : null }
  })

  return (
    <div className="max-w-2xl mx-auto w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-4">
        <div className={`text-5xl font-black ${GRADE_TONE[g.grade]}`}>{g.grade}</div>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-slate-900 dark:text-white">Shift over, {character.name}.</h1>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">
            {g.total} pts of {g.possible} possible · {results.length} call{results.length !== 1 ? 's' : ''} closed
            {unfinished.length > 0 && `, ${unfinished.length} left open`}
          </p>
          {isBest && <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5"><Trophy size={11} /> New personal best</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Tile label="Earned" value={`${g.earned}`} />
        <Tile label="Shrink" value={`$${Math.round(shrink)}`} tone={shrink > 500 ? 'text-red-600 dark:text-red-400' : undefined} sub={`−${Math.round(shrink / 100)} pts`} />
        <Tile label="Complaints" value={`${complaints}`} tone={complaints > 0 ? 'text-red-600 dark:text-red-400' : undefined} sub={`−${complaints * 10} pts`} />
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">By system</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {systems.map(({ s, n, avg }) => (
            <div key={s} className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700" style={{ borderTopColor: SYSTEM_COLOR[s], borderTopWidth: 3 }}>
              <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">{SYSTEM_META[s].label}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{n === 0 ? 'no calls' : `${n} call${n > 1 ? 's' : ''} · avg ${avg}`}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Call log</p>
        <ul className="space-y-1.5">
          {results.map(r => {
            const f = FAULT_BY_ID[r.faultId]
            const node = EQUIPMENT.find(e => e.id === r.equipmentId)!
            return (
              <li key={r.callId} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{node.label} — {f.title}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{r.note || 'No note'}</p>
                </div>
                <span className="text-[12px] font-bold tabular-nums text-slate-700 dark:text-slate-300 flex-shrink-0">{r.points}</span>
              </li>
            )
          })}
          {unfinished.map(c => {
            const f = FAULT_BY_ID[c.faultId]
            const node = EQUIPMENT.find(e => e.id === c.equipmentId)!
            return (
              <li key={c.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                <AlertTriangle size={13} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{node.label} — {f.title}</p>
                  <p className="text-[10px] text-red-600 dark:text-red-300">Left open at end of shift. Answer: {f.causes.find(o => o.correct)?.label}</p>
                </div>
                <span className="text-[12px] font-bold tabular-nums text-red-600 dark:text-red-400 flex-shrink-0">0</span>
              </li>
            )
          })}
        </ul>
      </div>

      <button onClick={onAgain} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
        <RotateCcw size={14} /> Run another shift
      </button>
    </div>
  )
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="px-2 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${tone ?? 'text-slate-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-[9px] text-slate-400">{sub}</p>}
    </div>
  )
}
