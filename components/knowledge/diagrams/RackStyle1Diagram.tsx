'use client'

export function RackStyle1Diagram() {
  return (
    <figure className="my-6">
      <figcaption className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Rack Style 1 — Standard Receiver Rack — Refrigerant Flow Path
      </figcaption>
      <svg
        viewBox="0 0 540 418"
        className="w-full max-w-xl mx-auto block border border-slate-200 rounded-lg bg-white"
        aria-label="Standard receiver rack refrigerant flow diagram"
      >
        <defs>
          <marker id="rk1-b" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#3b82f6" />
          </marker>
          <marker id="rk1-g" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#10b981" />
          </marker>
        </defs>

        {/* CONDENSER */}
        <rect x="120" y="12" width="300" height="48" rx="5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
        <text x="270" y="32" textAnchor="middle" fontSize="13" fontWeight="600" fill="#334155">CONDENSER</text>
        <text x="270" y="50" textAnchor="middle" fontSize="9" fill="#64748b">rooftop · air-cooled</text>

        {/* Condenser → Receiver */}
        <line x1="270" y1="60" x2="270" y2="96" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#rk1-b)" />
        <text x="278" y="82" fontSize="9" fill="#3b82f6">condensed liquid</text>

        {/* LIQUID RECEIVER — key highlighted component */}
        <rect x="50" y="96" width="440" height="70" rx="5" fill="#dbeafe" stroke="#2563eb" strokeWidth="2.5" />
        <text x="270" y="120" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1d4ed8">LIQUID RECEIVER</text>
        <text x="270" y="139" textAnchor="middle" fontSize="10" fill="#1e40af">In the main flow path — every drop of liquid passes through</text>
        <text x="270" y="155" textAnchor="middle" fontSize="10" fontWeight="600" fill="#15803d">Full receiver = NORMAL ✓</text>

        {/* Receiver → accessories */}
        <line x1="270" y1="166" x2="270" y2="202" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#rk1-b)" />
        <text x="278" y="188" fontSize="9" fill="#3b82f6">subcooled liquid · 10–15°F SC</text>

        {/* FILTER-DRIER */}
        <rect x="50" y="202" width="185" height="36" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
        <text x="143" y="218" textAnchor="middle" fontSize="11" fill="#475569">Filter-Drier</text>
        <text x="143" y="230" textAnchor="middle" fontSize="9" fill="#94a3b8">liquid line</text>

        <line x1="235" y1="220" x2="265" y2="220" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#rk1-b)" />

        {/* SIGHT GLASS */}
        <rect x="265" y="202" width="185" height="36" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
        <text x="358" y="218" textAnchor="middle" fontSize="11" fill="#475569">Sight Glass</text>
        <text x="358" y="230" textAnchor="middle" fontSize="9" fill="#94a3b8">moisture / flow</text>

        <line x1="270" y1="238" x2="270" y2="268" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#rk1-b)" />

        {/* LIQUID HEADER */}
        <rect x="30" y="268" width="480" height="32" rx="4" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5" />
        <text x="270" y="289" textAnchor="middle" fontSize="12" fontWeight="600" fill="#2563eb">LIQUID HEADER</text>

        {/* Three arrows down to cases */}
        <line x1="110" y1="300" x2="110" y2="322" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#rk1-b)" />
        <line x1="270" y1="300" x2="270" y2="322" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#rk1-b)" />
        <line x1="430" y1="300" x2="430" y2="322" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#rk1-b)" />
        <text x="88"  y="315" fontSize="8" fill="#64748b">LLS → TXV</text>
        <text x="248" y="315" fontSize="8" fill="#64748b">LLS → TXV</text>
        <text x="408" y="315" fontSize="8" fill="#64748b">LLS → TXV</text>

        {/* EVAPORATORS */}
        <rect x="30" y="322" width="480" height="42" rx="4" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
        <text x="270" y="344" textAnchor="middle" fontSize="12" fontWeight="600" fill="#15803d">EVAPORATORS — Cases</text>
        <text x="270" y="358" textAnchor="middle" fontSize="9" fill="#4ade80">LT circuits · MT circuits (EPR on MT)</text>

        {/* Suction arrow down */}
        <line x1="270" y1="364" x2="270" y2="392" stroke="#10b981" strokeWidth="2" markerEnd="url(#rk1-g)" />
        <text x="278" y="381" fontSize="9" fill="#16a34a">suction vapour</text>

        {/* Return annotation */}
        <text x="270" y="409" textAnchor="middle" fontSize="9" fill="#94a3b8">
          → Suction Header → Compressors → Oil Separator → Condenser (cycle repeats)
        </text>
      </svg>
    </figure>
  )
}
