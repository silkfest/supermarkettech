'use client'
import { Clock, DollarSign, MessageSquareWarning, Trophy, Navigation } from 'lucide-react'
import { clockLabel, SHIFT_LEN_MIN } from '@/lib/game/engine'
import { FAULT_BY_ID, SYSTEM_META } from '@/lib/game/faults'
import { EQUIPMENT } from '@/lib/game/store'
import { SYSTEM_COLOR } from './StoreMap'
import type { ActiveCall, CallResult } from '@/lib/game/types'

interface Props {
  elapsedMin: number
  shrink: number
  complaints: number
  results: CallResult[]
  calls: ActiveCall[]
  nearCallId: string | null
  onWalkTo: (callId: string) => void
  onOpen: (callId: string) => void
}

export default function ShiftHUD({ elapsedMin, shrink, complaints, results, calls, nearCallId, onWalkTo, onOpen }: Props) {
  const points = results.reduce((a, r) => a + r.points, 0)
  const pct = Math.min(100, (elapsedMin / SHIFT_LEN_MIN) * 100)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat icon={Clock} label="Shift" value={clockLabel(elapsedMin)} sub={`${Math.max(0, Math.round(SHIFT_LEN_MIN - elapsedMin))} min left`} tone="text-slate-900 dark:text-white" />
        <Stat icon={Trophy} label="Points" value={String(points)} sub={`${results.length} closed`} tone="text-emerald-600 dark:text-emerald-400" />
        <Stat icon={DollarSign} label="Shrink" value={`$${Math.round(shrink)}`} sub="product at risk" tone={shrink > 500 ? 'text-red-600 dark:text-red-400' : shrink > 150 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'} />
        <Stat icon={MessageSquareWarning} label="Complaints" value={String(complaints)} sub="from the store" tone={complaints > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'} />
      </div>
      <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div className="h-full bg-blue-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Open calls · {calls.length}</p>
        {calls.length === 0 ? (
          <p className="text-[12px] text-slate-500 dark:text-slate-400 italic">Quiet for now. Walk the floor.</p>
        ) : (
          <ul className="space-y-1.5">
            {calls.map(c => {
              const f = FAULT_BY_ID[c.faultId]
              const node = EQUIPMENT.find(e => e.id === c.equipmentId)!
              const age = Math.round(elapsedMin - c.spawnedAtMin)
              const near = nearCallId === c.id
              return (
                <li key={c.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: SYSTEM_COLOR[f.system] }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200 truncate">{node.label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{SYSTEM_META[f.system].label} · open {age} min{c.complained ? ' · complaint' : ''}{c.stage !== 'ticket' ? ' · in progress' : ''}</p>
                  </div>
                  {near ? (
                    <button onClick={() => onOpen(c.id)} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0">
                      {c.stage === 'ticket' ? 'Take it' : 'Resume'}
                    </button>
                  ) : (
                    <button onClick={() => onWalkTo(c.id)} className="text-[10px] font-medium px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400 flex items-center gap-1 flex-shrink-0">
                      <Navigation size={10} /> Walk
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, sub, tone }: { icon: typeof Clock; label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="px-2 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Icon size={9} />{label}</p>
      <p className={`text-[13px] font-bold tabular-nums leading-tight truncate ${tone}`}>{value}</p>
      <p className="text-[9px] text-slate-400 truncate">{sub}</p>
    </div>
  )
}
