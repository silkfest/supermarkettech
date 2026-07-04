'use client'
import { Defs, Pipe, Fan, Coil, Comp, Vessel, CaseBox, Tag, Hotspot, C, type CompVisStatus } from './primitives'
import type { SchematicDetail } from './SchematicViewer'

// ── Hussmann parallel rack — MT + LT booster schematic ──────────────────────────
// Two layouts share one render pass via a geometry table:
//   wide — landscape, desktop / tablets
//   tall — portrait, stacked top-to-bottom so it stays legible on phones

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
  layout?: 'wide' | 'tall'
  /** Tap-to-inspect */
  selectedId?: string | null
  onSelect?: (d: SchematicDetail | null) => void
}

interface Geo {
  viewBox: string
  pipes: { d: string; color: 'discharge' | 'liquid' | 'suction' | 'ltSuction'; w?: number; speed?: number; role: 'mt' | 'lt' }[]
  cond: { x: number; y: number; w: number; h: number }
  fans: [{ x: number; y: number }, { x: number; y: number }]
  hpTag: { x: number; y: number }
  recv: { x: number; y: number; w: number; h: number }
  drier: { x: number; y: number }          // 40×16 rect origin
  sight: { x: number; y: number }
  comps: { x: number; y: number }[]        // 4
  compW: number
  mtCaption: { x: number; y: number }
  boosters: { x: number; y: number }[]     // 2
  boosterW: number
  ltCaption: { x: number; y: number }
  mtCase: { x: number; y: number; w: number; h: number }
  ltCase: { x: number; y: number; w: number; h: number }
  tagDischarge: { x: number; y: number }
  tagSuction: { x: number; y: number }
  tagLt: { x: number; y: number }
  tagFlood: { x: number; y: number }
}

const WIDE: Geo = {
  viewBox: '0 0 860 330',
  pipes: [
    { d: 'M445,205 L445,120 L310,120 L310,88', color: 'discharge', speed: 1.2, role: 'mt' },
    { d: 'M55,90 L55,128 L92,128 L92,152', color: 'liquid', speed: 0.8, role: 'mt' },
    { d: 'M92,246 L92,278 L745,278 L745,118', color: 'liquid', speed: 0.8, role: 'mt' },
    { d: 'M700,112 L700,168 L340,168', color: 'suction', role: 'mt' },
    ...[346, 406, 466, 526].map(x => ({ d: `M${x},168 L${x},205`, color: 'suction' as const, w: 3.5, role: 'mt' as const })),
    { d: 'M700,250 L700,310 L648,310 L648,288', color: 'ltSuction', role: 'lt' },
    { d: 'M648,310 L590,310 L590,288', color: 'ltSuction', role: 'lt' },
    { d: 'M612,238 L612,168', color: 'ltSuction', w: 3.5, speed: 1.2, role: 'lt' },
  ],
  cond: { x: 40, y: 42, w: 270, h: 46 },
  fans: [{ x: 110, y: 65 }, { x: 240, y: 65 }],
  hpTag: { x: 175, y: 108 },
  recv: { x: 70, y: 152, w: 44, h: 94 },
  drier: { x: 150, y: 270 },
  sight: { x: 243, y: 278 },
  comps: [0, 1, 2, 3].map(i => ({ x: 320 + i * 60, y: 208 })),
  compW: 52,
  mtCaption: { x: 436, y: 276 },
  boosters: [0, 1].map(i => ({ x: 566 + i * 58, y: 240 })),
  boosterW: 50,
  ltCaption: { x: 620, y: 324 },
  mtCase: { x: 640, y: 46, w: 185, h: 66 },
  ltCase: { x: 640, y: 190, w: 185, h: 60 },
  tagDischarge: { x: 378, y: 108 },
  tagSuction: { x: 510, y: 158 },
  tagLt: { x: 772, y: 328 },
  tagFlood: { x: 436, y: 145 },
}

const TALL: Geo = {
  viewBox: '0 0 430 620',
  pipes: [
    // discharge: comp row → up the left edge → condenser
    { d: 'M20,466 L6,466 L6,64 L20,64', color: 'discharge', speed: 1.2, role: 'mt' },
    // condensed liquid: condenser → receiver
    { d: 'M255,86 L255,118 L63,118 L63,132', color: 'liquid', speed: 0.8, role: 'mt' },
    // liquid main: receiver → drier → case feed riser
    { d: 'M63,222 L63,250 L210,250 L210,172 L230,172', color: 'liquid', speed: 0.8, role: 'mt' },
    { d: 'M210,250 L210,258 L230,258', color: 'liquid', speed: 0.8, role: 'mt' },
    // MT suction: case → right edge → header above comps
    { d: 'M415,160 L424,160 L424,400 L40,400', color: 'suction', role: 'mt' },
    ...[64, 160, 256, 352].map(x => ({ d: `M${x},400 L${x},440`, color: 'suction' as const, w: 3.5, role: 'mt' as const })),
    // LT suction: frozen case → boosters
    { d: 'M400,288 L400,520 L162,520 L162,540', color: 'ltSuction', role: 'lt' },
    { d: 'M272,520 L272,540', color: 'ltSuction', w: 3.5, role: 'lt' },
    // LT discharge → MT suction header
    { d: 'M120,562 L14,562 L14,400 L40,400', color: 'ltSuction', w: 3.5, speed: 1.2, role: 'lt' },
  ],
  cond: { x: 20, y: 42, w: 250, h: 44 },
  fans: [{ x: 85, y: 64 }, { x: 205, y: 64 }],
  hpTag: { x: 145, y: 102 },
  recv: { x: 40, y: 132, w: 46, h: 90 },
  drier: { x: 92, y: 242 },
  sight: { x: 186, y: 250 },
  comps: [0, 1, 2, 3].map(i => ({ x: 20 + i * 96, y: 440 })),
  compW: 88,
  mtCaption: { x: 185, y: 512 },
  boosters: [{ x: 120, y: 540 }, { x: 230, y: 540 }],
  boosterW: 84,
  ltCaption: { x: 215, y: 610 },
  mtCase: { x: 230, y: 128, w: 185, h: 66 },
  ltCase: { x: 230, y: 226, w: 185, h: 62 },
  tagDischarge: { x: 52, y: 300 },
  tagSuction: { x: 230, y: 390 },
  tagLt: { x: 335, y: 514 },
  tagFlood: { x: 230, y: 364 },
}

export default function ParallelRackVisual(p: ParallelRackVisualProps) {
  const G = p.layout === 'tall' ? TALL : WIDE
  const mtRunning = p.comps.some(c => c.status === 'run')
  const ltRunning = p.boosters.some(c => c.status === 'run')
  const fansUp = p.fansFailed.filter(f => !f).length
  const pick = (detail: SchematicDetail) => () => p.onSelect?.(p.selectedId === detail.id ? null : detail)
  const statusText = (s: CompVisStatus) => (s === 'run' ? 'Running' : s === 'trip' ? 'TRIPPED' : 'Standby')
  const pipeColor = { discharge: C.discharge, liquid: C.liquid, suction: C.suction, ltSuction: C.ltSuction }

  return (
    <svg viewBox={G.viewBox} className="w-full h-auto select-none" role="img" aria-label="Parallel rack schematic">
      <Defs />

      {/* ── Pipes (under equipment) ── */}
      {G.pipes.map((pp, i) => (
        <Pipe key={i} d={pp.d} color={pipeColor[pp.color]} w={pp.w} speed={pp.speed}
          flowing={pp.role === 'lt' ? ltRunning : mtRunning} />
      ))}

      {/* ── Condenser ── */}
      <Coil x={G.cond.x} y={G.cond.y} w={G.cond.w} h={G.cond.h} fouled={p.dirtyCondenser} label="Air-Cooled Condenser" />
      <Fan x={G.fans[0].x} y={G.fans[0].y} r={17} spinning={p.fansSpinning[0]} failed={p.fansFailed[0]} />
      <Fan x={G.fans[1].x} y={G.fans[1].y} r={17} spinning={p.fansSpinning[1]} failed={p.fansFailed[1]} />
      {p.hpCtrlActive && <Tag x={G.hpTag.x} y={G.hpTag.y} text="HP CTRL — fans cycling" color={C.warn} />}

      {/* ── Receiver + drier ── */}
      <Vessel x={G.recv.x} y={G.recv.y} w={G.recv.w} h={G.recv.h} level={p.receiverLevel} label="Receiver" />
      <g>
        <rect x={G.drier.x} y={G.drier.y} width={40} height={16} rx={4} fill="url(#simMetal)" stroke={p.drierRestricted ? C.warn : C.stroke} strokeWidth={p.drierRestricted ? 2.2 : 1.3} />
        <text x={G.drier.x + 20} y={G.drier.y + 32} textAnchor="middle" fontSize={10.5} fill={p.drierRestricted ? C.warn : C.text} fontWeight={700}>
          {p.drierRestricted ? 'drier ΔT!' : 'filter drier'}
        </text>
        {/* sight glass */}
        <circle cx={G.sight.x} cy={G.sight.y} r={6.5} fill="#dbeafe" stroke={C.stroke} strokeWidth={1.2} opacity={0.9} />
        <text x={G.sight.x} y={G.sight.y + 22} textAnchor="middle" fontSize={10} fill={C.text}>sight glass</text>
      </g>

      {/* ── MT compressors ── */}
      {p.comps.map((c, i) => (
        <Comp key={i} x={G.comps[i].x} y={G.comps[i].y} w={G.compW} h={50} label={c.label} status={c.status} amps={c.amps} />
      ))}
      <text x={G.mtCaption.x} y={G.mtCaption.y} textAnchor="middle" fontSize={11} fill={C.text} fontWeight={700}>MT Rack — 4 × Copeland Scroll</text>

      {/* ── LT boosters ── */}
      {p.boosters.map((c, i) => (
        <Comp key={i} x={G.boosters[i].x} y={G.boosters[i].y} w={G.boosterW} h={46} label={c.label} status={c.status} amps={c.amps} />
      ))}
      <text x={G.ltCaption.x} y={G.ltCaption.y} textAnchor="middle" fontSize={10.5} fill={C.ltSuction} fontWeight={700}>LT Boosters → MT suction</text>

      {/* ── Cases ── */}
      <CaseBox x={G.mtCase.x} y={G.mtCase.y} w={G.mtCase.w} h={G.mtCase.h} label="MT Cases" sub="produce · dairy · WIC"
        temp={p.mtCaseTemp} tempColor={p.mtCaseColor} doors={4} doorsOpen={p.doorsOpen} defrost={p.defrostStuck}
        iced={p.mtIced} fanOut={p.mtFanOut} />
      <CaseBox x={G.ltCase.x} y={G.ltCase.y} w={G.ltCase.w} h={G.ltCase.h} label="Frozen Food" sub="RL-5 doors · WIF · bunkers"
        temp={p.ltCaseTemp} tempColor={p.ltCaseColor} doors={4} frozen defrost={p.ltDefrostStuck} />

      {/* ── Reading tags ── */}
      <Tag x={G.tagDischarge.x} y={G.tagDischarge.y} text={`${p.dischargePsig.toFixed(0)} psig`} color={C.discharge} />
      <Tag x={G.tagSuction.x} y={G.tagSuction.y} text={`${p.suctionPsig.toFixed(1)} psig`} color={C.suction} />
      <Tag x={G.tagLt.x} y={G.tagLt.y} text={`${p.ltSuctionPsig.toFixed(1)} psig`} color={C.ltSuction} />
      {p.floodback && <Tag x={G.tagFlood.x} y={G.tagFlood.y} text="⚠ low SH — floodback risk" color={C.crit} />}

      {/* ── Tap-to-inspect hotspots (top layer) ── */}
      {p.onSelect && (
        <g>
          <Hotspot x={G.cond.x} y={G.cond.y} w={G.cond.w} h={G.cond.h} selected={p.selectedId === 'cond'} onSelect={pick({
            id: 'cond', title: 'Air-Cooled Condenser', subtitle: '2-fan remote',
            rows: [
              { label: 'Discharge', value: `${p.dischargePsig.toFixed(0)} psig` },
              { label: 'Fans', value: `${fansUp}/2 running`, color: fansUp < 2 ? 'text-red-600 dark:text-red-400' : undefined },
              { label: 'HP control', value: p.hpCtrlActive ? 'Active (floor)' : 'Off' },
              ...(p.dirtyCondenser ? [{ label: 'Coil', value: 'FOULED', color: 'text-amber-600 dark:text-amber-400' }] : []),
            ],
          })} />
          <Hotspot x={G.recv.x} y={G.recv.y} w={G.recv.w} h={G.recv.h} selected={p.selectedId === 'recv'} onSelect={pick({
            id: 'recv', title: 'Liquid Receiver',
            rows: [
              { label: 'Level', value: `${Math.round(p.receiverLevel * 100)}%`, color: p.receiverLevel < 0.2 ? 'text-red-600 dark:text-red-400' : p.receiverLevel > 0.7 ? 'text-amber-600 dark:text-amber-400' : undefined },
              { label: 'Liquid line', value: `${Math.max(p.dischargePsig - 8, 0).toFixed(0)} psig` },
            ],
          })} />
          <Hotspot x={G.drier.x - 4} y={G.drier.y - 6} w={90} h={26} selected={p.selectedId === 'drier'} onSelect={pick({
            id: 'drier', title: 'Filter Drier + Sight Glass',
            rows: [{ label: 'Drier ΔT', value: p.drierRestricted ? 'RESTRICTED' : 'Normal (<1 °F)', color: p.drierRestricted ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' }],
          })} />
          {p.comps.map((c, i) => (
            <Hotspot key={c.label} x={G.comps[i].x} y={G.comps[i].y} w={G.compW} h={50} selected={p.selectedId === `comp${i}`} onSelect={pick({
              id: `comp${i}`, title: `Compressor ${c.label}`, subtitle: 'Copeland Scroll · MT',
              rows: [
                { label: 'Status', value: statusText(c.status), color: c.status === 'trip' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Amps', value: c.status === 'run' ? `${c.amps.toFixed(1)} A` : '—' },
                { label: 'Suction', value: `${p.suctionPsig.toFixed(1)} psig` },
                { label: 'Discharge', value: `${p.dischargePsig.toFixed(0)} psig` },
              ],
            })} />
          ))}
          {p.boosters.map((c, i) => (
            <Hotspot key={c.label} x={G.boosters[i].x} y={G.boosters[i].y} w={G.boosterW} h={46} selected={p.selectedId === `boost${i}`} onSelect={pick({
              id: `boost${i}`, title: `LT Booster ${i + 1}`, subtitle: 'discharges into MT suction',
              rows: [
                { label: 'Status', value: statusText(c.status), color: c.status === 'trip' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Amps', value: c.status === 'run' ? `${c.amps.toFixed(1)} A` : '—' },
                { label: 'LT suction', value: `${p.ltSuctionPsig.toFixed(1)} psig` },
              ],
            })} />
          ))}
          <Hotspot x={G.mtCase.x} y={G.mtCase.y} w={G.mtCase.w} h={G.mtCase.h} selected={p.selectedId === 'mtcases'} onSelect={pick({
            id: 'mtcases', title: 'MT Cases', subtitle: 'produce · dairy · WIC',
            rows: [
              { label: 'Avg temp', value: `${p.mtCaseTemp.toFixed(1)} °F`, color: p.mtCaseColor === '#10b981' ? 'text-emerald-600 dark:text-emerald-400' : p.mtCaseColor === '#f59e0b' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400' },
              { label: 'Suction', value: `${p.suctionPsig.toFixed(1)} psig` },
              ...(p.defrostStuck ? [{ label: 'Defrost', value: 'STUCK ON', color: 'text-amber-600 dark:text-amber-400' }] : []),
              ...(p.doorsOpen ? [{ label: 'Doors', value: 'PROPPED OPEN', color: 'text-amber-600 dark:text-amber-400' }] : []),
              ...(p.mtIced ? [{ label: 'Coil', value: 'ICED', color: 'text-cyan-600 dark:text-cyan-400' }] : []),
              ...(p.mtFanOut ? [{ label: 'Evap fans', value: 'OUT', color: 'text-red-600 dark:text-red-400' }] : []),
            ],
          })} />
          <Hotspot x={G.ltCase.x} y={G.ltCase.y} w={G.ltCase.w} h={G.ltCase.h} selected={p.selectedId === 'ltcases'} onSelect={pick({
            id: 'ltcases', title: 'Frozen Food Cases', subtitle: 'RL-5 doors · WIF · bunkers',
            rows: [
              { label: 'Avg temp', value: `${p.ltCaseTemp.toFixed(1)} °F`, color: p.ltCaseColor === '#10b981' ? 'text-emerald-600 dark:text-emerald-400' : p.ltCaseColor === '#f59e0b' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400' },
              { label: 'LT suction', value: `${p.ltSuctionPsig.toFixed(1)} psig` },
              ...(p.ltDefrostStuck ? [{ label: 'Defrost', value: 'STUCK ON', color: 'text-amber-600 dark:text-amber-400' }] : []),
            ],
          })} />
        </g>
      )}
    </svg>
  )
}
