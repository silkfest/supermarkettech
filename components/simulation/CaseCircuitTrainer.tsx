'use client'
import { useState, useCallback } from 'react'
import { Zap, RotateCcw, Dices, CheckCircle2, XCircle, Eye } from 'lucide-react'
import { saveSimAttempt } from '@/lib/simulation/attempts'

// ── Case Circuit Trainer — DT bunker fan + defrost circuits (120/208 V) ─────────
// Two rungs off the case's field wiring, switched by the defrost relay:
//   FAN rung (live in refrigeration):  L1 → fuse → relay NC → fan-delay klixon → fans → N
//   DEFROST rung (live in defrost):    L1 → fuse → relay NO → hi-limit → heaters → N
// The twist real techs know: you have to probe the rung that's COMMANDED. A dead
// defrost rung during refrigeration is normal — flip the case into defrost first.

type Rung = 'fan' | 'defrost'

interface CircuitElement {
  id: string
  rung: Rung
  name: string
  short: string
  kind: 'fuse' | 'contact' | 'wire' | 'load'
  spec: string
  faultLabel: string
  reveal: string
}

// Element 0 (fuse) is shared: drawn once, feeds both rungs.
const ELEMENTS: CircuitElement[] = [
  { id: 'fuse', rung: 'fan', name: 'Case Fuse', short: 'FU', kind: 'fuse', spec: '15 A',
    faultLabel: 'Case circuit fuse blown',
    reveal: 'The whole case is dead — fans AND defrost. One measurement at T1 tells you: 0 V right after the fuse means nothing downstream ever had a chance.' },
  { id: 'relayNC', rung: 'fan', name: 'Defrost Relay — NC contact', short: 'R-NC', kind: 'contact', spec: 'opens in defrost',
    faultLabel: 'Defrost relay NC contact burnt open',
    reveal: 'The NC contact feeds the fans in refrigeration. Burnt open, the fans are dead in refrigeration but the heaters still work in defrost — the relay coil is fine, just one contact is gone.' },
  { id: 'klixon', rung: 'fan', name: 'Fan Delay Klixon', short: 'KLIX', kind: 'contact', spec: 'closes ≤ ~20 °F coil',
    faultLabel: 'Fan delay klixon stuck open',
    reveal: 'The klixon holds the fans off after defrost until the coil is cold — so warm air never blows on product. Stuck open, the fans NEVER come back: cold coil, good motors, 0 V past the klixon. The single most-missed case fault.' },
  { id: 'fanWire', rung: 'fan', name: 'Fan Harness (T3→T4)', short: 'WIRE', kind: 'wire', spec: 'raceway pull',
    faultLabel: 'Broken fan harness wire',
    reveal: 'Case harnesses live in a wet, frosty raceway — broken conductors and green corroded lugs are everyday finds. Every device tests fine; the WIRE is open.' },
  { id: 'fans', rung: 'fan', name: 'Evap Fan Motors', short: 'FANS', kind: 'load', spec: '2 × 0.4 A',
    faultLabel: 'Both fan motors open (burned out)',
    reveal: '120 V across the fan feed with zero amps and no rotation = open windings. One dead motor still leaves the other running; BOTH dead with voltage present means motors, not circuit.' },
  { id: 'relayNO', rung: 'defrost', name: 'Defrost Relay — NO contact', short: 'R-NO', kind: 'contact', spec: 'closes in defrost',
    faultLabel: 'Defrost relay NO contact failed',
    reveal: 'The NO contact feeds the heaters when defrost is called. If it never closes, the case skips every defrost and the coil ices over a week. Probe it IN DEFROST — in refrigeration an open NO contact is normal.' },
  { id: 'hilimit', rung: 'defrost', name: 'Heater Hi-Limit Klixon', short: 'HI-LIM', kind: 'contact', spec: 'opens ~70 °F',
    faultLabel: 'Heater hi-limit tripped/open',
    reveal: 'The hi-limit protects against a runaway defrost. Open, the heaters never energize — same iced-coil complaint as a failed relay, but the voltage dies one device later. That one extra hop is the whole diagnosis.' },
  { id: 'heaters', rung: 'defrost', name: 'Defrost Heaters', short: 'HTRS', kind: 'load', spec: '2 × 4.2 A',
    faultLabel: 'Both heater elements open',
    reveal: 'Full voltage across the heater feed, zero amps: elements are open. One element open halves the amps and leaves half-melted defrosts; both open and the coil never clears at all.' },
]

const fanElems = ELEMENTS.filter(e => e.rung === 'fan')
const defElems = [ELEMENTS[0], ...ELEMENTS.filter(e => e.rung === 'defrost')]  // fuse is shared

// Layout: two ladder rows sharing L1/fuse at top-left. viewBox 430×300.
// Fan rung nodes:    L1(28,60) FU→ T1(120,60) R-NC→ T2(205,60) KLIX→ T3(290,60) WIRE→ T4(360,60)... loads then N
// Too many for one row at 430 → snake each rung over: keep each rung to ONE row by
// tightening spacing (5 elements incl. loads).
const FAN_NODES: { x: number; y: number; label: string }[] = [
  { x: 24, y: 70, label: 'L1' },
  { x: 100, y: 70, label: 'T1' },
  { x: 180, y: 70, label: 'T2' },
  { x: 260, y: 70, label: 'T3' },
  { x: 330, y: 70, label: 'T4' },
  { x: 402, y: 70, label: 'N' },
]
const DEF_NODES: { x: number; y: number; label: string }[] = [
  { x: 24, y: 190, label: 'L1' },
  { x: 100, y: 190, label: 'T1' },
  { x: 190, y: 190, label: 'T5' },
  { x: 285, y: 190, label: 'T6' },
  { x: 402, y: 190, label: 'N' },
]
// symbol centres between nodes
const FAN_SYMS: [number, number][] = [[62, 70], [140, 70], [220, 70], [295, 70], [366, 70]]
const DEF_SYMS: [number, number][] = [[62, 190], [145, 190], [237, 190], [343, 190]]

const HOT = '#f59e0b'
const DEAD = '#94a3b8'
const IDLE = '#64748b'

/** Potential at node i of a rung: elements are a series chain node0→…→nodeN(=neutral).
 *  effOpen = index of the first open element (fault, un-commanded relay contact, or
 *  the load itself when everything's closed). Nodes ≤ effOpen read 120 V. */
function rungPotential(node: number, elems: CircuitElement[], nodeCount: number, faultId: string | null, commanded: boolean): number {
  if (node >= nodeCount - 1) return 0
  let effOpen = elems.length - 1     // healthy: the load drops the voltage
  for (let i = 0; i < elems.length; i++) {
    const el = elems[i]
    const isRelay = el.id === 'relayNC' || el.id === 'relayNO'
    const relayOpen = isRelay && !commanded
    const faulted = faultId === el.id
    if (relayOpen || faulted) { effOpen = i; break }
  }
  return node <= effOpen ? 120 : 0
}

function ElementSymbol({ el, x, y, open, reveal }: { el: CircuitElement; x: number; y: number; open: boolean; reveal: boolean }) {
  const stroke = reveal && open ? '#ef4444' : '#475569'
  return (
    <g transform={`translate(${x},${y})`}>
      {el.kind === 'fuse' && (
        <g>
          <rect x={-15} y={-6.5} width={30} height={13} rx={6.5} fill="none" stroke={stroke} strokeWidth={2} />
          <line x1={-15} y1={0} x2={15} y2={0} stroke={stroke} strokeWidth={2} strokeDasharray={reveal && open ? '3 4' : undefined} />
        </g>
      )}
      {el.kind === 'contact' && (
        <g>
          <circle cx={-10} cy={0} r={2.8} fill={stroke} />
          <circle cx={10} cy={0} r={2.8} fill={stroke} />
          <line x1={-10} y1={0} x2={reveal && open ? 7 : 10} y2={reveal && open ? -10 : 0} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
        </g>
      )}
      {el.kind === 'wire' && reveal && open && (
        <g>
          <line x1={-6} y1={-6} x2={6} y2={6} stroke="#ef4444" strokeWidth={2.2} strokeLinecap="round" />
          <line x1={6} y1={-6} x2={-6} y2={6} stroke="#ef4444" strokeWidth={2.2} strokeLinecap="round" />
        </g>
      )}
      {el.kind === 'load' && (
        <g>
          <path d="M-14,0 l3,-6 l5,12 l5,-12 l5,12 l3,-6" fill="none" stroke={stroke} strokeWidth={2}
            strokeDasharray={reveal && open ? '3 3' : undefined} strokeLinejoin="round" />
        </g>
      )}
    </g>
  )
}

export default function CaseCircuitTrainer({ defrostMode = false }: { defrostMode?: boolean }) {
  const [mode, setMode] = useState<'practice' | 'mystery'>('practice')
  const [practiceFault, setPracticeFault] = useState<string | null>(null)
  const [mysteryFault, setMysteryFault] = useState<string | null>(null)
  const [caseState, setCaseState] = useState<'refrigeration' | 'defrost'>(defrostMode ? 'defrost' : 'refrigeration')
  const [probes, setProbes] = useState<{ rung: Rung; red: number | null; black: number | null }>({ rung: 'fan', red: null, black: null })
  const [probeCount, setProbeCount] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)
  const [wrongGuesses, setWrongGuesses] = useState(0)

  const activeFault = mode === 'practice' ? practiceFault : mysteryFault
  const reveal = mode === 'practice' || solved
  const fanCommanded = caseState === 'refrigeration'
  const defCommanded = caseState === 'defrost'

  // running states: rung commanded AND no element in its chain is faulted
  const fanChainClosed = fanCommanded && !fanElems.some(el => el.id === activeFault)
  const defChainClosed = defCommanded && !defElems.some(el => el.id === activeFault)

  const newMystery = useCallback(() => {
    setMysteryFault(ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)].id)
    setProbes({ rung: 'fan', red: null, black: null }); setProbeCount(0)
    setPicked(null); setSolved(false); setWrongGuesses(0)
  }, [])

  function enterMode(m: 'practice' | 'mystery') {
    setMode(m)
    setProbes({ rung: 'fan', red: null, black: null }); setProbeCount(0)
    setPicked(null); setSolved(false); setWrongGuesses(0)
    if (m === 'mystery') setMysteryFault(ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)].id)
  }

  function tapNode(rung: Rung, i: number) {
    if (probes.rung !== rung || probes.red === null) { setProbes({ rung, red: i, black: null }); return }
    if (probes.black === null && i !== probes.red) {
      setProbeCount(c => c + 1)
      setProbes({ rung, red: probes.red, black: i })
      return
    }
    setProbes({ rung, red: i, black: null })
  }

  function confirmDiagnosis() {
    if (!picked || !mysteryFault || solved) return
    if (picked === mysteryFault) {
      setSolved(true)
      const score = Math.max(30, 100 - Math.max(0, probeCount - 5) * 10 - wrongGuesses * 20)
      saveSimAttempt({
        rack: 'dt-bunker', scenarioId: 'case-circuit',
        scenarioName: 'DT Bunker — Case Circuit Fault', difficulty: 'Intermediate',
        mode: 'wiring', score, correct: 1, total: 1, falsePositives: wrongGuesses,
      })
    } else {
      setWrongGuesses(w => w + 1)
      setPicked(null)
    }
  }

  const reading = probes.red !== null && probes.black !== null
    ? (() => {
        const elems = probes.rung === 'fan' ? fanElems : defElems
        const nodes = probes.rung === 'fan' ? FAN_NODES : DEF_NODES
        const commanded = probes.rung === 'fan' ? fanCommanded : defCommanded
        return Math.abs(
          rungPotential(probes.red!, elems, nodes.length, activeFault, commanded) -
          rungPotential(probes.black!, elems, nodes.length, activeFault, commanded)
        )
      })()
    : null

  const renderRung = (rung: Rung) => {
    const elems = rung === 'fan' ? fanElems : defElems
    const nodes = rung === 'fan' ? FAN_NODES : DEF_NODES
    const syms = rung === 'fan' ? FAN_SYMS : DEF_SYMS
    const commanded = rung === 'fan' ? fanCommanded : defCommanded
    const showColors = reveal
    const segColor = (i: number) => {
      if (!showColors) return IDLE
      return rungPotential(i, elems, nodes.length, activeFault, commanded) > 0 ? HOT : DEAD
    }
    return (
      <g key={rung}>
        {/* rung title */}
        <text x={24} y={nodes[0].y - 34} fontSize={10.5} fontWeight={800} fill={commanded ? '#16a34a' : '#94a3b8'}>
          {rung === 'fan' ? 'FAN CIRCUIT' : 'DEFROST CIRCUIT'} {commanded ? '· commanded ON' : '· not commanded'}
        </text>
        {elems.map((el, i) => {
          const a = nodes[i], b = nodes[i + 1]
          const open = activeFault === el.id || ((el.id === 'relayNC' || el.id === 'relayNO') && !commanded)
          const [sx, sy] = syms[i]
          return (
            <g key={el.id + rung}>
              <line x1={a.x} y1={a.y} x2={sx - 18} y2={a.y} stroke={segColor(i)} strokeWidth={3} />
              <line x1={sx + 18} y1={a.y} x2={b.x} y2={b.y} stroke={segColor(i + 1)} strokeWidth={3} />
              <ElementSymbol el={el} x={sx} y={sy} open={open} reveal={reveal || el.id === 'relayNC' || el.id === 'relayNO'} />
              <text x={sx} y={sy + 26} textAnchor="middle" fontSize={9.5} fontWeight={800}
                fill={reveal && activeFault === el.id ? '#ef4444' : '#64748b'}>{el.short}</text>
              <text x={sx} y={sy + 37} textAnchor="middle" fontSize={7.5} fill="#94a3b8">{el.spec}</text>
              {mode === 'mystery' && !solved && (
                <g onClick={() => setPicked(picked === el.id ? null : el.id)} style={{ cursor: 'pointer' }}>
                  <rect x={sx - 22} y={sy - 18} width={44} height={38} rx={7}
                    fill={picked === el.id ? 'rgba(139,92,246,0.12)' : 'transparent'}
                    stroke={picked === el.id ? '#8b5cf6' : 'transparent'} strokeWidth={2} strokeDasharray="5 3" />
                </g>
              )}
            </g>
          )
        })}
        {nodes.map((n, i) => {
          const isRed = probes.rung === rung && probes.red === i
          const isBlack = probes.rung === rung && probes.black === i
          return (
            <g key={i} onClick={() => tapNode(rung, i)} style={{ cursor: 'pointer' }}>
              <circle cx={n.x} cy={n.y} r={12} fill="transparent" />
              <circle cx={n.x} cy={n.y} r={5}
                fill={isRed ? '#dc2626' : isBlack ? '#1e293b' : '#e2e8f0'}
                stroke={isRed ? '#dc2626' : isBlack ? '#0f172a' : '#64748b'} strokeWidth={1.5} />
              {isBlack && <circle cx={n.x} cy={n.y} r={2} fill="#e2e8f0" />}
              <text x={n.x} y={n.y - 10} textAnchor="middle" fontSize={9} fontWeight={700}
                fill={isRed ? '#dc2626' : isBlack ? '#334155' : '#94a3b8'}>{n.label}</text>
            </g>
          )
        })}
      </g>
    )
  }

  const activeDef = activeFault ? ELEMENTS.find(e => e.id === activeFault) : null

  return (
    <div className="space-y-3">
      {/* Mode + case-state controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
          <button onClick={() => enterMode('practice')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'practice' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            Practice
          </button>
          <button onClick={() => enterMode('mystery')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'mystery' ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            Find the Fault
          </button>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
          <button onClick={() => setCaseState('refrigeration')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${caseState === 'refrigeration' ? 'bg-cyan-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            ❄ Refrigeration
          </button>
          <button onClick={() => setCaseState('defrost')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${caseState === 'defrost' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            🔥 Defrost
          </button>
        </div>
        {mode === 'mystery' && (
          <button onClick={newMystery}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
            <Dices size={12}/> New fault
          </button>
        )}
      </div>

      {mode === 'practice' && (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Inject fault:</label>
          <select value={practiceFault ?? ''} onChange={e => setPracticeFault(e.target.value || null)}
            className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100">
            <option value="">No fault — healthy case</option>
            {ELEMENTS.map(el => <option key={el.id} value={el.id}>{el.faultLabel}</option>)}
          </select>
        </div>
      )}

      {/* Status chips */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${fanChainClosed
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
          : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-400/40'}`}>
          <span className={`w-2 h-2 rounded-full ${fanChainClosed ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          FANS {fanChainClosed ? 'RUNNING' : 'OFF'}
        </span>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${defChainClosed
          ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40'
          : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-400/40'}`}>
          <span className={`w-2 h-2 rounded-full ${defChainClosed ? 'bg-orange-500 animate-pulse' : 'bg-slate-400'}`} />
          HEATERS {defChainClosed ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* Ladder */}
      <div className="max-w-2xl">
        <svg viewBox="0 0 430 250" className="w-full h-auto select-none" role="img" aria-label="DT bunker case circuit ladder">
          {renderRung('fan')}
          {renderRung('defrost')}
        </svg>
      </div>

      {/* Meter */}
      <div className="flex items-center gap-3 flex-wrap rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5">
        <Zap size={14} className="text-amber-500 flex-shrink-0" />
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          <span className="text-red-600 dark:text-red-400 font-semibold">
            RED {probes.red === null ? '—' : (probes.rung === 'fan' ? FAN_NODES : DEF_NODES)[probes.red].label}
          </span>
          <span className="mx-1.5">·</span>
          <span className="text-slate-700 dark:text-slate-200 font-semibold">
            BLK {probes.black === null ? '—' : (probes.rung === 'fan' ? FAN_NODES : DEF_NODES)[probes.black].label}
          </span>
          <span className="ml-1.5 text-[10px] text-slate-400">({probes.rung} rung)</span>
        </div>
        <div className={`text-xl font-mono font-bold tabular-nums ${reading === null ? 'text-slate-400' : reading > 0 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>
          {reading === null ? '—' : `${reading} VAC`}
        </div>
        {mode === 'mystery' && <span className="text-[10px] text-slate-400">{probeCount} measurement{probeCount === 1 ? '' : 's'}</span>}
        <button onClick={() => setProbes({ rung: probes.rung, red: null, black: null })}
          className="ml-auto flex items-center gap-1 px-2 py-1 text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg">
          <RotateCcw size={10}/> Clear probes
        </button>
      </div>

      {/* Mystery diagnose bar */}
      {mode === 'mystery' && !solved && (
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-3 py-2.5">
          <span className="text-[11px] text-violet-700 dark:text-violet-300">
            {picked === null
              ? 'Probe both rungs (switch the case into defrost when you need the heater circuit live), then tap the component you’d condemn.'
              : <>Condemn <strong>{ELEMENTS.find(e => e.id === picked)?.name}</strong>?</>}
          </span>
          {wrongGuesses > 0 && <span className="text-[10px] text-red-500 font-semibold">{wrongGuesses} wrong guess{wrongGuesses > 1 ? 'es' : ''}</span>}
          <button onClick={confirmDiagnosis} disabled={picked === null}
            className="ml-auto px-3 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg">
            Confirm diagnosis
          </button>
        </div>
      )}

      {/* Reveal / result */}
      {mode === 'mystery' && solved && activeDef && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={14}/> {activeDef.faultLabel} — found in {probeCount} measurement{probeCount === 1 ? '' : 's'}
            {wrongGuesses > 0 && <span className="text-red-500 font-semibold">· {wrongGuesses} wrong guess{wrongGuesses > 1 ? 'es' : ''}</span>}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{activeDef.reveal}</p>
        </div>
      )}
      {mode === 'practice' && activeDef && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
            <Eye size={13}/> {activeDef.faultLabel}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{activeDef.reveal}</p>
        </div>
      )}
      {mode === 'mystery' && !solved && wrongGuesses > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-red-500">
          <XCircle size={12}/> Not that one. Remember: a dead rung that isn&apos;t commanded is NORMAL — flip the case state and re-probe.
        </div>
      )}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
        The relay contacts split the circuits: NC feeds the fans in refrigeration, NO feeds the heaters in defrost.
        Probing a rung that isn&apos;t commanded reads dead from the relay on — that&apos;s normal, not a fault.
        Flip the ❄/🔥 case state to energize the rung you&apos;re chasing, then hopscotch it: black on N, walk the red probe.
      </p>
    </div>
  )
}
