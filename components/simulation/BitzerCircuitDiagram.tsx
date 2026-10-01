'use client'
import { CHAIN, bitzerState, bitzerPointLabel, type BitzerVoltage, type BitzerPoint } from '@/lib/simulation/bitzer-circuit'

type Props = {
  oil: 'Delta-PII' | 'OLC-K1'
  voltage: BitzerVoltage
  state: ReturnType<typeof bitzerState>
  power: boolean
  reveal: boolean
  red: BitzerPoint
  black: BitzerPoint
  selectPoint: (point: BitzerPoint) => void
  wiring?: boolean
}
const labels = ['FU · 2 A', 'Call / enable', 'HP', 'LP', 'SE-B3', 'Oil safety', 'INT280', 'Panel wire', 'M']
const nodes = [[30, 60], [150, 60], [270, 60], [390, 60], [390, 170], [270, 170], [150, 170], [30, 170], [30, 280], [150, 280]]

export default function BitzerCircuitDiagram({ oil, voltage, state, power, reveal, red, black, selectPoint, wiring = false }: Props) {
  const returnLabel = voltage === 208 ? 'L2' : 'N'
  const color = (p: BitzerPoint) => wiring ? '#334155' : !reveal ? '#64748b' : power && state.potentials[p] === voltage ? '#f59e0b' : '#94a3b8'
  function terminal(p: BitzerPoint, x: number, y: number, label: string = bitzerPointLabel(p, voltage)) {
    return <g key={p} role="button" tabIndex={0} aria-label={`Probe terminal ${p}`} onClick={() => selectPoint(p)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPoint(p) } }} className="cursor-pointer">
      <rect x={x - 22} y={y - 22} width="44" height="44" rx="8" fill="#ffffff" fillOpacity="0" />
      <circle cx={x} cy={y} r="6" fill={red === p ? '#dc2626' : black === p ? '#0f172a' : '#e2e8f0'} stroke={color(p)} strokeWidth="2" />
      {black === p && <circle cx={x} cy={y} r="2" fill="white" />}
      <text x={x} y={y - 14} textAnchor="middle" fontSize="11" fontWeight="600" fill={wiring ? '#334155' : 'currentColor'}>{label}{red === p ? ' R' : ''}{black === p ? ' B' : ''}</text>
    </g>
  }
  function symbol(i: number, x: number, y: number, vertical = false) {
    const open = !wiring && reveal && power && state.breakIndex === i
    const stroke = open ? '#ef4444' : '#64748b'
    return <g transform={`translate(${x},${y})`}>
      <g transform={vertical ? 'rotate(90)' : undefined} stroke={stroke} strokeWidth="2.4" fill="none">
        {i === 0 ? <><rect x="-16" y="-7" width="32" height="14" rx="7" /><path d="M-16 0 H16" /></> : i === 8 ? <circle r="16" /> : i === 7 ? <path d={open ? 'M-18 0 H-6 M6 0 H18 M-5 -6 L5 6' : 'M-18 0 H18'} /> : <><circle cx="-16" r="2" /><circle cx="16" r="2" /><path d={`M-16 0 L16 ${open || (wiring && i >= 4) ? -13 : 0}`} /></>}
      </g>
      {i === 8 && <text y="5" textAnchor="middle" fontSize="13" fontWeight="700" fill={stroke}>M</text>}
    </g>
  }
  if (wiring) return <div className="space-y-3">
    <p className="text-xs text-slate-500 dark:text-slate-400">Reference drawing: relay contacts shown with modules de-energized; call and pressure switches shown closed. Probe readings still follow your active exercise. {voltage === 208 && 'L2 is a live return, not neutral.'} Scroll sideways to inspect the drawing.</p>
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white" tabIndex={0} aria-label="Scrollable wiring diagram">
      <svg viewBox="0 0 1160 710" className="min-w-[1000px] w-full" role="group" aria-label="Bitzer functional wiring diagram with safety circuit, module supplies and PTC loop">
        <text x="30" y="30" fontSize="18" fontWeight="700" fill="#0f172a">BITZER · CONTROL WIRING REFERENCE</text>
        <text x="30" y="52" fontSize="12" fill="#475569">{voltage} V control circuit · functional terminal labels · not a model-specific installation drawing</text>
        <path d="M30 82 V370 M1110 82 V370" stroke="#334155" strokeWidth="3" />
        {CHAIN.map((p, i) => {
          const x = 30 + i * 120
          return <g key={p}>
            {i < 9 && <>
              <path d={`M${x} 110 H${x + 42} M${x + 78} 110 H${x + 120}`} stroke="#334155" strokeWidth="2" fill="none" />
              {symbol(i, x + 60, 110)}
              <text x={x + 60} y="151" textAnchor="middle" fontSize="12" fill="#334155">{i === 5 ? oil : labels[i]}</text>
              {i >= 4 && i <= 6 && <text x={x + 60} y="169" textAnchor="middle" fontSize="10" fill="#64748b">{i === 4 ? '11–14' : 'IN–OUT'}</text>}
            </>}
            {terminal(p, x, 110, bitzerPointLabel(p, voltage))}
          </g>
        })}
        {/* Module feeds branch from the fused node, before call and pressure controls. */}
        <path d="M150 110 V310 M150 230 H350 M550 230 H1110 M150 310 H350 M550 310 H1110" stroke="#334155" strokeWidth="2" fill="none" />
        <circle cx="150" cy="230" r="4" fill="#334155" />
        {[{ y: 230, name: 'SE-B3 supply', l: 'SE-L', n: 'SE-N' }, { y: 310, name: `${oil} supply`, l: 'Oil-L', n: 'Oil-N' }].map(m => <g key={m.l}>
          <rect x="350" y={m.y - 22} width="200" height="44" rx="3" fill="#f8fafc" stroke="#64748b" />
          <text x="450" y={m.y + 5} textAnchor="middle" fontSize="13" fill="#334155">{m.name} · {voltage} V</text>
          {terminal(m.l as BitzerPoint, 350, m.y)}{terminal(m.n as BitzerPoint, 550, m.y)}
        </g>)}
        <g transform="translate(0,160)">
        <rect x="650" y="200" width="340" height="70" rx="4" fill="white" stroke="#94a3b8" strokeDasharray="5 4" />
        <text x="820" y="220" textAnchor="middle" fontSize="12" fill="#334155">SE-B3 sensor input · separate PTC loop</text>
        <path d="M680 250 H745 M895 250 H960" stroke="#334155" strokeWidth="2" />
        <rect x="745" y="238" width="150" height="24" fill="white" stroke="#64748b" />
        <text x="820" y="254" textAnchor="middle" fontSize="11" fill="#334155">Motor winding PTC</text>
        {terminal('M1', 680, 250)}{terminal('M2', 960, 250)}
        </g>
        <text x="650" y="349" fontSize="12" fill="#475569">SE-B3 changeover: 11–12 closed / 11–14 open when released.</text>
        {terminal('12', 220, 393, '12 · unused trip contact')}
        <text x="270" y="398" fontSize="11" fill="#64748b">Not connected to the run chain.</text>
        <g transform="translate(0,60)">
        <path d="M30 430 H1110" stroke="#cbd5e1" strokeDasharray="6 4" />
        <text x="30" y="460" fontSize="14" fontWeight="700" fill="#334155">Separate 230 V supply · INT280-60 variant in this exercise</text>
        <path d="M80 520 H350 M550 520 H1050" stroke="#334155" strokeWidth="2" />
        <rect x="350" y="493" width="200" height="54" rx="3" fill="#f8fafc" stroke="#64748b" />
        <text x="450" y="517" textAnchor="middle" fontSize="13" fill="#334155">INT280 oil regulator</text>
        <text x="450" y="535" textAnchor="middle" fontSize="11" fill="#64748b">Level sensing + oil refill</text>
        {terminal('Reg-L', 350, 520)}{terminal('Reg-N', 550, 520)}
        <text x="30" y="588" fontSize="12" fill="#475569">Oil monitor and INT280 relay contacts belong to the {voltage} V safety string; their supplies are separate connections.</text>
        <text x="30" y="610" fontSize="12" fill="#475569">IN/OUT are functional labels. Match terminal numbers, wire colours and supply voltage to the exact device diagram.</text>
        </g>
      </svg>
    </div>
  </div>
  return <>
    <svg viewBox="0 0 440 345" className="w-full max-w-2xl mx-auto select-none" role="group" aria-label="Bitzer safety circuit with selectable meter terminals">
      {CHAIN.slice(0, -1).map((p, i) => {
        const [x, y] = nodes[i], [nx, ny] = nodes[i + 1]
        const mx = (x + nx) / 2, my = (y + ny) / 2
        const vertical = x === nx, dx = vertical ? 0 : Math.sign(nx - x) * 18, dy = vertical ? Math.sign(ny - y) * 18 : 0
        return <g key={p}>
          <path d={`M${x} ${y} L${mx-dx} ${my-dy}`} stroke={color(p)} strokeWidth="3" />
          <path d={`M${mx+dx} ${my+dy} L${nx} ${ny}`} stroke={color(CHAIN[i+1])} strokeWidth="3" />
          {symbol(i, mx, my, vertical)}
          <text x={vertical ? mx + (i === 3 ? -28 : 28) : mx} y={vertical ? my + 4 : my + 32} textAnchor={vertical ? i === 3 ? 'end' : 'start' : 'middle'} fontSize="11" fontWeight="700" fill="currentColor">{i === 5 ? oil : labels[i]}</text>
        </g>
      })}
      {CHAIN.map((p, i) => terminal(p, nodes[i][0], nodes[i][1], bitzerPointLabel(p, voltage)))}
      <text x="220" y="284" fontSize="11" fill="#64748b">{voltage} V · L1–{returnLabel}</text>
    </svg>
    <p className="text-xs text-slate-500 dark:text-slate-400">{reveal ? `Amber = ${voltage} V to ${returnLabel} · grey = 0 V to ${returnLabel} · red symbol = fault location.` : 'Voltage colours and fault locations are hidden. Use your meter to trace the circuit.'} Module supply and sensor points are available in Wiring diagram and the meter selectors.</p>
  </>
}
