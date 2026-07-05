'use client'
import { Defs, Pipe, Fan, Coil, Comp, Vessel, Valve, CaseBox, Tag, Hotspot, C, type CompVisStatus } from './primitives'
import type { SchematicDetail } from './SchematicViewer'

// ── Hussmann MT parallel rack schematic ─────────────────────────────────────────
// Pure medium-temp rack: 4 Discus recips → oil separator → SPLIT condenser
// (section B gated by a Belimo valve, isolated in cold weather) → flooding
// (receiver pressure) valve → receiver → drier → cases. DDR bypasses discharge
// gas to the receiver in flooding mode and during KoolGas defrost draw; the
// KoolGas hot-gas main runs from the receiver top to the cases.
// Two layouts share one render pass via a geometry table:
//   wide — landscape, desktop / tablets
//   tall — portrait, stacked top-to-bottom so it stays legible on phones

export interface ParallelRackVisualProps {
  fansSpinning: boolean[]             // 6 CFMs; parked fans (staging / split) don't spin
  fansFailed: boolean[]               // already concealed by caller in scenario mode
  dirtyCondenser: boolean
  comps: { label: string; status: CompVisStatus; amps: number; model?: string; injecting?: boolean }[]      // 4 MT Discus recips
  receiverLevel: number               // 0–1
  drierRestricted: boolean
  suctionPsig: number
  dischargePsig: number
  receiverPsig: number
  mtCaseTemp: number; mtCaseColor: string
  defrostStuck: boolean
  doorsOpen: boolean
  mtIced: boolean
  mtFanOut: boolean
  /** Gauge-derived (low SH) — safe to show even in scenario mode */
  floodback: boolean
  hpCtrlActive: boolean
  /** Split condenser engaged — Belimo closed, section B isolated */
  splitActive: boolean
  /** Fault cues — concealed by caller in scenario mode */
  splitStuckClosed: boolean
  splitStuckOpen: boolean
  floodingStuckOpen: boolean
  ddrStuckOpen: boolean
  /** KoolGas defrost active — hot gas main flows */
  hotGasDefrost: boolean
  /** DDR feeding discharge gas to the receiver (flooding mode, defrost draw, or stuck) */
  ddrBypassing: boolean
  layout?: 'wide' | 'tall'
  /** Tap-to-inspect */
  selectedId?: string | null
  onSelect?: (d: SchematicDetail | null) => void
}

interface Geo {
  viewBox: string
  pDischargeIn: string                       // comps → oil separator
  pDischargeOut: string                      // oil separator → split-inlet riser/tee
  pSplitA: string                            // tee → condenser A
  pSplitB: string                            // tee → Belimo → condenser B
  pCondOutA: string                          // condenser A outlet (joins upstream of flooding valve)
  pCondOutB: string                          // condenser B outlet → flooding valve → receiver
  pDdr: string                               // discharge → receiver bypass
  pHotGas: string                            // receiver top → cases (KoolGas defrost main)
  pLiquid: string[]                          // receiver → drier → cases
  pSuction: string; pSuctionStubs: string[]
  condA: { x: number; y: number; w: number; h: number }
  condB: { x: number; y: number; w: number; h: number }
  fans: { x: number; y: number; r: number }[]
  belimo: { x: number; y: number }
  belimoLabel: { x: number; y: number }
  hpTag: { x: number; y: number }
  oilSep: { x: number; y: number; w: number; h: number }
  floodValve: { x: number; y: number }
  ddrValve: { x: number; y: number }
  recv: { x: number; y: number; w: number; h: number }
  drier: { x: number; y: number }
  sight: { x: number; y: number }
  comps: { x: number; y: number }[]
  compW: number
  mtCaption: { x: number; y: number }
  mtCase: { x: number; y: number; w: number; h: number }
  hotGasLabel: { x: number; y: number } | null
  caseLineLabels: { suction: [number, number]; liquid: [number, number]; hotGas: [number, number] } | null
  tagDischarge: { x: number; y: number }
  tagSuction: { x: number; y: number }
  tagReceiver: { x: number; y: number }
  tagFlood: { x: number; y: number }
}

const WIDE: Geo = {
  viewBox: '0 0 860 330',
  pDischargeIn: 'M445,205 L445,120 L386,120',
  pDischargeOut: 'M352,120 L185,120 L185,64',
  pSplitA: 'M185,64 L160,64',
  pSplitB: 'M185,64 L210,64',
  pCondOutA: 'M55,90 L55,104',
  pCondOutB: 'M315,88 L315,104 L55,104 L55,115 L92,115 L92,152',
  pDdr: 'M330,120 L330,192 L114,192',
  pHotGas: 'M114,165 L128,165 L128,20 L790,20 L790,46',
  pLiquid: ['M92,246 L92,278 L745,278 L745,118'],
  pSuction: 'M700,112 L700,168 L340,168',
  pSuctionStubs: [346, 406, 466, 526].map(x => `M${x},168 L${x},205`),
  condA: { x: 40, y: 42, w: 120, h: 46 },
  condB: { x: 210, y: 42, w: 120, h: 46 },
  fans: [
    { x: 62, y: 65, r: 12.5 }, { x: 100, y: 65, r: 12.5 }, { x: 138, y: 65, r: 12.5 },
    { x: 232, y: 65, r: 12.5 }, { x: 270, y: 65, r: 12.5 }, { x: 308, y: 65, r: 12.5 },
  ],
  belimo: { x: 198, y: 64 },
  belimoLabel: { x: 185, y: 52 },
  hpTag: { x: 498, y: 106 },
  oilSep: { x: 352, y: 92, w: 34, h: 55 },
  floodValve: { x: 74, y: 115 },
  ddrValve: { x: 222, y: 192 },
  recv: { x: 70, y: 152, w: 44, h: 94 },
  drier: { x: 150, y: 270 },
  sight: { x: 243, y: 278 },
  comps: [0, 1, 2, 3].map(i => ({ x: 320 + i * 60, y: 208 })),
  compW: 52,
  mtCaption: { x: 436, y: 276 },
  mtCase: { x: 640, y: 46, w: 185, h: 76 },
  hotGasLabel: { x: 460, y: 14 },
  caseLineLabels: { suction: [694, 138], liquid: [751, 138], hotGas: [782, 40] },
  tagDischarge: { x: 495, y: 132 },
  tagSuction: { x: 600, y: 158 },
  tagReceiver: { x: 58, y: 306 },
  tagFlood: { x: 600, y: 214 },
}

const TALL: Geo = {
  viewBox: '0 0 430 548',
  pDischargeIn: 'M352,482 L352,506 L160,506',
  pDischargeOut: 'M90,506 L6,506 L6,100 L137,100 L137,64',
  pSplitA: 'M137,64 L110,64',
  pSplitB: 'M137,64 L165,64',
  pCondOutA: 'M30,86 L30,108 L200,108 L200,118',
  pCondOutB: 'M255,86 L255,118 L63,118 L63,132',
  pDdr: 'M6,175 L40,175',
  pHotGas: 'M86,157 L230,157',
  pLiquid: ['M63,222 L63,250 L210,250 L210,166 L230,166'],
  pSuction: 'M415,172 L424,172 L424,400 L40,400',
  pSuctionStubs: [64, 160, 256, 352].map(x => `M${x},400 L${x},430`),
  condA: { x: 20, y: 42, w: 90, h: 44 },
  condB: { x: 165, y: 42, w: 105, h: 44 },
  fans: [
    { x: 35, y: 64, r: 10 }, { x: 65, y: 64, r: 10 }, { x: 95, y: 64, r: 10 },
    { x: 183, y: 64, r: 11 }, { x: 217, y: 64, r: 11 }, { x: 251, y: 64, r: 11 },
  ],
  belimo: { x: 152, y: 64 },
  belimoLabel: { x: 137, y: 50 },
  hpTag: { x: 330, y: 106 },
  oilSep: { x: 90, y: 492, w: 70, h: 28 },
  floodValve: { x: 160, y: 118 },
  ddrValve: { x: 23, y: 175 },
  recv: { x: 40, y: 132, w: 46, h: 90 },
  drier: { x: 92, y: 242 },
  sight: { x: 186, y: 250 },
  comps: [0, 1, 2, 3].map(i => ({ x: 20 + i * 96, y: 430 })),
  compW: 88,
  mtCaption: { x: 285, y: 540 },
  mtCase: { x: 230, y: 128, w: 185, h: 76 },
  hotGasLabel: null,
  caseLineLabels: null,
  tagDischarge: { x: 52, y: 312 },
  tagSuction: { x: 230, y: 390 },
  tagReceiver: { x: 150, y: 214 },
  tagFlood: { x: 230, y: 364 },
}

export default function ParallelRackVisual(p: ParallelRackVisualProps) {
  const G = p.layout === 'tall' ? TALL : WIDE
  const mtRunning = p.comps.some(c => c.status === 'run')
  const fansUp = p.fansFailed.filter(f => !f).length
  const ddrFlow = p.ddrBypassing || p.ddrStuckOpen
  const pick = (detail: SchematicDetail) => () => p.onSelect?.(p.selectedId === detail.id ? null : detail)
  const statusText = (s: CompVisStatus) => (s === 'run' ? 'Running' : s === 'trip' ? 'TRIPPED' : 'Standby')
  const receiverDrop = p.dischargePsig - p.receiverPsig
  const bIsolated = p.splitActive && !p.splitStuckOpen
  const condSpan = { x: G.condA.x, w: G.condB.x + G.condB.w - G.condA.x }

  return (
    <svg viewBox={G.viewBox} className="w-full h-auto select-none" role="img" aria-label="MT parallel rack schematic">
      <Defs />

      {/* ── Pipes (under equipment) ── */}
      <Pipe d={G.pDischargeIn} color={C.discharge} flowing={mtRunning} speed={1.2} />
      <Pipe d={G.pDischargeOut} color={C.discharge} flowing={mtRunning} speed={1.2} />
      <Pipe d={G.pSplitA} color={C.discharge} w={3.5} flowing={mtRunning} speed={1.1} />
      <Pipe d={G.pSplitB} color={C.discharge} w={3.5} flowing={mtRunning && !bIsolated} dim={bIsolated} speed={1.1} />
      <Pipe d={G.pCondOutA} color={C.liquid} w={3.5} flowing={mtRunning} speed={0.8} />
      <Pipe d={G.pCondOutB} color={C.liquid} flowing={mtRunning} speed={0.8} />
      {/* DDR bypass — dim/idle unless flooding mode, defrost draw, or stuck open */}
      <Pipe d={G.pDdr} color={C.discharge} w={3.2} flowing={ddrFlow && mtRunning} dim={!ddrFlow} speed={0.9} />
      {/* KoolGas hot-gas defrost main: receiver top → cases */}
      <Pipe d={G.pHotGas} color={C.discharge} w={3.2} flowing={p.hotGasDefrost && mtRunning} dim={!p.hotGasDefrost} speed={1.1} />
      {G.pLiquid.map((d, i) => <Pipe key={i} d={d} color={C.liquid} flowing={mtRunning} speed={0.8} />)}
      <Pipe d={G.pSuction} color={C.suction} flowing={mtRunning} />
      {G.pSuctionStubs.map((d, i) => <Pipe key={i} d={d} color={C.suction} w={3.5} flowing={mtRunning} />)}

      {/* ── Split condenser — section A always active, section B behind the Belimo ── */}
      <Coil x={G.condA.x} y={G.condA.y} w={G.condA.w} h={G.condA.h} fouled={p.dirtyCondenser} label="Cond A" />
      <g opacity={bIsolated ? 0.45 : 1}>
        <Coil x={G.condB.x} y={G.condB.y} w={G.condB.w} h={G.condB.h} fouled={p.dirtyCondenser && !bIsolated} />
      </g>
      <text x={G.condB.x + G.condB.w / 2} y={G.condB.y - 7} textAnchor="middle" fontSize={11.5} fontWeight={700}
        fill={bIsolated ? C.warn : C.text}>
        {bIsolated ? 'Cond B — SPLIT OFF' : 'Cond B — split'}
      </text>
      {G.fans.map((f, i) => (
        <Fan key={i} x={f.x} y={f.y} r={f.r} spinning={p.fansSpinning[i] ?? true} failed={p.fansFailed[i] ?? false} />
      ))}
      {/* Belimo split valve on section B's feed */}
      <Valve x={G.belimo.x} y={G.belimo.y} state={p.splitStuckOpen ? 'open' : p.splitStuckClosed ? 'closed' : 'auto'} />
      <text x={G.belimoLabel.x} y={G.belimoLabel.y} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={C.text}>Belimo</text>
      {p.hpCtrlActive && <Tag x={G.hpTag.x} y={G.hpTag.y} text="HP CTRL — flooding mode" color={C.warn} />}

      {/* ── Oil separator on the discharge line ── */}
      <Vessel x={G.oilSep.x} y={G.oilSep.y} w={G.oilSep.w} h={G.oilSep.h} level={0.35} label="Oil Sep" liquidColor="#a16207" />

      {/* ── Flooding (receiver pressure) valve + DDR ── */}
      <Valve x={G.floodValve.x} y={G.floodValve.y} label="Flooding" state={p.floodingStuckOpen ? 'open' : 'auto'} labelBelow />
      <Valve x={G.ddrValve.x} y={G.ddrValve.y} label="DDR" state={p.ddrStuckOpen ? 'open' : 'auto'} labelBelow />

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
        <g key={i}>
          <Comp x={G.comps[i].x} y={G.comps[i].y} w={G.compW} h={50} label={c.label} status={c.status} amps={c.amps} />
          {c.injecting && (
            <text x={G.comps[i].x + G.compW / 2} y={G.comps[i].y + 62} textAnchor="middle" fontSize={9.5} fontWeight={800} fill={C.warn}>
              INJ ●
              <animate attributeName="opacity" values="1;0.35;1" dur="1.4s" repeatCount="indefinite" />
            </text>
          )}
        </g>
      ))}
      <text x={G.mtCaption.x} y={G.mtCaption.y} textAnchor="middle" fontSize={11} fill={C.text} fontWeight={700}>MT Rack — 4 × Copeland Discus recips</text>

      {/* ── Cases ── */}
      <CaseBox x={G.mtCase.x} y={G.mtCase.y} w={G.mtCase.w} h={G.mtCase.h} label="MT Cases" sub="produce · dairy · meat · deli · WIC"
        temp={p.mtCaseTemp} tempColor={p.mtCaseColor} doors={5} doorsOpen={p.doorsOpen} defrost={p.defrostStuck}
        iced={p.mtIced} fanOut={p.mtFanOut} />

      {/* ── Line labels at the case connections ── */}
      {G.hotGasLabel && (
        <text x={G.hotGasLabel.x} y={G.hotGasLabel.y} textAnchor="middle" fontSize={9.5} fontWeight={700}
          fill={p.hotGasDefrost ? C.discharge : C.text} opacity={p.hotGasDefrost ? 1 : 0.7}>
          KoolGas defrost main {p.hotGasDefrost ? '— FLOWING' : ''}
        </text>
      )}
      {G.caseLineLabels && (
        <g fontSize={9} fontWeight={700}>
          <text x={G.caseLineLabels.suction[0]} y={G.caseLineLabels.suction[1]} textAnchor="end" fill={C.suction}>suction</text>
          <text x={G.caseLineLabels.liquid[0]} y={G.caseLineLabels.liquid[1]} textAnchor="start" fill={C.liquid}>liquid</text>
          <text x={G.caseLineLabels.hotGas[0]} y={G.caseLineLabels.hotGas[1]} textAnchor="end" fill={C.discharge}>hot gas</text>
        </g>
      )}

      {/* ── Reading tags ── */}
      <Tag x={G.tagDischarge.x} y={G.tagDischarge.y} text={`${p.dischargePsig.toFixed(0)} psig`} color={C.discharge} />
      <Tag x={G.tagSuction.x} y={G.tagSuction.y} text={`${p.suctionPsig.toFixed(1)} psig`} color={C.suction} />
      <Tag x={G.tagReceiver.x} y={G.tagReceiver.y} text={`recv ${p.receiverPsig.toFixed(0)}`} color="#b45309" />
      {p.floodback && <Tag x={G.tagFlood.x} y={G.tagFlood.y} text="⚠ low SH — floodback risk" color={C.crit} />}

      {/* ── Tap-to-inspect hotspots (top layer) ── */}
      {p.onSelect && (
        <g>
          <Hotspot x={condSpan.x} y={G.condA.y} w={condSpan.w} h={G.condA.h} selected={p.selectedId === 'cond'} onSelect={pick({
            id: 'cond', title: 'Split Air-Cooled Condenser', subtitle: '6 CFMs — section B gated by Belimo valve',
            rows: [
              { label: 'Discharge', value: `${p.dischargePsig.toFixed(0)} psig` },
              { label: 'Fans', value: `${fansUp}/6 healthy`, color: fansUp < 6 ? 'text-red-600 dark:text-red-400' : undefined },
              { label: 'Split', value: bIsolated ? 'B ISOLATED (half surface)' : 'Full surface', color: bIsolated ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
              { label: 'HP control', value: p.hpCtrlActive ? 'Active (flooding)' : 'Off' },
              ...(p.dirtyCondenser ? [{ label: 'Coil', value: 'FOULED', color: 'text-amber-600 dark:text-amber-400' }] : []),
            ],
          })} />
          <Hotspot x={G.belimo.x - 16} y={G.belimo.y - 18} w={32} h={36} selected={p.selectedId === 'belimo'} onSelect={pick({
            id: 'belimo', title: 'Belimo Split Valve', subtitle: 'gates condenser section B',
            rows: [
              { label: 'State', value: p.splitStuckOpen ? 'STUCK OPEN — won\'t split' : p.splitStuckClosed ? 'STUCK CLOSED — B lost' : bIsolated ? 'Closed — split engaged' : 'Open — full surface',
                color: p.splitStuckOpen || p.splitStuckClosed ? 'text-red-600 dark:text-red-400' : bIsolated ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Duty', value: 'Closes below ~50 °F OAT' },
            ],
          })} />
          <Hotspot x={G.oilSep.x} y={G.oilSep.y} w={G.oilSep.w} h={G.oilSep.h} selected={p.selectedId === 'oilsep'} onSelect={pick({
            id: 'oilsep', title: 'Oil Separator', subtitle: 'discharge line → oil back to Y825 system',
            rows: [
              { label: 'Duty', value: 'Strips oil from hot gas' },
              { label: 'Return', value: 'Reservoir → Y825 → comps' },
            ],
          })} />
          <Hotspot x={G.floodValve.x - 16} y={G.floodValve.y - 20} w={32} h={40} selected={p.selectedId === 'flood'} onSelect={pick({
            id: 'flood', title: 'Flooding / Receiver Pressure Valve', subtitle: 'condenser drop leg',
            rows: [
              { label: 'State', value: p.floodingStuckOpen ? 'STUCK OPEN' : p.hpCtrlActive ? 'Throttling (flooding condenser)' : 'Wide open (warm ambient)',
                color: p.floodingStuckOpen ? 'text-red-600 dark:text-red-400' : p.hpCtrlActive ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Duty', value: 'Holds head in low ambient' },
            ],
          })} />
          <Hotspot x={G.ddrValve.x - 16} y={G.ddrValve.y - 20} w={32} h={40} selected={p.selectedId === 'ddr'} onSelect={pick({
            id: 'ddr', title: 'DDR — Discharge Differential Regulator', subtitle: 'discharge → receiver bypass',
            rows: [
              { label: 'State', value: p.ddrStuckOpen ? 'STUCK OPEN — bypassing' : p.ddrBypassing ? 'Bypassing' : 'Closed',
                color: p.ddrStuckOpen ? 'text-red-600 dark:text-red-400' : p.ddrBypassing ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Δ disch→recv', value: `${receiverDrop.toFixed(0)} psig`, color: receiverDrop < 4 ? 'text-amber-600 dark:text-amber-400' : undefined },
              { label: 'Duty', value: 'Presses receiver when flooding' },
              ...(p.defrostStuck ? [{ label: 'KoolGas draw', value: 'Feeding receiver', color: 'text-amber-600 dark:text-amber-400' }] : []),
            ],
          })} />
          <Hotspot x={G.recv.x} y={G.recv.y} w={G.recv.w} h={G.recv.h} selected={p.selectedId === 'recv'} onSelect={pick({
            id: 'recv', title: 'Liquid Receiver', subtitle: 'KoolGas defrost gas draws off the top',
            rows: [
              { label: 'Pressure', value: `${p.receiverPsig.toFixed(0)} psig` },
              { label: 'Level', value: `${Math.round(p.receiverLevel * 100)}%`, color: p.receiverLevel < 0.2 ? 'text-red-600 dark:text-red-400' : p.receiverLevel > 0.7 ? 'text-amber-600 dark:text-amber-400' : undefined },
              ...(p.hotGasDefrost ? [{ label: 'Defrost draw', value: 'ACTIVE — supplying hot gas', color: 'text-amber-600 dark:text-amber-400' }] : []),
            ],
          })} />
          <Hotspot x={G.drier.x - 4} y={G.drier.y - 6} w={90} h={26} selected={p.selectedId === 'drier'} onSelect={pick({
            id: 'drier', title: 'Filter Drier + Sight Glass',
            rows: [{ label: 'Drier ΔT', value: p.drierRestricted ? 'RESTRICTED' : 'Normal (<1 °F)', color: p.drierRestricted ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' }],
          })} />
          {p.comps.map((c, i) => (
            <Hotspot key={c.label} x={G.comps[i].x} y={G.comps[i].y} w={G.compW} h={50} selected={p.selectedId === `comp${i}`} onSelect={pick({
              id: `comp${i}`, title: `Compressor ${c.label}`, subtitle: c.model ? `Copeland Discus ${c.model}` : 'Copeland Discus · MT',
              rows: [
                { label: 'Status', value: statusText(c.status), color: c.status === 'trip' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Amps', value: c.status === 'run' ? `${c.amps.toFixed(1)} A` : '—' },
                { label: 'Suction', value: `${p.suctionPsig.toFixed(1)} psig` },
                { label: 'Discharge', value: `${p.dischargePsig.toFixed(0)} psig` },
                { label: 'Safeties', value: 'HPCO · LPCO · OPC · MP' },
                ...(c.injecting !== undefined && c.injecting ? [{ label: 'Demand Cooling', value: 'INJECTING', color: 'text-amber-600 dark:text-amber-400' }] : []),
              ],
            })} />
          ))}
          <Hotspot x={G.mtCase.x} y={G.mtCase.y} w={G.mtCase.w} h={G.mtCase.h} selected={p.selectedId === 'mtcases'} onSelect={pick({
            id: 'mtcases', title: 'MT Cases', subtitle: 'produce · dairy · meat · deli · WIC',
            rows: [
              { label: 'Avg temp', value: `${p.mtCaseTemp.toFixed(1)} °F`, color: p.mtCaseColor === '#10b981' ? 'text-emerald-600 dark:text-emerald-400' : p.mtCaseColor === '#f59e0b' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400' },
              { label: 'Suction', value: `${p.suctionPsig.toFixed(1)} psig` },
              { label: 'Lines', value: 'suction · liquid · hot gas' },
              ...(p.defrostStuck ? [{ label: 'Defrost', value: 'STUCK ON', color: 'text-amber-600 dark:text-amber-400' }] : []),
              ...(p.doorsOpen ? [{ label: 'Doors', value: 'PROPPED OPEN', color: 'text-amber-600 dark:text-amber-400' }] : []),
              ...(p.mtIced ? [{ label: 'Coil', value: 'ICED', color: 'text-cyan-600 dark:text-cyan-400' }] : []),
              ...(p.mtFanOut ? [{ label: 'Evap fans', value: 'OUT', color: 'text-red-600 dark:text-red-400' }] : []),
            ],
          })} />
        </g>
      )}
    </svg>
  )
}
