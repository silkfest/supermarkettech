'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, RotateCcw } from 'lucide-react'
import {
  contactBladeLift,
  RL_CAUTION,
  RL_COMPONENTS,
  RL_DOOR_COUNTS,
  RL_JUMPER_NOTES,
  RL_LEGEND_NOTES,
  RL_LIGHTING_NOTE,
  RL_LOADS,
  RL_MARKER_HEX,
  RL_PARTS,
  RL_ROWS,
  RL_SEQUENCES,
  RL_SHEET,
  RL_TERMINAL_GROUPS,
  RL_TERMINALS,
  RL_VARIANTS,
  RL_WIRE_COLOURS,
  type RlRow,
  type RlVariant
} from '@/lib/game/rl-wiring'

/** The RL sheet drawn the way it is drawn in the case: numbered terminals at
 *  each end of every rung, circled parts-list items over the devices, the
 *  marker letter on each leg, and the raceway terminal strip along the bottom.
 *
 *  Stepping the sequence lights the rungs that are actually made. That is the
 *  one thing the paper cannot do, and it is what separates a fan that is dead
 *  from a fan that is only waiting. */

type Tab = 'diagram' | 'sequence' | 'terminals' | 'data'

const byId = (id: string) => RL_COMPONENTS.find((c) => c.id === id)

const W = 380
const T_L = 20 // left terminal column
const T_R = 344 // right terminal column
const DEV_L = 62
const DEV_R = 330
const ROW_H = 30

export default function RlWiringDiagram({
  dark = false,
  onClose
}: {
  dark?: boolean
  onClose?: () => void
}) {
  const [tab, setTab] = useState<Tab>('diagram')
  const [variant, setVariant] = useState<RlVariant>('electric')
  const [picked, setPicked] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [doors, setDoors] = useState(2)

  const seq = RL_SEQUENCES[variant]
  const cur = seq[Math.min(step, seq.length - 1)]
  const live = new Set(cur.live)
  const detail = picked ? byId(picked) : null
  const rows = RL_ROWS.filter((r) => r.variant.includes(variant))

  const shell = dark
    ? 'bg-slate-900 border-slate-600 text-slate-100'
    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white'
  const muted = dark ? 'text-slate-300' : 'text-slate-700 dark:text-slate-300'
  const faint = dark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
  const chip = dark
    ? 'border-slate-600 bg-slate-800'
    : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900'
  const board = dark ? '#0f172a' : '#ffffff'
  const ink = dark ? '#cbd5e1' : '#1e293b'
  const dim = dark ? '#475569' : '#b8c2cf'

  const acting = (id: string) => tab === 'sequence' && cur.actor === id
  const rowLive = (r: RlRow) =>
    tab !== 'sequence' || r.section === 'field' || (r.load ? live.has(r.load) : true)

  function pill(active: boolean) {
    return active
      ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
      : `${chip} ${muted}`
  }

  // ── layout: stack the sections the sheet uses ──────────────────────────
  const s208 = rows.filter((r) => r.section === '208')
  const s120 = rows.filter((r) => r.section === '120')
  const sLight = rows.filter((r) => r.section === 'lights')
  const sField = rows.filter((r) => r.section === 'field')
  const blocks: { title: string; rail: [string, string]; rows: RlRow[] }[] = []
  if (s208.length) blocks.push({ title: '', rail: ['208 V', '208 V'], rows: s208 })
  blocks.push({ title: '', rail: ['120 V Power', 'Neutral'], rows: s120 })
  blocks.push({ title: '', rail: ['120 V Power', 'Neutral'], rows: sLight })
  blocks.push({ title: 'Field wired', rail: ['', ''], rows: sField })

  let y = 18
  const placed = blocks.map((b) => {
    const top = y
    y += 16 + b.rows.length * ROW_H + 8
    return { ...b, top, rows: b.rows.map((r, i) => ({ r, y: top + 16 + i * ROW_H })) }
  })
  const stripTop = y + 6
  const H = stripTop + 74

  return (
    <section
      className={`rounded-xl border p-3 space-y-3 ${shell}`}
      aria-label="Hussmann RL wiring diagram trainer"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Hussmann RL &middot; {RL_SHEET.part}
          </p>
          <h3 className="font-bold text-[13px] leading-tight mt-0.5">
            Fan and Heater Circuits &mdash; {RL_VARIANTS[variant].label}, Low Temperature
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
        {(
          [
            ['diagram', 'Diagram'],
            ['sequence', 'Sequence'],
            ['terminals', 'Terminals'],
            ['data', 'Electrical data']
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`min-h-9 px-2.5 rounded-lg border text-[11px] font-semibold ${pill(tab === id)}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab !== 'data' && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] ${faint}`}>Defrost:</span>
          {(Object.keys(RL_VARIANTS) as RlVariant[]).map((v) => (
            <button
              key={v}
              onClick={() => {
                setVariant(v)
                setStep(0)
              }}
              className={`min-h-9 px-2.5 rounded-lg border text-[11px] font-semibold ${pill(variant === v)}`}
            >
              {RL_VARIANTS[v].label}
            </button>
          ))}
        </div>
      )}

      {tab === 'sequence' && (
        <div className={`rounded-lg border p-2.5 space-y-2 ${chip}`}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white">
              STEP {cur.n} / {seq.length}
            </span>
            <span className="text-[12px] font-bold flex-1 min-w-0">{cur.title}</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${
                cur.fans === 'running'
                  ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                  : 'text-red-600 dark:text-red-400 border-red-500/40'
              }`}
            >
              fans {cur.fans}
            </span>
          </div>
          <p className={`text-[12px] leading-relaxed ${muted}`}>{cur.body}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep((v) => Math.max(0, v - 1))}
              disabled={step === 0}
              className={`min-h-9 px-2.5 rounded-lg border text-[11px] flex items-center gap-1 disabled:opacity-40 ${chip}`}
            >
              <ChevronLeft size={12} /> Back
            </button>
            <div className="flex-1 flex justify-center gap-1.5" aria-hidden>
              {seq.map((_, n) => (
                <span
                  key={n}
                  className={`w-1.5 h-1.5 rounded-full ${n === step ? 'bg-amber-500' : 'bg-slate-400/40'}`}
                />
              ))}
            </div>
            {step >= seq.length - 1 ? (
              <button
                onClick={() => setStep(0)}
                className={`min-h-9 px-2.5 rounded-lg border text-[11px] flex items-center gap-1 ${chip}`}
              >
                <RotateCcw size={12} /> Restart
              </button>
            ) : (
              <button
                onClick={() => setStep((v) => Math.min(seq.length - 1, v + 1))}
                className={`min-h-9 px-2.5 rounded-lg border text-[11px] flex items-center gap-1 ${chip}`}
              >
                Next <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'data' && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] ${faint}`}>Case size:</span>
            {RL_DOOR_COUNTS.map((d, i) => (
              <button
                key={d}
                onClick={() => setDoors(i)}
                className={`min-h-9 px-2.5 rounded-lg border text-[11px] font-semibold ${pill(doors === i)}`}
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
            Per-case figures. Divide by the door count for a per-fan or per-door number before you
            compare it with a clamp.
          </p>
        </div>
      )}

      {tab === 'terminals' && (
        <div className="space-y-2">
          {(Object.keys(RL_TERMINAL_GROUPS) as (keyof typeof RL_TERMINAL_GROUPS)[]).map((g) => {
            const list = RL_TERMINALS.filter((t) => t.group === g)
            if (!list.length) return null
            return (
              <div key={g} className={`rounded-lg border p-2.5 ${chip}`}>
                <p className="text-[11px] font-semibold mb-1.5">{RL_TERMINAL_GROUPS[g]}</p>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((t) => (
                    <span
                      key={t.n}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-500/40 flex items-center gap-1"
                    >
                      <span className="font-bold tabular-nums">{t.n}</span>
                      <span
                        className="w-2 h-2 rounded-full border border-slate-500/40"
                        style={{ background: RL_MARKER_HEX[t.marker] }}
                      />
                      <span className={faint}>{t.marker}</span>
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
          <ul className="space-y-1.5">
            {RL_JUMPER_NOTES.map((n, i) => (
              <li key={i} className={`text-[11px] leading-relaxed pl-4 relative ${muted}`}>
                <span className="absolute left-0 top-[6px] w-1.5 h-1.5 rounded-full bg-amber-500" />
                {n}
              </li>
            ))}
          </ul>
          <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
            {RL_CAUTION}
          </p>
        </div>
      )}

      {(tab === 'diagram' || tab === 'sequence') && (
        <div className={`rounded-lg border overflow-hidden ${chip}`}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            style={{ background: board }}
            role="img"
            aria-label={`Wiring diagram, ${RL_VARIANTS[variant].label}`}
          >
            {placed.map((b) => (
              <g key={b.rail.join('-') + b.top}>
                {b.rail[0] && (
                  <>
                    <text x={T_L - 12} y={b.top + 8} fontSize="7" fill={ink} fontWeight="700">
                      {b.rail[0]}
                    </text>
                    <text
                      x={T_R + 14} y={b.top + 8} fontSize="7" fill={ink}
                      fontWeight="700" textAnchor="end"
                    >
                      {b.rail[1]}
                    </text>
                  </>
                )}
                {b.title && (
                  <text x={T_L - 12} y={b.top + 8} fontSize="7" fill={ink} fontWeight="700">
                    {b.title}
                  </text>
                )}
                {b.rows.map(({ r, y: ry }) => {
                  const on = rowLive(r)
                  const stroke = on ? ink : dim
                  const n = r.devices.length
                  const span = DEV_R - DEV_L
                  const at = (i: number) => DEV_L + (span * (i + 0.5)) / n
                  return (
                    <g key={r.id}>
                      {/* conductors */}
                      <line
                        x1={T_L + 14} y1={ry} x2={at(0) - 16} y2={ry}
                        stroke={stroke} strokeWidth={on ? 1.4 : 1}
                        strokeDasharray={on ? undefined : '3 3'}
                      />
                      <line
                        x1={at(n - 1) + 16} y1={ry} x2={T_R} y2={ry}
                        stroke={stroke} strokeWidth={on ? 1.4 : 1}
                        strokeDasharray={on ? undefined : '3 3'}
                      />
                      {r.devices.slice(0, -1).map((_, i) => (
                        <line
                          key={i}
                          x1={at(i) + 16} y1={ry} x2={at(i + 1) - 16} y2={ry}
                          stroke={stroke} strokeWidth={on ? 1.4 : 1}
                          strokeDasharray={on ? undefined : '3 3'}
                        />
                      ))}

                      {/* marker letters, as printed on each leg */}
                      <Marker x={T_L + 22} y={ry} code={r.markers[0]} ink={on ? ink : dim} />
                      <Marker x={T_R - 12} y={ry} code={r.markers[1]} ink={on ? ink : dim} />

                      {/* terminals */}
                      {r.left.terminal !== undefined && (
                        <Terminal n={r.left.terminal} x={T_L} y={ry} ink={ink} dim={dim} on={on} />
                      )}
                      {r.right.terminal !== undefined && (
                        <Terminal n={r.right.terminal} x={T_R} y={ry} ink={ink} dim={dim} on={on} />
                      )}
                      {r.left.rail && (
                        <text x={T_L - 12} y={ry + 3} fontSize="6" fill={dim}>
                          {r.left.rail}
                        </text>
                      )}
                      {r.right.rail && (
                        <text x={T_R + 14} y={ry + 3} fontSize="6" fill={dim} textAnchor="end">
                          {r.right.rail}
                        </text>
                      )}

                      {/* devices */}
                      {r.devices.map((d, i) => (
                        <g
                          key={d.id + i}
                          onClick={() => setPicked(picked === d.id ? null : d.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          {(picked === d.id || acting(d.id)) && (
                            <rect
                              x={at(i) - 22} y={ry - 15} width={44} height={30} rx={4}
                              fill="none" stroke="#f59e0b" strokeWidth={1.4}
                              strokeDasharray={acting(d.id) && picked !== d.id ? '3 2' : undefined}
                            />
                          )}
                          <Device kind={d.kind} x={at(i)} y={ry} on={on} ink={ink} dim={dim} />
                          <text
                            x={at(i)} y={ry - 8} fontSize="5.5" textAnchor="middle"
                            fill={on ? ink : dim}
                          >
                            {d.label.length > 30 ? d.label.slice(0, 29) + '…' : d.label}
                          </text>
                          {d.item !== undefined && (
                            <>
                              {/* The sheet sets the circled item number right
                                  after the label, so track the label width
                                  instead of a fixed offset that longer names
                                  would sit on top of. */}
                              <circle
                                cx={at(i) + labelW(d.label) / 2 + 6} cy={ry - 10} r={4.4}
                                fill="none" stroke={on ? ink : dim} strokeWidth={0.7}
                              />
                              <text
                                x={at(i) + labelW(d.label) / 2 + 6} y={ry - 8.2}
                                fontSize="5.2" textAnchor="middle"
                                fill={on ? ink : dim}
                              >
                                {d.item}
                              </text>
                            </>
                          )}
                          {d.mark && (
                            <text
                              x={at(i)} y={ry + 12} fontSize="5" textAnchor="middle"
                              fill={on ? ink : dim}
                            >
                              {d.mark}
                            </text>
                          )}
                        </g>
                      ))}
                    </g>
                  )
                })}
              </g>
            ))}

            {/* ── terminal blocks in raceway ── */}
            <line
              x1={8} y1={stripTop - 6} x2={W - 8} y2={stripTop - 6}
              stroke={dim} strokeWidth={0.8} strokeDasharray="4 3"
            />
            <text x={W / 2} y={stripTop + 6} fontSize="7" textAnchor="middle" fill={ink} fontWeight="700">
              Terminal Blocks in Raceway
            </text>
            {RL_TERMINALS.map((t, i) => {
              const bx = 14 + i * 17
              return (
                <g key={t.n}>
                  <text x={bx + 6} y={stripTop + 19} fontSize="5" textAnchor="middle" fill={ink}>
                    {t.marker}
                  </text>
                  <rect
                    x={bx} y={stripTop + 22} width={12} height={12} rx={1.5}
                    fill="none" stroke={ink} strokeWidth={0.7}
                  />
                  <text x={bx + 6} y={stripTop + 31} fontSize="6" textAnchor="middle" fill={ink}>
                    {t.n}
                  </text>
                  <rect
                    x={bx + 2} y={stripTop + 36} width={8} height={3}
                    fill={RL_MARKER_HEX[t.marker]} stroke={dim} strokeWidth={0.3}
                  />
                </g>
              )
            })}
            <text x={14} y={stripTop + 52} fontSize="5.5" fill={ink}>
              1&ndash;8 defrost heaters (208 V)
            </text>
            <text x={14} y={stripTop + 61} fontSize="5.5" fill={ink}>
              10&ndash;16 fans &amp; A.S. (120 V) &middot; 17 lights &middot; 20 lights neutral &middot; 21&ndash;26 fans &amp; A.S. neutral
            </text>
            <text x={14} y={stripTop + 70} fontSize="5.5" fill={dim}>
              Heavy lines inside the blocks are permanent internal jumpers.
            </text>
          </svg>
        </div>
      )}

      {(tab === 'diagram' || tab === 'sequence') && (
        <p className={`text-[11px] ${faint}`}>
          {tab === 'sequence'
            ? 'Solid rungs have power through them; dashed ones are out. The dashed amber mark is the device doing the switching at this step — often the one that has just opened. '
            : ''}
          Tap any device to read what it does and how it fails.
        </p>
      )}

      {detail && (
        <div className={`rounded-lg border p-2.5 space-y-1.5 ${chip}`}>
          <div className="flex items-center gap-2">
            {detail.item !== undefined && (
              <span className="text-[10px] w-4 h-4 rounded-full border border-amber-500 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                {detail.item}
              </span>
            )}
            <span className="text-[12px] font-bold flex-1">{detail.label}</span>
            {!!detail.terminals?.length && (
              <span className={`text-[10px] ${faint}`}>
                terminals {detail.terminals.join(', ')}
              </span>
            )}
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
        </div>
      )}

      <details className={`rounded-lg border p-2.5 ${chip}`}>
        <summary className="text-[11.5px] font-semibold cursor-pointer">
          Legend, parts list and the notes printed on the sheet
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
        <ul className="space-y-1.5 mt-2">
          {RL_LEGEND_NOTES.map((n, i) => (
            <li key={i} className={`text-[11px] leading-relaxed pl-4 relative ${muted}`}>
              <span className="absolute left-0 top-[6px] w-1.5 h-1.5 rounded-full bg-amber-500" />
              {n}
            </li>
          ))}
        </ul>
        <p className="text-[11px] font-semibold mt-2.5 mb-1">Parts list</p>
        <div className="flex flex-wrap gap-1.5">
          {RL_PARTS.map((p) => (
            <span
              key={p.item}
              className="text-[10px] px-1.5 py-0.5 rounded-full border border-slate-500/30 flex items-center gap-1"
            >
              <span className="w-3.5 h-3.5 rounded-full border border-slate-500/50 flex items-center justify-center">
                {p.item}
              </span>
              <span className={faint}>{p.label}</span>
            </span>
          ))}
        </div>
        <p className={`text-[11px] leading-relaxed mt-2 ${muted}`}>{RL_LIGHTING_NOTE}</p>
        <p className={`text-[10px] leading-relaxed mt-2 ${faint}`}>
          {RL_SHEET.title}, {RL_SHEET.part} &mdash; {RL_SHEET.maker}
        </p>
      </details>
    </section>
  )
}

/** Rough advance width of the 5.5 px label text, for placing the circled
 *  parts-list number just after it the way the sheet does. */
function labelW(label: string): number {
  return Math.min(label.length, 30) * 2.55
}

function Terminal({
  n, x, y, ink, dim, on
}: { n: number; x: number; y: number; ink: string; dim: string; on: boolean }) {
  return (
    <g>
      <rect
        x={x} y={y - 6} width={14} height={12} rx={1.5}
        fill="none" stroke={on ? ink : dim} strokeWidth={0.8}
      />
      <text x={x + 7} y={y + 3} fontSize="6.5" textAnchor="middle" fill={on ? ink : dim}>
        {n}
      </text>
    </g>
  )
}

function Marker({ x, y, code, ink }: { x: number; y: number; code: string; ink: string }) {
  return (
    <text x={x} y={y - 3} fontSize="5.5" fill={ink} textAnchor="middle">
      {code}
    </text>
  )
}

/** Sheet symbols: a coil is a circle marked C, a heater is a resistor, a fan
 *  is a blade, a contact is a blade across two pads. */
function Device({
  kind, x, y, on, ink, dim
}: {
  kind: string
  x: number
  y: number
  on: boolean
  ink: string
  dim: string
}) {
  const c = on ? ink : dim
  if (kind === 'coil')
    return (
      <g>
        <circle cx={x} cy={y} r={5.5} fill="none" stroke={c} strokeWidth={0.9} />
        <text x={x} y={y + 2.2} fontSize="5.5" textAnchor="middle" fill={c}>C</text>
        <circle cx={x - 8} cy={y} r={1.4} fill="none" stroke={c} strokeWidth={0.7} />
        <circle cx={x + 8} cy={y} r={1.4} fill="none" stroke={c} strokeWidth={0.7} />
      </g>
    )
  if (kind === 'heater')
    return (
      <g>
        <circle cx={x - 12} cy={y} r={1.5} fill="none" stroke={c} strokeWidth={0.7} />
        <polyline
          points={`${x - 10},${y} ${x - 8},${y - 4} ${x - 4},${y + 4} ${x},${y - 4} ${x + 4},${y + 4} ${x + 8},${y - 4} ${x + 10},${y}`}
          fill="none" stroke={c} strokeWidth={0.9}
        />
        <circle cx={x + 12} cy={y} r={1.5} fill="none" stroke={c} strokeWidth={0.7} />
      </g>
    )
  if (kind === 'fan')
    return (
      <g>
        <circle cx={x} cy={y} r={3} fill="none" stroke={c} strokeWidth={0.9} />
        <path d={`M${x - 3},${y - 3} L${x - 10},${y - 6} L${x - 10},${y + 6} Z`} fill="none" stroke={c} strokeWidth={0.8} />
        <path d={`M${x + 3},${y - 3} L${x + 10},${y - 6} L${x + 10},${y + 6} Z`} fill="none" stroke={c} strokeWidth={0.8} />
      </g>
    )
  if (kind === 'ref')
    return (
      <rect
        x={x - 16} y={y - 5} width={32} height={10} rx={1}
        fill="none" stroke={dim} strokeWidth={0.7} strokeDasharray="2 2"
      />
    )
  // contact, stat, switch
  return (
    <g>
      <circle cx={x - 7} cy={y} r={1.4} fill="none" stroke={c} strokeWidth={0.7} />
      <circle cx={x + 7} cy={y} r={1.4} fill="none" stroke={c} strokeWidth={0.7} />
      <line
        x1={x - 6} y1={y} x2={x + 6} y2={y - contactBladeLift(on)}
        stroke={c} strokeWidth={1.1}
      />
      {kind === 'stat' && (
        <path d={`M${x - 6},${y + 6} q6,-4 12,0`} fill="none" stroke={c} strokeWidth={0.8} />
      )}
    </g>
  )
}
