'use client'

export function RackStyle2Diagram() {
  return (
    <figure className="my-6">
      <figcaption className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Rack Style 2 — Tyler Enviroguard
      </figcaption>
      <svg
        viewBox="0 0 640 440"
        className="w-full max-w-2xl mx-auto block border border-slate-200 rounded-lg bg-white"
        aria-label="Tyler Enviroguard rack schematic"
      >
        <defs>
          <marker id="s2-b" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#3b82f6" />
          </marker>
          <marker id="s2-g" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#10b981" />
          </marker>
          <marker id="s2-p" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#7c3aed" />
          </marker>
          <marker id="s2-o" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#f97316" />
          </marker>
        </defs>

        {/* ── AIR FLOW arrows above condenser ── */}
        <text x="130" y="11" textAnchor="middle" fontSize="10" fill="#94a3b8">↓</text>
        <text x="220" y="11" textAnchor="middle" fontSize="10" fill="#94a3b8">↓</text>
        <text x="310" y="11" textAnchor="middle" fontSize="10" fill="#94a3b8">↓</text>
        <text x="52"  y="11" fontSize="8" fill="#94a3b8">air flow</text>

        {/* ── CONDENSER — coil symbol ── */}
        <rect x="50" y="14" width="340" height="74" rx="5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
        {/* 4-pass serpentine coil */}
        <path d="M 68,27 H 372 V 42 H 68 V 57 H 372 V 72 H 68"
              stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <text x="220" y="101" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b">CONDENSER — pressure-based fan control</text>

        {/* Pipe: condenser → SPR (liquid dropleg) */}
        <line x1="220" y1="88" x2="220" y2="106" stroke="#3b82f6" strokeWidth="2" />
        <text x="230" y="101" fontSize="8" fill="#3b82f6">liquid dropleg</text>

        {/* ── SPR VALVE — green box ── */}
        <rect x="110" y="106" width="220" height="60" rx="5" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" />
        <text x="220" y="128" textAnchor="middle" fontSize="12" fontWeight="700" fill="#15803d">SPR VALVE</text>
        <text x="220" y="144" textAnchor="middle" fontSize="9" fill="#166534">System Pressure Regulator</text>
        <text x="220" y="157" textAnchor="middle" fontSize="8" fill="#166534">Pilot ← ambient air sensor</text>

        {/* ── OVERFLOW BRANCH: SPR → Receiver ── */}
        <line x1="330" y1="136" x2="430" y2="136"
              stroke="#7c3aed" strokeWidth="2" strokeDasharray="5,3" markerEnd="url(#s2-p)" />
        <text x="336" y="128" fontSize="8" fill="#7c3aed">SPR opens →</text>
        <text x="336" y="148" fontSize="8" fill="#7c3aed">overflow</text>

        {/* ── RECEIVER — cylindrical vessel (off main flow, purple) ── */}
        {/* Top cap */}
        <ellipse cx="510" cy="136" rx="80" ry="10" fill="#ddd6fe" stroke="#7c3aed" strokeWidth="1.5" />
        {/* Body */}
        <rect x="430" y="136" width="160" height="80" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5" />
        {/* Bottom cap */}
        <ellipse cx="510" cy="216" rx="80" ry="10" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1.5" />
        {/* Labels */}
        <text x="510" y="162" textAnchor="middle" fontSize="12" fontWeight="700" fill="#5b21b6">RECEIVER</text>
        <text x="510" y="178" textAnchor="middle" fontSize="9" fill="#6d28d9">Not in main flow path</text>
        <text x="510" y="196" textAnchor="middle" fontSize="9" fontWeight="600" fill="#b91c1c">Full = INVESTIGATE ⚠</text>
        <text x="510" y="210" textAnchor="middle" fontSize="8" fill="#6d28d9">Seasonal buffer only</text>

        {/* ── BLEED CIRCUIT: Receiver → Suction Header (orange dashed) ── */}
        <line x1="510" y1="226" x2="510" y2="336"
              stroke="#f97316" strokeWidth="1.5" strokeDasharray="5,3" />
        <line x1="510" y1="336" x2="402" y2="336"
              stroke="#f97316" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#s2-o)" />
        <text x="520" y="272" fontSize="8" fill="#ea580c" fontStyle="italic">bleed circuit</text>
        <text x="520" y="284" fontSize="8" fill="#ea580c" fontStyle="italic">cap. tube</text>
        <text x="520" y="296" fontSize="8" fill="#ea580c" fontStyle="italic">+ heat</text>
        <text x="520" y="308" fontSize="8" fill="#ea580c" fontStyle="italic">exchanger</text>

        {/* ── MAIN FLOW CONTINUES: SPR → Liquid Manifold ── */}
        <line x1="220" y1="166" x2="220" y2="190" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#s2-b)" />
        <text x="230" y="182" fontSize="8" fill="#3b82f6">main flow (SPR closed)</text>

        {/* ── LIQUID MANIFOLD ── */}
        <rect x="40" y="190" width="360" height="28" rx="3" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5" />
        <text x="220" y="209" textAnchor="middle" fontSize="11" fontWeight="600" fill="#2563eb">LIQUID MANIFOLD</text>

        {/* Branch pipes: liquid manifold → evaporators */}
        <line x1="94"  y1="218" x2="94"  y2="238" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#s2-b)" />
        <line x1="220" y1="218" x2="220" y2="238" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#s2-b)" />
        <line x1="346" y1="218" x2="346" y2="238" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#s2-b)" />
        <text x="70"  y="231" fontSize="7" fill="#64748b">LLS→TXV</text>
        <text x="196" y="231" fontSize="7" fill="#64748b">LLS→TXV</text>
        <text x="322" y="231" fontSize="7" fill="#64748b">LLS→TXV</text>

        {/* ── EVAPORATORS — coil symbols (3 cases) ── */}
        {/* Case 1 */}
        <rect x="40"  y="238" width="107" height="62" rx="3" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
        <path d="M 54,251 H 133 V 267 H 54 V 283 H 133"
              stroke="#15803d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <text x="94"  y="294" textAnchor="middle" fontSize="7" fill="#15803d">EVAPORATOR</text>

        {/* Case 2 */}
        <rect x="163" y="238" width="107" height="62" rx="3" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
        <path d="M 177,251 H 256 V 267 H 177 V 283 H 256"
              stroke="#15803d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <text x="216" y="294" textAnchor="middle" fontSize="7" fill="#15803d">EVAPORATOR</text>

        {/* Case 3 */}
        <rect x="286" y="238" width="107" height="62" rx="3" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
        <path d="M 300,251 H 379 V 267 H 300 V 283 H 379"
              stroke="#15803d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <text x="340" y="294" textAnchor="middle" fontSize="7" fill="#15803d">EVAPORATOR</text>

        {/* Suction pipes: evaporators → suction header */}
        <line x1="94"  y1="300" x2="94"  y2="322" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#s2-g)" />
        <line x1="220" y1="300" x2="220" y2="322" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#s2-g)" />
        <line x1="346" y1="300" x2="346" y2="322" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#s2-g)" />

        {/* ── SUCTION HEADER ── */}
        <rect x="40" y="322" width="360" height="28" rx="3" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
        <text x="220" y="341" textAnchor="middle" fontSize="11" fontWeight="600" fill="#15803d">SUCTION HEADER</text>
        <text x="404" y="341" fontSize="8" fill="#ea580c" fontStyle="italic">← bleed</text>

        {/* Return annotation */}
        <line x1="220" y1="350" x2="220" y2="364" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#s2-g)" />
        <text x="220" y="378" textAnchor="middle" fontSize="8" fill="#94a3b8">
          → Compressors → Oil Separator → Condenser (cycle repeats)
        </text>

        {/* ── LEGEND ── */}
        <rect x="40" y="394" width="410" height="34" rx="3" fill="#fafafa" stroke="#e2e8f0" strokeWidth="1" />
        <line x1="54"  y1="411" x2="82"  y2="411" stroke="#3b82f6" strokeWidth="2" />
        <text x="87"  y="415" fontSize="8" fill="#475569">Main liquid flow</text>
        <line x1="162" y1="411" x2="190" y2="411" stroke="#7c3aed" strokeWidth="2" strokeDasharray="4,3" />
        <text x="195" y="415" fontSize="8" fill="#475569">SPR overflow → receiver</text>
        <line x1="316" y1="411" x2="344" y2="411" stroke="#f97316" strokeWidth="2" strokeDasharray="4,3" />
        <text x="349" y="415" fontSize="8" fill="#475569">Bleed circuit</text>
      </svg>
    </figure>
  )
}
