'use client'
import { CHAIN, BITZER_WIRES, chainWire, returnWire, bitzerPointLabel, type BitzerWire, type BitzerVoltage, type BitzerPoint } from '@/lib/simulation/bitzer-circuit'

/** The wiring reference, drawn to be read on a phone.
 *
 *  It used to be one 1160-unit canvas forced to a 1000px minimum width. On a
 *  390px phone that left 322px visible — the tech saw a third of the drawing
 *  at a time, the title was cut mid-word, and 12px text landed at about 10px.
 *  Side-scrolling a drawing you are trying to read against a live panel is the
 *  worst of both worlds.
 *
 *  So the sheet is cut into the four circuits it actually contains, each its
 *  own small drawing that scales to whatever width it is given. Nothing
 *  scrolls sideways. On a wide screen they sit two-up instead of running down
 *  the page.
 */

type Props = {
  oil: 'Delta-PII' | 'OLC-K1'
  voltage: BitzerVoltage
  red: BitzerPoint
  black: BitzerPoint
  selectPoint: (point: BitzerPoint) => void
}

const DEVICE = ['FU · 2 A', 'Call / enable', 'HP cutout', 'LP cutout', 'SE-B3 · 11–14', 'Oil safety', 'INT280 · IN–OUT', 'Panel wire', 'M contactor']

/** Light and dark conductor colours as CSS variables, so one element carries
 *  both and the theme picks. Tailwind's `dark` class drives it. */
const wireVars = (w: BitzerWire) =>
  ({ '--bz-l': w.hex, '--bz-d': w.darkHex }) as React.CSSProperties

const WIRE_CSS = `
.bz-s { stroke: var(--bz-l); }
.bz-f { fill: var(--bz-l); }
:is(.dark) .bz-s { stroke: var(--bz-d); }
:is(.dark) .bz-f { fill: var(--bz-d); }
`

const card =
  'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3'
const heading = 'text-[13px] font-bold text-slate-800 dark:text-slate-100'
const note = 'text-[11px] text-slate-500 dark:text-slate-400'

export default function BitzerWiringReference({ oil, voltage, red, black, selectPoint }: Props) {
  const ret = returnWire(voltage)

  /** A tappable terminal. Same probe behaviour as the trainer view. */
  function terminal(p: BitzerPoint, x: number, y: number, label: string, anchor: 'start' | 'end' | 'above' = 'start') {
    const w = chainWire(p, voltage)
    return (
      <g
        role="button"
        tabIndex={0}
        aria-label={`Probe terminal ${bitzerPointLabel(p, voltage)}`}
        onClick={() => selectPoint(p)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPoint(p) } }}
        className="cursor-pointer"
      >
        <rect x={x - 20} y={y - 16} width="40" height="32" fill="transparent" />
        <circle
          cx={x} cy={y} r="5.5"
          style={wireVars(w)}
          className="bz-s"
          fill={red === p ? '#dc2626' : black === p ? '#0f172a' : 'transparent'}
          strokeWidth="2.2"
        />
        {black === p && <circle cx={x} cy={y} r="1.8" fill="white" />}
        <text
          x={anchor === 'above' ? x : anchor === 'start' ? x + 11 : x - 11}
          y={anchor === 'above' ? y - 13 : y + 4}
          textAnchor={anchor === 'above' ? 'middle' : anchor}
          fontSize="11.5" fontWeight="600" fill="currentColor"
        >
          {label}{red === p ? ' ◀R' : ''}{black === p ? ' ◀B' : ''}
        </text>
      </g>
    )
  }

  /** The conductor between two terminals, in its own colour, tagged with the
   *  code a tech would read off the wire marker. */
  function conductor(w: BitzerWire, d: string, tagX?: number, tagY?: number) {
    return (
      <g style={wireVars(w)}>
        <path d={d} className="bz-s" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        {tagX !== undefined && tagY !== undefined && (
          <text x={tagX} y={tagY} textAnchor="end" fontSize="9.5" fontWeight="700" className="bz-f">
            {w.code}
          </text>
        )}
      </g>
    )
  }

  function deviceSymbol(i: number, x: number, y: number) {
    // Drawn vertically: the string runs down the page, not across it.
    const s = 'stroke-slate-500 dark:stroke-slate-400'
    if (i === 0) return <g className={s} strokeWidth="2.2" fill="none"><rect x={x - 7} y={y - 14} width="14" height="28" rx="6" /><path d={`M${x} ${y - 14} V${y + 14}`} /></g>
    if (i === 8) return <g className={s} strokeWidth="2.2" fill="none"><circle cx={x} cy={y} r="13" /><text x={x} y={y + 5} textAnchor="middle" fontSize="12" fontWeight="700" className="fill-slate-500 dark:fill-slate-400" stroke="none">M</text></g>
    if (i === 7) return <g className={s} strokeWidth="2.2" fill="none"><path d={`M${x} ${y - 14} V${y + 14}`} /></g>
    return (
      <g className={s} strokeWidth="2.2" fill="none">
        <circle cx={x} cy={y - 13} r="1.9" /><circle cx={x} cy={y + 13} r="1.9" />
        <path d={`M${x} ${y - 13} L${x + 13} ${y + 13}`} />
      </g>
    )
  }

  // ---- Block A: the series safety string, drawn down the page ----
  const ROW = 56
  const topY = 34
  const stringH = topY + 9 * ROW + 30
  const CX = 58

  const safetyString = (
    <svg viewBox={`0 0 330 ${stringH}`} className="w-full" role="group"
      aria-label="Control safety string, series connected from L1 to the return">
      <text x="4" y="14" fontSize="11.5" fontWeight="700" fill="currentColor">
        {voltage} V control safety string · series
      </text>
      {CHAIN.slice(0, -1).map((p, i) => {
        const y = topY + i * ROW
        const w = chainWire(CHAIN[i + 1] === 'N' ? 'N' : CHAIN[i + 1], voltage)
        const upper = chainWire(p, voltage)
        return (
          <g key={p}>
            {conductor(upper, `M${CX} ${y + 6} V${y + ROW / 2 - 15}`, CX - 17, y + 26)}
            {deviceSymbol(i, CX, y + ROW / 2)}
            {conductor(w, `M${CX} ${y + ROW / 2 + 15} V${y + ROW - 6}`)}
            <text x={CX + 30} y={y + ROW / 2 + 4} fontSize="11.5" fill="currentColor">
              {i === 5 ? `${oil} · IN–OUT` : DEVICE[i]}
            </text>
          </g>
        )
      })}
      {CHAIN.map((p, i) =>
        <g key={`t-${p}`}>{terminal(p, CX, topY + i * ROW, bitzerPointLabel(p, voltage))}</g>
      )}
      <text x="4" y={stringH - 8} fontSize="10.5" className="fill-slate-500 dark:fill-slate-400">
        Return leg runs {ret.name.toLowerCase()} ({ret.code}){voltage === 208 ? ' — L2 is live, not a neutral' : ''}.
      </text>
    </svg>
  )

  // ---- Block B: module supplies, tapped ahead of the controls ----
  const supplies = (
    <svg viewBox="0 0 330 206" className="w-full" role="group" aria-label="Monitoring module supplies">
      <text x="4" y="14" fontSize="11.5" fontWeight="700" fill="currentColor">
        Module supplies · tapped at FU-out
      </text>
      {[{ y: 74, name: 'SE-B3', l: 'SE-L', n: 'SE-N' },
        { y: 152, name: oil, l: 'Oil-L', n: 'Oil-N' }].map(m => (
        <g key={m.l}>
          {conductor(BITZER_WIRES.control, `M28 40 V${m.y} H74`, 52, m.y + 15)}
          <rect x="96" y={m.y - 20} width="150" height="40" rx="3"
            className="fill-slate-50 dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.4" />
          <text x="171" y={m.y - 2} textAnchor="middle" fontSize="11.5" fill="currentColor">{m.name}</text>
          <text x="171" y={m.y + 13} textAnchor="middle" fontSize="10" className="fill-slate-500 dark:fill-slate-400">
            {voltage} V supply
          </text>
          {conductor(ret, `M246 ${m.y} H292`, 288, m.y + 15)}
          {terminal(m.l as BitzerPoint, 74, m.y, m.l, 'above')}
          {terminal(m.n as BitzerPoint, 292, m.y, m.n, 'above')}
        </g>
      ))}
      <circle cx="28" cy="40" r="3.5" className="fill-slate-600 dark:fill-slate-300" />
      <text x="20" y="30" fontSize="10.5" className="fill-slate-500 dark:fill-slate-400">from FU-out</text>
    </svg>
  )

  // ---- Block C: the PTC loop, which is not part of the run chain ----
  const ptc = (
    <svg viewBox="0 0 330 118" className="w-full" role="group" aria-label="Motor PTC sensor loop">
      <text x="4" y="14" fontSize="11.5" fontWeight="700" fill="currentColor">
        SE-B3 sensor input · separate PTC loop
      </text>
      <rect x="10" y="26" width="310" height="62" rx="4"
        className="fill-transparent stroke-slate-300 dark:stroke-slate-600" strokeDasharray="5 4" strokeWidth="1.4" />
      {conductor(BITZER_WIRES.sensor, 'M52 60 H112', 50, 48)}
      <rect x="112" y="46" width="106" height="28" className="fill-slate-50 dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.4" />
      <text x="165" y="64" textAnchor="middle" fontSize="10.5" fill="currentColor">Motor winding PTC</text>
      {conductor(BITZER_WIRES.sensor, 'M218 60 H278')}
      {terminal('M1', 52, 60, 'M1', 'end')}
      {terminal('M2', 278, 60, 'M2')}
      <text x="10" y="104" fontSize="10.5" className="fill-slate-500 dark:fill-slate-400">
        Measure isolated. Never apply control voltage to this pair.
      </text>
    </svg>
  )

  // ---- Block D: the supply that stays live when you open the disconnect ----
  const foreign = (
    <svg viewBox="0 0 330 140" className="w-full" role="group" aria-label="Separate 230 volt INT280 supply">
      <text x="4" y="14" fontSize="11.5" fontWeight="700" fill="currentColor">
        INT280 · separate 230 V supply
      </text>
      {conductor(BITZER_WIRES.foreign, 'M26 62 H68', 50, 78)}
      <rect x="96" y="40" width="150" height="44" rx="3"
        className="fill-slate-50 dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.4" />
      <text x="171" y="60" textAnchor="middle" fontSize="11.5" fill="currentColor">INT280 oil regulator</text>
      <text x="171" y="74" textAnchor="middle" fontSize="10" className="fill-slate-500 dark:fill-slate-400">Level sensing + refill</text>
      {conductor(BITZER_WIRES.foreign, 'M246 62 H292', 288, 78)}
      {terminal('Reg-L', 68, 62, 'Reg-L', 'above')}
      {terminal('Reg-N', 292, 62, 'Reg-N', 'above')}
      <text x="10" y="106" fontSize="10.5" className="fill-amber-700 dark:fill-amber-400" fontWeight="600">
        Yellow = live with this panel&apos;s disconnect OPEN.
      </text>
      <text x="10" y="122" fontSize="10.5" className="fill-slate-500 dark:fill-slate-400">
        Its contact joins the {voltage} V string; its supply does not.
      </text>
    </svg>
  )

  const legend = [BITZER_WIRES.line, BITZER_WIRES.control, ret, BITZER_WIRES.foreign, BITZER_WIRES.sensor, BITZER_WIRES.earth]
    .filter((w, i, all) => all.findIndex(x => x.code === w.code) === i)

  return (
    <div className="space-y-3">
      <style>{WIRE_CSS}</style>

      <p className={note}>
        Reference drawing: relay contacts shown with modules de-energized; call and pressure
        switches shown closed. Probe readings still follow your active exercise.
      </p>

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <div className={`${card} lg:row-span-2`}>{safetyString}</div>
        <div className={card}>{supplies}</div>
        <div className={card}>{ptc}</div>
        <div className={`${card} lg:col-start-2`}>{foreign}</div>
      </div>

      <div className={card}>
        <h3 className={heading}>Conductor colours</h3>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {legend.map(w => (
            <li key={w.code} className="flex items-start gap-2">
              <svg width="24" height="10" className="mt-1 flex-shrink-0" aria-hidden>
                <rect width="24" height="10" rx="2" style={wireVars(w)} className="bz-f" />
              </svg>
              <span className="text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                <strong className="text-slate-800 dark:text-slate-100">{w.code}</strong> · {w.use}
                {!w.standard && <em className="text-slate-500 dark:text-slate-400"> — not a standard-assigned colour</em>}
              </span>
            </li>
          ))}
        </ul>
        <p className={`${note} mt-3`}>
          Colours follow NFPA 79 for a North-American panel, which is what the {voltage} V supply
          indicates. A Bitzer OEM sheet from Germany uses IEC 60204-1 instead: light blue for the
          grounded conductor and orange for the always-live foreign supply. Terminal numbers,
          wire colours and voltage still come from the drawing on the actual machine.
        </p>
      </div>
    </div>
  )
}
