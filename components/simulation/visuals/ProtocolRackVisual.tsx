'use client'
import { Defs, Pipe, Fan, Coil, Comp, Tag, Hotspot, C, type CompVisStatus } from './primitives'
import type { SchematicDetail } from './SchematicViewer'

// ── Hussmann Protocol Rack — Unit A schematic ───────────────────────────────────
// 6 EVI scrolls (C1 digital lead) + condenser + 9 LT circuits on Remote Header A.
// Two layouts (wide landscape / tall portrait for phones) share one render pass.

export interface ProtocolCircuitVis {
  id: string
  status: 'OK' | 'TXV_FAIL' | 'DEF_STUCK' | 'SPARE' | 'FAN_OUT' | 'ICED' | 'DRIER' | 'OVERFEED'
  temp: number
  tempColor: string
  sh?: number          // per-circuit superheat (NaN/undefined = n/a)
  doors?: number
  mbh?: number
}

export interface ProtocolRackVisualProps {
  fansSpinning: [boolean, boolean]
  fansFailed: [boolean, boolean]
  dirtyCondenser: boolean
  comps: { label: string; status: CompVisStatus; amps: number; mod?: number }[]   // 6
  drierRestricted: boolean
  suctionPsig: number
  dischargePsig: number
  circuits: ProtocolCircuitVis[]      // 12 (incl. spares)
  doorsOpen: boolean
  layout?: 'wide' | 'tall'
  /** Tap-to-inspect */
  selectedId?: string | null
  onSelect?: (d: SchematicDetail | null) => void
}

const CIRCUIT_STATUS_TEXT: Record<string, { text: string; color?: string }> = {
  OK:        { text: 'Normal', color: 'text-emerald-600 dark:text-emerald-400' },
  TXV_FAIL:  { text: 'TXV not feeding', color: 'text-orange-600 dark:text-orange-400' },
  DEF_STUCK: { text: 'Defrost stuck', color: 'text-amber-600 dark:text-amber-400' },
  DRIER:     { text: 'Case drier plugged', color: 'text-orange-600 dark:text-orange-400' },
  ICED:      { text: 'Coil iced', color: 'text-cyan-600 dark:text-cyan-400' },
  FAN_OUT:   { text: 'Evap fans out', color: 'text-red-600 dark:text-red-400' },
  OVERFEED:  { text: 'TXV overfeeding', color: 'text-violet-600 dark:text-violet-400' },
  SPARE:     { text: 'Spare (capped)' },
}

interface Geo {
  viewBox: string
  pipes: { d: string; color: 'discharge' | 'liquid' | 'ltSuction'; w?: number; speed?: number }[]
  cond: { x: number; y: number; w: number; h: number }
  fans: [{ x: number; y: number }, { x: number; y: number }]
  drier: { x: number; y: number }
  drierLabelDy: number                 // label offset from drier rect top (tall puts it above)
  comps: { x: number; y: number }[]
  compW: number; compH: number
  compCaption: { x: number; y: number }
  // circuit grid
  grid: { gx: number; gy: number; cols: number; cw: number; ch: number; gxs: number; gys: number }
  gridCaption: { x: number; y: number }
  doorsTag: { x: number; y: number }
  tagDischarge: { x: number; y: number }
  tagSuction: { x: number; y: number }
}

const WIDE: Geo = {
  viewBox: '0 0 860 330',
  pipes: [
    { d: 'M220,238 L220,118 L165,118 L165,90', color: 'discharge', speed: 1.2 },
    { d: 'M60,90 L60,150 L380,150 L496,150 L496,210', color: 'liquid', speed: 0.8 },
    { d: 'M496,232 L496,290 L100,290 L100,272', color: 'ltSuction' },
    ...[160, 230, 300, 370, 440].map(x => ({ d: `M${x},290 L${x},272`, color: 'ltSuction' as const, w: 3.2 })),
  ],
  cond: { x: 40, y: 44, w: 250, h: 46 },
  fans: [{ x: 105, y: 67 }, { x: 225, y: 67 }],
  drier: { x: 360, y: 142 },
  drierLabelDy: 32,
  comps: [0, 1, 2, 3, 4, 5].map(i => ({ x: 76 + i * 70, y: 238 })),
  compW: 58, compH: 48,
  compCaption: { x: 286, y: 326 },
  grid: { gx: 520, gy: 28, cols: 4, cw: 80, ch: 52, gxs: 86, gys: 62 },
  gridCaption: { x: 520 + (86 * 4 - 6) / 2, y: 18 },
  doorsTag: { x: 690, y: 226 },
  tagDischarge: { x: 258, y: 108 },
  tagSuction: { x: 410, y: 306 },
}

const TALL: Geo = {
  viewBox: '0 0 430 552',
  pipes: [
    // discharge: comp row → far left → condenser
    { d: 'M20,456 L8,456 L8,63 L20,63', color: 'discharge', speed: 1.2 },
    // liquid: condenser → drier → manifold riser on the right
    { d: 'M250,86 L250,115 L416,115 L416,390', color: 'liquid', speed: 0.8 },
    // suction: manifold → header above comps → stubs
    { d: 'M416,390 L416,408 L40,408', color: 'ltSuction' },
    ...[51, 117, 183, 249, 315, 381].map(x => ({ d: `M${x},408 L${x},430`, color: 'ltSuction' as const, w: 3.2 })),
  ],
  cond: { x: 20, y: 42, w: 250, h: 44 },
  fans: [{ x: 85, y: 64 }, { x: 205, y: 64 }],
  drier: { x: 300, y: 107 },
  drierLabelDy: -14,
  comps: [0, 1, 2, 3, 4, 5].map(i => ({ x: 20 + i * 66, y: 430 })),
  compW: 62, compH: 52,
  compCaption: { x: 215, y: 508 },
  grid: { gx: 20, gy: 152, cols: 3, cw: 120, ch: 52, gxs: 128, gys: 60 },
  gridCaption: { x: 215, y: 142 },
  doorsTag: { x: 215, y: 534 },
  tagDischarge: { x: 340, y: 64 },
  tagSuction: { x: 228, y: 396 },
}

export default function ProtocolRackVisual(p: ProtocolRackVisualProps) {
  const G = p.layout === 'tall' ? TALL : WIDE
  const running = p.comps.some(c => c.status === 'run')
  const fansUp = p.fansFailed.filter(f => !f).length
  const pick = (detail: SchematicDetail) => () => p.onSelect?.(p.selectedId === detail.id ? null : detail)
  const pipeColor = { discharge: C.discharge, liquid: C.liquid, ltSuction: C.ltSuction }
  const circuitPos = (i: number) => {
    const col = i % G.grid.cols, row = Math.floor(i / G.grid.cols)
    return { x: G.grid.gx + col * G.grid.gxs, y: G.grid.gy + row * G.grid.gys }
  }

  return (
    <svg viewBox={G.viewBox} className="w-full h-auto select-none" role="img" aria-label="Protocol rack schematic">
      <Defs />

      {/* ── Pipes ── */}
      {G.pipes.map((pp, i) => (
        <Pipe key={i} d={pp.d} color={pipeColor[pp.color]} w={pp.w} speed={pp.speed} flowing={running} />
      ))}

      {/* ── Condenser ── */}
      <Coil x={G.cond.x} y={G.cond.y} w={G.cond.w} h={G.cond.h} fouled={p.dirtyCondenser} label="Air-Cooled Condenser" />
      <Fan x={G.fans[0].x} y={G.fans[0].y} r={17} spinning={p.fansSpinning[0]} failed={p.fansFailed[0]} />
      <Fan x={G.fans[1].x} y={G.fans[1].y} r={17} spinning={p.fansSpinning[1]} failed={p.fansFailed[1]} />

      {/* ── Filter drier on liquid main ── */}
      <g>
        <rect x={G.drier.x} y={G.drier.y} width={40} height={16} rx={4} fill="url(#simMetal)" stroke={p.drierRestricted ? C.warn : C.stroke} strokeWidth={p.drierRestricted ? 2.2 : 1.3} />
        <text x={G.drier.x + 20} y={G.drier.y + G.drierLabelDy} textAnchor="middle" fontSize={10.5} fill={p.drierRestricted ? C.warn : C.text} fontWeight={700}>
          {p.drierRestricted ? 'drier ΔT!' : 'filter drier'}
        </text>
      </g>

      {/* ── Compressor bank ── */}
      {p.comps.map((c, i) => (
        <g key={i}>
          <Comp x={G.comps[i].x} y={G.comps[i].y} w={G.compW} h={G.compH} label={c.label} status={c.status} amps={c.amps}
            sub={i === 0 && c.status === 'run' && c.mod !== undefined ? `${Math.round(c.mod * 100)}% mod` : undefined} />
        </g>
      ))}
      <text x={G.compCaption.x} y={G.compCaption.y} textAnchor="middle" fontSize={11} fill={C.text} fontWeight={700}>
        Protocol sequencing — C1 digital lead · C2–C6 staged lags
      </text>

      {/* ── Circuits A1–A12 ── */}
      <text x={G.gridCaption.x} y={G.gridCaption.y} textAnchor="middle" fontSize={11} fill={C.text} fontWeight={700}>
        Remote Header A — frozen food circuits
      </text>
      {p.circuits.map((c, i) => {
        const { x, y } = circuitPos(i)
        const cw = G.grid.cw, ch = G.grid.ch
        const spare = c.status === 'SPARE'
        const border =
          c.status === 'DEF_STUCK' ? C.warn :
          c.status === 'TXV_FAIL' || c.status === 'DRIER' ? '#fb923c' :
          c.status === 'ICED' || c.status === 'FAN_OUT' ? '#22d3ee' :
          c.status === 'OVERFEED' ? '#a78bfa' : C.stroke
        const faultText: Record<string, { label: string; color: string }> = {
          TXV_FAIL: { label: 'TXV starved',    color: '#fb923c' },
          DRIER:    { label: 'drier plugged',  color: '#fb923c' },
          ICED:     { label: 'coil iced',      color: '#0891b2' },
          FAN_OUT:  { label: 'evap fans out',  color: '#ef4444' },
          OVERFEED: { label: 'floodback',      color: '#8b5cf6' },
        }
        return (
          <g key={c.id} opacity={spare ? 0.4 : 1}>
            <rect x={x} y={y} width={cw} height={ch} rx={6} fill={C.metal} fillOpacity={0.14} stroke={border}
              strokeWidth={c.status !== 'OK' && !spare ? 2 : 1.2} />
            <text x={x + 7} y={y + 16} fontSize={11} fontWeight={800} fill={C.text}>❄ {c.id}</text>
            {spare ? (
              <text x={x + cw / 2} y={y + 36} textAnchor="middle" fontSize={10} fill={C.text}>spare</text>
            ) : (
              <>
                <text x={x + cw - 7} y={y + 17} textAnchor="end" fontSize={13.5} fontWeight={800} fill={c.tempColor}>{c.temp.toFixed(0)}°</text>
                {c.status === 'DEF_STUCK' && (
                  <>
                    <path d={`M${x + 14},${y + ch - 10} q3,-4 0,-8 q-3,-4 0,-8`} stroke="#fb923c" strokeWidth={1.6} fill="none">
                      <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
                    </path>
                    <text x={x + cw / 2 + 6} y={y + ch - 9} textAnchor="middle" fontSize={9.5} fill="#fb923c" fontWeight={700}>defrost stuck</text>
                  </>
                )}
                {c.status === 'ICED' && (
                  <path d={`M${x + 10},${y + ch - 14} l4,-4 l4,4 l4,-4 l4,4 l4,-4 l4,4`}
                    stroke="#22d3ee" strokeWidth={1.6} fill="none" strokeLinejoin="round" />
                )}
                {faultText[c.status] && (
                  <text x={x + cw / 2} y={y + ch - (c.status === 'ICED' ? 4 : 9)} textAnchor="middle" fontSize={9.5}
                    fill={faultText[c.status].color} fontWeight={700}>{faultText[c.status].label}</text>
                )}
                {c.status === 'OK' && (
                  <circle cx={x + 12} cy={y + ch - 14} r={2.8} fill={C.ok}>
                    <animate attributeName="opacity" values="1;0.4;1" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                )}
              </>
            )}
          </g>
        )
      })}
      {p.doorsOpen && <Tag x={G.doorsTag.x} y={G.doorsTag.y} text="⚠ case doors propped open" color={C.warn} />}

      {/* ── Reading tags ── */}
      <Tag x={G.tagDischarge.x} y={G.tagDischarge.y} text={`${p.dischargePsig.toFixed(0)} psig`} color={C.discharge} />
      <Tag x={G.tagSuction.x} y={G.tagSuction.y} text={`${p.suctionPsig.toFixed(1)} psig suction`} color={C.ltSuction} />

      {/* ── Tap-to-inspect hotspots (top layer) ── */}
      {p.onSelect && (
        <g>
          <Hotspot x={G.cond.x} y={G.cond.y} w={G.cond.w} h={G.cond.h} selected={p.selectedId === 'cond'} onSelect={pick({
            id: 'cond', title: 'Air-Cooled Condenser', subtitle: '2-fan remote',
            rows: [
              { label: 'Discharge', value: `${p.dischargePsig.toFixed(0)} psig` },
              { label: 'Fans', value: `${fansUp}/2 running`, color: fansUp < 2 ? 'text-red-600 dark:text-red-400' : undefined },
              ...(p.dirtyCondenser ? [{ label: 'Coil', value: 'FOULED', color: 'text-amber-600 dark:text-amber-400' }] : []),
            ],
          })} />
          <Hotspot x={G.drier.x - 4} y={G.drier.y - 6} w={48} h={28} selected={p.selectedId === 'drier'} onSelect={pick({
            id: 'drier', title: 'Filter Drier (rack)',
            rows: [{ label: 'ΔT', value: p.drierRestricted ? 'RESTRICTED' : 'Normal (<1 °F)', color: p.drierRestricted ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' }],
          })} />
          {p.comps.map((c, i) => (
            <Hotspot key={c.label} x={G.comps[i].x} y={G.comps[i].y} w={G.compW} h={G.compH} selected={p.selectedId === `comp${i}`} onSelect={pick({
              id: `comp${i}`, title: `Compressor ${c.label}`, subtitle: i === 0 ? 'ZFD25KVE digital lead' : 'EVI scroll lag',
              rows: [
                { label: 'Status', value: c.status === 'run' ? 'Running' : c.status === 'trip' ? 'TRIPPED' : 'Standby',
                  color: c.status === 'trip' ? 'text-red-600 dark:text-red-400' : c.status === 'run' ? 'text-emerald-600 dark:text-emerald-400' : undefined },
                { label: 'Amps', value: c.status === 'run' ? `${c.amps.toFixed(1)} A` : '—' },
                ...(i === 0 && c.status === 'run' && c.mod !== undefined ? [{ label: 'Modulation', value: `${Math.round(c.mod * 100)}%` }] : []),
                { label: 'Suction', value: `${p.suctionPsig.toFixed(1)} psig` },
              ],
            })} />
          ))}
          {p.circuits.map((c, i) => {
            const { x, y } = circuitPos(i)
            const st = CIRCUIT_STATUS_TEXT[c.status] ?? CIRCUIT_STATUS_TEXT.OK
            return (
              <Hotspot key={c.id} x={x} y={y} w={G.grid.cw} h={G.grid.ch} selected={p.selectedId === `circ${i}`} onSelect={pick({
                id: `circ${i}`, title: `Circuit ${c.id}`,
                subtitle: c.status === 'SPARE' ? undefined : `${c.doors ?? '—'} doors · ${c.mbh?.toFixed(2) ?? '—'} MBH`,
                rows: c.status === 'SPARE' ? [{ label: 'Status', value: 'Spare (capped)' }] : [
                  { label: 'Case temp', value: `${c.temp.toFixed(1)} °F` },
                  { label: 'Superheat', value: c.sh !== undefined && Number.isFinite(c.sh) ? `${c.sh.toFixed(0)} °F` : '—' },
                  { label: 'Status', value: st.text, color: st.color },
                ],
              })} />
            )
          })}
        </g>
      )}
    </svg>
  )
}
