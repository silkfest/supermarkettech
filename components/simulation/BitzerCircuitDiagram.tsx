'use client'
import { CHAIN, bitzerState, bitzerPointLabel, type BitzerVoltage, type BitzerPoint } from '@/lib/simulation/bitzer-circuit'
import BitzerWiringReference from './BitzerWiringReference'

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
  const color = (p: BitzerPoint) => !reveal ? '#64748b' : power && state.potentials[p] === voltage ? '#f59e0b' : '#94a3b8'
  function terminal(p: BitzerPoint, x: number, y: number, label: string = bitzerPointLabel(p, voltage)) {
    return <g key={p} role="button" tabIndex={0} aria-label={`Probe terminal ${p}`} onClick={() => selectPoint(p)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPoint(p) } }} className="cursor-pointer">
      <rect x={x - 22} y={y - 22} width="44" height="44" rx="8" fill="#ffffff" fillOpacity="0" />
      <circle cx={x} cy={y} r="6" fill={red === p ? '#dc2626' : black === p ? '#0f172a' : '#e2e8f0'} stroke={color(p)} strokeWidth="2" />
      {black === p && <circle cx={x} cy={y} r="2" fill="white" />}
      <text x={x} y={y - 14} textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor">{label}{red === p ? ' R' : ''}{black === p ? ' B' : ''}</text>
    </g>
  }
  function symbol(i: number, x: number, y: number, vertical = false) {
    const open = reveal && power && state.breakIndex === i
    const stroke = open ? '#ef4444' : '#64748b'
    return <g transform={`translate(${x},${y})`}>
      <g transform={vertical ? 'rotate(90)' : undefined} stroke={stroke} strokeWidth="2.4" fill="none">
        {i === 0 ? <><rect x="-16" y="-7" width="32" height="14" rx="7" /><path d="M-16 0 H16" /></> : i === 8 ? <circle r="16" /> : i === 7 ? <path d={open ? 'M-18 0 H-6 M6 0 H18 M-5 -6 L5 6' : 'M-18 0 H18'} /> : <><circle cx="-16" r="2" /><circle cx="16" r="2" /><path d={`M-16 0 L16 ${open ? -13 : 0}`} /></>}
      </g>
      {i === 8 && <text y="5" textAnchor="middle" fontSize="13" fontWeight="700" fill={stroke}>M</text>}
    </g>
  }
  if (wiring) return <BitzerWiringReference oil={oil} voltage={voltage} red={red} black={black} selectPoint={selectPoint} />
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
