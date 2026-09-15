'use client'
import { useState } from 'react'
import { HardHat, Play } from 'lucide-react'
import type { Character } from '@/lib/game/types'

const COLORS = [
  { hex: '#2563eb', name: 'Navy' },
  { hex: '#0d9488', name: 'Teal' },
  { hex: '#ea580c', name: 'Hi-vis' },
  { hex: '#7c3aed', name: 'Violet' },
  { hex: '#475569', name: 'Grey' },
]

const ROLES: { key: Character['role']; label: string; blurb: string }[] = [
  { key: 'apprentice', label: 'Apprentice', blurb: 'Up to 2 calls open at once, 6 calls a shift. Learn the systems.' },
  { key: 'journeyman', label: 'Journeyman', blurb: 'Up to 3 calls open, 9 a shift. Triage under pressure.' },
]

interface Props {
  initial: Character
  submitLabel?: string
  onStart: (c: Character) => void
  onCancel?: () => void
}

export default function CharacterSetup({ initial, submitLabel = 'Clock in', onStart, onCancel }: Props) {
  const [name, setName] = useState(initial.name)
  const [color, setColor] = useState(initial.color)
  const [role, setRole] = useState<Character['role']>(initial.role)

  return (
    <div className="max-w-md mx-auto w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: color }}>
          <HardHat size={22} />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white">Your tech</h1>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">Trade school first, then a gas station, then the whole supermarket.</p>
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Your name</span>
        <input id="cc-name" value={name} onChange={e => setName(e.target.value)} placeholder="What's on your shirt?" maxLength={24}
          className="w-full text-sm px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:border-blue-400" />
      </label>

      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Uniform</span>
        <div className="flex gap-2">
          {COLORS.map(c => (
            <button key={c.hex} onClick={() => setColor(c.hex)} title={c.name}
              className={`w-9 h-9 rounded-full border-2 transition-transform ${color === c.hex ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'}`}
              style={{ background: c.hex }} aria-label={c.name} />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Role</span>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map(r => (
            <button key={r.key} onClick={() => setRole(r.key)}
              className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${role === r.key
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}`}>
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{r.label}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{r.blurb}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700">
            Cancel
          </button>
        )}
        <button onClick={() => onStart({ name: name.trim() || 'Tech', color, role })}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
          <Play size={15} /> {submitLabel}
        </button>
      </div>
    </div>
  )
}
