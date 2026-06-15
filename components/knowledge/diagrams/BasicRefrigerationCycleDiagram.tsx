'use client'

// Loop diagram of the basic vapor-compression refrigeration cycle, with the
// refrigerant state (superheated vapor / subcooled liquid / etc.) called out
// on each connecting line — ties the cycle stages to the terminology used
// throughout the Refrigeration Fundamentals and Components lessons.
export function BasicRefrigerationCycleDiagram() {
  return (
    <div className="my-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
        The Basic Refrigeration Cycle
      </p>
      <svg viewBox="0 0 480 300" className="w-full max-w-lg mx-auto">
        {/* Components */}
        <rect x="170" y="15" width="140" height="40" rx="6" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
        <text x="240" y="40" textAnchor="middle" fontSize="14" fontWeight="600" fill="#334155">Condenser</text>

        <rect x="20" y="125" width="140" height="40" rx="6" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
        <text x="90" y="150" textAnchor="middle" fontSize="14" fontWeight="600" fill="#334155">Metering Device</text>

        <rect x="170" y="245" width="140" height="40" rx="6" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
        <text x="240" y="270" textAnchor="middle" fontSize="14" fontWeight="600" fill="#334155">Evaporator</text>

        <rect x="320" y="125" width="140" height="40" rx="6" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" />
        <text x="390" y="150" textAnchor="middle" fontSize="14" fontWeight="600" fill="#334155">Compressor</text>

        {/* Loop arrows */}
        <defs>
          <marker id="cycleArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#94a3b8" />
          </marker>
        </defs>
        {/* Compressor -> Condenser (discharge) */}
        <path d="M390 125 V70 H310" fill="none" stroke="#ef4444" strokeWidth="3" markerEnd="url(#cycleArrow)" />
        <text x="350" y="65" textAnchor="middle" fontSize="10" fill="#64748b">High-pressure</text>
        <text x="350" y="78" textAnchor="middle" fontSize="10" fill="#64748b">superheated vapor</text>

        {/* Condenser -> Metering Device (liquid line) */}
        <path d="M170 35 H90 V125" fill="none" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#cycleArrow)" />
        <text x="130" y="65" textAnchor="middle" fontSize="10" fill="#64748b">High-pressure</text>
        <text x="130" y="78" textAnchor="middle" fontSize="10" fill="#64748b">subcooled liquid</text>

        {/* Metering Device -> Evaporator */}
        <path d="M90 165 V245 H170" fill="none" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#cycleArrow)" />
        <text x="130" y="225" textAnchor="middle" fontSize="10" fill="#64748b">Low-pressure</text>
        <text x="130" y="238" textAnchor="middle" fontSize="10" fill="#64748b">liquid/vapor mix</text>

        {/* Evaporator -> Compressor (suction line) */}
        <path d="M310 265 H390 V165" fill="none" stroke="#06b6d4" strokeWidth="3" markerEnd="url(#cycleArrow)" />
        <text x="350" y="225" textAnchor="middle" fontSize="10" fill="#64748b">Low-pressure</text>
        <text x="350" y="238" textAnchor="middle" fontSize="10" fill="#64748b">superheated vapor</text>
      </svg>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
        Inside the evaporator and condenser, the refrigerant passes through a <strong>saturated</strong> liquid/vapor mixture
        (boiling or condensing at a constant temperature for a given pressure) before leaving as superheated vapor
        or subcooled liquid — the basis for superheat and subcooling measurements.
      </p>
    </div>
  )
}
