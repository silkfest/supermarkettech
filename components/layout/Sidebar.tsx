'use client'
import { useState } from 'react'
import { Plus, Thermometer, Zap, WrenchIcon, ShieldCheck, MessageSquare, AlertTriangle } from 'lucide-react'
import { cn, statusDot } from '@/lib/utils'
import type { Equipment, ChatMode } from '@/types'

const MODES: { id: ChatMode; label: string; icon: React.ReactNode }[] = [
  { id: 'ASK',         label: 'Ask the expert',  icon: <MessageSquare size={13}/> },
  { id: 'DIAGNOSE',    label: 'Fault diagnosis',  icon: <Thermometer size={13}/> },
  { id: 'ALARM',       label: 'Alarm lookup',     icon: <AlertTriangle size={13}/> },
  { id: 'MAINTENANCE', label: 'Maintenance log',  icon: <WrenchIcon size={13}/> },
  { id: 'COMPLIANCE',  label: 'Compliance check', icon: <ShieldCheck size={13}/> },
]

interface Props {
  equipment: Equipment[]
  selected: Equipment | null
  mode: ChatMode
  onSelect: (e: Equipment | null) => void
  onMode:   (m: ChatMode) => void
  onAdd:    () => void
}

export default function Sidebar({ equipment, selected, mode, onSelect, onMode, onAdd }: Props) {
  const alarmCount   = equipment.filter(e => e.status === 'ALARM').length
  const warningCount = equipment.filter(e => e.status === 'WARNING').length

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col bg-slate-50 border-r border-slate-200 overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-200">
        <div className="flex items-baseline gap-0.5">
          <span className="text-[17px] font-bold tracking-tight text-blue-600">Cold</span>
          <span className="text-[17px] font-bold tracking-tight text-slate-800">IQ</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">Refrigeration expert</p>
        {(alarmCount > 0 || warningCount > 0) && (
          <div className="flex gap-1.5 mt-2">
            {alarmCount   > 0 && <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">{alarmCount} alarm{alarmCount>1?'s':''}</span>}
            {warningCount > 0 && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">{warningCount} warning{warningCount>1?'s':''}</span>}
          </div>
        )}
      </div>

      {/* Modes */}
      <div className="px-2 pt-3 pb-1">
        <p className="px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Mode</p>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => onMode(m.id)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs transition-all mb-0.5',
              mode === m.id
                ? 'bg-white border border-slate-200 shadow-sm text-slate-900 font-medium'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            )}
          >
            <span className="opacity-60">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Equipment list */}
      <div className="flex-1 overflow-y-auto px-2 pt-2 min-h-0">
        <p className="px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Equipment</p>

        <button
          onClick={() => onSelect(null)}
          className={cn(
            'w-full text-left px-2 py-1.5 rounded-lg mb-1 text-xs transition-all',
            !selected ? 'bg-white border border-slate-200 shadow-sm text-slate-900 font-medium' : 'text-slate-500 hover:bg-slate-100'
          )}
        >
          General (no unit)
        </button>

        {equipment.map(eq => {
          const alarms = (eq.active_alarms ?? []).filter((a: any) => !a.resolved_at)
          return (
            <button
              key={eq.id}
              onClick={() => onSelect(eq)}
              className={cn(
                'w-full text-left px-2.5 py-2 rounded-lg mb-0.5 transition-all',
                selected?.id === eq.id
                  ? 'bg-white border border-slate-200 shadow-sm'
                  : 'hover:bg-slate-100'
              )}
            >
              <div className="flex items-start gap-2">
                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', statusDot(eq.status))} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate leading-tight">{eq.name}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{eq.manufacturer} {eq.model}</p>
                  {alarms.length > 0 && (
                    <p className="text-[10px] text-red-500 font-medium mt-0.5">
                      ⚠ {alarms.length} alarm{alarms.length>1?'s':''}
                    </p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Add equipment */}
      <div className="p-2 border-t border-slate-200">
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <Plus size={12}/> Add equipment
        </button>
      </div>
    </aside>
  )
}
