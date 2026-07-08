'use client'
import { Defs, Fan, Coil, Valve, Tag, Hotspot, C } from './primitives'
import type { SchematicDetail } from './SchematicViewer'

// ── DT bunker (single-deck frozen island) — top-down plan view ─────────────────
// Drawn the way a tech sees it walking up and looking into the case: the open
// top with the discharge grille along one long side and the return grille along
// the other, the air curtain sweeping across the opening over the product, and
// the deck pans pulled at one end to expose the under-deck works — the coil
// running lengthwise with its fans mounted on the fan board (blowing through
// the coil toward the discharge side), calrod heaters in the fins, DT clamped
// to the coil, the fan-delay klixon on the suction header, and TXV + suction
// connections at the coil end plate where the lines leave the case.

export interface DtBunkerVisualProps {
  fansSpinning: [boolean, boolean]
  fansFailed: [boolean, boolean]
  frostPct: number                    // 0–100 coil frost
  heatersOn: boolean
  heaterHalf: boolean                 // one element open — half glow
  defrostMode: boolean
  txvState: 'normal' | 'starved' | 'flooding'
  dtState: 'closed' | 'open'          // defrost termination switch
  klixonClosed: boolean               // fan delay klixon
  curtainDeployed: boolean            // night curtain over the opening
  curtainFault: boolean
  suctionPsig: number
  coilTempF: number
  dischargeAirF: number
  returnAirF: number
  productF: number
  productColor: string
  airflowOk: boolean                  // any air moving through the loop
  layout?: 'wide' | 'tall'
  selectedId?: string | null
  onSelect?: (d: SchematicDetail | null) => void
}

interface XY { x: number; y: number }
interface Rect { x: number; y: number; w: number; h: number }

interface Geo {
  viewBox: string
  vertical: boolean                   // tall layout: case length runs down the screen
  title: XY | null
  outer: Rect                         // outer shell
  wallT: number
  dischBand: Rect                     // discharge grille band (long side)
  returnBand: Rect                    // return grille band (opposite long side)
  productZone: Rect                   // stocked portion of the opening
  plenumZone: Rect                    // deck-pans-removed portion (under-deck view)
  cartonGrid: { cols: number; rows: number }
  curtainLanes: number[]              // air-curtain arrow lanes across the opening
  coil: Rect
  fanBoard: Rect
  fans: [XY, XY]
  fanR: number
  fanLabel: XY
  plenumLanes: number[]               // under-deck airflow arrow lanes (aligned to fans)
  heaters: { x: number; y: number; len: number }
  heaterLabel: XY
  dt: XY
  klix: XY
  txv: XY
  txvStub: { x1: number; y1: number; x2: number; y2: number }
  pLiquid: string
  pSuction: string
  cutLabel: { x: number; y: number; rotate: boolean }
  warn: XY
  tagDischarge: XY
  tagReturn: XY
  tagSuction: XY & { anchor: 'start' | 'middle' | 'end' }
  tagProduct: XY
}

const WIDE: Geo = {
  viewBox: '0 0 860 340',
  vertical: false,
  title: { x: 430, y: 30 },
  outer: { x: 150, y: 64, w: 560, h: 240 },
  wallT: 10,
  dischBand: { x: 160, y: 74, w: 540, h: 20 },
  returnBand: { x: 160, y: 274, w: 540, h: 20 },
  productZone: { x: 160, y: 94, w: 270, h: 180 },
  plenumZone: { x: 430, y: 94, w: 270, h: 180 },
  cartonGrid: { cols: 3, rows: 2 },
  curtainLanes: [205, 285, 365],
  coil: { x: 440, y: 112, w: 200, h: 44 },
  fanBoard: { x: 440, y: 156, w: 200, h: 5 },
  fans: [{ x: 510, y: 185 }, { x: 595, y: 185 }],
  fanR: 19,
  fanLabel: { x: 552, y: 216 },
  plenumLanes: [510, 595],
  heaters: { x: 444, y: 124, len: 192 },
  heaterLabel: { x: 540, y: 105 },
  dt: { x: 466, y: 167 },
  klix: { x: 652, y: 120 },
  txv: { x: 668, y: 148 },
  txvStub: { x1: 640, y1: 148, x2: 657, y2: 148 },
  pLiquid: 'M742,148 L679,148',
  pSuction: 'M640,120 L742,120',
  cutLabel: { x: 436, y: 184, rotate: true },
  warn: { x: 295, y: 156 },
  tagDischarge: { x: 255, y: 54 },
  tagReturn: { x: 255, y: 316 },
  tagSuction: { x: 752, y: 124, anchor: 'start' },
  tagProduct: { x: 295, y: 196 },
}

const TALL: Geo = {
  viewBox: '0 0 430 480',
  vertical: true,
  title: { x: 215, y: 26 },
  outer: { x: 40, y: 56, w: 350, h: 396 },
  wallT: 9,
  dischBand: { x: 49, y: 65, w: 18, h: 378 },
  returnBand: { x: 363, y: 65, w: 18, h: 378 },
  productZone: { x: 67, y: 65, w: 296, h: 207 },
  plenumZone: { x: 67, y: 272, w: 296, h: 171 },
  cartonGrid: { cols: 3, rows: 2 },
  curtainLanes: [110, 165, 220],
  coil: { x: 79, y: 284, w: 44, h: 130 },
  fanBoard: { x: 123, y: 284, w: 5, h: 130 },
  fans: [{ x: 158, y: 318 }, { x: 158, y: 383 }],
  fanR: 17,
  fanLabel: { x: 158, y: 353 },
  plenumLanes: [318, 383],
  heaters: { x: 91, y: 288, len: 122 },
  heaterLabel: { x: 100, y: 280 },
  dt: { x: 135, y: 296 },
  klix: { x: 99, y: 428 },
  txv: { x: 117, y: 432 },
  txvStub: { x1: 117, y1: 414, x2: 117, y2: 426 },
  pLiquid: 'M117,438 L117,466 L14,466',
  pSuction: 'M99,414 L99,460 L190,460',
  cutLabel: { x: 215, y: 267, rotate: false },
  warn: { x: 215, y: 150 },
  tagDischarge: { x: 100, y: 48 },
  tagReturn: { x: 330, y: 48 },
  tagSuction: { x: 198, y: 464, anchor: 'start' },
  tagProduct: { x: 215, y: 190 },
}

/** Coil-mounted klixon disc with a side label (space in the plenum is tight). */
function ClampDisc({ x, y, label, ok, side }: { x: number; y: number; label: string; ok: boolean; side: 'left' | 'right' }) {
  const color = ok ? '#10b981' : '#ef4444'
  const tx = side === 'left' ? x - 10 : x + 10
  return (
    <g>
      <circle cx={x} cy={y} r={6} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.6} />
      <circle cx={x} cy={y} r={2.2} fill={color} />
      <text x={tx} y={y + 3.5} textAnchor={side === 'left' ? 'end' : 'start'} fontSize={9.5} fontWeight={800}
        fill={ok ? C.text : '#ef4444'}>
        {label}{ok ? '' : ' · OPEN'}
      </text>
    </g>
  )
}

/** Grille band with slots running across the airflow direction. */
function GrilleBand({ r, vertical }: { r: Rect; vertical: boolean }) {
  const step = 7
  const n = Math.floor((vertical ? r.h : r.w) / step) - 1
  return (
    <g>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#22d3ee" fillOpacity={0.07} stroke={C.stroke} strokeWidth={0.9} />
      {Array.from({ length: n }, (_, i) =>
        vertical
          ? <line key={i} x1={r.x + 2} y1={r.y + step * (i + 1)} x2={r.x + r.w - 2} y2={r.y + step * (i + 1)} stroke={C.stroke} strokeWidth={0.8} opacity={0.55} />
          : <line key={i} x1={r.x + step * (i + 1)} y1={r.y + 2} x2={r.x + step * (i + 1)} y2={r.y + r.h - 2} stroke={C.stroke} strokeWidth={0.8} opacity={0.55} />,
      )}
    </g>
  )
}

export default function DtBunkerVisual(p: DtBunkerVisualProps) {
  const G = p.layout === 'tall' ? TALL : WIDE
  const pick = (detail: SchematicDetail) => () => p.onSelect?.(p.selectedId === detail.id ? null : detail)
  const frost = Math.max(0, Math.min(100, p.frostPct))
  const o = G.outer
  const V = G.vertical
  const pz = G.productZone
  const uz = G.plenumZone

  // air-curtain arrows: discharge side → across the opening → return side
  const curtainPath = (lane: number) =>
    V ? `M${pz.x + 6},${lane} L${pz.x + pz.w - 10},${lane}` : `M${lane},${pz.y + 6} L${lane},${pz.y + pz.h - 10}`
  const curtainHead = (lane: number) =>
    V ? `M${pz.x + pz.w - 10},${lane - 4} L${pz.x + pz.w - 2},${lane} L${pz.x + pz.w - 10},${lane + 4} Z`
      : `M${lane - 4},${pz.y + pz.h - 10} L${lane},${pz.y + pz.h - 2} L${lane + 4},${pz.y + pz.h - 10} Z`
  // under-deck arrows: return side back toward the fans/coil
  const plenumPath = (lane: number) =>
    V ? `M${uz.x + uz.w - 8},${lane} L${G.fans[0].x + G.fanR + 12},${lane}`
      : `M${lane},${uz.y + uz.h - 8} L${lane},${G.fans[0].y + G.fanR + 12}`
  const plenumHead = (lane: number) =>
    V ? `M${G.fans[0].x + G.fanR + 20},${lane - 4} L${G.fans[0].x + G.fanR + 12},${lane} L${G.fans[0].x + G.fanR + 20},${lane + 4} Z`
      : `M${lane - 4},${G.fans[0].y + G.fanR + 20} L${lane},${G.fans[0].y + G.fanR + 12} L${lane + 4},${G.fans[0].y + G.fanR + 20} Z`

  // calrod heater zigzag along the coil length
  const heaterSegs = Math.floor(G.heaters.len / 18)
  const heaterPath = V
    ? `M${G.heaters.x},${G.heaters.y} ${Array.from({ length: heaterSegs }, () => 'l-5,5 l10,8 l-5,5').join(' ')}`
    : `M${G.heaters.x},${G.heaters.y} ${Array.from({ length: heaterSegs }, () => 'l5,-5 l8,10 l5,-5').join(' ')}`

  // fans hotspot bounds
  const fx0 = Math.min(G.fans[0].x, G.fans[1].x) - G.fanR - 4
  const fy0 = Math.min(G.fans[0].y, G.fans[1].y) - G.fanR - 4
  const fw = Math.abs(G.fans[1].x - G.fans[0].x) + G.fanR * 2 + 8
  const fh = Math.abs(G.fans[1].y - G.fans[0].y) + G.fanR * 2 + 8

  return (
    <svg viewBox={G.viewBox} className="w-full h-auto select-none" role="img" aria-label="DT bunker case cross-section">
      <Defs />

      {G.title && (
        <text x={G.title.x} y={G.title.y} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={C.text}>
          DT Bunker — 8 ft Frozen Island · top view
        </text>
      )}

      {/* ── Shell: insulated walls seen from above ── */}
      <rect x={o.x} y={o.y} width={o.w} height={o.h} rx={14} fill="url(#simMetal)" stroke={C.stroke} strokeWidth={1.8} />
      <rect x={o.x + G.wallT} y={o.y + G.wallT} width={o.w - G.wallT * 2} height={o.h - G.wallT * 2} rx={8}
        className="fill-white dark:fill-slate-800" stroke={C.stroke} strokeWidth={1} />

      {/* ── Grille bands along the long sides ── */}
      <GrilleBand r={G.dischBand} vertical={V} />
      <GrilleBand r={G.returnBand} vertical={V} />

      {/* ── Under-deck zone (deck pans removed) ── */}
      <rect x={uz.x} y={uz.y} width={uz.w} height={uz.h} fill="#64748b" fillOpacity={0.10} />
      <line
        x1={V ? uz.x : uz.x} y1={V ? uz.y : uz.y}
        x2={V ? uz.x + uz.w : uz.x} y2={V ? uz.y : uz.y + uz.h}
        stroke={C.metalDark} strokeWidth={1.6} strokeDasharray="8 5" />
      <text x={G.cutLabel.x} y={G.cutLabel.y} textAnchor="middle" fontSize={8} fontWeight={700} fill={C.stroke}
        transform={G.cutLabel.rotate ? `rotate(-90 ${G.cutLabel.x} ${G.cutLabel.y})` : undefined}>
        deck pans removed
      </text>

      {/* ── Product cartons in the stocked half ── */}
      {(() => {
        const pad = 12, gap = 8
        const { cols, rows } = G.cartonGrid
        const cw = (pz.w - pad * 2 - gap * (cols - 1)) / cols
        const rh = (pz.h - pad * 2 - gap * (rows - 1)) / rows
        return Array.from({ length: cols * rows }, (_, i) => {
          const cx = pz.x + pad + (i % cols) * (cw + gap)
          const cy = pz.y + pad + Math.floor(i / cols) * (rh + gap)
          return (
            <g key={i}>
              <rect x={cx} y={cy} width={cw} height={rh} rx={3}
                fill="#93c5fd" fillOpacity={0.28} stroke={C.stroke} strokeWidth={1} />
              <line x1={cx + cw / 2} y1={cy + 4} x2={cx + cw / 2} y2={cy + rh - 4} stroke={C.stroke} strokeWidth={0.7} opacity={0.45} />
            </g>
          )
        })
      })()}
      <Tag x={G.tagProduct.x} y={G.tagProduct.y} text={`product ${p.productF.toFixed(0)}°F`} color={p.productColor} />

      {/* ── Air curtain across the opening ── */}
      {p.airflowOk && G.curtainLanes.map(lane => (
        <g key={lane}>
          <path d={curtainPath(lane)} stroke="#22d3ee" strokeWidth={2.4} fill="none" opacity={0.5} />
          <path d={curtainPath(lane)} stroke="#a5f3fc" strokeWidth={1.2} fill="none" opacity={0.9} strokeDasharray="4 9">
            <animate attributeName="stroke-dashoffset" from="26" to="0" dur="0.9s" repeatCount="indefinite" />
          </path>
          <path d={curtainHead(lane)} fill="#22d3ee" opacity={0.85} />
        </g>
      ))}
      {!p.airflowOk && !p.defrostMode && (
        <text x={G.warn.x} y={G.warn.y} textAnchor="middle" fontSize={10} fontWeight={800} fill={C.crit}>
          ⚠ no air curtain — stagnant case
        </text>
      )}
      {!p.airflowOk && p.defrostMode && (
        <text x={G.warn.x} y={G.warn.y} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="#f97316">
          defrost in progress — fans held off
        </text>
      )}

      {/* ── Under-deck airflow: return air drawn back to the fans ── */}
      {p.airflowOk && G.plenumLanes.map(lane => (
        <g key={lane}>
          <path d={plenumPath(lane)} stroke="#22d3ee" strokeWidth={2} fill="none" opacity={0.4} strokeDasharray="4 9">
            <animate attributeName="stroke-dashoffset" from="26" to="0" dur="0.9s" repeatCount="indefinite" />
          </path>
          <path d={plenumHead(lane)} fill="#22d3ee" opacity={0.7} />
        </g>
      ))}

      {/* ── Coil / fan assembly (runs the case length) ── */}
      <Coil x={G.coil.x} y={G.coil.y} w={G.coil.w} h={G.coil.h} />
      {frost > 5 && (
        <rect x={G.coil.x} y={G.coil.y} width={G.coil.w} height={G.coil.h} rx={5}
          fill="#e0f2fe" opacity={Math.min(0.85, frost / 110)} stroke={frost > 55 ? '#22d3ee' : 'none'} strokeWidth={1.5} />
      )}
      {frost >= 10 && (
        <text x={G.coil.x + G.coil.w / 2} y={G.coil.y + G.coil.h / 2 + 3.5} textAnchor="middle" fontSize={9} fontWeight={800}
          fill={frost > 55 ? '#0891b2' : C.text} opacity={0.9}>
          frost {Math.round(frost)}%
        </text>
      )}
      {/* fan board on the coil's return-side face */}
      <rect x={G.fanBoard.x} y={G.fanBoard.y} width={G.fanBoard.w} height={G.fanBoard.h} fill={C.metalDark} opacity={0.85} rx={1} />
      {[0, 1].map(i => (
        <Fan key={i} x={G.fans[i].x} y={G.fans[i].y} r={G.fanR} spinning={p.fansSpinning[i]} failed={p.fansFailed[i]} />
      ))}
      <text x={G.fanLabel.x} y={G.fanLabel.y} textAnchor="middle" fontSize={8} fontWeight={700} fill={C.stroke}>
        coil fans
      </text>

      {/* calrod heaters in the coil fins */}
      <path d={heaterPath} stroke={p.heatersOn ? '#f97316' : C.metalDark} strokeWidth={2.2} fill="none" opacity={p.heatersOn ? 1 : 0.55}>
        {p.heatersOn && <animate attributeName="opacity" values="1;0.55;1" dur="1.2s" repeatCount="indefinite" />}
      </path>
      <text x={G.heaterLabel.x} y={G.heaterLabel.y} textAnchor="middle" fontSize={8.5} fontWeight={700}
        fill={p.heatersOn ? '#f97316' : C.stroke} opacity={p.heatersOn ? 1 : 0.85}>
        defrost heaters{p.heatersOn ? (p.heaterHalf ? ' — HALF POWER' : ' — ON') : ''}
      </text>

      {/* ── End plate: TXV + suction header, lines leaving the case ── */}
      <path d={G.pLiquid} stroke={C.liquid} strokeWidth={3.5} fill="none" opacity={0.9} />
      <path d={G.pSuction} stroke={C.suction} strokeWidth={3.5} fill="none" opacity={0.9} />
      <line x1={G.txvStub.x1} y1={G.txvStub.y1} x2={G.txvStub.x2} y2={G.txvStub.y2} stroke={C.liquid} strokeWidth={3} opacity={0.9} />
      <Valve x={G.txv.x} y={G.txv.y} label="TXV" labelBelow
        state={p.txvState === 'starved' ? 'closed' : p.txvState === 'flooding' ? 'open' : 'auto'} />
      <ClampDisc x={G.dt.x} y={G.dt.y} label="DT" ok={p.dtState === 'closed'} side="right" />
      <ClampDisc x={G.klix.x} y={G.klix.y} label="KLIX" ok={p.klixonClosed} side={V ? 'right' : 'left'} />

      {/* ── Night curtain over the stocked opening ── */}
      {p.curtainDeployed && !p.curtainFault && (
        <g>
          <rect x={pz.x} y={pz.y} width={pz.w} height={pz.h} fill={C.metalDark} opacity={0.30} />
          {V
            ? <rect x={pz.x} y={pz.y} width={6} height={pz.h} fill={C.metalDark} opacity={0.9} rx={2} />
            : <rect x={pz.x} y={pz.y} width={pz.w} height={6} fill={C.metalDark} opacity={0.9} rx={2} />}
          <text x={pz.x + pz.w / 2} y={pz.y + pz.h / 2 - 26} textAnchor="middle" fontSize={9} fontWeight={800} fill={C.text} opacity={0.85}>
            night curtain
          </text>
        </g>
      )}
      {p.curtainFault && (
        <text x={pz.x + pz.w / 2} y={pz.y + 12} textAnchor="middle" fontSize={9} fontWeight={800} fill={C.warn}>
          night curtain torn / off ⚠
        </text>
      )}

      {/* ── Reading tags ── */}
      <Tag x={G.tagDischarge.x} y={G.tagDischarge.y} text={`disch air ${p.dischargeAirF.toFixed(0)}°F`} color="#0891b2" />
      <Tag x={G.tagReturn.x} y={G.tagReturn.y} text={`return ${p.returnAirF.toFixed(0)}°F`} color="#0e7490" />
      <Tag x={G.tagSuction.x} y={G.tagSuction.y} text={`${p.suctionPsig.toFixed(1)} psig`} color={C.suction} anchor={G.tagSuction.anchor} />

      {/* ── Hotspots ── */}
      {p.onSelect && (
        <g>
          <Hotspot x={G.coil.x} y={G.coil.y - 6} w={G.coil.w} h={G.coil.h + 12} selected={p.selectedId === 'coil'} onSelect={pick({
            id: 'coil', title: 'Evaporator Coil', subtitle: 'under-deck · electric defrost',
            rows: [
              { label: 'Coil temp', value: `${p.coilTempF.toFixed(0)} °F` },
              { label: 'Frost', value: `${Math.round(frost)} %`, color: frost > 55 ? 'text-cyan-600 dark:text-cyan-400' : undefined },
              { label: 'TXV', value: p.txvState === 'normal' ? 'Feeding normally' : p.txvState === 'starved' ? 'STARVING' : 'FLOODING',
                color: p.txvState === 'normal' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
            ],
          })} />
          <Hotspot x={fx0} y={fy0} w={fw} h={fh} selected={p.selectedId === 'fans'} onSelect={pick({
            id: 'fans', title: 'Evap Fans', subtitle: '2 × on the coil fan board · 0.4 A each',
            rows: [
              { label: 'Fan 1', value: p.fansFailed[0] ? 'DEAD' : p.fansSpinning[0] ? 'Running' : 'Off (klixon)', color: p.fansFailed[0] ? 'text-red-600 dark:text-red-400' : undefined },
              { label: 'Fan 2', value: p.fansFailed[1] ? 'DEAD' : p.fansSpinning[1] ? 'Running' : 'Off (klixon)', color: p.fansFailed[1] ? 'text-red-600 dark:text-red-400' : undefined },
            ],
          })} />
          <Hotspot x={G.dt.x - 12} y={G.dt.y - 11} w={24} h={22} selected={p.selectedId === 'dt'} onSelect={pick({
            id: 'dt', title: 'DT — Defrost Termination Switch', subtitle: 'coil-mounted · opens ~55 °F',
            rows: [
              { label: 'State', value: p.dtState === 'closed' ? 'Closed (coil cold)' : 'OPEN', color: p.dtState === 'closed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
              { label: 'Duty', value: 'Ends defrost when the coil clears' },
            ],
          })} />
          <Hotspot x={G.klix.x - 12} y={G.klix.y - 11} w={24} h={22} selected={p.selectedId === 'klix'} onSelect={pick({
            id: 'klix', title: 'Fan Delay Klixon', subtitle: 'on the suction header · closes ≤ ~20 °F',
            rows: [
              { label: 'State', value: p.klixonClosed ? 'Closed — fans allowed' : 'OPEN — fans held off', color: p.klixonClosed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
              { label: 'Duty', value: 'Keeps warm air off product after defrost' },
            ],
          })} />
          <Hotspot
            x={V ? G.heaters.x - 10 : G.heaters.x} y={V ? G.heaters.y : G.heaters.y - 10}
            w={V ? 20 : G.heaters.len} h={V ? G.heaters.len : 20}
            selected={p.selectedId === 'heaters'} onSelect={pick({
            id: 'heaters', title: 'Defrost Heaters', subtitle: '2 elements · 4.2 A each @ 208 V',
            rows: [
              { label: 'State', value: p.heatersOn ? (p.heaterHalf ? 'ON — one element open' : 'ON') : 'Off',
                color: p.heatersOn ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Check', value: 'Clamp amps: 8.4 A both · 4.2 A one' },
            ],
          })} />
          <Hotspot x={pz.x + 8} y={pz.y + 8} w={pz.w - 16} h={pz.h - 16} selected={p.selectedId === 'product'} onSelect={pick({
            id: 'product', title: 'Product', subtitle: 'frozen food — keep ≤ 0 °F',
            rows: [
              { label: 'Temp', value: `${p.productF.toFixed(1)} °F`, color: p.productF > 10 ? 'text-red-600 dark:text-red-400' : p.productF > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Return air', value: `${p.returnAirF.toFixed(0)} °F` },
            ],
          })} />
        </g>
      )}
    </svg>
  )
}
