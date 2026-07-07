'use client'
import { Defs, Fan, Coil, Valve, Tag, Hotspot, C } from './primitives'
import type { SchematicDetail } from './SchematicViewer'

// ── DT bunker (single-deck frozen island) — true-to-life cross-section ─────────
// Walk-up anatomy: an open-top insulated tub. Product sits ON the deck below the
// load line. Air returns through a grille at one top edge, is pulled down the
// hollow side wall (duct), pushed by the plenum fans through the coil under the
// deck, up the far wall duct, and discharged across the opening as the air
// curtain. DT + fan-delay klixon clamp to the coil; calrod defrost heaters run
// beneath it; the TXV feeds the coil inlet from an underfloor liquid line.

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

interface Geo {
  viewBox: string
  floorY: number                                        // store floor line
  outer: { x1: number; x2: number; topY: number; botY: number }
  wallT: number                                         // outer insulation skin
  ductW: number                                         // air channel inside each wall
  airY: number                                          // air-curtain height over opening
  curtainY: number                                      // night-curtain height
  deck: { y: number; h: number }                        // tub floor band
  plenumBotY: number                                    // top of bottom insulation
  fans: [{ x: number; y: number }, { x: number; y: number }]
  fanR: number
  coil: { x: number; y: number; w: number; h: number }
  heatersY: number
  txv: { x: number; y: number }
  dt: { x: number; y: number }
  klix: { x: number; y: number }
  pLiquid: string
  pSuction: string
  suctionDropX: number                                  // where the suction line turns down
  product: { x: number; y: number; w: number; h: number }
  loadLineY: number
  title: { x: number; y: number } | null
  tagDischarge: { x: number; y: number }
  tagReturn: { x: number; y: number }
  tagSuction: { x: number; y: number; anchor: 'start' | 'middle' | 'end' }
  tagProduct: { x: number; y: number }
  heaterLabel: { x: number; y: number }
  warnY: number
}

const WIDE: Geo = {
  viewBox: '0 0 860 360',
  floorY: 330,
  outer: { x1: 190, x2: 670, topY: 84, botY: 312 },
  wallT: 14,
  ductW: 28,
  airY: 106,
  curtainY: 94,
  deck: { y: 224, h: 8 },
  plenumBotY: 298,
  fans: [{ x: 285, y: 268 }, { x: 345, y: 268 }],
  fanR: 16,
  coil: { x: 392, y: 248, w: 196, h: 38 },
  heatersY: 293,
  txv: { x: 380, y: 268 },
  dt: { x: 418, y: 239 },
  klix: { x: 598, y: 239 },
  pLiquid: 'M120,344 L380,344 L380,276',
  pSuction: 'M612,268 L612,344 L764,344',
  suctionDropX: 612,
  product: { x: 248, y: 156, w: 364, h: 68 },
  loadLineY: 150,
  title: { x: 430, y: 32 },
  tagDischarge: { x: 642, y: 64 },
  tagReturn: { x: 218, y: 64 },
  tagSuction: { x: 772, y: 348, anchor: 'start' },
  tagProduct: { x: 430, y: 196 },
  heaterLabel: { x: 496, y: 324 },
  warnY: 134,
}

const TALL: Geo = {
  viewBox: '0 0 430 448',
  floorY: 404,
  outer: { x1: 30, x2: 400, topY: 92, botY: 386 },
  wallT: 10,
  ductW: 22,
  airY: 114,
  curtainY: 103,
  deck: { y: 282, h: 7 },
  plenumBotY: 370,
  fans: [{ x: 82, y: 328 }, { x: 124, y: 328 }],
  fanR: 14,
  coil: { x: 166, y: 310, w: 182, h: 36 },
  heatersY: 353,
  txv: { x: 155, y: 328 },
  pLiquid: 'M6,416 L155,416 L155,336',
  pSuction: 'M362,328 L362,416 L424,416',
  suctionDropX: 362,
  dt: { x: 188, y: 301 },
  klix: { x: 356, y: 301 },
  product: { x: 78, y: 216, w: 274, h: 66 },
  loadLineY: 210,
  title: { x: 215, y: 30 },
  tagDischarge: { x: 330, y: 72 },
  tagReturn: { x: 100, y: 72 },
  tagSuction: { x: 388, y: 438, anchor: 'middle' },
  tagProduct: { x: 215, y: 252 },
  heaterLabel: { x: 254, y: 366 },
  warnY: 142,
}

/** Coil-mounted klixon disc with a side label (space under the deck is tight). */
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

export default function DtBunkerVisual(p: DtBunkerVisualProps) {
  const G = p.layout === 'tall' ? TALL : WIDE
  const pick = (detail: SchematicDetail) => () => p.onSelect?.(p.selectedId === detail.id ? null : detail)
  const frost = Math.max(0, Math.min(100, p.frostPct))
  const o = G.outer
  const linerL = o.x1 + G.wallT + G.ductW           // tub wall, inner face (left)
  const linerR = o.x2 - G.wallT - G.ductW           // tub wall, inner face (right)
  const ductLcx = o.x1 + G.wallT + G.ductW / 2      // return-air channel centreline
  const ductRcx = o.x2 - G.wallT - G.ductW / 2      // supply-air channel centreline
  const plenumAirY = G.fans[0].y
  const railH = 13
  const railY = o.topY - 5
  // discharge (right) → across the opening → return (left) → down → through fans
  // + coil → up the right wall. One closed loop so the dash animation circulates.
  const pAir = `M${ductRcx},${G.airY} L${ductLcx},${G.airY} L${ductLcx},${plenumAirY} L${ductRcx},${plenumAirY} Z`

  return (
    <svg viewBox={G.viewBox} className="w-full h-auto select-none" role="img" aria-label="DT bunker case cross-section">
      <Defs />

      {G.title && (
        <text x={G.title.x} y={G.title.y} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={C.text}>
          DT Bunker — 8 ft Frozen Island · end view
        </text>
      )}

      {/* ── Store floor + kick base ── */}
      <line x1={o.x1 - 55} y1={G.floorY} x2={o.x2 + 55} y2={G.floorY} stroke={C.stroke} strokeWidth={1.6} opacity={0.55} />
      <rect x={o.x1 + 4} y={o.botY} width={o.x2 - o.x1 - 8} height={G.floorY - o.botY - 1} fill={C.metalDark} opacity={0.55} />

      {/* ── Insulated shell: two hollow side walls + bottom (open top) ── */}
      <rect x={o.x1} y={o.topY} width={G.wallT} height={o.botY - o.topY} fill="url(#simMetal)" stroke={C.stroke} strokeWidth={1.2} />
      <rect x={o.x2 - G.wallT} y={o.topY} width={G.wallT} height={o.botY - o.topY} fill="url(#simMetal)" stroke={C.stroke} strokeWidth={1.2} />
      <rect x={o.x1} y={G.plenumBotY} width={o.x2 - o.x1} height={o.botY - G.plenumBotY} fill="url(#simMetal)" stroke={C.stroke} strokeWidth={1.2} />
      {/* air channels inside the walls */}
      <rect x={o.x1 + G.wallT} y={o.topY + 10} width={G.ductW} height={G.plenumBotY - o.topY - 10}
        fill="#22d3ee" fillOpacity={0.06} stroke={C.stroke} strokeWidth={0.7} opacity={0.8} />
      <rect x={linerR} y={o.topY + 10} width={G.ductW} height={G.plenumBotY - o.topY - 10}
        fill="#22d3ee" fillOpacity={0.06} stroke={C.stroke} strokeWidth={0.7} opacity={0.8} />
      {/* tub interior + under-deck plenum */}
      <rect x={linerL} y={o.topY + 10} width={linerR - linerL} height={G.deck.y - o.topY - 10}
        className="fill-white dark:fill-slate-800" stroke={C.stroke} strokeWidth={1} opacity={0.95} />
      <rect x={linerL} y={G.deck.y + G.deck.h} width={linerR - linerL} height={G.plenumBotY - G.deck.y - G.deck.h}
        className="fill-white dark:fill-slate-800" stroke={C.stroke} strokeWidth={0.8} opacity={0.75} />
      {/* deck (tub floor) — perforated over the coil so air can pass */}
      <rect x={linerL} y={G.deck.y} width={linerR - linerL} height={G.deck.h} fill="url(#simMetal)" stroke={C.stroke} strokeWidth={1} />

      {/* ── Top rails with return / discharge grilles ── */}
      <rect x={o.x1 - 6} y={railY} width={linerL - o.x1 + 12} height={railH} rx={5} fill="url(#simMetal)" stroke={C.stroke} strokeWidth={1.2} />
      <rect x={linerR - 6} y={railY} width={o.x2 - linerR + 12} height={railH} rx={5} fill="url(#simMetal)" stroke={C.stroke} strokeWidth={1.2} />
      {/* grille slots (honeycomb) under each rail */}
      {Array.from({ length: Math.floor(G.ductW / 5) }, (_, i) => (
        <line key={`gl${i}`} x1={o.x1 + G.wallT + 3 + i * 5} y1={railY + railH + 1} x2={o.x1 + G.wallT + 3 + i * 5} y2={railY + railH + 8}
          stroke={C.stroke} strokeWidth={1.1} opacity={0.7} />
      ))}
      {Array.from({ length: Math.floor(G.ductW / 5) }, (_, i) => (
        <line key={`gr${i}`} x1={linerR + 3 + i * 5} y1={railY + railH + 1} x2={linerR + 3 + i * 5} y2={railY + railH + 8}
          stroke={C.stroke} strokeWidth={1.1} opacity={0.7} />
      ))}
      <text x={ductLcx} y={railY - 4} textAnchor="middle" fontSize={8} fontWeight={700} fill={C.stroke}>return</text>
      <text x={ductRcx} y={railY - 4} textAnchor="middle" fontSize={8} fontWeight={700} fill={C.stroke}>discharge</text>

      {/* ── Air loop: curtain across the opening, down the wall, through the plenum ── */}
      <path d={pAir} stroke="#22d3ee" strokeWidth={3} fill="none" strokeLinejoin="round" opacity={p.airflowOk ? 0.5 : 0.12} />
      {p.airflowOk && (
        <path d={pAir} stroke="#a5f3fc" strokeWidth={1.4} fill="none" strokeLinejoin="round" opacity={0.85} strokeDasharray="4 10">
          <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.0s" repeatCount="indefinite" />
        </path>
      )}
      {p.airflowOk && (
        <path d={`M${(linerL + linerR) / 2 + 7},${G.airY - 4} L${(linerL + linerR) / 2 - 5},${G.airY} L${(linerL + linerR) / 2 + 7},${G.airY + 4} Z`}
          fill="#22d3ee" opacity={0.85} />
      )}
      {!p.airflowOk && !p.defrostMode && (
        <text x={(linerL + linerR) / 2} y={G.warnY} textAnchor="middle" fontSize={10} fontWeight={800} fill={C.crit}>
          ⚠ no air curtain — stagnant case
        </text>
      )}
      {!p.airflowOk && p.defrostMode && (
        <text x={(linerL + linerR) / 2} y={G.warnY} textAnchor="middle" fontSize={10} fontWeight={800} fill="#f97316">
          defrost in progress — fans held off by the klixon
        </text>
      )}

      {/* ── Night curtain ── */}
      {p.curtainDeployed && !p.curtainFault && (
        <g>
          <line x1={linerL} y1={G.curtainY} x2={linerR} y2={G.curtainY} stroke={C.metalDark} strokeWidth={3} strokeDasharray="12 5" />
          <text x={linerL + 12} y={G.curtainY - 5} fontSize={8} fontWeight={700} fill={C.stroke}>night curtain</text>
        </g>
      )}
      {p.curtainFault && (
        <text x={linerR - 2} y={G.curtainY - 2} textAnchor="end" fontSize={9} fontWeight={800} fill={C.warn}>night curtain torn / off ⚠</text>
      )}

      {/* ── Product: cartons stacked on the deck, below the load line ── */}
      <line x1={linerL} y1={G.loadLineY} x2={linerR} y2={G.loadLineY} stroke={C.warn} strokeWidth={1.2} strokeDasharray="7 5" opacity={0.75} />
      <text x={linerR - 4} y={G.loadLineY - 4} textAnchor="end" fontSize={7.5} fontWeight={700} fill={C.warn} opacity={0.9}>load limit</text>
      {[0, 1, 2, 3, 4].map(i => {
        const gap = 8
        const bw = (G.product.w - gap * 4) / 5
        const hVar = [0, 6, 2, 8, 4][i]
        return (
          <g key={i}>
            <rect x={G.product.x + i * (bw + gap)} y={G.product.y + hVar} width={bw} height={G.product.h - hVar} rx={2.5}
              fill="#93c5fd" fillOpacity={0.28} stroke={C.stroke} strokeWidth={1} />
            <line x1={G.product.x + i * (bw + gap) + 3} y1={G.product.y + hVar + 8} x2={G.product.x + i * (bw + gap) + bw - 3} y2={G.product.y + hVar + 8}
              stroke={C.stroke} strokeWidth={0.7} opacity={0.5} />
          </g>
        )
      })}
      <Tag x={G.tagProduct.x} y={G.tagProduct.y} text={`product ${p.productF.toFixed(0)}°F`} color={p.productColor} />

      {/* ── Plenum machinery: fans → TXV/coil → heaters ── */}
      {[0, 1].map(i => (
        <Fan key={i} x={G.fans[i].x} y={G.fans[i].y} r={G.fanR} spinning={p.fansSpinning[i]} failed={p.fansFailed[i]} />
      ))}
      <text x={(G.fans[0].x + G.fans[1].x) / 2} y={G.fans[0].y + G.fanR + 10} textAnchor="middle" fontSize={8} fontWeight={700} fill={C.stroke}>
        plenum fans
      </text>

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
      {frost > 55 && (
        <path d={`M${G.coil.x + 8},${G.coil.y + G.coil.h + 1} ${Array.from({ length: Math.floor((G.coil.w - 16) / 14) }, () => 'l7,6 l7,-6').join(' ')}`}
          stroke="#22d3ee" strokeWidth={1.5} fill="none" />
      )}

      {/* calrod defrost heaters under the coil */}
      <path d={`M${G.coil.x},${G.heatersY} ${Array.from({ length: Math.floor(G.coil.w / 18) }, () => 'l5,-5 l8,10 l5,-5').join(' ')}`}
        stroke={p.heatersOn ? '#f97316' : C.metalDark} strokeWidth={2.2} fill="none" opacity={p.heatersOn ? 1 : 0.55}>
        {p.heatersOn && <animate attributeName="opacity" values="1;0.55;1" dur="1.2s" repeatCount="indefinite" />}
      </path>
      <text x={G.heaterLabel.x} y={G.heaterLabel.y} textAnchor="middle" fontSize={9} fontWeight={700}
        fill={p.heatersOn ? '#f97316' : C.stroke} opacity={p.heatersOn ? 1 : 0.85}>
        defrost heaters{p.heatersOn ? (p.heaterHalf ? ' — HALF POWER' : ' — ON') : ''}
      </text>

      {/* ── Refrigerant: underfloor liquid line up to the TXV; suction back down ── */}
      <path d={G.pLiquid} stroke={C.liquid} strokeWidth={3.5} fill="none" opacity={0.9} />
      <path d={G.pSuction} stroke={C.suction} strokeWidth={3.5} fill="none" opacity={0.9} />
      <line x1={G.txv.x} y1={G.txv.y} x2={G.coil.x} y2={G.txv.y} stroke={C.liquid} strokeWidth={3} opacity={0.9} />
      <line x1={G.coil.x + G.coil.w} y1={G.txv.y} x2={G.suctionDropX} y2={G.txv.y} stroke={C.suction} strokeWidth={3} opacity={0.9} />
      <Valve x={G.txv.x} y={G.txv.y} label="TXV" labelBelow
        state={p.txvState === 'starved' ? 'closed' : p.txvState === 'flooding' ? 'open' : 'auto'} />

      {/* ── DT + fan-delay klixon clamped to the coil ── */}
      <ClampDisc x={G.dt.x} y={G.dt.y} label="DT" ok={p.dtState === 'closed'} side="left" />
      <ClampDisc x={G.klix.x} y={G.klix.y} label="KLIX" ok={p.klixonClosed} side="left" />

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
          <Hotspot x={G.fans[0].x - G.fanR - 4} y={G.fans[0].y - G.fanR - 4} w={(G.fans[1].x - G.fans[0].x) + G.fanR * 2 + 8} h={G.fanR * 2 + 8}
            selected={p.selectedId === 'fans'} onSelect={pick({
            id: 'fans', title: 'Evap Fans', subtitle: '2 × plenum fans · 0.4 A each',
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
            id: 'klix', title: 'Fan Delay Klixon', subtitle: 'closes ≤ ~20 °F coil',
            rows: [
              { label: 'State', value: p.klixonClosed ? 'Closed — fans allowed' : 'OPEN — fans held off', color: p.klixonClosed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
              { label: 'Duty', value: 'Keeps warm air off product after defrost' },
            ],
          })} />
          <Hotspot x={G.coil.x} y={G.heatersY - 9} w={G.coil.w} h={20} selected={p.selectedId === 'heaters'} onSelect={pick({
            id: 'heaters', title: 'Defrost Heaters', subtitle: '2 elements · 4.2 A each @ 208 V',
            rows: [
              { label: 'State', value: p.heatersOn ? (p.heaterHalf ? 'ON — one element open' : 'ON') : 'Off',
                color: p.heatersOn ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Check', value: 'Clamp amps: 8.4 A both · 4.2 A one' },
            ],
          })} />
          <Hotspot x={G.product.x} y={G.product.y} w={G.product.w} h={G.product.h} selected={p.selectedId === 'product'} onSelect={pick({
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
