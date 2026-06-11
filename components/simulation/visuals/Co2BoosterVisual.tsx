'use client'
import { Defs, Pipe, Fan, Coil, Comp, Vessel, Valve, CaseBox, Tag, C, type CompVisStatus, type ValveVisState } from './primitives'

// ── CO2 transcritical booster schematic ─────────────────────────────────────────
// Gas cooler → HPV → flash tank (w/ relief valve + FGBV) → MT/LT cases;
// LT boosters discharge into the MT suction header.

export interface Co2BoosterVisualProps {
  fansSpinning: [boolean, boolean]
  fansFailed: [boolean, boolean]
  gcFouled: boolean
  transcritical: boolean
  headPsig: number
  flashPsig: number
  flashLevel: number       // 0–1
  rvVenting: boolean
  rvWarn: boolean
  hpv: ValveVisState
  fgbv: ValveVisState
  mtComps: { label: string; status: CompVisStatus; amps: number }[]
  ltComps: { label: string; status: CompVisStatus; amps: number }[]
  mtSuctionPsig: number
  ltSuctionPsig: number
  mtCaseTemp: number; mtCaseColor: string
  ltCaseTemp: number; ltCaseColor: string
  ltDefrost: boolean
  doorsOpen: boolean
}

export default function Co2BoosterVisual(p: Co2BoosterVisualProps) {
  const mtRunning = p.mtComps.some(c => c.status === 'run')
  const ltRunning = p.ltComps.some(c => c.status === 'run')
  const hpvFlow = mtRunning && p.hpv !== 'closed'
  const fgbvFlow = mtRunning && p.fgbv !== 'closed'

  return (
    <svg viewBox="0 0 860 340" className="w-full h-auto select-none" role="img" aria-label="CO2 booster rack schematic">
      <Defs />

      {/* ── Pipes ── */}
      {/* MT discharge → gas cooler */}
      <Pipe d="M160,250 L160,120 L250,120 L250,88" color={p.transcritical ? '#f97316' : C.discharge} flowing={mtRunning} speed={1.3} />
      {/* gas cooler → HPV → flash tank */}
      <Pipe d="M470,88 L470,120 L560,120 L596,120" color={p.transcritical ? '#f97316' : C.liquid} flowing={hpvFlow} speed={0.9} />
      <Pipe d="M616,120 L646,120 L646,150" color={C.liquid} flowing={hpvFlow} speed={0.8} />
      {/* liquid out of tank → MT + LT cases */}
      <Pipe d="M646,252 L646,278 L760,278 L760,250" color={C.liquid} flowing={hpvFlow} speed={0.7} />
      <Pipe d="M760,278 L760,118" color={C.liquid} w={3} flowing={hpvFlow} speed={0.7} />
      {/* FGBV: flash gas → MT suction header */}
      <Pipe d="M620,170 L545,170 L545,228" color={C.flashGas} w={3} flowing={fgbvFlow} speed={0.9} />
      {/* MT suction header: cases + FGBV + LT discharge → MT comps */}
      <Pipe d="M712,112 L712,228 L210,228 L210,250" color={C.suction} flowing={mtRunning} />
      {[110, 160].map(x => (
        <Pipe key={x} d={`M${x},228 L${x},250`} color={C.suction} w={2.8} flowing={mtRunning} />
      ))}
      {/* LT suction: frozen case → LT comps */}
      <Pipe d="M790,250 L790,312 L420,312 L420,295" color={C.ltSuction} flowing={ltRunning} />
      <Pipe d="M370,312 L370,295" color={C.ltSuction} w={2.8} flowing={ltRunning} />
      {/* LT discharge → MT suction header */}
      <Pipe d="M395,250 L395,228" color={C.ltSuction} w={3} flowing={ltRunning} speed={1.2} />

      {/* ── Gas cooler ── */}
      <Coil x={230} y={42} w={250} h={46} fouled={p.gcFouled} label={p.transcritical ? 'Gas Cooler — transcritical' : 'Gas Cooler / Condenser — subcritical'} />
      <Fan x={295} y={65} r={17} spinning={p.fansSpinning[0]} failed={p.fansFailed[0]} />
      <Fan x={415} y={65} r={17} spinning={p.fansSpinning[1]} failed={p.fansFailed[1]} />
      {p.transcritical && (
        <Tag x={355} y={32} text={`above ${'87.8'}°F critical — no condensing`} color="#f97316" />
      )}

      {/* ── HPV ── */}
      <Valve x={606} y={120} label="HPV" state={p.hpv} labelBelow />

      {/* ── Flash tank + relief valve ── */}
      <Vessel x={622} y={152} w={48} h={100} level={p.flashLevel} label="Flash Tank" liquidColor="#fbbf24" />
      <g>
        {/* relief valve stub on top */}
        <line x1={658} y1={152} x2={658} y2={138} stroke={C.stroke} strokeWidth={2.4} />
        <rect x={651} y={128} width={14} height={11} rx={2} fill={p.rvVenting ? C.crit : p.rvWarn ? C.warn : 'url(#simMetal)'} stroke={C.stroke} strokeWidth={1} />
        <text x={682} y={137} fontSize={8} fill={p.rvVenting ? C.crit : p.rvWarn ? C.warn : C.text} fontWeight={700}>RV 690</text>
        {p.rvVenting && [0, 1, 2].map(i => (
          <circle key={i} cx={658 + i * 4 - 4} cy={122} r={2.5} fill={C.crit} opacity={0.7}>
            <animate attributeName="cy" values="122;104" dur="1.1s" begin={`${i * 0.35}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="1.1s" begin={`${i * 0.35}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </g>

      {/* ── FGBV ── */}
      <Valve x={596} y={170} label="FGBV" state={p.fgbv} labelBelow />

      {/* ── Compressors ── */}
      {p.mtComps.map((c, i) => (
        <Comp key={i} x={84 + i * 52} y={252} w={46} h={42} label={c.label} status={c.status} amps={c.amps} />
      ))}
      <text x={162} y={308} textAnchor="middle" fontSize={8.5} fill={C.text} fontWeight={600}>MT compressors</text>
      {p.ltComps.map((c, i) => (
        <Comp key={i} x={346 + i * 52} y={252} w={46} h={42} label={c.label} status={c.status} amps={c.amps} />
      ))}
      <text x={395} y={308} textAnchor="middle" fontSize={8.5} fill={C.ltSuction} fontWeight={600}>LT boosters</text>

      {/* ── Cases ── */}
      <CaseBox x={690} y={46} w={150} h={66} label="MT Cases" sub="dairy · meat · deli"
        temp={p.mtCaseTemp} tempColor={p.mtCaseColor} doors={3} doorsOpen={p.doorsOpen} />
      <CaseBox x={690} y={186} w={150} h={64} label="Frozen" sub="frozen food · ice cream" frozen
        temp={p.ltCaseTemp} tempColor={p.ltCaseColor} doors={3} defrost={p.ltDefrost} />

      {/* ── Reading tags ── */}
      <Tag x={205} y={112} text={`${p.headPsig.toFixed(0)} psig`} color={p.transcritical ? '#f97316' : C.discharge} />
      <Tag x={646} y={268} text={`${p.flashPsig.toFixed(0)}`} color="#b45309" />
      <Tag x={480} y={222} text={`MT ${p.mtSuctionPsig.toFixed(0)} psig`} color={C.suction} />
      <Tag x={600} y={326} text={`LT ${p.ltSuctionPsig.toFixed(0)} psig`} color={C.ltSuction} />
    </svg>
  )
}
