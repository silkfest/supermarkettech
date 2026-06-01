'use client'

export function RackStyle1Diagram() {
  return (
    <figure className="my-6">
      <figcaption className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Rack Style 1 — Standard Receiver Rack
      </figcaption>
      <svg
        viewBox="0 0 580 500"
        className="w-full max-w-xl mx-auto block border border-slate-200 rounded-lg bg-white"
        aria-label="Standard receiver rack schematic"
      >
        <defs>
          <marker id="s1-b" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#3b82f6" />
          </marker>
          <marker id="s1-g" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#10b981" />
          </marker>
        </defs>

        {/* ── AIR FLOW arrows above condenser ── */}
        <text x="160" y="11" textAnchor="middle" fontSize="10" fill="#94a3b8">↓</text>
        <text x="290" y="11" textAnchor="middle" fontSize="10" fill="#94a3b8">↓</text>
        <text x="420" y="11" textAnchor="middle" fontSize="10" fill="#94a3b8">↓</text>
        <text x="62"  y="11" fontSize="8" fill="#94a3b8">air flow</text>

        {/* ── CONDENSER — coil symbol ── */}
        <rect x="60" y="14" width="460" height="74" rx="5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
        {/* 4-pass serpentine coil */}
        <path d="M 80,27 H 500 V 42 H 80 V 57 H 500 V 72 H 80"
              stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <text x="290" y="101" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b">CONDENSER — rooftop air-cooled</text>

        {/* Pipe: condenser → receiver */}
        <line x1="290" y1="88" x2="290" y2="100" stroke="#3b82f6" strokeWidth="2" />
        <text x="300" y="98" fontSize="8" fill="#3b82f6">condensed liquid</text>

        {/* ── LIQUID RECEIVER — cylindrical vessel ── */}
        {/* Top cap */}
        <ellipse cx="290" cy="110" rx="105" ry="10" fill="#bfdbfe" stroke="#2563eb" strokeWidth="1.5" />
        {/* Body */}
        <rect x="185" y="110" width="210" height="86" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.5" />
        {/* Bottom cap */}
        <ellipse cx="290" cy="196" rx="105" ry="10" fill="#93c5fd" stroke="#2563eb" strokeWidth="1.5" />
        {/* Labels */}
        <text x="290" y="143" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1d4ed8">LIQUID RECEIVER</text>
        <text x="290" y="160" textAnchor="middle" fontSize="9" fill="#1e40af">In main flow — all liquid passes through</text>
        <text x="290" y="176" textAnchor="middle" fontSize="10" fontWeight="600" fill="#15803d">Full = NORMAL ✓</text>

        {/* Pipe: receiver → filter-drier */}
        <line x1="290" y1="206" x2="290" y2="218" stroke="#3b82f6" strokeWidth="2" />
        <text x="300" y="216" fontSize="8" fill="#3b82f6">subcooled · 10–15°F SC</text>

        {/* ── FILTER-DRIER — inline cylinder ── */}
        <ellipse cx="290" cy="224" rx="24" ry="8" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
        <rect x="266" y="224" width="48" height="22" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
        <ellipse cx="290" cy="246" rx="24" ry="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
        <text x="320" y="238" fontSize="8" fill="#64748b">Filter-Drier</text>

        {/* Pipe: filter-drier → sight glass */}
        <line x1="290" y1="254" x2="290" y2="264" stroke="#3b82f6" strokeWidth="2" />

        {/* ── SIGHT GLASS — inline circle ── */}
        <circle cx="290" cy="274" r="11" fill="#eff6ff" stroke="#94a3b8" strokeWidth="1" />
        <line x1="283" y1="274" x2="297" y2="274" stroke="#94a3b8" strokeWidth="0.8" />
        <line x1="290" y1="267" x2="290" y2="281" stroke="#94a3b8" strokeWidth="0.8" />
        <text x="307" y="278" fontSize="8" fill="#64748b">Sight Glass</text>

        {/* Pipe: sight glass → liquid header */}
        <line x1="290" y1="285" x2="290" y2="300" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#s1-b)" />

        {/* ── LIQUID HEADER ── */}
        <rect x="30" y="300" width="520" height="28" rx="3" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5" />
        <text x="290" y="319" textAnchor="middle" fontSize="11" fontWeight="600" fill="#2563eb">LIQUID HEADER</text>

        {/* Branch pipes: liquid header → evaporators */}
        <line x1="111" y1="328" x2="111" y2="348" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#s1-b)" />
        <line x1="290" y1="328" x2="290" y2="348" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#s1-b)" />
        <line x1="469" y1="328" x2="469" y2="348" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#s1-b)" />
        <text x="86"  y="341" fontSize="7" fill="#64748b">LLS→TXV</text>
        <text x="265" y="341" fontSize="7" fill="#64748b">LLS→TXV</text>
        <text x="444" y="341" fontSize="7" fill="#64748b">LLS→TXV</text>

        {/* ── EVAPORATORS — coil symbols (3 cases) ── */}
        {/* Case 1 */}
        <rect x="30" y="348" width="162" height="62" rx="3" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
        <path d="M 46,361 H 176 V 377 H 46 V 393 H 176"
              stroke="#15803d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <text x="111" y="405" textAnchor="middle" fontSize="7" fill="#15803d">EVAPORATOR</text>

        {/* Case 2 */}
        <rect x="209" y="348" width="162" height="62" rx="3" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
        <path d="M 225,361 H 355 V 377 H 225 V 393 H 355"
              stroke="#15803d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <text x="290" y="405" textAnchor="middle" fontSize="7" fill="#15803d">EVAPORATOR</text>

        {/* Case 3 */}
        <rect x="388" y="348" width="162" height="62" rx="3" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
        <path d="M 404,361 H 534 V 377 H 404 V 393 H 534"
              stroke="#15803d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <text x="469" y="405" textAnchor="middle" fontSize="7" fill="#15803d">EVAPORATOR</text>

        {/* Suction pipes: evaporators → suction header */}
        <line x1="111" y1="410" x2="111" y2="430" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#s1-g)" />
        <line x1="290" y1="410" x2="290" y2="430" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#s1-g)" />
        <line x1="469" y1="410" x2="469" y2="430" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#s1-g)" />

        {/* ── SUCTION HEADER ── */}
        <rect x="30" y="430" width="520" height="28" rx="3" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
        <text x="290" y="449" textAnchor="middle" fontSize="11" fontWeight="600" fill="#15803d">SUCTION HEADER</text>

        {/* Return annotation */}
        <line x1="290" y1="458" x2="290" y2="472" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#s1-g)" />
        <text x="290" y="486" textAnchor="middle" fontSize="8" fill="#94a3b8">
          → Suction Filter → Compressors → Oil Separator → Condenser (cycle repeats)
        </text>
      </svg>
    </figure>
  )
}
