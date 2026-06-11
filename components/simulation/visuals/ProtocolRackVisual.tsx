'use client'
import { Defs, Pipe, Fan, Coil, Comp, Tag, Hotspot, C, type CompVisStatus } from './primitives'
import type { SchematicDetail } from './SchematicViewer'

// ── Hussmann Protocol Rack — Unit A schematic ───────────────────────────────────
// 6 EVI scrolls (C1 digital lead) + condenser + 9 LT circuits on Remote Header A.

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

export default function ProtocolRackVisual(p: ProtocolRackVisualProps) {
  const running = p.comps.some(c => c.status === 'run')
  const fansUp = p.fansFailed.filter(f => !f).length
  const pick = (detail: SchematicDetail) => () => p.onSelect?.(p.selectedId === detail.id ? null : detail)
  // circuit grid: 4 cols × 3 rows on the right
  const gx = 520, gy = 28, cw = 80, ch = 52, gxs = 86, gys = 62

  return (
    <svg viewBox="0 0 860 330" className="w-full h-auto select-none" role="img" aria-label="Protocol rack schematic">
      <Defs />

      {/* ── Pipes ── */}
      {/* discharge: comp header → condenser */}
      <Pipe d="M220,238 L220,118 L165,118 L165,90" color={C.discharge} flowing={running} speed={1.2} />
      {/* liquid: condenser → drier → liquid manifold (vertical at x=496) */}
      <Pipe d="M60,90 L60,150 L380,150 L496,150 L496,210" color={C.liquid} flowing={running} speed={0.8} />
      {/* suction header: circuit grid → comps */}
      <Pipe d="M496,232 L496,290 L100,290 L100,272" color={C.ltSuction} flowing={running} />
      {[160, 230, 300, 370, 440].map(x => (
        <Pipe key={x} d={`M${x},290 L${x},272`} color={C.ltSuction} w={2.6} flowing={running} />
      ))}

      {/* ── Condenser ── */}
      <Coil x={40} y={44} w={250} h={46} fouled={p.dirtyCondenser} label="Air-Cooled Condenser" />
      <Fan x={105} y={67} r={17} spinning={p.fansSpinning[0]} failed={p.fansFailed[0]} />
      <Fan x={225} y={67} r={17} spinning={p.fansSpinning[1]} failed={p.fansFailed[1]} />

      {/* ── Filter drier on liquid main ── */}
      <g>
        <rect x={360} y={142} width={40} height={16} rx={4} fill="url(#simMetal)" stroke={p.drierRestricted ? C.warn : C.stroke} strokeWidth={p.drierRestricted ? 2 : 1.2} />
        <text x={380} y={172} textAnchor="middle" fontSize={8.5} fill={p.drierRestricted ? C.warn : C.text} fontWeight={600}>
          {p.drierRestricted ? 'drier ΔT!' : 'filter drier'}
        </text>
      </g>

      {/* ── Compressor bank ── */}
      {p.comps.map((c, i) => (
        <g key={i}>
          <Comp x={76 + i * 70} y={238} w={58} h={48} label={c.label} status={c.status} amps={c.amps}
            sub={i === 0 && c.status === 'run' && c.mod !== undefined ? `${Math.round(c.mod * 100)}% mod` : undefined} />
        </g>
      ))}
      <text x={286} y={322} textAnchor="middle" fontSize={9} fill={C.text} fontWeight={600}>
        Protocol sequencing — C1 digital lead · C2–C6 staged lags
      </text>

      {/* ── Circuits A1–A12 ── */}
      <text x={gx + (gxs * 4 - 6) / 2} y={gy - 8} textAnchor="middle" fontSize={9} fill={C.text} fontWeight={600}>
        Remote Header A — frozen food circuits
      </text>
      {p.circuits.map((c, i) => {
        const col = i % 4, row = Math.floor(i / 4)
        const x = gx + col * gxs, y = gy + row * gys
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
            <rect x={x} y={y} width={cw} height={ch} rx={5} fill={C.metal} fillOpacity={0.13} stroke={border}
              strokeWidth={c.status !== 'OK' && !spare ? 1.8 : 1.1} />
            <text x={x + 7} y={y + 14} fontSize={9} fontWeight={700} fill={C.text}>❄ {c.id}</text>
            {spare ? (
              <text x={x + cw / 2} y={y + 34} textAnchor="middle" fontSize={8} fill={C.text}>spare</text>
            ) : (
              <>
                <text x={x + cw - 7} y={y + 15} textAnchor="end" fontSize={10.5} fontWeight={800} fill={c.tempColor}>{c.temp.toFixed(0)}°</text>
                {c.status === 'DEF_STUCK' && (
                  <>
                    <path d={`M${x + 14},${y + ch - 10} q3,-4 0,-8 q-3,-4 0,-8`} stroke="#fb923c" strokeWidth={1.4} fill="none">
                      <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
                    </path>
                    <text x={x + cw / 2 + 6} y={y + ch - 10} textAnchor="middle" fontSize={7.5} fill="#fb923c" fontWeight={700}>defrost stuck</text>
                  </>
                )}
                {c.status === 'ICED' && (
                  <path d={`M${x + 10},${y + ch - 14} l4,-4 l4,4 l4,-4 l4,4 l4,-4 l4,4`}
                    stroke="#22d3ee" strokeWidth={1.4} fill="none" strokeLinejoin="round" />
                )}
                {faultText[c.status] && (
                  <text x={x + cw / 2} y={y + ch - (c.status === 'ICED' ? 4 : 10)} textAnchor="middle" fontSize={7.5}
                    fill={faultText[c.status].color} fontWeight={700}>{faultText[c.status].label}</text>
                )}
                {c.status === 'OK' && (
                  <circle cx={x + 12} cy={y + ch - 14} r={2.6} fill={C.ok}>
                    <animate attributeName="opacity" values="1;0.4;1" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                )}
              </>
            )}
          </g>
        )
      })}
      {p.doorsOpen && <Tag x={gx + 160} y={gy + 3 * gys + 6} text="⚠ case doors propped open — infiltration load" color={C.warn} />}

      {/* ── Reading tags ── */}
      <Tag x={252} y={112} text={`${p.dischargePsig.toFixed(0)} psig`} color={C.discharge} />
      <Tag x={300} y={284} text={`${p.suctionPsig.toFixed(1)} psig suction`} color={C.ltSuction} />

      {/* ── Tap-to-inspect hotspots (top layer) ── */}
      {p.onSelect && (
        <g>
          <Hotspot x={40} y={44} w={250} h={46} selected={p.selectedId === 'cond'} onSelect={pick({
            id: 'cond', title: 'Air-Cooled Condenser', subtitle: '2-fan remote',
            rows: [
              { label: 'Discharge', value: `${p.dischargePsig.toFixed(0)} psig` },
              { label: 'Fans', value: `${fansUp}/2 running`, color: fansUp < 2 ? 'text-red-600 dark:text-red-400' : undefined },
              ...(p.dirtyCondenser ? [{ label: 'Coil', value: 'FOULED', color: 'text-amber-600 dark:text-amber-400' }] : []),
            ],
          })} />
          <Hotspot x={356} y={136} w={48} h={28} selected={p.selectedId === 'drier'} onSelect={pick({
            id: 'drier', title: 'Filter Drier (rack)',
            rows: [{ label: 'ΔT', value: p.drierRestricted ? 'RESTRICTED' : 'Normal (<1 °F)', color: p.drierRestricted ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' }],
          })} />
          {p.comps.map((c, i) => (
            <Hotspot key={c.label} x={76 + i * 70} y={238} w={58} h={48} selected={p.selectedId === `comp${i}`} onSelect={pick({
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
            const col = i % 4, row = Math.floor(i / 4)
            const st = CIRCUIT_STATUS_TEXT[c.status] ?? CIRCUIT_STATUS_TEXT.OK
            return (
              <Hotspot key={c.id} x={520 + col * 86} y={28 + row * 62} w={80} h={52} selected={p.selectedId === `circ${i}`} onSelect={pick({
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
