'use client'

export function RackStyle2Diagram() {
  return (
    <figure className="my-6">
      <figcaption className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Rack Style 2 — Tyler Enviroguard — Refrigerant Flow Path
      </figcaption>
      <svg
        viewBox="0 0 640 458"
        className="w-full max-w-2xl mx-auto block border border-slate-200 rounded-lg bg-white"
        aria-label="Tyler Enviroguard rack refrigerant flow diagram"
      >
        <defs>
          <marker id="rk2-b" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#3b82f6" />
          </marker>
          <marker id="rk2-g" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#10b981" />
          </marker>
          <marker id="rk2-p" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#7c3aed" />
          </marker>
          <marker id="rk2-o" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#f97316" />
          </marker>
        </defs>

        {/* CONDENSER */}
        <rect x="60" y="12" width="310" height="48" rx="5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
        <text x="215" y="32" textAnchor="middle" fontSize="13" fontWeight="600" fill="#334155">CONDENSER</text>
        <text x="215" y="50" textAnchor="middle" fontSize="9" fill="#64748b">pressure-based fan control required</text>

        {/* Condenser → SPR */}
        <line x1="215" y1="60" x2="215" y2="100" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#rk2-b)" />
        <text x="223" y="84" fontSize="9" fill="#3b82f6">liquid dropleg</text>

        {/* SPR VALVE — green */}
        <rect x="60" y="100" width="310" height="60" rx="5" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" />
        <text x="215" y="122" textAnchor="middle" fontSize="13" fontWeight="700" fill="#15803d">SPR VALVE</text>
        <text x="215" y="138" textAnchor="middle" fontSize="9" fill="#166534">System Pressure Regulator</text>
        <text x="215" y="151" textAnchor="middle" fontSize="9" fill="#166534">Pilot pressure tracks ambient temperature dynamically</text>

        {/* Overflow branch: SPR → Receiver */}
        <line x1="370" y1="128" x2="446" y2="128" stroke="#7c3aed" strokeWidth="2" strokeDasharray="5,3" markerEnd="url(#rk2-p)" />
        <text x="374" y="119" fontSize="8" fill="#7c3aed">SPR opens →</text>
        <text x="374" y="142" fontSize="8" fill="#7c3aed">overflow</text>

        {/* RECEIVER — purple, off to side */}
        <rect x="446" y="98" width="168" height="94" rx="5" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2" />
        <text x="530" y="120" textAnchor="middle" fontSize="12" fontWeight="700" fill="#5b21b6">RECEIVER</text>
        <text x="530" y="136" textAnchor="middle" fontSize="9" fill="#6d28d9">Not in normal</text>
        <text x="530" y="148" textAnchor="middle" fontSize="9" fill="#6d28d9">flow path</text>
        <text x="530" y="164" textAnchor="middle" fontSize="10" fontWeight="600" fill="#b91c1c">Full = INVESTIGATE ⚠</text>
        <text x="530" y="180" textAnchor="middle" fontSize="8" fill="#6d28d9">Seasonal buffer only</text>

        {/* Bleed circuit: Receiver → Suction Header (orange dashed) */}
        <line x1="530" y1="192" x2="530" y2="384" stroke="#f97316" strokeWidth="1.5" strokeDasharray="5,3" />
        <line x1="530" y1="384" x2="418" y2="384" stroke="#f97316" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#rk2-o)" />
        <text x="538" y="262" fontSize="8" fill="#ea580c" fontStyle="italic">bleed circuit</text>
        <text x="538" y="274" fontSize="8" fill="#ea580c" fontStyle="italic">cap. tube +</text>
        <text x="538" y="286" fontSize="8" fill="#ea580c" fontStyle="italic">heat exchanger</text>
        <text x="538" y="298" fontSize="8" fill="#ea580c" fontStyle="italic">→ suction</text>

        {/* Main flow continues: SPR → Liquid Manifold */}
        <line x1="215" y1="160" x2="215" y2="200" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#rk2-b)" />
        <text x="223" y="185" fontSize="9" fill="#3b82f6">main flow (SPR closed)</text>

        {/* LIQUID MANIFOLD */}
        <rect x="30" y="200" width="380" height="32" rx="4" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5" />
        <text x="220" y="221" textAnchor="middle" fontSize="12" fontWeight="600" fill="#2563eb">LIQUID MANIFOLD</text>

        {/* Three arrows down to cases */}
        <line x1="90"  y1="232" x2="90"  y2="256" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#rk2-b)" />
        <line x1="220" y1="232" x2="220" y2="256" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#rk2-b)" />
        <line x1="350" y1="232" x2="350" y2="256" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#rk2-b)" />
        <text x="68"  y="248" fontSize="8" fill="#64748b">LLS → TXV</text>
        <text x="198" y="248" fontSize="8" fill="#64748b">LLS → TXV</text>
        <text x="328" y="248" fontSize="8" fill="#64748b">LLS → TXV</text>

        {/* EVAPORATORS */}
        <rect x="30" y="256" width="380" height="42" rx="4" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
        <text x="220" y="278" textAnchor="middle" fontSize="12" fontWeight="600" fill="#15803d">EVAPORATORS — Cases</text>
        <text x="220" y="292" textAnchor="middle" fontSize="9" fill="#4ade80">LT circuits · MT circuits (EPR on MT)</text>

        {/* Arrows to suction header */}
        <line x1="90"  y1="298" x2="90"  y2="326" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#rk2-g)" />
        <line x1="220" y1="298" x2="220" y2="326" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#rk2-g)" />
        <line x1="350" y1="298" x2="350" y2="326" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#rk2-g)" />

        {/* SUCTION HEADER */}
        <rect x="30" y="326" width="380" height="32" rx="4" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" />
        <text x="220" y="347" textAnchor="middle" fontSize="12" fontWeight="600" fill="#15803d">SUCTION HEADER</text>

        {/* Bleed circuit points at suction header right side */}
        <text x="400" y="343" fontSize="8" fill="#ea580c" fontStyle="italic">← bleed</text>

        {/* Suction vapour arrow down */}
        <line x1="220" y1="358" x2="220" y2="388" stroke="#10b981" strokeWidth="2" markerEnd="url(#rk2-g)" />

        {/* Return annotation */}
        <text x="220" y="403" textAnchor="middle" fontSize="9" fill="#94a3b8">
          → Compressors → Oil Separator → Condenser (cycle repeats)
        </text>

        {/* Legend */}
        <rect x="30" y="416" width="400" height="34" rx="4" fill="#fafafa" stroke="#e2e8f0" strokeWidth="1" />
        <line x1="44"  y1="433" x2="70"  y2="433" stroke="#3b82f6" strokeWidth="2" />
        <text x="75"  y="437" fontSize="8" fill="#475569">Main liquid flow</text>
        <line x1="144" y1="433" x2="170" y2="433" stroke="#7c3aed" strokeWidth="2" strokeDasharray="4,3" />
        <text x="175" y="437" fontSize="8" fill="#475569">SPR overflow to receiver</text>
        <line x1="292" y1="433" x2="318" y2="433" stroke="#f97316" strokeWidth="2" strokeDasharray="4,3" />
        <text x="323" y="437" fontSize="8" fill="#475569">Bleed circuit</text>
      </svg>
    </figure>
  )
}
