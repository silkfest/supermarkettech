'use client'
import { Defs, Pipe, Fan, Coil, Comp, Vessel, Valve, CaseBox, Tag, Hotspot, C, type CompVisStatus, type ValveVisState } from './primitives'
import type { SchematicDetail } from './SchematicViewer'

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
  ltIced: boolean
  mtFanOut: boolean
  /** Tap-to-inspect */
  selectedId?: string | null
  onSelect?: (d: SchematicDetail | null) => void
}

export default function Co2BoosterVisual(p: Co2BoosterVisualProps) {
  const mtRunning = p.mtComps.some(c => c.status === 'run')
  const ltRunning = p.ltComps.some(c => c.status === 'run')
  const hpvFlow = mtRunning && p.hpv !== 'closed'
  const fgbvFlow = mtRunning && p.fgbv !== 'closed'
  const fansUp = p.fansFailed.filter(f => !f).length
  const pick = (detail: SchematicDetail) => () => p.onSelect?.(p.selectedId === detail.id ? null : detail)
  const valveRow = (state: ValveVisState) =>
    state === 'closed' ? { value: 'STUCK CLOSED', color: 'text-red-600 dark:text-red-400' }
    : state === 'open' ? { value: 'STUCK OPEN', color: 'text-amber-600 dark:text-amber-400' }
    : { value: 'Auto (modulating)' as string, color: 'text-emerald-600 dark:text-emerald-400' }
  const compRows = (c: { status: CompVisStatus; amps: number }, suction: number) => [
    { label: 'Status', value: c.status === 'run' ? 'Running' : 'TRIPPED',
      color: c.status === 'trip' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Amps', value: c.status === 'run' ? `${c.amps.toFixed(1)} A` : '—' },
    { label: 'Suction', value: `${suction.toFixed(0)} psig` },
  ]

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
        temp={p.mtCaseTemp} tempColor={p.mtCaseColor} doors={3} doorsOpen={p.doorsOpen} fanOut={p.mtFanOut} />
      <CaseBox x={690} y={186} w={150} h={64} label="Frozen" sub="frozen food · ice cream" frozen
        temp={p.ltCaseTemp} tempColor={p.ltCaseColor} doors={3} defrost={p.ltDefrost} iced={p.ltIced} />

      {/* ── Reading tags ── */}
      <Tag x={205} y={112} text={`${p.headPsig.toFixed(0)} psig`} color={p.transcritical ? '#f97316' : C.discharge} />
      <Tag x={646} y={268} text={`${p.flashPsig.toFixed(0)}`} color="#b45309" />
      <Tag x={480} y={222} text={`MT ${p.mtSuctionPsig.toFixed(0)} psig`} color={C.suction} />
      <Tag x={600} y={326} text={`LT ${p.ltSuctionPsig.toFixed(0)} psig`} color={C.ltSuction} />

      {/* ── Tap-to-inspect hotspots (top layer) ── */}
      {p.onSelect && (
        <g>
          <Hotspot x={230} y={42} w={250} h={46} selected={p.selectedId === 'gc'} onSelect={pick({
            id: 'gc', title: 'Gas Cooler', subtitle: p.transcritical ? 'transcritical — no condensing' : 'subcritical — condensing',
            rows: [
              { label: 'Pressure', value: `${p.headPsig.toFixed(0)} psig` },
              { label: 'Fans', value: `${fansUp}/2 running`, color: fansUp < 2 ? 'text-red-600 dark:text-red-400' : undefined },
              ...(p.gcFouled ? [{ label: 'Coil', value: 'FOULED', color: 'text-amber-600 dark:text-amber-400' }] : []),
            ],
          })} />
          <Hotspot x={586} y={98} w={40} h={42} selected={p.selectedId === 'hpv'} onSelect={pick({
            id: 'hpv', title: 'High Pressure Valve (HPV)', subtitle: 'gas cooler → flash tank',
            rows: [{ label: 'State', ...valveRow(p.hpv) }],
          })} />
          <Hotspot x={622} y={152} w={48} h={100} selected={p.selectedId === 'flash'} onSelect={pick({
            id: 'flash', title: 'Flash Tank / Receiver',
            rows: [
              { label: 'Pressure', value: `${p.flashPsig.toFixed(0)} psig` },
              { label: 'Level', value: `${Math.round(p.flashLevel * 100)}%` },
              { label: 'Relief valve', value: p.rvVenting ? 'LIFTING — venting CO2' : p.rvWarn ? 'Approaching (690)' : 'OK (lifts 690)',
                color: p.rvVenting ? 'text-red-600 dark:text-red-400' : p.rvWarn ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
            ],
          })} />
          <Hotspot x={576} y={148} w={40} h={42} selected={p.selectedId === 'fgbv'} onSelect={pick({
            id: 'fgbv', title: 'Flash Gas Bypass Valve (FGBV)', subtitle: 'flash tank vapor → MT suction',
            rows: [{ label: 'State', ...valveRow(p.fgbv) }],
          })} />
          {p.mtComps.map((c, i) => (
            <Hotspot key={c.label} x={84 + i * 52} y={252} w={46} h={42} selected={p.selectedId === `mt${i}`} onSelect={pick({
              id: `mt${i}`, title: `MT Compressor ${i + 1}`, subtitle: 'Bitzer · discharges to gas cooler',
              rows: compRows(c, p.mtSuctionPsig),
            })} />
          ))}
          {p.ltComps.map((c, i) => (
            <Hotspot key={c.label} x={346 + i * 52} y={252} w={46} h={42} selected={p.selectedId === `lt${i}`} onSelect={pick({
              id: `lt${i}`, title: `LT Booster ${i + 1}`, subtitle: 'Bitzer · discharges into MT suction',
              rows: compRows(c, p.ltSuctionPsig),
            })} />
          ))}
          <Hotspot x={690} y={46} w={150} h={66} selected={p.selectedId === 'mtcases'} onSelect={pick({
            id: 'mtcases', title: 'MT Cases', subtitle: 'dairy · meat · deli',
            rows: [
              { label: 'Avg temp', value: `${p.mtCaseTemp.toFixed(1)} °F` },
              { label: 'MT suction', value: `${p.mtSuctionPsig.toFixed(0)} psig` },
              ...(p.doorsOpen ? [{ label: 'Doors', value: 'PROPPED OPEN', color: 'text-amber-600 dark:text-amber-400' }] : []),
              ...(p.mtFanOut ? [{ label: 'Evap fans', value: 'OUT', color: 'text-red-600 dark:text-red-400' }] : []),
            ],
          })} />
          <Hotspot x={690} y={186} w={150} h={64} selected={p.selectedId === 'ltcases'} onSelect={pick({
            id: 'ltcases', title: 'Frozen Cases', subtitle: 'frozen food · ice cream',
            rows: [
              { label: 'Avg temp', value: `${p.ltCaseTemp.toFixed(1)} °F` },
              { label: 'LT suction', value: `${p.ltSuctionPsig.toFixed(0)} psig` },
              ...(p.ltDefrost ? [{ label: 'Defrost', value: 'STUCK ON', color: 'text-amber-600 dark:text-amber-400' }] : []),
              ...(p.ltIced ? [{ label: 'Coil', value: 'ICED', color: 'text-cyan-600 dark:text-cyan-400' }] : []),
            ],
          })} />
        </g>
      )}
    </svg>
  )
}
