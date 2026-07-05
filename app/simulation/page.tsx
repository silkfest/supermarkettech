'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, ChevronRight, Layers, Snowflake, Leaf, Trophy } from 'lucide-react'
import LearningTabBar from '@/components/layout/LearningTabBar'
import PageHeader from '@/components/PageHeader'

interface RackSummary { attempts: number; bestScore: number | null; avgScore: number | null; lastAt: string | null }

const RACKS = [
  {
    href: '/simulation/parallel-rack',
    rackKey: 'parallel-rack',
    icon: Layers,
    accent: 'blue',
    name: 'Hussmann Parallel Rack',
    refrigerant: 'R-404A · Medium Temp',
    description:
      'Classic MT parallel rack — 4 Copeland scrolls with oil separator, flooding valve + DDR head ' +
      'pressure control, receiver, sight glass, oil differential, and condenser readings.',
    stats: ['25 fault toggles', '12 scored scenarios + Mystery Fault', 'Field-readings analyzer', 'Adjustable refrigerant & setpoints'],
    source: 'Based on Hussmann Parallel Rack Systems I/O Manual',
  },
  {
    href: '/simulation/protocol-rack-a',
    rackKey: 'protocol-rack-a',
    icon: Snowflake,
    accent: 'violet',
    name: 'Hussmann Protocol HE Rack — Unit A',
    refrigerant: 'R-448A · Low Temp',
    description:
      'Distributed Protocol unit modeled on a real store install — 6 Copeland EVI scrolls with digital ' +
      'lead modulation serving 9 frozen-food circuits, each with its own suction and superheat readings.',
    stats: ['Per-circuit case temps & SH', 'Digital scroll modulation', '9 scored scenarios + Mystery Fault', 'Time-of-day load curve'],
    source: "Modeled on Fortino's Mall Rd · Remote Header A",
  },
  {
    href: '/simulation/co2-booster',
    rackKey: 'co2-booster',
    icon: Leaf,
    accent: 'emerald',
    name: 'CO2 Transcritical Booster',
    refrigerant: 'R-744 · MT + LT Booster',
    description:
      'Where the industry is heading — transcritical CO2 with a gas cooler, high pressure valve, flash tank, ' +
      'and flash gas bypass. Watch the rack flip between subcritical and transcritical as the weather changes.',
    stats: ['17 fault toggles', '8 scored scenarios + Mystery Fault', 'Transcritical / subcritical modes', 'Flash tank & relief valve dynamics'],
    source: 'R-744 booster architecture · gas cooler optimization curve',
  },
]

const ACCENT = {
  blue: {
    iconBox: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400',
    hover: 'hover:border-blue-400 dark:hover:border-blue-500',
    badge: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300',
  },
  violet: {
    iconBox: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-400',
    hover: 'hover:border-violet-400 dark:hover:border-violet-500',
    badge: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300',
  },
  emerald: {
    iconBox: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    hover: 'hover:border-emerald-400 dark:hover:border-emerald-500',
    badge: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  },
} as const

export default function SimulatorSelectPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<Record<string, RackSummary>>({})

  useEffect(() => {
    fetch('/api/simulator/attempts')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.summary) setSummary(data.summary) })
      .catch(err => console.error('Failed to load simulator attempt stats', err))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">

      {/* Header */}
      <PageHeader title="Rack Simulator" home={false} back={false} variant="learning" />

      <LearningTabBar />

      <div className="max-w-5xl mx-auto w-full px-4 py-6 space-y-5">

        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical size={16} className="text-blue-600 dark:text-blue-400" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Choose a rack</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pick the system you want to practice on. Toggle faults, watch the readings respond, and
            test yourself with guided scenarios — all in-browser, no live equipment.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RACKS.map(rack => {
            const a = ACCENT[rack.accent as keyof typeof ACCENT]
            const Icon = rack.icon
            const s = summary[rack.rackKey]
            return (
              <button
                key={rack.href}
                onClick={() => router.push(rack.href)}
                className={`text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 transition-all hover:shadow-md ${a.hover} flex flex-col`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${a.iconBox}`}>
                    <Icon size={18} />
                  </div>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 mt-2" />
                </div>

                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{rack.name}</h2>
                <span className={`inline-block self-start text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1.5 mb-2.5 ${a.badge}`}>
                  {rack.refrigerant}
                </span>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3 flex-1">
                  {rack.description}
                </p>

                <ul className="space-y-1 mb-3">
                  {rack.stats.map(st => (
                    <li key={st} className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500 flex-shrink-0" />
                      {st}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-slate-100 dark:border-slate-700 pt-2.5 space-y-1.5">
                  {s && s.attempts > 0 ? (
                    <div className="flex items-center gap-2">
                      {s.bestScore !== null && (
                        <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                          s.bestScore >= 90
                            ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400'
                            : s.bestScore >= 70
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                        }`}>
                          <Trophy size={9} />
                          {s.bestScore}%
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {s.attempts} run{s.attempts !== 1 ? 's' : ''}
                        {s.avgScore !== null && ` · avg ${s.avgScore}%`}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">No attempts yet</p>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{rack.source}</p>
                </div>
              </button>
            )
          })}
        </div>

      </div>
    </div>
  )
}
