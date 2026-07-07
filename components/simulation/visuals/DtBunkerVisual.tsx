'use client'
import { Defs, Fan, Coil, Valve, Tag, Hotspot, C } from './primitives'
import type { SchematicDetail } from './SchematicViewer'

// ── DT bunker (single-deck frozen island) — cross-section ──────────────────────
// Air loop: fans in the under-deck plenum push air through the coil, up the end
// duct, across the opening as the air curtain, and back down the return duct.
// Coil carries the TXV, DT (defrost termination) switch, fan-delay klixon, and
// electric defrost heaters underneath. Night curtain covers the opening at night.

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
  shell: { x: number; y: number; w: number; h: number }   // outer case body
  deckY: number                                            // tub floor / plenum top
  fans: [{ x: number; y: number }, { x: number; y: number }]
  fanR: number
  coil: { x: number; y: number; w: number; h: number }
  heatersY: number
  txv: { x: number; y: number }
  dt: { x: number; y: number }
  klix: { x: number; y: number }
  pAir: string
  pLiquid: string
  pSuction: string
  curtainY: number
  product: { x: number; y: number; w: number; h: number }
  title: { x: number; y: number } | null
  tagDischarge: { x: number; y: number }
  tagReturn: { x: number; y: number }
  tagSuction: { x: number; y: number }
  tagProduct: { x: number; y: number }
  tagCoil: { x: number; y: number }
}

const WIDE: Geo = {
  viewBox: '0 0 860 330',
  shell: { x: 180, y: 70, w: 500, h: 230 },
  deckY: 240,
  fans: [{ x: 252, y: 264 }, { x: 320, y: 264 }],
  fanR: 15,
  coil: { x: 380, y: 248, w: 180, h: 32 },
  heatersY: 290,
  txv: { x: 368, y: 264 },
  dt: { x: 398, y: 242 },
  klix: { x: 542, y: 242 },
  pAir: 'M340,264 L652,264 L652,108 L208,108 L208,264 L336,264',
  pLiquid: 'M110,292 L368,292 L368,276',
  pSuction: 'M566,254 L640,254 L640,292 L750,292',
  curtainY: 82,
  product: { x: 235, y: 150, w: 390, h: 84 },
  title: { x: 430, y: 34 },
  tagDischarge: { x: 590, y: 136 },
  tagReturn: { x: 268, y: 136 },
  tagSuction: { x: 758, y: 278 },
  tagProduct: { x: 430, y: 196 },
  tagCoil: { x: 470, y: 316 },
}

const TALL: Geo = {
  viewBox: '0 0 430 420',
  shell: { x: 12, y: 66, w: 406, h: 264 },
  deckY: 268,
  fans: [{ x: 70, y: 294 }, { x: 128, y: 294 }],
  fanR: 12,
  coil: { x: 175, y: 278, w: 170, h: 30 },
  heatersY: 318,
  txv: { x: 165, y: 294 },
  dt: { x: 192, y: 272 },
  klix: { x: 328, y: 272 },
  pAir: 'M143,294 L390,294 L390,104 L40,104 L40,294 L57,294',
  pLiquid: 'M4,322 L165,322 L165,306',
  pSuction: 'M348,284 L372,284 L372,352 L426,352',
  curtainY: 78,
  product: { x: 58, y: 140, w: 314, h: 96 },
  title: { x: 215, y: 30 },
  tagDischarge: { x: 322, y: 130 },
  tagReturn: { x: 105, y: 130 },
  tagSuction: { x: 350, y: 376 },
  tagProduct: { x: 215, y: 192 },
  tagCoil: { x: 260, y: 344 },
}

function StateDisc({ x, y, label, ok, stateText }: { x: number; y: number; label: string; ok: boolean; stateText?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={7} fill={ok ? '#10b981' : '#ef4444'} fillOpacity={0.25}
        stroke={ok ? '#10b981' : '#ef4444'} strokeWidth={1.6} />
      <circle cx={x} cy={y} r={2.4} fill={ok ? '#10b981' : '#ef4444'} />
      <text x={x} y={y - 11} textAnchor="middle" fontSize={9.5} fontWeight={800} fill={C.text}>{label}</text>
      {stateText && <text x={x} y={y + 19} textAnchor="middle" fontSize={8} fontWeight={700} fill={ok ? '#10b981' : '#ef4444'}>{stateText}</text>}
    </g>
  )
}

export default function DtBunkerVisual(p: DtBunkerVisualProps) {
  const G = p.layout === 'tall' ? TALL : WIDE
  const pick = (detail: SchematicDetail) => () => p.onSelect?.(p.selectedId === detail.id ? null : detail)
  const frost = Math.max(0, Math.min(100, p.frostPct))
  const s = G.shell
  const wall = 13

  return (
    <svg viewBox={G.viewBox} className="w-full h-auto select-none" role="img" aria-label="DT bunker case cross-section">
      <Defs />

      {G.title && (
        <text x={G.title.x} y={G.title.y} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={C.text}>
          DT Bunker — 8 ft Frozen Island · cross-section
        </text>
      )}

      {/* ── Case shell (insulated walls) ── */}
      <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={10} fill="url(#simMetal)" fillOpacity={0.35} stroke={C.stroke} strokeWidth={1.8} />
      <rect x={s.x + wall} y={s.y + wall} width={s.w - wall * 2} height={s.h - wall * 2} rx={6}
        className="fill-white dark:fill-slate-800" stroke={C.stroke} strokeWidth={1} opacity={0.95} />
      {/* deck separating tub from plenum */}
      <line x1={s.x + wall} y1={G.deckY} x2={s.x + s.w - wall} y2={G.deckY} stroke={C.metalDark} strokeWidth={2.5} />
      <line x1={s.x + wall} y1={G.deckY + 4} x2={s.x + s.w - wall} y2={G.deckY + 4} stroke={C.stroke} strokeWidth={1} opacity={0.5} strokeDasharray="6 5" />

      {/* ── Air loop ── */}
      <path d={G.pAir} stroke="#22d3ee" strokeWidth={3} fill="none" strokeLinejoin="round" opacity={p.airflowOk ? 0.55 : 0.15} />
      {p.airflowOk && (
        <path d={G.pAir} stroke="#a5f3fc" strokeWidth={1.4} fill="none" strokeLinejoin="round" opacity={0.8} strokeDasharray="4 10">
          <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.0s" repeatCount="indefinite" />
        </path>
      )}
      {!p.airflowOk && (
        <text x={(s.x + s.w / 2)} y={G.curtainY + 40} textAnchor="middle" fontSize={10} fontWeight={800} fill={C.crit}>
          ⚠ no air curtain — stagnant case
        </text>
      )}

      {/* ── Night curtain ── */}
      {p.curtainDeployed && !p.curtainFault && (
        <line x1={s.x + wall} y1={G.curtainY} x2={s.x + s.w - wall} y2={G.curtainY} stroke={C.metalDark} strokeWidth={3} strokeDasharray="10 6" />
      )}
      {p.curtainFault && (
        <text x={s.x + s.w - wall - 4} y={G.curtainY + 4} textAnchor="end" fontSize={9} fontWeight={800} fill={C.warn}>night curtain torn / off ⚠</text>
      )}

      {/* ── Product ── */}
      {[0, 1, 2, 3].map(i => {
        const bw = (G.product.w - 30) / 4
        return (
          <rect key={i} x={G.product.x + i * (bw + 10)} y={G.product.y + 14} width={bw} height={G.product.h - 14} rx={4}
            fill="#93c5fd" fillOpacity={0.25} stroke={C.stroke} strokeWidth={1} />
        )
      })}
      <Tag x={G.tagProduct.x} y={G.tagProduct.y} text={`product ${p.productF.toFixed(0)}°F`} color={p.productColor} />

      {/* ── Fans (plenum) ── */}
      {[0, 1].map(i => (
        <Fan key={i} x={G.fans[i].x} y={G.fans[i].y} r={G.fanR} spinning={p.fansSpinning[i]} failed={p.fansFailed[i]} />
      ))}

      {/* ── Coil + frost + heaters ── */}
      <Coil x={G.coil.x} y={G.coil.y} w={G.coil.w} h={G.coil.h} />
      {frost > 5 && (
        <rect x={G.coil.x} y={G.coil.y} width={G.coil.w} height={G.coil.h} rx={5}
          fill="#e0f2fe" opacity={Math.min(0.85, frost / 110)} stroke={frost > 55 ? '#22d3ee' : 'none'} strokeWidth={1.5} />
      )}
      {frost > 55 && (
        <path d={`M${G.coil.x + 8},${G.coil.y + G.coil.h + 2} ${Array.from({ length: Math.floor((G.coil.w - 16) / 14) }, () => 'l7,7 l7,-7').join(' ')}`}
          stroke="#22d3ee" strokeWidth={1.6} fill="none" />
      )}
      <text x={G.coil.x + G.coil.w / 2} y={G.coil.y - (p.layout === 'tall' ? 16 : 16)} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={C.text}>
        evap coil · frost {Math.round(frost)}%
      </text>
      {/* heaters */}
      <path d={`M${G.coil.x},${G.heatersY} ${Array.from({ length: Math.floor(G.coil.w / 18) }, () => 'l5,-6 l8,12 l5,-6').join(' ')}`}
        stroke={p.heatersOn ? '#f97316' : C.metalDark} strokeWidth={2.2} fill="none" opacity={p.heatersOn ? 1 : 0.55}>
        {p.heatersOn && <animate attributeName="opacity" values="1;0.55;1" dur="1.2s" repeatCount="indefinite" />}
      </path>
      <text x={G.tagCoil.x} y={G.tagCoil.y} textAnchor="middle" fontSize={9} fontWeight={700}
        fill={p.heatersOn ? '#f97316' : C.text} opacity={p.heatersOn ? 1 : 0.8}>
        defrost heaters {p.heatersOn ? (p.heaterHalf ? '— HALF POWER' : '— ON') : ''}
      </text>

      {/* ── TXV + DT + klixon ── */}
      <Valve x={G.txv.x} y={G.txv.y - 10} label="TXV" labelBelow={false}
        state={p.txvState === 'starved' ? 'closed' : p.txvState === 'flooding' ? 'open' : 'auto'} />
      <StateDisc x={G.dt.x} y={G.dt.y} label="DT" ok={p.dtState === 'closed'} stateText={p.dtState === 'closed' ? undefined : 'OPEN'} />
      <StateDisc x={G.klix.x} y={G.klix.y} label="KLIX" ok={p.klixonClosed} stateText={p.klixonClosed ? undefined : 'OPEN'} />

      {/* ── Refrigerant stubs from the rack ── */}
      <path d={G.pLiquid} stroke={C.liquid} strokeWidth={3.5} fill="none" opacity={0.9} />
      <path d={G.pSuction} stroke={C.suction} strokeWidth={3.5} fill="none" opacity={0.9} />

      {/* ── Reading tags ── */}
      <Tag x={G.tagDischarge.x} y={G.tagDischarge.y} text={`disch air ${p.dischargeAirF.toFixed(0)}°F`} color="#0891b2" />
      <Tag x={G.tagReturn.x} y={G.tagReturn.y} text={`return ${p.returnAirF.toFixed(0)}°F`} color="#0e7490" />
      <Tag x={G.tagSuction.x} y={G.tagSuction.y} text={`${p.suctionPsig.toFixed(1)} psig`} color={C.suction} anchor={p.layout === 'tall' ? 'middle' : 'end'} />

      {/* ── Hotspots ── */}
      {p.onSelect && (
        <g>
          <Hotspot x={G.coil.x} y={G.coil.y - 8} w={G.coil.w} h={G.coil.h + 16} selected={p.selectedId === 'coil'} onSelect={pick({
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
          <Hotspot x={G.dt.x - 14} y={G.dt.y - 20} w={28} h={36} selected={p.selectedId === 'dt'} onSelect={pick({
            id: 'dt', title: 'DT — Defrost Termination Switch', subtitle: 'coil-mounted · opens ~55 °F',
            rows: [
              { label: 'State', value: p.dtState === 'closed' ? 'Closed (coil cold)' : 'OPEN', color: p.dtState === 'closed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
              { label: 'Duty', value: 'Ends defrost when the coil clears' },
            ],
          })} />
          <Hotspot x={G.klix.x - 14} y={G.klix.y - 20} w={28} h={36} selected={p.selectedId === 'klix'} onSelect={pick({
            id: 'klix', title: 'Fan Delay Klixon', subtitle: 'closes ≤ ~20 °F coil',
            rows: [
              { label: 'State', value: p.klixonClosed ? 'Closed — fans allowed' : 'OPEN — fans held off', color: p.klixonClosed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
              { label: 'Duty', value: 'Keeps warm air off product after defrost' },
            ],
          })} />
          <Hotspot x={G.coil.x} y={G.heatersY - 10} w={G.coil.w} h={22} selected={p.selectedId === 'heaters'} onSelect={pick({
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
