'use client'
import { Defs, Pipe, Fan, Coil, Comp, Vessel, Valve, CaseBox, Tag, Hotspot, C, type CompVisStatus, type ValveVisState } from './primitives'
import type { SchematicDetail } from './SchematicViewer'

// ── CO2 transcritical booster schematic ─────────────────────────────────────────
// Gas cooler → HPV → flash tank (w/ relief valve + FGBV) → MT/LT cases;
// LT boosters discharge into the MT suction header.
// Two layouts (wide landscape / tall portrait for phones) share one render pass.

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
  layout?: 'wide' | 'tall'
  /** Tap-to-inspect */
  selectedId?: string | null
  onSelect?: (d: SchematicDetail | null) => void
}

interface Geo {
  viewBox: string
  // pipes get their flowing/color resolved in render
  pDischarge: string; pGcToHpv: string; pHpvToTank: string
  pLiquid: string[]; pFgbv: string; pMtSuction: string; pMtStubs: string[]
  pLtSuction: string[]; pLtDischarge: string
  gc: { x: number; y: number; w: number; h: number }
  fans: [{ x: number; y: number }, { x: number; y: number }]
  transTag: { x: number; y: number } | null   // null = GC label already says it (tall)
  hpv: { x: number; y: number }
  tank: { x: number; y: number; w: number; h: number }
  rv: { stubX: number }                                    // relief valve stub on tank top
  rvTextAnchor: 'start' | 'end'
  fgbv: { x: number; y: number }
  mtComps: { x: number; y: number }[]; mtCompW: number
  mtCaption: { x: number; y: number }
  ltComps: { x: number; y: number }[]; ltCompW: number
  ltCaption: { x: number; y: number }
  mtCase: { x: number; y: number; w: number; h: number }
  ltCase: { x: number; y: number; w: number; h: number }
  tagHead: { x: number; y: number }
  tagFlash: { x: number; y: number }
  tagMt: { x: number; y: number }
  tagLt: { x: number; y: number }
}

const WIDE: Geo = {
  viewBox: '0 0 860 340',
  pDischarge: 'M160,250 L160,120 L250,120 L250,88',
  pGcToHpv: 'M470,88 L470,120 L560,120 L596,120',
  pHpvToTank: 'M616,120 L646,120 L646,150',
  pLiquid: ['M646,252 L646,278 L760,278 L760,250', 'M760,278 L760,118'],
  pFgbv: 'M620,170 L545,170 L545,228',
  pMtSuction: 'M712,112 L712,228 L210,228 L210,250',
  pMtStubs: ['M110,228 L110,250', 'M160,228 L160,250'],
  pLtSuction: ['M790,250 L790,312 L420,312 L420,295', 'M370,312 L370,295'],
  pLtDischarge: 'M395,250 L395,228',
  gc: { x: 230, y: 42, w: 250, h: 46 },
  fans: [{ x: 295, y: 65 }, { x: 415, y: 65 }],
  transTag: { x: 355, y: 16 },
  hpv: { x: 606, y: 120 },
  tank: { x: 622, y: 152, w: 48, h: 100 },
  rv: { stubX: 658 }, rvTextAnchor: 'start',
  fgbv: { x: 596, y: 170 },
  mtComps: [0, 1, 2].map(i => ({ x: 84 + i * 52, y: 252 })), mtCompW: 46,
  mtCaption: { x: 162, y: 316 },
  ltComps: [0, 1].map(i => ({ x: 346 + i * 52, y: 252 })), ltCompW: 46,
  ltCaption: { x: 395, y: 328 },
  mtCase: { x: 690, y: 46, w: 150, h: 66 },
  ltCase: { x: 690, y: 186, w: 150, h: 64 },
  tagHead: { x: 200, y: 108 },
  tagFlash: { x: 646, y: 290 },
  tagMt: { x: 470, y: 218 },
  tagLt: { x: 600, y: 330 },
}

const TALL: Geo = {
  viewBox: '0 0 430 565',
  // MT comps → up the far left → gas cooler
  pDischarge: 'M175,430 L175,444 L10,444 L10,64 L20,64',
  // gas cooler → HPV (horizontal run) → flash tank
  pGcToHpv: 'M250,86 L250,110 L172,110',
  pHpvToTank: 'M148,110 L64,110 L64,140',
  // tank → case-feed riser (MT + frozen stubs)
  pLiquid: ['M64,240 L64,315 L212,315 L212,172 L230,172', 'M212,260 L230,260'],
  // tank vapor → MT suction header
  pFgbv: 'M88,185 L150,185 L150,350',
  pMtSuction: 'M415,172 L424,172 L424,350 L40,350',
  pMtStubs: ['M75,350 L75,380', 'M175,350 L175,380', 'M275,350 L275,380'],
  pLtSuction: ['M400,292 L400,460 L155,460 L155,480', 'M260,460 L260,480'],
  pLtDischarge: 'M110,504 L20,504 L20,350 L40,350',
  gc: { x: 20, y: 42, w: 260, h: 44 },
  fans: [{ x: 90, y: 64 }, { x: 210, y: 64 }],
  transTag: null,
  hpv: { x: 160, y: 110 },
  tank: { x: 40, y: 140, w: 48, h: 100 },
  rv: { stubX: 76 }, rvTextAnchor: 'start',
  fgbv: { x: 119, y: 185 },
  mtComps: [{ x: 30, y: 380 }, { x: 130, y: 380 }, { x: 230, y: 380 }], mtCompW: 90,
  mtCaption: { x: 95, y: 470 },
  ltComps: [{ x: 110, y: 480 }, { x: 215, y: 480 }], ltCompW: 90,
  ltCaption: { x: 210, y: 550 },
  mtCase: { x: 230, y: 140, w: 185, h: 64 },
  ltCase: { x: 230, y: 228, w: 185, h: 64 },
  tagHead: { x: 255, y: 126 },
  tagFlash: { x: 64, y: 274 },
  tagMt: { x: 240, y: 338 },
  tagLt: { x: 340, y: 444 },
}

export default function Co2BoosterVisual(p: Co2BoosterVisualProps) {
  const G = p.layout === 'tall' ? TALL : WIDE
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
  const hotColor = p.transcritical ? '#f97316' : C.discharge

  return (
    <svg viewBox={G.viewBox} className="w-full h-auto select-none" role="img" aria-label="CO2 booster rack schematic">
      <Defs />

      {/* ── Pipes ── */}
      <Pipe d={G.pDischarge} color={hotColor} flowing={mtRunning} speed={1.3} />
      <Pipe d={G.pGcToHpv} color={p.transcritical ? '#f97316' : C.liquid} flowing={hpvFlow} speed={0.9} />
      <Pipe d={G.pHpvToTank} color={C.liquid} flowing={hpvFlow} speed={0.8} />
      {G.pLiquid.map((d, i) => <Pipe key={i} d={d} color={C.liquid} w={i === 0 ? 4.5 : 3.5} flowing={hpvFlow} speed={0.7} />)}
      <Pipe d={G.pFgbv} color={C.flashGas} w={3.5} flowing={fgbvFlow} speed={0.9} />
      <Pipe d={G.pMtSuction} color={C.suction} flowing={mtRunning} />
      {G.pMtStubs.map((d, i) => <Pipe key={i} d={d} color={C.suction} w={3.2} flowing={mtRunning} />)}
      {G.pLtSuction.map((d, i) => <Pipe key={i} d={d} color={C.ltSuction} w={i === 0 ? 4.5 : 3.2} flowing={ltRunning} />)}
      <Pipe d={G.pLtDischarge} color={C.ltSuction} w={3.5} flowing={ltRunning} speed={1.2} />

      {/* ── Gas cooler ── */}
      <Coil x={G.gc.x} y={G.gc.y} w={G.gc.w} h={G.gc.h} fouled={p.gcFouled} label={p.transcritical ? 'Gas Cooler — transcritical' : 'Gas Cooler / Condenser — subcritical'} />
      <Fan x={G.fans[0].x} y={G.fans[0].y} r={17} spinning={p.fansSpinning[0]} failed={p.fansFailed[0]} />
      <Fan x={G.fans[1].x} y={G.fans[1].y} r={17} spinning={p.fansSpinning[1]} failed={p.fansFailed[1]} />
      {p.transcritical && G.transTag && (
        <Tag x={G.transTag.x} y={G.transTag.y} text="above 87.8°F critical — no condensing" color="#f97316" />
      )}

      {/* ── HPV ── */}
      <Valve x={G.hpv.x} y={G.hpv.y} label="HPV" state={p.hpv} labelBelow />

      {/* ── Flash tank + relief valve ── */}
      <Vessel x={G.tank.x} y={G.tank.y} w={G.tank.w} h={G.tank.h} level={p.flashLevel} label="Flash Tank" liquidColor="#fbbf24" />
      <g>
        {/* relief valve stub on top */}
        <line x1={G.rv.stubX} y1={G.tank.y} x2={G.rv.stubX} y2={G.tank.y - 14} stroke={C.stroke} strokeWidth={2.6} />
        <rect x={G.rv.stubX - 7} y={G.tank.y - 24} width={14} height={11} rx={2} fill={p.rvVenting ? C.crit : p.rvWarn ? C.warn : 'url(#simMetal)'} stroke={C.stroke} strokeWidth={1} />
        <text x={G.rv.stubX + (G.rvTextAnchor === 'start' ? 12 : -12)} y={G.tank.y - 15} textAnchor={G.rvTextAnchor} fontSize={10} fill={p.rvVenting ? C.crit : p.rvWarn ? C.warn : C.text} fontWeight={700}>RV 690</text>
        {p.rvVenting && [0, 1, 2].map(i => (
          <circle key={i} cx={G.rv.stubX + i * 4 - 4} cy={G.tank.y - 30} r={2.5} fill={C.crit} opacity={0.7}>
            <animate attributeName="cy" values={`${G.tank.y - 30};${G.tank.y - 48}`} dur="1.1s" begin={`${i * 0.35}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="1.1s" begin={`${i * 0.35}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </g>

      {/* ── FGBV ── */}
      <Valve x={G.fgbv.x} y={G.fgbv.y} label="FGBV" state={p.fgbv} labelBelow />

      {/* ── Compressors ── */}
      {p.mtComps.map((c, i) => (
        <Comp key={i} x={G.mtComps[i].x} y={G.mtComps[i].y} w={G.mtCompW} h={46} label={c.label} status={c.status} amps={c.amps} />
      ))}
      <text x={G.mtCaption.x} y={G.mtCaption.y} textAnchor="middle" fontSize={10.5} fill={C.text} fontWeight={700}>MT compressors</text>
      {p.ltComps.map((c, i) => (
        <Comp key={i} x={G.ltComps[i].x} y={G.ltComps[i].y} w={G.ltCompW} h={46} label={c.label} status={c.status} amps={c.amps} />
      ))}
      <text x={G.ltCaption.x} y={G.ltCaption.y} textAnchor="middle" fontSize={10.5} fill={C.ltSuction} fontWeight={700}>LT boosters → MT suction</text>

      {/* ── Cases ── */}
      <CaseBox x={G.mtCase.x} y={G.mtCase.y} w={G.mtCase.w} h={G.mtCase.h} label="MT Cases" sub="dairy · meat · deli"
        temp={p.mtCaseTemp} tempColor={p.mtCaseColor} doors={3} doorsOpen={p.doorsOpen} fanOut={p.mtFanOut} />
      <CaseBox x={G.ltCase.x} y={G.ltCase.y} w={G.ltCase.w} h={G.ltCase.h} label="Frozen" sub="frozen food · ice cream" frozen
        temp={p.ltCaseTemp} tempColor={p.ltCaseColor} doors={3} defrost={p.ltDefrost} iced={p.ltIced} />

      {/* ── Reading tags ── */}
      <Tag x={G.tagHead.x} y={G.tagHead.y} text={`${p.headPsig.toFixed(0)} psig`} color={hotColor} />
      <Tag x={G.tagFlash.x} y={G.tagFlash.y} text={`${p.flashPsig.toFixed(0)} psig`} color="#b45309" />
      <Tag x={G.tagMt.x} y={G.tagMt.y} text={`MT ${p.mtSuctionPsig.toFixed(0)} psig`} color={C.suction} />
      <Tag x={G.tagLt.x} y={G.tagLt.y} text={`LT ${p.ltSuctionPsig.toFixed(0)} psig`} color={C.ltSuction} />

      {/* ── Tap-to-inspect hotspots (top layer) ── */}
      {p.onSelect && (
        <g>
          <Hotspot x={G.gc.x} y={G.gc.y} w={G.gc.w} h={G.gc.h} selected={p.selectedId === 'gc'} onSelect={pick({
            id: 'gc', title: 'Gas Cooler', subtitle: p.transcritical ? 'transcritical — no condensing' : 'subcritical — condensing',
            rows: [
              { label: 'Pressure', value: `${p.headPsig.toFixed(0)} psig` },
              { label: 'Fans', value: `${fansUp}/2 running`, color: fansUp < 2 ? 'text-red-600 dark:text-red-400' : undefined },
              ...(p.gcFouled ? [{ label: 'Coil', value: 'FOULED', color: 'text-amber-600 dark:text-amber-400' }] : []),
            ],
          })} />
          <Hotspot x={G.hpv.x - 20} y={G.hpv.y - 22} w={40} h={42} selected={p.selectedId === 'hpv'} onSelect={pick({
            id: 'hpv', title: 'High Pressure Valve (HPV)', subtitle: 'gas cooler → flash tank',
            rows: [{ label: 'State', ...valveRow(p.hpv) }],
          })} />
          <Hotspot x={G.tank.x} y={G.tank.y} w={G.tank.w} h={G.tank.h} selected={p.selectedId === 'flash'} onSelect={pick({
            id: 'flash', title: 'Flash Tank / Receiver',
            rows: [
              { label: 'Pressure', value: `${p.flashPsig.toFixed(0)} psig` },
              { label: 'Level', value: `${Math.round(p.flashLevel * 100)}%` },
              { label: 'Relief valve', value: p.rvVenting ? 'LIFTING — venting CO2' : p.rvWarn ? 'Approaching (690)' : 'OK (lifts 690)',
                color: p.rvVenting ? 'text-red-600 dark:text-red-400' : p.rvWarn ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
            ],
          })} />
          <Hotspot x={G.fgbv.x - 20} y={G.fgbv.y - 22} w={40} h={42} selected={p.selectedId === 'fgbv'} onSelect={pick({
            id: 'fgbv', title: 'Flash Gas Bypass Valve (FGBV)', subtitle: 'flash tank vapor → MT suction',
            rows: [{ label: 'State', ...valveRow(p.fgbv) }],
          })} />
          {p.mtComps.map((c, i) => (
            <Hotspot key={c.label} x={G.mtComps[i].x} y={G.mtComps[i].y} w={G.mtCompW} h={46} selected={p.selectedId === `mt${i}`} onSelect={pick({
              id: `mt${i}`, title: `MT Compressor ${i + 1}`, subtitle: 'Bitzer · discharges to gas cooler',
              rows: compRows(c, p.mtSuctionPsig),
            })} />
          ))}
          {p.ltComps.map((c, i) => (
            <Hotspot key={c.label} x={G.ltComps[i].x} y={G.ltComps[i].y} w={G.ltCompW} h={46} selected={p.selectedId === `lt${i}`} onSelect={pick({
              id: `lt${i}`, title: `LT Booster ${i + 1}`, subtitle: 'Bitzer · discharges into MT suction',
              rows: compRows(c, p.ltSuctionPsig),
            })} />
          ))}
          <Hotspot x={G.mtCase.x} y={G.mtCase.y} w={G.mtCase.w} h={G.mtCase.h} selected={p.selectedId === 'mtcases'} onSelect={pick({
            id: 'mtcases', title: 'MT Cases', subtitle: 'dairy · meat · deli',
            rows: [
              { label: 'Avg temp', value: `${p.mtCaseTemp.toFixed(1)} °F` },
              { label: 'MT suction', value: `${p.mtSuctionPsig.toFixed(0)} psig` },
              ...(p.doorsOpen ? [{ label: 'Doors', value: 'PROPPED OPEN', color: 'text-amber-600 dark:text-amber-400' }] : []),
              ...(p.mtFanOut ? [{ label: 'Evap fans', value: 'OUT', color: 'text-red-600 dark:text-red-400' }] : []),
            ],
          })} />
          <Hotspot x={G.ltCase.x} y={G.ltCase.y} w={G.ltCase.w} h={G.ltCase.h} selected={p.selectedId === 'ltcases'} onSelect={pick({
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
