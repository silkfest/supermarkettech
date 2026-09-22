'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, Zap, RotateCcw } from 'lucide-react'
import {
  RL_CIRCUITS,
  RL_COMPONENTS,
  RL_DIAGRAM_NOTES,
  RL_DOOR_COUNTS,
  RL_LOADS,
  RL_SEQUENCE,
  RL_SOURCES,
  RL_WIRE_COLOURS,
  RL_WIRE_COLOUR_NOTE
} from '@/lib/game/rl-wiring'

/** The RL sheet as a ladder you can poke at.
 *
 *  Drawn as a ladder rather than as a picture of the case because that is the
 *  shape the questions come in: what closes this contact, and what is holding
 *  this load out right now. Stepping the defrost sequence lights the rungs
 *  that are actually made, so "no voltage at the fan" stops being a mystery
 *  and starts being a step number. */

type Tab = 'diagram' | 'sequence' | 'data'

const byId = (id: string) => RL_COMPONENTS.find((c) => c.id === id)

/** Rungs, in ladder order. `x` positions are the load box; the contacts in
 *  front of it are drawn from `gates`. */
const RUNGS: {
  id: string
  y: number
  rail: 'c120' | 'c208'
  gates: { id: string; label: string; kind: 'nc' | 'no' | 'stat' }[]
}[] = [
  { id: 'asrelay', y: 56, rail: 'c120', gates: [{ id: 'rct', label: 'RCT', kind: 'stat' }] },
  {
    id: 'fans',
    y: 92,
    rail: 'c120',
    gates: [
      { id: 'asrelay', label: 'AS', kind: 'nc' },
      { id: 'fanrelay', label: 'FR', kind: 'nc' }
    ]
  },
  { id: 'doorash', y: 124, rail: 'c120', gates: [{ id: 'asrelay', label: 'AS', kind: 'nc' }] },
  { id: 'frameash', y: 156, rail: 'c120', gates: [{ id: 'asrelay', label: 'AS', kind: 'nc' }] },
  { id: 'pan', y: 188, rail: 'c120', gates: [{ id: 'asrelay', label: 'AS', kind: 'no' }] },
  { id: 'lights', y: 220, rail: 'c120', gates: [] },
  {
    id: 'heaters',
    y: 306,
    rail: 'c208',
    gates: [
      { id: 'dlt', label: 'DLT', kind: 'stat' },
      { id: 'dtt', label: 'DTT', kind: 'stat' }
    ]
  },
  { id: 'fanrelay', y: 342, rail: 'c208', gates: [] }
]

const LEFT = 34
const RIGHT = 330
const LOAD_X = 236

export default function RlWiringDiagram({
  dark = false,
  onClose
}: {
  dark?: boolean
  onClose?: () => void
}) {
  const [tab, setTab] = useState<Tab>('diagram')
  const [picked, setPicked] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [doors, setDoors] = useState(2) // index into RL_DOOR_COUNTS

  const seq = RL_SEQUENCE[step]
  const live = new Set(seq.live)
  const detail = picked ? byId(picked) : null

  const shell = dark
    ? 'bg-slate-900 border-slate-600 text-slate-100'
    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white'
  const muted = dark ? 'text-slate-300' : 'text-slate-700 dark:text-slate-300'
  const faint = dark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
  const chip = dark
    ? 'border-slate-600 bg-slate-800'
    : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900'
  const board = dark ? '#0f172a' : '#f8fafc'
  const ink = dark ? '#cbd5e1' : '#334155'
  const dim = dark ? '#475569' : '#cbd5e1'

  /** On the diagram tab every rung is drawn at full strength; on the sequence
   *  tab only what the sequence says is made. */
  const energised = (id: string) => tab !== 'sequence' || live.has(id)
  /** The component doing the switching this step — usually the one that just
   *  opened, which is why it gets its own mark instead of the live colour. */
  const acting = (id: string) => tab === 'sequence' && seq.actor === id

  function tabBtn(id: Tab, label: string) {
    return (
      <button
        key={id}
        onClick={() => setTab(id)}
        className={`min-h-9 px-2.5 rounded-lg border text-[11px] font-semibold ${
          tab === id
            ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
            : `${chip} ${muted}`
        }`}
      >
        {label}
      </button>
    )
  }

  return (
    <section
      className={`rounded-xl border p-3 space-y-3 ${shell}`}
      aria-label="Hussmann RL wiring diagram trainer"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Hussmann RL &middot; reach-in wiring diagram
          </p>
          <h3 className="font-bold text-[13px] leading-tight mt-0.5">
            Two circuits, four thermostats, two relays
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close the RL wiring diagram"
            className="-mt-1 -mr-1 p-1 rounded hover:bg-slate-500/20"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {tabBtn('diagram', 'Diagram')}
        {tabBtn('sequence', 'Defrost sequence')}
        {tabBtn('data', 'Electrical data')}
      </div>

      {tab === 'sequence' && (
        <div className={`rounded-lg border p-2.5 space-y-2 ${chip}`}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white">
              STEP {seq.n} / {RL_SEQUENCE.length}
            </span>
            <span className="text-[12px] font-bold flex-1 min-w-0 truncate">{seq.title}</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                seq.fans === 'running'
                  ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                  : 'text-red-600 dark:text-red-400 border-red-500/40'
              }`}
            >
              fans {seq.fans}
            </span>
          </div>
          <p className={`text-[12px] leading-relaxed ${muted}`}>{seq.body}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep((v) => Math.max(0, v - 1))}
              disabled={step === 0}
              className={`min-h-9 px-2.5 rounded-lg border text-[11px] flex items-center gap-1 disabled:opacity-40 ${chip}`}
            >
              <ChevronLeft size={12} /> Back
            </button>
            <div className="flex-1 flex justify-center gap-1.5" aria-hidden>
              {RL_SEQUENCE.map((_, n) => (
                <span
                  key={n}
                  className={`w-1.5 h-1.5 rounded-full ${
                    n === step ? 'bg-amber-500' : 'bg-slate-400/40'
                  }`}
                />
              ))}
            </div>
            {step === RL_SEQUENCE.length - 1 ? (
              <button
                onClick={() => setStep(0)}
                className={`min-h-9 px-2.5 rounded-lg border text-[11px] flex items-center gap-1 ${chip}`}
              >
                <RotateCcw size={12} /> Restart
              </button>
            ) : (
              <button
                onClick={() => setStep((v) => Math.min(RL_SEQUENCE.length - 1, v + 1))}
                className={`min-h-9 px-2.5 rounded-lg border text-[11px] flex items-center gap-1 ${chip}`}
              >
                Next <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'data' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] ${faint}`}>Case size:</span>
            {RL_DOOR_COUNTS.map((d, i) => (
              <button
                key={d}
                onClick={() => setDoors(i)}
                className={`min-h-9 px-2.5 rounded-lg border text-[11px] font-semibold ${
                  doors === i
                    ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : `${chip} ${muted}`
                }`}
              >
                {d} door
              </button>
            ))}
          </div>
          <div className={`rounded-lg border overflow-hidden ${chip}`}>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-1.5 font-semibold">Load</th>
                  <th className="px-2 py-1.5 font-semibold">V</th>
                  <th className="px-2 py-1.5 font-semibold">Amps</th>
                  <th className="px-2 py-1.5 font-semibold">Watts</th>
                </tr>
              </thead>
              <tbody>
                {RL_LOADS.map((r) => (
                  <tr key={r.load} className="border-t border-slate-500/20 align-top">
                    <td className={`px-2 py-1.5 ${muted}`}>
                      {r.load}
                      {r.note && <span className={`block text-[10px] mt-0.5 ${faint}`}>{r.note}</span>}
                    </td>
                    <td className={`px-2 py-1.5 ${muted}`}>{r.volts}</td>
                    <td className="px-2 py-1.5 font-bold text-amber-600 dark:text-amber-400">
                      {r.amps[doors].toFixed(2)}
                    </td>
                    <td className={`px-2 py-1.5 ${muted}`}>{r.watts[doors]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={`text-[11px] leading-relaxed ${faint}`}>
            Per-case figures from the published RL data sheets. Divide by the door count for a
            per-fan or per-door number before you compare it with a clamp.
          </p>
        </div>
      ) : (
        <div className={`rounded-lg border overflow-hidden ${chip}`}>
          <svg
            viewBox="0 0 364 392"
            className="w-full h-auto"
            style={{ background: board }}
            role="img"
            aria-label="Ladder diagram of the RL 120 volt case circuit and 208 volt defrost circuit"
          >
            {/* ---- 120 V rails ---- */}
            <text x={LEFT - 12} y={36} fontSize="9" fill={RL_CIRCUITS.c120.colour} fontWeight="700">
              120 V case circuit
            </text>
            <line
              x1={LEFT} y1={44} x2={LEFT} y2={236}
              stroke={RL_CIRCUITS.c120.colour} strokeWidth={2.5}
            />
            <line
              x1={RIGHT} y1={44} x2={RIGHT} y2={236}
              stroke={RL_CIRCUITS.c120.colour} strokeWidth={2.5}
            />
            <text x={LEFT - 10} y={250} fontSize="8" fill={ink}>L1</text>
            <text x={RIGHT - 4} y={250} fontSize="8" fill={ink}>N</text>

            {/* ---- 208 V rails ---- */}
            <text x={LEFT - 12} y={286} fontSize="9" fill={RL_CIRCUITS.c208.colour} fontWeight="700">
              208 V defrost circuit &mdash; from the defrost contactor
            </text>
            {/* The 208 V rails are only alive while the contactor is in;
                the 120 V case circuit is fed all the time. */}
            <line
              x1={LEFT} y1={294} x2={LEFT} y2={358}
              stroke={energised('contactor') ? RL_CIRCUITS.c208.colour : dim}
              strokeWidth={2.5}
            />
            <line
              x1={RIGHT} y1={294} x2={RIGHT} y2={358}
              stroke={energised('contactor') ? RL_CIRCUITS.c208.colour : dim}
              strokeWidth={2.5}
            />
            <text x={LEFT - 10} y={372} fontSize="8" fill={ink}>L1</text>
            <text x={RIGHT - 4} y={372} fontSize="8" fill={ink}>L2</text>

            {/* ---- terminal block ---- */}
            <g
              onClick={() => setPicked(picked === 'tb' ? null : 'tb')}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={LEFT - 16} y={262} width={64} height={16} rx={3}
                fill={energised('tb') ? RL_CIRCUITS.c120.colour : dim}
                opacity={energised('tb') ? 0.25 : 0.4}
                stroke={picked === 'tb' ? '#f59e0b' : 'transparent'}
                strokeWidth={1.6}
              />
              <text x={LEFT - 10} y={273} fontSize="8" fill={energised('tb') ? ink : dim}>terminal block</text>
            </g>

            {/* ---- rungs ---- */}
            {RUNGS.map((rung) => {
              const c = byId(rung.id)!
              const on = energised(rung.id)
              const rail = RL_CIRCUITS[rung.rail].colour
              const stroke = on ? rail : dim
              const sel = picked === rung.id
              return (
                <g key={`${rung.id}-${rung.y}`}>
                  {/* conductor across to the load */}
                  <line
                    x1={LEFT} y1={rung.y} x2={LOAD_X} y2={rung.y}
                    stroke={stroke} strokeWidth={on ? 2 : 1.2}
                    strokeDasharray={on ? undefined : '3 3'}
                  />
                  <line
                    x1={LOAD_X + 76} y1={rung.y} x2={RIGHT} y2={rung.y}
                    stroke={stroke} strokeWidth={on ? 2 : 1.2}
                    strokeDasharray={on ? undefined : '3 3'}
                  />

                  {/* contacts / thermostats in front of the load */}
                  {rung.gates.map((g, i) => {
                    const gx = LEFT + 34 + i * 58
                    const gon = energised(g.id)
                    return (
                      <g
                        key={g.id + i}
                        onClick={() => setPicked(picked === g.id ? null : g.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <rect
                          x={gx - 14} y={rung.y - 13} width={40} height={26} rx={4}
                          fill="none"
                          stroke={
                            picked === g.id || acting(g.id) ? '#f59e0b' : 'transparent'
                          }
                          strokeWidth={1.4}
                          strokeDasharray={acting(g.id) && picked !== g.id ? '3 2' : undefined}
                        />
                        {/* a contact is two pads and a blade; a stat gets a bulb */}
                        <line x1={gx - 9} y1={rung.y} x2={gx - 4} y2={rung.y} stroke={gon ? ink : dim} strokeWidth={1.6} />
                        <line x1={gx + 8} y1={rung.y} x2={gx + 13} y2={rung.y} stroke={gon ? ink : dim} strokeWidth={1.6} />
                        <line
                          x1={gx - 4}
                          y1={rung.y}
                          x2={gx + 8}
                          y2={g.kind === 'no' ? rung.y : rung.y - 6}
                          stroke={gon ? RL_CIRCUITS[rung.rail].colour : dim}
                          strokeWidth={2}
                        />
                        {g.kind === 'stat' && (
                          <circle
                            cx={gx + 2} cy={rung.y - 11} r={3}
                            fill="none"
                            stroke={gon ? ink : dim}
                            strokeWidth={1.2}
                          />
                        )}
                        <text
                          x={gx - 4} y={rung.y + 15} fontSize="7"
                          fill={gon ? ink : dim}
                          fontWeight={picked === g.id ? '700' : '400'}
                        >
                          {g.label}
                        </text>
                      </g>
                    )
                  })}

                  {/* the load itself */}
                  <g
                    onClick={() => setPicked(sel ? null : rung.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Selection is a ring, never a fill: the fill is what
                        says "energised", and on the sequence tab a selected
                        load that is OUT is the whole point of looking. */}
                    {(sel || acting(rung.id)) && (
                      <rect
                        x={LOAD_X - 3} y={rung.y - 12} width={82} height={24} rx={5}
                        fill="none" stroke="#f59e0b" strokeWidth={1.6}
                        strokeDasharray={acting(rung.id) && !sel ? '3 2' : undefined}
                      />
                    )}
                    <rect
                      x={LOAD_X} y={rung.y - 9} width={76} height={18} rx={3}
                      fill={on ? rail : 'transparent'}
                      opacity={on ? 0.18 : 1}
                      stroke={on ? rail : dim}
                      strokeWidth={1.4}
                      strokeDasharray={on ? undefined : '3 3'}
                    />
                    <text
                      x={LOAD_X + 38} y={rung.y + 3.5}
                      fontSize="7.5" textAnchor="middle"
                      fill={on ? ink : dim}
                      fontWeight={sel ? '700' : '500'}
                    >
                      {short(c.label)}
                    </text>
                  </g>
                </g>
              )
            })}

            {/* the contactor feeding the 208 V rail */}
            <g
              onClick={() => setPicked(picked === 'contactor' ? null : 'contactor')}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={LEFT - 16} y={366} width={92} height={16} rx={3}
                fill={energised('contactor') ? RL_CIRCUITS.c208.colour : dim}
                opacity={energised('contactor') ? 0.25 : 0.4}
                stroke={
                  picked === 'contactor' || acting('contactor') ? '#f59e0b' : 'transparent'
                }
                strokeWidth={1.6}
                strokeDasharray={
                  acting('contactor') && picked !== 'contactor' ? '3 2' : undefined
                }
              />
              <text x={LEFT - 10} y={377} fontSize="8" fill={energised('contactor') ? ink : dim}>defrost contactor</text>
            </g>
          </svg>
        </div>
      )}

      {tab !== 'data' && (
        <p className={`text-[11px] ${faint}`}>
          {tab === 'sequence' && seq.actor
            ? 'Solid rungs have power through them; dashed ones are out. The dashed amber mark is the device doing the switching at this step — often the one that has just opened. '
            : ''}
          Tap any contact, thermostat or load to read what it does and how it fails.
        </p>
      )}

      {detail && (
        <div className={`rounded-lg border p-2.5 space-y-1.5 ${chip}`}>
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-amber-500 flex-shrink-0" />
            <span className="text-[12px] font-bold flex-1">{detail.label}</span>
            <span className={`text-[10px] ${faint}`}>{RL_CIRCUITS[detail.circuit].label}</span>
          </div>
          <p className={`text-[11.5px] leading-relaxed ${muted}`}>
            <span className="font-semibold">Where: </span>
            {detail.where}
          </p>
          <p className={`text-[11.5px] leading-relaxed ${muted}`}>
            <span className="font-semibold">Does: </span>
            {detail.does}
          </p>
          <p className="text-[11.5px] leading-relaxed text-amber-700 dark:text-amber-400">
            <span className="font-semibold">Fails: </span>
            {detail.fails}
          </p>
          {detail.part && (
            <p className={`text-[11px] leading-relaxed ${faint}`}>
              <span className="font-semibold">Part: </span>
              {detail.part}
            </p>
          )}
          {detail.wires && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className={`text-[10px] ${faint}`}>Markers:</span>
              {detail.wires.map((w) => {
                const col = RL_WIRE_COLOURS.find((c) => c.code === w)
                return (
                  <span
                    key={w}
                    className="text-[10px] px-1.5 py-0.5 rounded-full border border-slate-500/30 flex items-center gap-1"
                  >
                    <span
                      className="w-2 h-2 rounded-full border border-slate-500/40"
                      style={{ background: col?.hex }}
                    />
                    {w}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      <details className={`rounded-lg border p-2.5 ${chip}`}>
        <summary className="text-[11.5px] font-semibold cursor-pointer">
          Wire marker colours and the notes printed on the sheet
        </summary>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {RL_WIRE_COLOURS.map((c) => (
            <span
              key={c.code}
              className="text-[10px] px-1.5 py-0.5 rounded-full border border-slate-500/30 flex items-center gap-1"
            >
              <span
                className="w-2 h-2 rounded-full border border-slate-500/40"
                style={{ background: c.hex }}
              />
              <span className="font-bold">{c.code}</span>
              <span className={faint}>{c.name}</span>
            </span>
          ))}
        </div>
        <p className={`text-[11px] leading-relaxed mt-2 ${muted}`}>{RL_WIRE_COLOUR_NOTE}</p>
        <ul className="space-y-1.5 mt-2">
          {RL_DIAGRAM_NOTES.map((n, i) => (
            <li key={i} className={`text-[11px] leading-relaxed pl-4 relative ${muted}`}>
              <span className="absolute left-0 top-[6px] w-1.5 h-1.5 rounded-full bg-amber-500" />
              {n}
            </li>
          ))}
        </ul>
        <p className={`text-[10px] leading-relaxed mt-2 ${faint}`}>
          Drawn from {RL_SOURCES.map((s) => s.doc).join(', ')}.
        </p>
      </details>
    </section>
  )
}

/** Labels are written for the detail card; the boxes are 76 px wide. */
function short(label: string): string {
  const map: Record<string, string> = {
    'Anti-sweat control relay': 'AS relay coil',
    'Evaporator fan assemblies': 'Fans',
    'Door anti-sweat heaters': 'Door heaters',
    'Frame anti-sweat heaters': 'Frame heaters',
    'Drain pan, bottom and plenum heaters': 'Pan heaters',
    'Door lamps and LED power supply': 'Lamps / LED',
    'Electric defrost heaters, front and rear': 'Defrost heaters',
    'Fan control relay': 'Fan relay coil'
  }
  return map[label] ?? label
}
