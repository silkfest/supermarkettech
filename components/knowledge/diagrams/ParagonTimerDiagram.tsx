'use client'

export function ParagonTimerDiagram() {
  // 96 pin positions around the dial (15 min each, 24hr clock)
  const pins = Array.from({ length: 96 }, (_, i) => {
    const angleDeg = (i / 96) * 360 - 90 // start at top (12 o'clock)
    const rad = (angleDeg * Math.PI) / 180
    const r = 88
    const x = 110 + r * Math.cos(rad)
    const y = 110 + r * Math.sin(rad)
    return { x, y, angle: angleDeg }
  })

  // Hour labels
  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  const hourLabels = hours.map((h, i) => {
    const angleDeg = (i / 12) * 360 - 90
    const rad = (angleDeg * Math.PI) / 180
    const r = 68
    return {
      label: h,
      x: 110 + r * Math.cos(rad),
      y: 110 + r * Math.sin(rad),
    }
  })

  // Example defrost pins: pulled at 2:00AM (pin 8), pushed at 2:30AM (pin 10)
  // and pulled at 10:00PM (pin 88), pushed at 10:30PM (pin 90)
  const pulledPins = new Set([8, 10, 88, 90])
  const isPull = (i: number) => i === 8 || i === 88
  const isPush = (i: number) => i === 10 || i === 90

  return (
    <div className="my-6 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
        Paragon 8145 — Defrost Timer Pin Dial
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <svg viewBox="0 0 220 220" className="w-52 h-52 flex-shrink-0">
          {/* Outer ring */}
          <circle cx="110" cy="110" r="105" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />
          <circle cx="110" cy="110" r="78" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
          {/* Dark mode background */}
          <circle cx="110" cy="110" r="105" fill="none" />

          {/* Hour tick marks */}
          {hourLabels.map(({ label, x, y }) => (
            <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="central"
              className="fill-slate-600 dark:fill-slate-400" style={{ fontSize: 9, fontWeight: 600 }}>
              {label}
            </text>
          ))}

          {/* "AM" / "PM" labels */}
          <text x="110" y="86" textAnchor="middle" style={{ fontSize: 7, fill: '#94a3b8' }}>AM</text>
          <text x="110" y="136" textAnchor="middle" style={{ fontSize: 7, fill: '#94a3b8' }}>PM</text>

          {/* Pin dots */}
          {pins.map(({ x, y }, i) => {
            const pulled = isPull(i)
            const pushed = isPush(i)
            const active = pulledPins.has(i)
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={active ? 4.5 : 2.5}
                fill={pulled ? '#ef4444' : pushed ? '#22c55e' : '#cbd5e1'}
                stroke={active ? (pulled ? '#dc2626' : '#16a34a') : 'none'}
                strokeWidth={active ? 1 : 0}
              />
            )
          })}

          {/* Centre arrow (current time pointer) */}
          <line x1="110" y1="110" x2="110" y2="30" stroke="#3b82f6" strokeWidth="2.5"
            strokeLinecap="round" markerEnd="url(#arr)" />
          <defs>
            <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#3b82f6" />
            </marker>
          </defs>

          {/* Centre hub */}
          <circle cx="110" cy="110" r="7" fill="#64748b" />
          <circle cx="110" cy="110" r="3" fill="#f8fafc" />
        </svg>

        <div className="flex-1 min-w-0 space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <p className="font-semibold text-slate-800 dark:text-slate-200">How to read the dial:</p>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <span><strong>Pull out pin</strong> = Defrost START at that time</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
            <span><strong>Push in pin</strong> = Defrost END at that time</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-slate-300 flex-shrink-0" />
            <span>Neutral pin (not set)</span>
          </div>
          <p className="text-slate-500 dark:text-slate-500 pt-1">
            Example above: 2 defrosts — 2:00–2:30 AM and 10:00–10:30 PM. Each pin = 15 minutes.
          </p>
          <p className="text-slate-500 dark:text-slate-500">
            Blue arrow = current time. Rotate outer dial ring to set clock.
          </p>
        </div>
      </div>
    </div>
  )
}
