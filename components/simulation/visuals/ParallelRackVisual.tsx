'use client'
import { Defs, Pipe, Fan, Coil, Comp, Vessel, CaseBox, Tag, C, type CompVisStatus } from './primitives'

// ── Hussmann parallel rack — MT + LT booster schematic ──────────────────────────
export interface ParallelRackVisualProps {
  fansSpinning: [boolean, boolean]
  fansFailed: [boolean, boolean]      // already concealed by caller in scenario mode
  dirtyCondenser: boolean
  comps: { label: string; status: CompVisStatus; amps: number }[]      // 4 MT
  boosters: { label: string; status: CompVisStatus; amps: number }[]   // 2 LT
  receiverLevel: number               // 0–1
  drierRestricted: boolean
  suctionPsig: number
  dischargePsig: number
  ltSuctionPsig: number
  mtCaseTemp: number; mtCaseColor: string
  ltCaseTemp: number; ltCaseColor: string
  defrostStuck: boolean
  ltDefrostStuck: boolean
  doorsOpen: boolean
  mtIced: boolean
  mtFanOut: boolean
  /** Gauge-derived (low SH) — safe to show even in scenario mode */
  floodback: boolean
  hpCtrlActive: boolean
}

export default function ParallelRackVisual(p: ParallelRackVisualProps) {
  const mtRunning = p.comps.some(c => c.status === 'run')
  const ltRunning = p.boosters.some(c => c.status === 'run')

  return (
    <svg viewBox="0 0 860 330" className="w-full h-auto select-none" role="img" aria-label="Parallel rack schematic">
      <Defs />

      {/* ── Pipes (under equipment) ── */}
      {/* discharge: comp header → condenser */}
      <Pipe d="M445,205 L445,120 L310,120 L310,88" color={C.discharge} flowing={mtRunning} speed={1.2} />
      {/* condensed liquid: condenser → receiver */}
      <Pipe d="M55,90 L55,128 L92,128 L92,152" color={C.liquid} flowing={mtRunning} speed={0.8} />
      {/* liquid main: receiver → drier → cases */}
      <Pipe d="M92,246 L92,278 L745,278 L745,118" color={C.liquid} flowing={mtRunning} speed={0.8} />
      {/* MT suction: cases → header → comps */}
      <Pipe d="M700,112 L700,168 L340,168" color={C.suction} flowing={mtRunning} />
      {[346, 406, 466, 526].map(x => (
        <Pipe key={x} d={`M${x},168 L${x},205`} color={C.suction} w={3} flowing={mtRunning} />
      ))}
      {/* LT suction: LT case → boosters */}
      <Pipe d="M700,250 L700,310 L648,310 L648,288" color={C.ltSuction} flowing={ltRunning} />
      <Pipe d="M648,310 L590,310 L590,288" color={C.ltSuction} flowing={ltRunning} />
      {/* LT discharge → MT suction header */}
      <Pipe d="M612,238 L612,168" color={C.ltSuction} w={3} flowing={ltRunning} speed={1.2} />

      {/* ── Condenser ── */}
      <Coil x={40} y={42} w={270} h={46} fouled={p.dirtyCondenser} label="Air-Cooled Condenser" />
      <Fan x={110} y={65} r={17} spinning={p.fansSpinning[0]} failed={p.fansFailed[0]} />
      <Fan x={240} y={65} r={17} spinning={p.fansSpinning[1]} failed={p.fansFailed[1]} />
      {p.hpCtrlActive && <Tag x={175} y={105} text="HP CTRL — fans cycling" color={C.warn} />}

      {/* ── Receiver + drier ── */}
      <Vessel x={70} y={152} w={44} h={94} level={p.receiverLevel} label="Receiver" />
      <g>
        <rect x={150} y={270} width={40} height={16} rx={4} fill="url(#simMetal)" stroke={p.drierRestricted ? C.warn : C.stroke} strokeWidth={p.drierRestricted ? 2 : 1.2} />
        <text x={170} y={300} textAnchor="middle" fontSize={8.5} fill={p.drierRestricted ? C.warn : C.text} fontWeight={600}>
          {p.drierRestricted ? 'drier ΔT!' : 'filter drier'}
        </text>
        {/* sight glass */}
        <circle cx={225} cy={278} r={6} fill="#dbeafe" stroke={C.stroke} strokeWidth={1.1} opacity={0.9} />
        <text x={225} y={300} textAnchor="middle" fontSize={8} fill={C.text}>sight glass</text>
      </g>

      {/* ── MT compressors ── */}
      {p.comps.map((c, i) => (
        <Comp key={i} x={320 + i * 60} y={208} w={52} label={c.label} status={c.status} amps={c.amps} />
      ))}
      <text x={436} y={272} textAnchor="middle" fontSize={9} fill={C.text} fontWeight={600}>MT Rack — 4 × Copeland Scroll</text>

      {/* ── LT boosters ── */}
      {p.boosters.map((c, i) => (
        <Comp key={i} x={566 + i * 58} y={240} w={50} h={44} label={c.label} status={c.status} amps={c.amps} />
      ))}
      <text x={622} y={232} textAnchor="middle" fontSize={8.5} fill={C.ltSuction} fontWeight={600}>LT Boosters → MT suction</text>

      {/* ── Cases ── */}
      <CaseBox x={640} y={46} w={185} h={66} label="MT Cases" sub="produce · dairy · WIC"
        temp={p.mtCaseTemp} tempColor={p.mtCaseColor} doors={4} doorsOpen={p.doorsOpen} defrost={p.defrostStuck}
        iced={p.mtIced} fanOut={p.mtFanOut} />
      <CaseBox x={640} y={190} w={185} h={60} label="Frozen Food" sub="RL-5 doors · WIF · bunkers"
        temp={p.ltCaseTemp} tempColor={p.ltCaseColor} doors={4} frozen defrost={p.ltDefrostStuck} />

      {/* ── Reading tags ── */}
      <Tag x={380} y={112} text={`${p.dischargePsig.toFixed(0)} psig`} color={C.discharge} />
      <Tag x={520} y={160} text={`${p.suctionPsig.toFixed(1)} psig`} color={C.suction} />
      <Tag x={672} y={322} text={`${p.ltSuctionPsig.toFixed(1)} psig`} color={C.ltSuction} />
      {p.floodback && <Tag x={436} y={148} text="⚠ low SH — liquid floodback risk" color={C.crit} />}
    </svg>
  )
}
