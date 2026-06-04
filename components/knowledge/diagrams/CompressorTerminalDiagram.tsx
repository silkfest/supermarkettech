'use client'

export function CompressorTerminalDiagram() {
  return (
    <div className="my-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
        Hermetic Compressor — Terminal Layout & PSC Wiring
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <svg viewBox="0 0 200 180" className="w-52 h-44 flex-shrink-0">
          {/* Compressor body */}
          <ellipse cx="100" cy="80" rx="70" ry="65" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
          <ellipse cx="100" cy="80" rx="70" ry="65" fill="url(#cmpGrad)" />
          <defs>
            <radialGradient id="cmpGrad" cx="40%" cy="35%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </radialGradient>
          </defs>

          {/* Terminal block at bottom of compressor */}
          <rect x="68" y="118" width="64" height="22" rx="4" fill="#1e293b" />

          {/* Three terminals */}
          {/* C - Common */}
          <circle cx="84" cy="129" r="7" fill="#ef4444" stroke="#dc2626" strokeWidth="1.5" />
          <text x="84" y="133" textAnchor="middle" style={{ fontSize: 8, fill: 'white', fontWeight: 700 }}>C</text>

          {/* R - Run */}
          <circle cx="100" cy="129" r="7" fill="#3b82f6" stroke="#2563eb" strokeWidth="1.5" />
          <text x="100" y="133" textAnchor="middle" style={{ fontSize: 8, fill: 'white', fontWeight: 700 }}>R</text>

          {/* S - Start */}
          <circle cx="116" cy="129" r="7" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
          <text x="116" y="133" textAnchor="middle" style={{ fontSize: 8, fill: 'white', fontWeight: 700 }}>S</text>

          {/* Suction / discharge stubs */}
          <line x1="44" y1="60" x2="20" y2="60" stroke="#64748b" strokeWidth="4" />
          <text x="16" y="58" textAnchor="end" style={{ fontSize: 8, fill: '#64748b' }}>Suction</text>
          <line x1="44" y1="75" x2="20" y2="75" stroke="#64748b" strokeWidth="4" />
          <text x="16" y="73" textAnchor="end" style={{ fontSize: 8, fill: '#64748b' }}>Discharge</text>

          {/* Run cap between R and S */}
          <path d="M100 150 Q100 162 116 162 Q132 162 132 150" fill="none" stroke="#6366f1" strokeWidth="2" />
          <rect x="109" y="160" width="14" height="6" rx="2" fill="#6366f1" />
          <text x="124" y="167" style={{ fontSize: 7, fill: '#6366f1' }}>Run Cap</text>
          <line x1="100" y1="136" x2="100" y2="150" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3,2" />
          <line x1="116" y1="136" x2="116" y2="150" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3,2" />

          {/* L1/L2 supply lines */}
          <line x1="84" y1="136" x2="84" y2="170" stroke="#ef4444" strokeWidth="2" />
          <text x="79" y="178" textAnchor="middle" style={{ fontSize: 7, fill: '#ef4444' }}>L1 →C</text>
          <line x1="100" y1="136" x2="56" y2="170" stroke="#3b82f6" strokeWidth="2" />
          <text x="46" y="178" textAnchor="middle" style={{ fontSize: 7, fill: '#3b82f6' }}>L2 →R</text>
        </svg>

        <div className="flex-1 min-w-0 space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <p className="font-semibold text-slate-800 dark:text-slate-200">Terminal identification (PSC):</p>
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 mt-0.5 flex-shrink-0" />
              <span><strong>C (Common)</strong> — connect to L1 supply (through overload)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mt-0.5 flex-shrink-0" />
              <span><strong>R (Run winding)</strong> — connect to L2. C→R = lowest resistance</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mt-0.5 flex-shrink-0" />
              <span><strong>S (Start winding)</strong> — run cap between R and S. C→S = middle resistance</span>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
            Winding test (motor cold, de-energized): C→R lowest Ω, C→S middle Ω, R→S highest Ω. Any terminal to ground = ∞Ω (open = grounded if less).
          </p>
        </div>
      </div>
    </div>
  )
}
