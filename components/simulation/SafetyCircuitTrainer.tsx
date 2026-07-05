'use client'
import { useState, useCallback } from 'react'
import { Zap, RotateCcw, Dices, CheckCircle2, XCircle, Eye } from 'lucide-react'
import { saveSimAttempt } from '@/lib/simulation/attempts'

// ── Safety Circuit Trainer — Copeland Discus recip control circuit (120 VAC) ────
// The classic single-compressor safety string, drawn as a snaking ladder run:
//   L1 → control fuse → control switch → HPCO → LPCO → oil pressure control →
//   (wire pull) → discharge temp klixon → motor protector module → M coil → N
// Two modes:
//   Practice      — pick a fault, watch where the voltage dies on the run.
//   Find the Fault — hidden fault; hopscotch it with the meter probes, then
//                    tap the component you'd condemn and confirm.

interface CircuitElement {
  id: string
  name: string
  short: string
  kind: 'fuse' | 'switch' | 'contact' | 'wire' | 'coil'
  spec: string
  faultLabel: string
  reveal: string      // shown after practice-select or mystery solve
}

const ELEMENTS: CircuitElement[] = [
  { id: 'fuse', name: 'Control Fuse', short: 'FU', kind: 'fuse', spec: '2 A',
    faultLabel: 'Control fuse blown',
    reveal: 'A blown control fuse kills the whole string — 120 V on the line side, 0 V everywhere after. Find WHY it blew (shorted coil? chafed wire?) before replacing it.' },
  { id: 'sw', name: 'Control Switch', short: 'SW', kind: 'switch', spec: 'comp rocker',
    faultLabel: 'Control switch off / failed',
    reveal: 'Simplest one on the rack — and techs still get burned by it. Somebody switched the comp off for service and never switched it back.' },
  { id: 'hpco', name: 'High Pressure Cutout', short: 'HPCO', kind: 'contact', spec: '425# · man reset',
    faultLabel: 'HPCO tripped (manual reset)',
    reveal: 'HPCO is a MANUAL reset — it stays open until a human pushes the button. Never just reset it and walk away: find what drove the head to 425 psig first.' },
  { id: 'lpco', name: 'Low Pressure Cutout', short: 'LPCO', kind: 'contact', spec: '15/35# · auto',
    faultLabel: 'LPCO open (suction below cut-out)',
    reveal: 'Auto reset — the comp will short-cycle on it if suction keeps dipping below 15 psig. Look for a starving circuit, low charge, or a closed valve.' },
  { id: 'opc', name: 'Oil Pressure Control', short: 'OPC', kind: 'contact', spec: '<9 psid 120s · man',
    faultLabel: 'Oil pressure control tripped',
    reveal: 'The OPC timed out — net oil pressure sat below ~9 psid for 120 s. Check oil level, the Y825 differential, and oil return before resetting. Repeated trips = the comp is telling you something.' },
  { id: 'wire', name: 'Interconnect Wire (T5→T6)', short: 'WIRE', kind: 'wire', spec: 'panel wire pull',
    faultLabel: 'Broken wire / loose terminal (T5→T6)',
    reveal: 'Every device tests fine and the circuit is still dead — the break is in the WIRE. Loose lugs and chafed pulls in the corner of the panel are classic. The meter finds it: 120 V on one end of the run, 0 V on the other.' },
  { id: 'dtc', name: 'Discharge Temp Klixon', short: 'DTC', kind: 'contact', spec: '~268°F · auto',
    faultLabel: 'Discharge temp klixon open (hot head)',
    reveal: 'The head got hot enough to open the klixon. On C3/C4 (no Demand Cooling) this is your high-compression-ratio warning. Let it cool, then find the cause — don\'t bypass it.' },
  { id: 'mp', name: 'Motor Protector Module', short: 'MP', kind: 'contact', spec: 'INT69 module',
    faultLabel: 'Motor protector open (windings hot)',
    reveal: 'The module opened on winding temperature. It may auto-reset after a long cool-down — but repeated MP trips mean low suction cooling, high amps, or a failing motor.' },
  { id: 'coil', name: 'Contactor Coil (M)', short: 'M', kind: 'coil', spec: '120 V',
    faultLabel: 'Contactor coil open (burned out)',
    reveal: 'Full 120 V across the coil and the contactor still won\'t pull in — the coil is open. Careful: a healthy ENERGIZED coil also reads 120 V across it; the difference is whether the comp is running.' },
]

// Snake layout: 3 rows. Node i sits upstream of element i; 10 nodes total.
const NODES: { x: number; y: number; label: string }[] = [
  { x: 28,  y: 55,  label: 'L1' },
  { x: 130, y: 55,  label: 'T1' },
  { x: 230, y: 55,  label: 'T2' },
  { x: 330, y: 55,  label: 'T3' },
  { x: 230, y: 135, label: 'T4' },
  { x: 130, y: 135, label: 'T5' },
  { x: 28,  y: 215, label: 'T6' },
  { x: 130, y: 215, label: 'T7' },
  { x: 230, y: 215, label: 'T8' },
  { x: 330, y: 215, label: 'N'  },
]

// Each element spans node i → node i+1. `inPath` runs node → symbol edge and
// carries the upstream potential; `outPath` runs symbol edge → next node and
// carries the downstream potential. Symbol centred at `sym`.
const SPANS: { inPath: [number, number][]; outPath: [number, number][]; sym: [number, number] }[] = [
  { inPath: [[28, 55], [61, 55]],    outPath: [[97, 55], [130, 55]],   sym: [79, 55]   },
  { inPath: [[130, 55], [162, 55]],  outPath: [[198, 55], [230, 55]],  sym: [180, 55]  },
  { inPath: [[230, 55], [262, 55]],  outPath: [[298, 55], [330, 55]],  sym: [280, 55]  },
  { inPath: [[330, 55], [402, 55], [402, 135], [334, 135]], outPath: [[298, 135], [230, 135]], sym: [316, 135] },
  { inPath: [[230, 135], [198, 135]], outPath: [[162, 135], [130, 135]], sym: [180, 135] },
  { inPath: [[130, 135], [28, 135], [28, 158]], outPath: [[28, 192], [28, 215]], sym: [28, 175] },   // the wire pull
  { inPath: [[28, 215], [61, 215]],  outPath: [[97, 215], [130, 215]], sym: [79, 215]  },
  { inPath: [[130, 215], [162, 215]], outPath: [[198, 215], [230, 215]], sym: [180, 215] },
  { inPath: [[230, 215], [265, 215]], outPath: [[295, 215], [330, 215]], sym: [280, 215] },
]

const HOT  = '#f59e0b'
const DEAD = '#94a3b8'
const IDLE = '#64748b'

function polyline(pts: [number, number][]) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
}

/** Node potential vs neutral. Single open at `openIdx` (−1 = healthy: the coil
 *  itself drops the voltage). Nodes at/before the open read 120 V; after, 0 V. */
function potential(node: number, openIdx: number): number {
  const eff = openIdx === -1 ? ELEMENTS.length - 1 : openIdx
  if (node >= NODES.length - 1) return 0            // neutral rail
  return node <= eff ? 120 : 0
}

function ElementSymbol({ el, x, y, open, revealOpen, vertical }: {
  el: CircuitElement; x: number; y: number; open: boolean; revealOpen: boolean; vertical?: boolean
}) {
  const stroke = revealOpen && open ? '#ef4444' : '#475569'
  const rot = vertical ? 'rotate(90)' : undefined
  return (
    <g transform={`translate(${x},${y})`}>
      <g transform={rot}>
        {el.kind === 'fuse' && (
          <g>
            <rect x={-16} y={-7} width={32} height={14} rx={7} fill="none" stroke={stroke} strokeWidth={2} />
            <line x1={-16} y1={0} x2={16} y2={0} stroke={stroke} strokeWidth={2}
              strokeDasharray={revealOpen && open ? '3 4' : undefined} />
          </g>
        )}
        {el.kind === 'switch' && (
          <g>
            <circle cx={-13} cy={0} r={3} fill={stroke} />
            <circle cx={13} cy={0} r={3} fill={stroke} />
            <line x1={-13} y1={0} x2={revealOpen && open ? 9 : 13} y2={revealOpen && open ? -13 : -1.5} stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
          </g>
        )}
        {el.kind === 'contact' && (
          <g>
            <circle cx={-11} cy={0} r={3} fill={stroke} />
            <circle cx={11} cy={0} r={3} fill={stroke} />
            <line x1={-11} y1={0} x2={revealOpen && open ? 8 : 11} y2={revealOpen && open ? -11 : 0} stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
          </g>
        )}
        {el.kind === 'coil' && (
          <g>
            <circle r={13} fill="none" stroke={stroke} strokeWidth={2.2} />
            <text x={0} y={4.5} textAnchor="middle" fontSize={12} fontWeight={800} fill={stroke}>M</text>
          </g>
        )}
        {el.kind === 'wire' && revealOpen && open && (
          <g>
            {/* visible break in the run */}
            <line x1={-7} y1={-7} x2={7} y2={7} stroke="#ef4444" strokeWidth={2.4} strokeLinecap="round" />
            <line x1={7} y1={-7} x2={-7} y2={7} stroke="#ef4444" strokeWidth={2.4} strokeLinecap="round" />
          </g>
        )}
      </g>
    </g>
  )
}

export default function SafetyCircuitTrainer() {
  const [mode, setMode] = useState<'practice' | 'mystery'>('practice')
  const [practiceFault, setPracticeFault] = useState(-1)
  const [mysteryFault, setMysteryFault] = useState<number | null>(null)
  const [probes, setProbes] = useState<{ red: number | null; black: number | null }>({ red: null, black: null })
  const [probeCount, setProbeCount] = useState(0)
  const [pickedElement, setPickedElement] = useState<number | null>(null)
  const [solved, setSolved] = useState(false)
  const [wrongGuesses, setWrongGuesses] = useState(0)

  const activeFault = mode === 'practice' ? practiceFault : (mysteryFault ?? -1)
  const revealStates = mode === 'practice' || solved
  const showVoltageColors = mode === 'practice' || solved
  const running = activeFault === -1

  const newMystery = useCallback(() => {
    setMysteryFault(Math.floor(Math.random() * ELEMENTS.length))
    setProbes({ red: null, black: null }); setProbeCount(0)
    setPickedElement(null); setSolved(false); setWrongGuesses(0)
  }, [])

  function enterMode(m: 'practice' | 'mystery') {
    setMode(m)
    setProbes({ red: null, black: null }); setProbeCount(0)
    setPickedElement(null); setSolved(false); setWrongGuesses(0)
    if (m === 'mystery') setMysteryFault(Math.floor(Math.random() * ELEMENTS.length))
  }

  function tapNode(i: number) {
    // keep the updater pure — incrementing inside setProbes double-counts under StrictMode
    if (probes.red === null) { setProbes({ red: i, black: null }); return }
    if (probes.black === null && i !== probes.red) {
      setProbeCount(c => c + 1)
      setProbes({ red: probes.red, black: i })
      return
    }
    setProbes({ red: i, black: null })
  }

  function confirmDiagnosis() {
    if (pickedElement === null || mysteryFault === null || solved) return
    if (pickedElement === mysteryFault) {
      setSolved(true)
      const score = Math.max(30, 100 - Math.max(0, probeCount - 4) * 10 - wrongGuesses * 20)
      saveSimAttempt({
        rack: 'parallel-rack', scenarioId: 'safety-circuit',
        scenarioName: 'Safety Circuit — Find the Fault', difficulty: 'Intermediate',
        mode: 'wiring', score, correct: 1, total: 1, falsePositives: wrongGuesses,
      })
    } else {
      setWrongGuesses(w => w + 1)
      setPickedElement(null)
    }
  }

  const reading = probes.red !== null && probes.black !== null
    ? Math.abs(potential(probes.red, activeFault) - potential(probes.black, activeFault))
    : null

  const segColor = (elementIdx: number, half: 'in' | 'out') => {
    if (!showVoltageColors) return IDLE
    const node = half === 'in' ? elementIdx : elementIdx + 1
    return potential(node, activeFault) > 0 ? HOT : DEAD
  }

  const probeLabel = (i: number | null) => i === null ? '—' : NODES[i].label

  return (
    <div className="space-y-3">
      {/* Mode tabs + status */}
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
        <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
          running
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
            : 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40'}`}>
          <span className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          {running ? 'C1 RUNNING' : 'C1 OFF — contactor de-energized'}
        </span>
        {mode === 'mystery' && (
          <button onClick={newMystery}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
            <Dices size={12}/> New fault
          </button>
        )}
      </div>

      {/* Practice fault picker */}
      {mode === 'practice' && (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Inject fault:</label>
          <select value={practiceFault} onChange={e => setPracticeFault(Number(e.target.value))}
            className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100">
            <option value={-1}>No fault — normal run</option>
            {ELEMENTS.map((el, i) => <option key={el.id} value={i}>{el.faultLabel}</option>)}
          </select>
        </div>
      )}

      {/* Diagram */}
      <div className="max-w-2xl">
        <svg viewBox="0 0 430 288" className="w-full h-auto select-none" role="img" aria-label="C1 safety circuit ladder diagram">
          {/* rails */}
          <text x={28} y={30} textAnchor="middle" fontSize={12} fontWeight={800} fill="#dc2626">L1</text>
          <line x1={28} y1={34} x2={28} y2={49} stroke="#dc2626" strokeWidth={2.5} />
          <text x={402} y={222} textAnchor="start" fontSize={12} fontWeight={800} fill="#2563eb">N</text>
          <line x1={330} y1={215} x2={396} y2={215} stroke={showVoltageColors ? DEAD : IDLE} strokeWidth={3} />

          {/* element spans */}
          {SPANS.map((s, i) => {
            const el = ELEMENTS[i]
            const open = activeFault === i
            const mid = s.sym
            // split the polyline at the symbol: color in-half and out-half separately
            return (
              <g key={el.id}>
                <path d={polyline(s.inPath)} stroke={segColor(i, 'in')} strokeWidth={3} fill="none" strokeLinejoin="round" />
                <path d={polyline(s.outPath)} stroke={segColor(i, 'out')} strokeWidth={3} fill="none" strokeLinejoin="round" />
                {/* the wire element renders as a live conductor between its stubs */}
                {el.kind === 'wire' && (
                  <path d={polyline([[28, 158], [28, 192]])}
                    stroke={revealStates && open ? '#ef4444' : segColor(i, 'in')} strokeWidth={3} fill="none"
                    strokeDasharray={revealStates && open ? '4 5' : undefined} />
                )}
                <ElementSymbol el={el} x={mid[0]} y={mid[1]} open={open} revealOpen={revealStates} vertical={el.id === 'wire'} />
                {/* label + spec */}
                {el.kind !== 'wire' && (
                  <>
                    <text x={mid[0]} y={mid[1] + 30} textAnchor="middle" fontSize={10.5} fontWeight={800}
                      fill={revealStates && open ? '#ef4444' : '#64748b'}>{el.short}</text>
                    <text x={mid[0]} y={mid[1] + 42} textAnchor="middle" fontSize={8} fill="#94a3b8">{el.spec}</text>
                  </>
                )}
                {/* mystery-mode element picker hit area */}
                {mode === 'mystery' && !solved && (
                  <g onClick={() => setPickedElement(pickedElement === i ? null : i)} style={{ cursor: 'pointer' }}>
                    <rect x={mid[0] - 24} y={mid[1] - 22} width={48} height={44} rx={8}
                      fill={pickedElement === i ? 'rgba(139,92,246,0.12)' : 'transparent'}
                      stroke={pickedElement === i ? '#8b5cf6' : 'transparent'} strokeWidth={2} strokeDasharray="5 3" />
                  </g>
                )}
              </g>
            )
          })}

          {/* test point nodes */}
          {NODES.map((n, i) => {
            const isRed = probes.red === i
            const isBlack = probes.black === i
            return (
              <g key={i} onClick={() => tapNode(i)} style={{ cursor: 'pointer' }}>
                <circle cx={n.x} cy={n.y} r={13} fill="transparent" />
                <circle cx={n.x} cy={n.y} r={5.5}
                  fill={isRed ? '#dc2626' : isBlack ? '#1e293b' : '#e2e8f0'}
                  stroke={isRed ? '#dc2626' : isBlack ? '#0f172a' : '#64748b'} strokeWidth={1.6} />
                {isBlack && <circle cx={n.x} cy={n.y} r={2.2} fill="#e2e8f0" />}
                {i > 0 && (
                  <text x={n.x} y={n.y - 11} textAnchor="middle" fontSize={9.5} fontWeight={700}
                    fill={isRed ? '#dc2626' : isBlack ? '#334155' : '#94a3b8'}>{n.label}</text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Meter */}
      <div className="flex items-center gap-3 flex-wrap rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5">
        <Zap size={14} className="text-amber-500 flex-shrink-0" />
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          <span className="text-red-600 dark:text-red-400 font-semibold">RED {probeLabel(probes.red)}</span>
          <span className="mx-1.5">·</span>
          <span className="text-slate-700 dark:text-slate-200 font-semibold">BLK {probeLabel(probes.black)}</span>
        </div>
        <div className={`text-xl font-mono font-bold tabular-nums ${reading === null ? 'text-slate-400' : reading > 0 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>
          {reading === null ? '—' : `${reading} VAC`}
        </div>
        {mode === 'mystery' && <span className="text-[10px] text-slate-400">{probeCount} measurement{probeCount === 1 ? '' : 's'}</span>}
        <button onClick={() => setProbes({ red: null, black: null })}
          className="ml-auto flex items-center gap-1 px-2 py-1 text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg">
          <RotateCcw size={10}/> Clear probes
        </button>
      </div>

      {/* Mystery diagnose bar */}
      {mode === 'mystery' && !solved && (
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-3 py-2.5">
          <span className="text-[11px] text-violet-700 dark:text-violet-300">
            {pickedElement === null
              ? 'Probe the test points, then tap the component you\'d condemn.'
              : <>Condemn <strong>{ELEMENTS[pickedElement].name}</strong>?</>}
          </span>
          {wrongGuesses > 0 && <span className="text-[10px] text-red-500 font-semibold">{wrongGuesses} wrong guess{wrongGuesses > 1 ? 'es' : ''}</span>}
          <button onClick={confirmDiagnosis} disabled={pickedElement === null}
            className="ml-auto px-3 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg">
            Confirm diagnosis
          </button>
        </div>
      )}

      {/* Reveal / result */}
      {mode === 'mystery' && solved && mysteryFault !== null && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={14}/> {ELEMENTS[mysteryFault].faultLabel} — found in {probeCount} measurement{probeCount === 1 ? '' : 's'}
            {wrongGuesses > 0 && <span className="text-red-500 font-semibold">· {wrongGuesses} wrong guess{wrongGuesses > 1 ? 'es' : ''}</span>}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{ELEMENTS[mysteryFault].reveal}</p>
        </div>
      )}
      {mode === 'practice' && practiceFault !== -1 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-3 py-2.5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
            <Eye size={13}/> {ELEMENTS[practiceFault].faultLabel}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{ELEMENTS[practiceFault].reveal}</p>
        </div>
      )}
      {mode === 'mystery' && !solved && wrongGuesses > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-red-500">
          <XCircle size={12}/> Not that one — the circuit disagrees with you. Keep hopscotching.
        </div>
      )}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
        Hopscotch method: black probe on <strong>N</strong>, walk the red probe L1 → T8. Every point reads 120 V until you
        cross the open device — the first point that reads 0 V puts the fault between it and your last 120 V point.
        Across a single open device you'll read full line voltage; across a closed one, 0 V.
        Heads-up: an energized coil also reads 120 V across it — that's normal when the comp is running.
      </p>
    </div>
  )
}
