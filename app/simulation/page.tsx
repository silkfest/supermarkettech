'use client'

import { useRouter } from 'next/navigation'
import { FlaskConical, ChevronRight, Layers, Snowflake } from 'lucide-react'
import LearningTabBar from '@/components/layout/LearningTabBar'

const RACKS = [
  {
    href: '/simulation/parallel-rack',
    icon: Layers,
    accent: 'blue',
    name: 'Hussmann Parallel Rack',
    refrigerant: 'R-404A · MT + LT Booster',
    description:
      'Classic parallel rack — 4 Copeland scrolls on medium temp with a 2-compressor low-temp booster. ' +
      'Full gauge set, sight glass, oil differential, and condenser readings.',
    stats: ['22 fault toggles', '9 guided scenarios', 'Instructor reveal', 'Adjustable refrigerant & setpoints'],
    source: 'Based on Hussmann Parallel Rack Systems I/O Manual',
  },
  {
    href: '/simulation/protocol-rack-a',
    icon: Snowflake,
    accent: 'violet',
    name: 'Hussmann Protocol HE Rack — Unit A',
    refrigerant: 'R-448A · Low Temp',
    description:
      'Distributed Protocol unit modeled on a real store install — 6 Copeland EVI scrolls with digital ' +
      'lead modulation serving 9 frozen-food circuits, each with its own suction and superheat readings.',
    stats: ['Per-circuit case temps & SH', 'Digital scroll modulation', '7 guided scenarios', 'Time-of-day load curve'],
    source: "Modeled on Fortino's Mall Rd · Remote Header A",
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
} as const

export default function SimulatorSelectPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">

      {/* Header */}
      <div className="safe-top bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-400">Cold</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white">IQ</span>
        </div>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Rack Simulator</span>
      </div>

      <LearningTabBar />

      <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-5">

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

        <div className="grid gap-4 sm:grid-cols-2">
          {RACKS.map(rack => {
            const a = ACCENT[rack.accent as keyof typeof ACCENT]
            const Icon = rack.icon
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
                  {rack.stats.map(s => (
                    <li key={s} className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-500 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>

                <p className="text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-2.5">
                  {rack.source}
                </p>
              </button>
            )
          })}
        </div>

      </div>
    </div>
  )
}
