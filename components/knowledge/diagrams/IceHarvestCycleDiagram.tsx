'use client'

export function IceHarvestCycleDiagram() {
  const steps = [
    { label: 'Water pump on\nCirculates water\nover evaporator', color: '#3b82f6', icon: '💧' },
    { label: 'Ice forms on\nevaporator plate\n(12–25 min)', color: '#0ea5e9', icon: '🧊' },
    { label: 'Thickness sensor\ntriggers harvest', color: '#8b5cf6', icon: '📡' },
    { label: 'Hot gas solenoid\nopens — warms\nevaporator', color: '#f59e0b', icon: '🔥' },
    { label: 'Ice releases,\nfalls into bin\n(2–5 min)', color: '#22c55e', icon: '⬇' },
    { label: 'Harvest ends —\nnew freeze\ncycle starts', color: '#3b82f6', icon: '🔄' },
  ]

  return (
    <div className="my-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
        Ice Machine — Harvest Cycle Sequence
      </p>
      <div className="flex items-center gap-1 flex-wrap justify-center">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="flex flex-col items-center w-20">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-sm border-2"
                style={{ borderColor: step.color, backgroundColor: step.color + '18' }}
              >
                <span style={{ fontSize: 22 }}>{step.icon}</span>
              </div>
              <p className="text-[9px] text-center text-slate-600 dark:text-slate-400 mt-1.5 leading-tight whitespace-pre-line">
                {step.label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <svg width="14" height="14" className="flex-shrink-0 mb-4">
                <path d="M2,7 L12,7 M8,3 L12,7 L8,11" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div>
          <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Manitowoc detection</p>
          <p>Water curtain bridge sensor — ice breaks water flow between evaporator and bin trough to trigger harvest</p>
        </div>
        <div>
          <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Hoshizaki detection</p>
          <p>Evaporator thermistor (TH2) — harvest triggers when TH2 reaches +7°C after hot gas warms the plate</p>
        </div>
      </div>
    </div>
  )
}
