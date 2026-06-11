'use client'
export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  RotateCcw, AlertTriangle, CheckCircle2, XCircle,
  Wind, ChevronLeft, Clock, BookOpen, Target, Trophy, Dices,
  Eye, EyeOff, SlidersHorizontal, GraduationCap,
} from 'lucide-react'
import LearningTabBar from '@/components/layout/LearningTabBar'
import TrendsCard, { useTrendHistory } from '@/components/simulation/TrendsCard'
import { useLiveReadings } from '@/components/simulation/useLiveReadings'
import ProtocolRackVisual from '@/components/simulation/visuals/ProtocolRackVisual'
import SchematicViewer, { SchematicInfoCard, type SchematicDetail } from '@/components/simulation/visuals/SchematicViewer'
import FieldReadingsPanel, { type Finding, type FieldDef, type DerivedRow } from '@/components/simulation/FieldReadings'
import { saveSimAttempt } from '@/lib/simulation/attempts'

// ── R-448A P-T data (psia) — Honeywell Solstice N40 / Opteon XP40 ─────────────
// R-448A has ~10–15 °F temperature glide.
// BUBBLE = saturated-liquid (high-side gauge reference)
// DEW    = saturated-vapor  (suction-side gauge reference)
const R448A_BUBBLE: [number, number][] = [
  [-40, 19.4], [-35, 22.0], [-30, 24.9], [-25, 28.0], [-20, 31.4],
  [-15, 35.1], [-10, 39.2], [-5,  43.6], [0,   48.4], [5,   53.6],
  [10,  59.2], [15,  65.3], [20,  71.8], [25,  78.7], [30,  86.2],
  [35,  94.2], [40, 102.7], [45, 111.8], [50, 121.5], [55, 131.8],
  [60, 142.7], [65, 154.3], [70, 166.6], [75, 179.6], [80, 193.3],
  [85, 207.8], [90, 223.1], [95, 239.1], [100, 256.0], [105, 275.7],
  [110, 295.7], [115, 314.7], [120, 334.7], [125, 354.1], [130, 376.7],
]
const R448A_DEW: [number, number][] = [
  [-40, 14.7], [-35, 16.6], [-30, 18.9], [-25, 21.5], [-20, 24.3],
  [-15, 27.4], [-10, 30.8], [-5,  34.5], [0,   38.6], [5,   43.0],
  [10,  47.8], [15,  53.1], [20,  58.7], [25,  64.8], [30,  71.3],
  [35,  78.4], [40,  85.9], [45,  94.0], [50, 102.7], [55, 112.0],
  [60, 121.9], [65, 132.4], [70, 143.7], [75, 155.6], [80, 168.3],
  [85, 181.7], [90, 195.9], [95, 211.0], [100, 227.0], [105, 245.7],
  [110, 264.7], [115, 283.7],
]

function ptInterp(tempF: number, tbl: [number, number][]): number {
  if (tempF <= tbl[0][0]) return tbl[0][1]
  if (tempF >= tbl[tbl.length - 1][0]) return tbl[tbl.length - 1][1]
  for (let i = 0; i < tbl.length - 1; i++) {
    const [t0, p0] = tbl[i], [t1, p1] = tbl[i + 1]
    if (tempF >= t0 && tempF <= t1) return p0 + (tempF - t0) / (t1 - t0) * (p1 - p0)
  }
  return tbl[0][1]
}
function ptInterpReverse(psig: number, tbl: [number, number][]): number {
  const psia = psig + 14.696
  if (psia <= tbl[0][1]) return tbl[0][0]
  if (psia >= tbl[tbl.length - 1][1]) return tbl[tbl.length - 1][0]
  for (let i = 0; i < tbl.length - 1; i++) {
    const [t0, p0] = tbl[i], [t1, p1] = tbl[i + 1]
    if (psia >= p0 && psia <= p1) return t0 + (psia - p0) / (p1 - p0) * (t1 - t0)
  }
  return tbl[0][0]
}
const toGauge = (psia: number) => Math.max(psia - 14.696, 0)
const bubblePsig     = (t: number) => toGauge(ptInterp(t, R448A_BUBBLE))
const dewPsig        = (t: number) => toGauge(ptInterp(t, R448A_DEW))
const dewTempFrom    = (psig: number) => ptInterpReverse(psig, R448A_DEW)
const bubbleTempFrom = (psig: number) => ptInterpReverse(psig, R448A_BUBBLE)

// ── Field Readings diagnostic ─────────────────────────────────────────────────
// Enter measured values from the rack → derived calcs + a findings list, tailored
// to this single-temp R-448A LT rack with EVI scrolls + demand cooling.
const FIELD_EMPTY = {
  oat: '', suctionPsig: '', suctionTemp: '',
  dischargePsig: '', dischargeTemp: '', liquidLineTemp: '',
  drierInTemp: '', drierOutTemp: '',
}
type FieldReadings = typeof FIELD_EMPTY

const FIELD_DEFS: FieldDef[] = [
  { key: 'oat',            label: 'Outdoor Ambient (OAT)', unit: '°F',   placeholder: 'e.g. 75', section: 'Environment' },
  { key: 'suctionPsig',    label: 'Suction Pressure',      unit: 'psig', placeholder: 'e.g. 9',  hint: 'rack suction header', section: 'Suction Side' },
  { key: 'suctionTemp',    label: 'Suction Line Temp',     unit: '°F',   placeholder: 'e.g. -9', hint: 'pipe temp at rack' },
  { key: 'dischargePsig',  label: 'Discharge Pressure',    unit: 'psig', placeholder: 'e.g. 235', hint: 'rack discharge header', section: 'Discharge Side' },
  { key: 'dischargeTemp',  label: 'Discharge Line Temp',   unit: '°F',   placeholder: 'e.g. 165', hint: 'pipe temp at discharge' },
  { key: 'liquidLineTemp', label: 'Liquid Line Temp',      unit: '°F',   placeholder: 'e.g. 95', hint: 'after condenser / receiver', section: 'Liquid Line' },
  { key: 'drierInTemp',    label: 'Drier Inlet Temp',      unit: '°F',   placeholder: 'e.g. 96', section: 'Filter Drier (optional)' },
  { key: 'drierOutTemp',   label: 'Drier Outlet Temp',     unit: '°F',   placeholder: 'e.g. 94', hint: 'ΔT > 3°F = restriction' },
]

function analyzeField(r: FieldReadings, opSST: number): { derived: DerivedRow[]; findings: Finding[] } {
  const num = (s: string) => (s.trim() === '' ? null : Number(s))
  const oat            = num(r.oat)
  const suctionPsig    = num(r.suctionPsig)
  const suctionTemp    = num(r.suctionTemp)
  const dischargePsig  = num(r.dischargePsig)
  const dischargeTemp  = num(r.dischargeTemp)
  const liquidLineTemp = num(r.liquidLineTemp)
  const drierInTemp    = num(r.drierInTemp)
  const drierOutTemp   = num(r.drierOutTemp)

  const condensingSatTemp = dischargePsig !== null ? bubbleTempFrom(dischargePsig) : null
  const suctionSatTemp    = suctionPsig !== null ? dewTempFrom(suctionPsig) : null
  const suctionSH         = suctionSatTemp !== null && suctionTemp !== null ? suctionTemp - suctionSatTemp : null
  const subcooling        = condensingSatTemp !== null && liquidLineTemp !== null ? condensingSatTemp - liquidLineTemp : null
  const dischargeSH       = condensingSatTemp !== null && dischargeTemp !== null ? dischargeTemp - condensingSatTemp : null
  const approachDelta     = condensingSatTemp !== null && oat !== null ? condensingSatTemp - oat : null
  const drierDeltaT       = drierInTemp !== null && drierOutTemp !== null ? drierInTemp - drierOutTemp : null
  const compRatio         = dischargePsig !== null && suctionPsig !== null ? (dischargePsig + 14.696) / (suctionPsig + 14.696) : null
  const setpointPsig      = dewPsig(opSST)
  const suctionDev        = suctionPsig !== null ? suctionPsig - setpointPsig : null

  const findings: Finding[] = []

  if (approachDelta !== null) {
    if (approachDelta > 32)
      findings.push({ severity: 'critical', label: 'Very high approach ΔT', measurement: `${approachDelta.toFixed(1)}°F (normal ~20°F)`,
        causes: ['Badly fouled condenser coil', 'Multiple condenser fans failed', 'Non-condensables in system'],
        checks: ['Wash condenser coil', 'Verify all fans spinning at full speed', 'Compare discharge psig vs PT — a gap = non-condensables'] })
    else if (approachDelta > 26)
      findings.push({ severity: 'warning', label: 'Elevated approach ΔT', measurement: `${approachDelta.toFixed(1)}°F (normal ~20°F)`,
        causes: ['Partial condenser fouling', 'One fan failed or at reduced speed'],
        checks: ['Inspect condenser coil', 'Check fan amp draw and blade condition'] })
  }

  if (dischargeTemp !== null && dischargeTemp > 225)
    findings.push({ severity: 'critical', label: 'Discharge temp at EVI limit', measurement: `${Math.round(dischargeTemp)}°F (limit ~225°F)`,
      causes: ['Demand cooling (liquid injection) failed', 'High compression ratio', 'Very high suction superheat'],
      checks: ['Verify demand cooling solenoid + liquid feed to intermediate stage', 'Check discharge temp sensor accuracy', 'Address compression-ratio root cause'] })
  else if (dischargeSH !== null && dischargeSH > 90)
    findings.push({ severity: 'warning', label: 'High discharge superheat', measurement: `${dischargeSH.toFixed(0)}°F above condensing sat`,
      causes: ['Demand cooling injecting weakly', 'High suction superheat', 'High compression ratio'],
      checks: ['Confirm demand cooling is functioning', 'Correlate with suction superheat'] })

  if (suctionSH !== null) {
    if (suctionSH > 30)
      findings.push({ severity: 'critical', label: 'Very high suction superheat', measurement: `${suctionSH.toFixed(1)}°F (EVI target 10–15°F)`,
        causes: ['Undercharge', 'TXV(s) not feeding', 'Filter drier restricted', 'Liquid line restriction'],
        checks: ['Check subcooling and sight glass', 'Measure drier in/out ΔT', 'Inspect TXV bulbs and external equalizers'] })
    else if (suctionSH > 20)
      findings.push({ severity: 'warning', label: 'High suction superheat', measurement: `${suctionSH.toFixed(1)}°F (EVI target 10–15°F)`,
        causes: ['Moderate undercharge', 'TXV hunting', 'Partial drier restriction', 'Low load'],
        checks: ['Check subcooling — if low, suspect undercharge', 'Measure drier ΔT'] })
    else if (suctionSH < 5)
      findings.push({ severity: 'warning', label: 'Low suction superheat — floodback risk', measurement: `${suctionSH.toFixed(1)}°F (EVI target 10–15°F)`,
        causes: ['Overcharge', 'TXV overfeeding', 'Defrost stuck on'],
        checks: ['Check subcooling — if high, suspect overcharge', 'Verify defrost termination'] })
  }

  if (subcooling !== null) {
    if (subcooling < 3)
      findings.push({ severity: 'critical', label: 'Near-zero subcooling — flash gas', measurement: `${subcooling.toFixed(1)}°F (target 10–18°F)`,
        causes: ['Undercharge', 'Restricted filter drier', 'Head pressure too low'],
        checks: ['Check sight glass for bubbles', 'Measure drier ΔT', 'Weigh refrigerant charge'] })
    else if (subcooling < 8)
      findings.push({ severity: 'warning', label: 'Low subcooling', measurement: `${subcooling.toFixed(1)}°F (target 10–18°F)`,
        causes: ['Marginal charge', 'Partial drier restriction'],
        checks: ['Inspect sight glass', 'Measure drier in/out ΔT'] })
    else if (subcooling > 28)
      findings.push({ severity: 'warning', label: 'High subcooling', measurement: `${subcooling.toFixed(1)}°F (target 10–18°F)`,
        causes: ['Overcharge', 'Low ambient — liquid backing up in condenser'],
        checks: ['Check OAT — if low with HP ctrl active, may be normal', 'If high OAT + high SC, recover excess charge'] })
  }

  if (drierDeltaT !== null) {
    if (drierDeltaT > 6)
      findings.push({ severity: 'critical', label: 'Filter drier severely restricted', measurement: `ΔT = ${drierDeltaT.toFixed(1)}°F across drier`,
        causes: ['Drier core saturated with moisture/debris', 'Drier icing'],
        checks: ['Replace drier core', 'Vacuum and recharge if moisture confirmed'] })
    else if (drierDeltaT > 3)
      findings.push({ severity: 'warning', label: 'Filter drier showing restriction', measurement: `ΔT = ${drierDeltaT.toFixed(1)}°F across drier`,
        causes: ['Drier core partially saturated'],
        checks: ['Plan drier core replacement', 'Monitor sight glass downstream'] })
  }

  if (suctionDev !== null && Math.abs(suctionDev) > 4)
    findings.push({ severity: 'warning',
      label: suctionDev > 0 ? 'Suction above setpoint' : 'Suction below setpoint',
      measurement: `${suctionPsig!.toFixed(1)} psig vs ${setpointPsig.toFixed(1)} psig (${opSST}°F SST)`,
      causes: suctionDev > 0 ? ['Excess load', 'Defrost stuck on', 'Compressor(s) down', 'TXV overfeeding'] : ['Undercharge', 'TXVs starved', 'Low load'],
      checks: suctionDev > 0 ? ['Check compressor staging and defrost status', 'Verify suction setpoint on controller'] : ['Check subcooling and sight glass', 'Verify TXVs feeding'] })

  if (compRatio !== null && compRatio > 12)
    findings.push({ severity: 'warning', label: 'High compression ratio', measurement: `${compRatio.toFixed(2)} : 1`,
      causes: ['Low suction combined with elevated discharge'],
      checks: ['Address suction and head root causes — a high ratio stresses scroll valves and raises discharge temp'] })

  const hasData = [dischargePsig, suctionPsig, liquidLineTemp, suctionTemp].some(v => v !== null)
  if (findings.length === 0 && hasData)
    findings.push({ severity: 'ok', label: 'No significant deviations found', measurement: '',
      causes: [], checks: ['Readings appear within normal range for this rack — enter more measurements for a fuller picture'] })

  const derived: DerivedRow[] = [
    { label: 'Condensing sat temp', value: condensingSatTemp, unit: '°F sat' },
    { label: 'Suction sat temp', value: suctionSatTemp, unit: '°F sat' },
    { label: 'Suction superheat', value: suctionSH, unit: '°F',
      note: suctionSH !== null && suctionSH > 20 ? 'HIGH' : suctionSH !== null && suctionSH < 5 ? 'LOW' : undefined,
      color: suctionSH !== null && (suctionSH > 20 || suctionSH < 5) ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Subcooling', value: subcooling, unit: '°F',
      note: subcooling !== null && subcooling < 3 ? 'FLASH GAS' : subcooling !== null && subcooling < 8 ? 'LOW' : undefined,
      color: subcooling !== null && subcooling < 8 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Discharge superheat', value: dischargeSH, dec: 0, unit: '°F',
      note: dischargeSH !== null && dischargeSH > 90 ? 'HIGH' : undefined,
      color: dischargeSH !== null && dischargeSH > 90 ? 'text-amber-600 dark:text-amber-400' : undefined },
    { label: 'Approach ΔT', value: approachDelta, unit: '°F',
      note: approachDelta !== null && approachDelta > 26 ? 'ELEVATED' : undefined,
      color: approachDelta !== null && approachDelta > 26 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
      tooltip: 'Condensing sat temp minus OAT. Protocol racks run a higher baseline (~20°F) than typical. Elevated values point to a dirty coil, failed fans, or non-condensables.' },
    { label: 'Compression ratio', value: compRatio, dec: 2, unit: ': 1',
      note: compRatio !== null && compRatio > 12 ? 'HIGH' : undefined,
      color: compRatio !== null && compRatio > 12 ? 'text-amber-600 dark:text-amber-400' : undefined },
    { label: 'Filter drier ΔT', value: drierDeltaT, unit: '°F',
      note: drierDeltaT !== null && drierDeltaT > 3 ? 'RESTRICTED' : undefined,
      color: drierDeltaT !== null && drierDeltaT > 3 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
  ]

  return { derived, findings }
}

// ── Compressor specs ───────────────────────────────────────────────────────────
// Hussmann Protocol Rack — Unit A — Fortino's Mall Rd
// 575 V / 3-ph / 60 Hz  |  R-448A  |  LT Frozen Food  |  Design: −25 °F SST
// C1 ZFD25KVE = digital scroll (Lead) → modulates 10–100% to trim capacity
// C2–C6 = standard EVI scrolls (Lag) → fully on or off
const COMP_SPECS = [
  { id: 'C1', model: 'ZFD25KVE', group: 'Lead',  designMBH: 30.0, rla: 10.5 },
  { id: 'C2', model: 'ZF25KVE',  group: 'Lag-1', designMBH: 23.5, rla:  9.0 },
  { id: 'C3', model: 'ZF25KVE',  group: 'Lag-1', designMBH: 23.5, rla:  9.0 },
  { id: 'C4', model: 'ZF18KVE',  group: 'Lag-2', designMBH: 18.6, rla:  6.3 },
  { id: 'C5', model: 'ZF18KVE',  group: 'Lag-2', designMBH: 18.6, rla:  6.3 },
  { id: 'C6', model: 'ZF18KVE',  group: 'Lag-2', designMBH: 18.6, rla:  6.3 },
] as const

// ── Circuit definitions ────────────────────────────────────────────────────────
// Remote Header A — Fortino's Mall Rd (Hussmann drawing 352892)
// All circuits: HG (hot gas) defrost
// ORZ  (Hillphoenix): 1×/day · 15 min failsafe — per ORZ installation manual
// BREMA (Arneg):      2×/day · 15 min failsafe — per Brema installation manual
type Mfr = 'ORZ' | 'BREMA' | 'SPARE'
interface Circuit {
  id: string; mfr: Mfr; doors: number; doorConfig: string
  designMBH: number; evapTargetF: number; caseTargetF: number; active: boolean
  defrostsPerDay: number; defrostMaxMin: number
}

const CIRCUITS: Circuit[] = [
  { id: 'A1',  mfr: 'ORZ',   doors:  9, doorConfig: '4+5',     designMBH:  9.54, evapTargetF: -15, caseTargetF:  -5, active: true,  defrostsPerDay: 1, defrostMaxMin: 15 },
  { id: 'A2',  mfr: 'BREMA', doors: 10, doorConfig: '5+5',     designMBH: 11.60, evapTargetF: -20, caseTargetF: -10, active: true,  defrostsPerDay: 2, defrostMaxMin: 15 },
  { id: 'A3',  mfr: 'BREMA', doors: 10, doorConfig: '5+5',     designMBH: 11.60, evapTargetF: -20, caseTargetF: -10, active: true,  defrostsPerDay: 2, defrostMaxMin: 15 },
  { id: 'A4',  mfr: 'BREMA', doors: 10, doorConfig: '5+5',     designMBH: 11.60, evapTargetF: -20, caseTargetF: -10, active: true,  defrostsPerDay: 2, defrostMaxMin: 15 },
  { id: 'A5',  mfr: 'BREMA', doors:  8, doorConfig: '3+5',     designMBH:  9.28, evapTargetF: -20, caseTargetF: -10, active: true,  defrostsPerDay: 2, defrostMaxMin: 15 },
  { id: 'A6',  mfr: 'ORZ',   doors: 10, doorConfig: '5+5',     designMBH: 10.60, evapTargetF: -15, caseTargetF:  -5, active: true,  defrostsPerDay: 1, defrostMaxMin: 15 },
  { id: 'A7',  mfr: 'ORZ',   doors: 10, doorConfig: '5+5',     designMBH: 10.60, evapTargetF: -15, caseTargetF:  -5, active: true,  defrostsPerDay: 1, defrostMaxMin: 15 },
  { id: 'A8',  mfr: 'ORZ',   doors: 16, doorConfig: '3+3+5+5', designMBH: 16.96, evapTargetF: -15, caseTargetF:  -5, active: true,  defrostsPerDay: 1, defrostMaxMin: 15 },
  { id: 'A9',  mfr: 'BREMA', doors: 12, doorConfig: '3+4+5',   designMBH: 13.92, evapTargetF: -20, caseTargetF: -10, active: true,  defrostsPerDay: 2, defrostMaxMin: 15 },
  { id: 'A10', mfr: 'SPARE', doors:  0, doorConfig: '—',       designMBH:  9.00, evapTargetF: -20, caseTargetF: -10, active: false, defrostsPerDay: 1, defrostMaxMin: 15 },
  { id: 'A11', mfr: 'SPARE', doors:  0, doorConfig: '—',       designMBH:  9.00, evapTargetF: -20, caseTargetF: -10, active: false, defrostsPerDay: 1, defrostMaxMin: 15 },
  { id: 'A12', mfr: 'SPARE', doors:  0, doorConfig: '—',       designMBH:  9.00, evapTargetF: -20, caseTargetF: -10, active: false, defrostsPerDay: 1, defrostMaxMin: 15 },
]

// ── Fault types ────────────────────────────────────────────────────────────────
type FaultKey =
  | 'comp1Failed' | 'comp2Failed' | 'comp3Failed'
  | 'comp4Failed' | 'comp5Failed' | 'comp6Failed'
  | 'demandCoolingFailed'
  | 'a1TxvFailed'  | 'a2TxvFailed'  | 'a3TxvFailed' | 'a4TxvFailed' | 'a5TxvFailed'
  | 'a6TxvFailed'  | 'a7TxvFailed'  | 'a8TxvFailed' | 'a9TxvFailed'
  | 'a1DefrostStuck'  | 'a2DefrostStuck'  | 'a3DefrostStuck'
  | 'a4DefrostStuck'  | 'a5DefrostStuck'  | 'a6DefrostStuck'
  | 'a7DefrostStuck'  | 'a8DefrostStuck'  | 'a9DefrostStuck'
  | 'dirtyCondenser' | 'fan1Failed' | 'fan2Failed'
  | 'undercharge' | 'overcharge'
  | 'filterDrierRestricted'
  | 'doorsOpen'
  | 'a6EvapFansOut' | 'a2CoilIced' | 'a4CaseDrierPlugged' | 'a8TxvOverfeeding'

type FaultState = Record<FaultKey, boolean>

const INITIAL_FAULTS: FaultState = {
  comp1Failed: false, comp2Failed: false, comp3Failed: false,
  comp4Failed: false, comp5Failed: false, comp6Failed: false,
  demandCoolingFailed: false,
  a1TxvFailed: false, a2TxvFailed: false, a3TxvFailed: false,
  a4TxvFailed: false, a5TxvFailed: false, a6TxvFailed: false,
  a7TxvFailed: false, a8TxvFailed: false, a9TxvFailed: false,
  a1DefrostStuck: false, a2DefrostStuck: false, a3DefrostStuck: false,
  a4DefrostStuck: false, a5DefrostStuck: false, a6DefrostStuck: false,
  a7DefrostStuck: false, a8DefrostStuck: false, a9DefrostStuck: false,
  dirtyCondenser: false, fan1Failed: false, fan2Failed: false,
  undercharge: false, overcharge: false,
  filterDrierRestricted: false,
  doorsOpen: false,
  a6EvapFansOut: false, a2CoilIced: false, a4CaseDrierPlugged: false, a8TxvOverfeeding: false,
}

const CIRCUIT_TXV_FAULT: Record<string, FaultKey> = {
  A1: 'a1TxvFailed', A2: 'a2TxvFailed', A3: 'a3TxvFailed', A4: 'a4TxvFailed', A5: 'a5TxvFailed',
  A6: 'a6TxvFailed', A7: 'a7TxvFailed', A8: 'a8TxvFailed', A9: 'a9TxvFailed',
}
const CIRCUIT_DEF_FAULT: Record<string, FaultKey> = {
  A1: 'a1DefrostStuck', A2: 'a2DefrostStuck', A3: 'a3DefrostStuck', A4: 'a4DefrostStuck', A5: 'a5DefrostStuck',
  A6: 'a6DefrostStuck', A7: 'a7DefrostStuck', A8: 'a8DefrostStuck', A9: 'a9DefrostStuck',
}

interface FaultDef {
  key: FaultKey; label: string; hint: string; group: string
  mutuallyExcludes?: FaultKey[]
}

const FAULT_DEFS: FaultDef[] = [
  { key: 'comp1Failed', group: 'Compressors', label: 'C1 ZFD25KVE failed (Lead)',       hint: 'Lead digital scroll offline — its modulation range lost immediately. Lag-1 & Lag-2 must cover the full load without C1\'s trimming.' },
  { key: 'comp2Failed', group: 'Compressors', label: 'C2 ZF25KVE failed (Lag-1A)',      hint: 'One Lag-1 scroll down. C3 carries the Lag-1 group alone; 23.5 MBH lost. C1 modulation increases to compensate.' },
  { key: 'comp3Failed', group: 'Compressors', label: 'C3 ZF25KVE failed (Lag-1B)',      hint: 'Second Lag-1 down. Full Lag-1 group offline — 47 MBH lost total if C2 also failed. C1 and Lag-2 must carry load.' },
  { key: 'comp4Failed', group: 'Compressors', label: 'C4 ZF18KVE failed (Lag-2A)',      hint: 'First Lag-2 scroll offline. C5 & C6 continue; 18.6 MBH lost. C1 modulation may increase to compensate.' },
  { key: 'comp5Failed', group: 'Compressors', label: 'C5 ZF18KVE failed (Lag-2B)',      hint: 'Second Lag-2 down. Only C6 remains in group; 37.2 MBH lost if C4 also failed.' },
  { key: 'comp6Failed', group: 'Compressors', label: 'C6 ZF18KVE failed (Lag-2C)',      hint: 'Full Lag-2 group offline — all three 18K scrolls down. 55.8 MBH lost. Significant suction rise.' },
  { key: 'demandCoolingFailed', group: 'Compressors', label: 'Demand cooling system failed', hint: 'All 6 EVI scrolls require liquid injection to intermediate stage. Loss = discharge temps spike to 200 °F+. Protect compressors immediately.' },
  { key: 'dirtyCondenser',  group: 'Condenser', label: 'Dirty condenser coil',      hint: 'Fouled coil raises approach ΔT — condensing and discharge pressure rise. Head pressure goes up; subcooling may increase slightly from liquid backup.' },
  { key: 'fan1Failed',      group: 'Condenser', label: 'Condenser fan #1 failed',   hint: 'Reduced airflow — head pressure rises ~12 psig. Approach ΔT up ~9 °F. Compressor amps increase.' },
  { key: 'fan2Failed',      group: 'Condenser', label: 'Condenser fan #2 failed',   hint: 'Both fans out: severe head pressure rise — approach ΔT +30 °F. Discharge temps spike. Risk of HPCO.' },
  { key: 'undercharge',     group: 'Charge', label: 'Undercharge (~20%)',            hint: 'High SH on all circuits, near-zero subcooling — EVI intermediate fed poorly, discharge temp rises. Flash gas in liquid line; cases struggle.', mutuallyExcludes: ['overcharge'] },
  { key: 'overcharge',      group: 'Charge', label: 'Overcharge (~15%)',             hint: 'High head pressure, high subcooling, low SH — liquid carryover risk to EVI scrolls. High discharge pressure drives up comp amps.', mutuallyExcludes: ['undercharge'] },
  { key: 'filterDrierRestricted', group: 'Charge', label: 'Filter drier restricted', hint: 'ΔT across drier — all 9 circuits liquid-starved. High SH on every circuit, cases warming. Subcooling drops downstream of restriction.' },
  { key: 'doorsOpen', group: 'Store Load', label: 'Case doors propped open (restock)', hint: 'Stocking crew left frozen-food doors open — infiltration load jumps ~18%, suction rises, C1 modulation climbs, cases drift warm. No alarm on the controller; you have to read the load.' },
  { key: 'a6EvapFansOut',     group: 'Case / Evap', label: 'A6 ORZ — evap fan motors out',          hint: 'Air stops moving across the A6 coil — case warms fast while the circuit\'s load falls OFF the rack. Circuit SH runs low; coil will ice next. Check fan amps at the case.' },
  { key: 'a2CoilIced',        group: 'Case / Evap', label: 'A2 BREMA — evaporator coil iced solid', hint: 'Frost blocks A2 airflow — classic low-load signature on one circuit: low SH, warm case, reduced load. Find why defrost didn\'t clear it (heater, termination, schedule).' },
  { key: 'a4CaseDrierPlugged', group: 'Case / Evap', label: 'A4 BREMA — case liquid drier plugged', hint: 'The drier AT THE CASE is restricting — A4 starves (warm case, very high SH) but the rack drier ΔT is normal. Check temp drop across the case drier, not the rack drier.', mutuallyExcludes: ['a4TxvFailed'] },
  { key: 'a8TxvOverfeeding',  group: 'Case / Evap', label: 'A8 ORZ — TXV overfeeding (floodback)',  hint: 'A8\'s valve is hunting wide open — circuit SH near zero and liquid carries back to the suction header. Rack SH drops; EVI scrolls at slugging risk. Check bulb mount and insulation.', mutuallyExcludes: ['a8TxvFailed'] },
  { key: 'a1TxvFailed',  group: 'Circuit TXV', label: 'A1 ORZ (9 doors) — TXV not feeding',   hint: 'A1 starved — coil SH very high, 9.54 MBH load drops off suction. Suction falls; case warms. Check TXV bulb and external equalizer.' },
  { key: 'a2TxvFailed',  group: 'Circuit TXV', label: 'A2 BREMA (10 doors) — TXV not feeding', hint: 'A2 starved — 11.60 MBH off suction. High SH. TXV bulb or equalizer suspect.' },
  { key: 'a3TxvFailed',  group: 'Circuit TXV', label: 'A3 BREMA (10 doors) — TXV not feeding', hint: 'A3 starved — twin to A2; check for common liquid supply issue if both starved.' },
  { key: 'a4TxvFailed',  group: 'Circuit TXV', label: 'A4 BREMA (10 doors) — TXV not feeding', hint: 'A4 starved — if A2, A3 & A4 all fail, suspect upstream liquid restriction or low head.', mutuallyExcludes: ['a4CaseDrierPlugged'] },
  { key: 'a5TxvFailed',  group: 'Circuit TXV', label: 'A5 BREMA (8 doors) — TXV not feeding',  hint: 'A5 starved — 9.28 MBH lost. Combined with A2–A4 TXV issues, check liquid main and filter drier.' },
  { key: 'a6TxvFailed',  group: 'Circuit TXV', label: 'A6 ORZ (10 doors) — TXV not feeding',   hint: 'A6 starved — 10.60 MBH off suction. High SH. Check liquid solenoid and TXV operation.' },
  { key: 'a7TxvFailed',  group: 'Circuit TXV', label: 'A7 ORZ (10 doors) — TXV not feeding',   hint: 'A7 starved — twin to A6. Verify TXV bulb clamped tightly on suction line.' },
  { key: 'a8TxvFailed',  group: 'Circuit TXV', label: 'A8 ORZ (16 doors) — TXV not feeding',   hint: 'A8 is the largest circuit (16.96 MBH). TXV failure here has the biggest single-circuit suction impact.', mutuallyExcludes: ['a8TxvOverfeeding'] },
  { key: 'a9TxvFailed',  group: 'Circuit TXV', label: 'A9 BREMA (12 doors) — TXV not feeding',  hint: 'A9 starved — 13.92 MBH off suction. Second-largest circuit; high SH, case warms quickly.' },
  { key: 'a1DefrostStuck',  group: 'Circuit Defrost', label: 'A1 ORZ (9 doors) — HG defrost stuck on',   hint: 'Hot gas circulating through A1 coil — case warms, suction rises. Net load spike on rack.' },
  { key: 'a2DefrostStuck',  group: 'Circuit Defrost', label: 'A2 BREMA (10 doors) — HG defrost stuck on', hint: 'A2 won\'t terminate. Suction rises; rack compressors load up.' },
  { key: 'a3DefrostStuck',  group: 'Circuit Defrost', label: 'A3 BREMA (10 doors) — HG defrost stuck on', hint: 'A3 stuck in defrost — combined with A2, suction rises significantly.' },
  { key: 'a4DefrostStuck',  group: 'Circuit Defrost', label: 'A4 BREMA (10 doors) — HG defrost stuck on', hint: 'A4 plus A2/A3 stuck = 3 of 4 Brema circuits in defrost. Frozen food at risk.' },
  { key: 'a5DefrostStuck',  group: 'Circuit Defrost', label: 'A5 BREMA (8 doors) — HG defrost stuck on',  hint: 'A5 stuck in defrost. Check defrost termination thermostat.' },
  { key: 'a6DefrostStuck',  group: 'Circuit Defrost', label: 'A6 ORZ (10 doors) — HG defrost stuck on',   hint: 'A6 stuck — hot gas through ORZ coil. Check pressure-termination or time-limit setting.' },
  { key: 'a7DefrostStuck',  group: 'Circuit Defrost', label: 'A7 ORZ (10 doors) — HG defrost stuck on',   hint: 'A7 stuck — paired with A6, two ORZ circuits in defrost. Suction elevated.' },
  { key: 'a8DefrostStuck',  group: 'Circuit Defrost', label: 'A8 ORZ (16 doors) — HG defrost stuck on',   hint: 'A8 is the largest circuit. Stuck defrost here causes the biggest single-circuit suction rise.' },
  { key: 'a9DefrostStuck',  group: 'Circuit Defrost', label: 'A9 BREMA (12 doors) — HG defrost stuck on',  hint: 'A9 stuck — 12-door section. Second highest load impact of any single circuit.' },
]

const FAULT_GROUPS = ['Compressors', 'Condenser', 'Charge', 'Store Load', 'Case / Evap', 'Circuit TXV', 'Circuit Defrost']

// ── Time-of-day load curve ─────────────────────────────────────────────────────
// Approximates door-opening infiltration load variation over a typical supermarket day.
interface DayPeriod { label: string; mult: number }

function loadPeriod(hour: number): DayPeriod {
  if (hour >= 2  && hour < 6)  return { label: 'Night setback',    mult: 0.72 }
  if (hour >= 6  && hour < 9)  return { label: 'Morning pulldown', mult: 1.10 }
  if (hour >= 9  && hour < 17) return { label: 'Daytime steady',   mult: 1.00 }
  if (hour >= 17 && hour < 21) return { label: 'Evening peak',     mult: 1.12 }
  return                               { label: 'Late / overnight', mult: 0.83 }
}

function formatHour(h: number): string {
  const suffix = h < 12 ? 'am' : 'pm'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}:00 ${suffix}`
}

// ── Scenarios ──────────────────────────────────────────────────────────────────
interface Scenario {
  id: string; name: string; description: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  ambient?: number; timeOfDay?: number; faults: Partial<FaultState>; answer: FaultKey[]
  knowledge?: { slug: string; label: string }[]   // related knowledge-base topics shown on reveal
}

const SCENARIOS: Scenario[] = [
  {
    id: 'lead_comp_down',
    name: 'Lead Compressor Down',
    difficulty: 'Beginner',
    description: 'Call at 2 AM — Protocol Rack A is alarming. The controller shows only 5 of 6 compressors active and suction is running above setpoint. Case temps starting to climb. Which compressor failed, and why does losing the Lead hurt differently than losing a Lag unit?',
    faults: { comp1Failed: true },
    answer: ['comp1Failed'],
    knowledge: [{ slug: 'copeland', label: 'Copeland Compressors' }, { slug: 'rack-sequence-of-events', label: 'Rack Sequence of Events' }],
  },
  {
    id: 'demand_cooling',
    name: 'High Discharge Temp on All Comps',
    difficulty: 'Intermediate',
    description: 'All 6 compressors running but discharge temperature is approaching 210 °F on every unit simultaneously. Suction and head pressure look near-normal. No refrigerant alarms. What is the common system element that protects all 6 Copeland EVI scrolls from high discharge temps?',
    faults: { demandCoolingFailed: true },
    answer: ['demandCoolingFailed'],
    knowledge: [{ slug: 'copeland', label: 'Copeland Compressors' }],
  },
  {
    id: 'lag2_all_down',
    name: 'Full Lag-2 Group Offline',
    difficulty: 'Intermediate',
    description: 'Three separate safety trips took out C4, C5, and C6 overnight — all ZF18KVE units. Suction is above setpoint and the frozen food cases are warming. The Lead and Lag-1 group are running. How much capacity has been lost, and how does C1 respond to carry more of the load?',
    faults: { comp4Failed: true, comp5Failed: true, comp6Failed: true },
    answer: ['comp4Failed', 'comp5Failed', 'comp6Failed'],
    knowledge: [{ slug: 'rack-sequence-of-events', label: 'Rack Sequence of Events' }, { slug: 'parallel-rack-systems', label: 'Parallel Rack Systems' }],
  },
  {
    id: 'a8_txv_failed',
    name: 'Largest Circuit Starved',
    difficulty: 'Beginner',
    description: 'Circuit A8 case temps are rising while suction is running lower than setpoint. The 16-door ORZ section isn\'t pulling down — superheat on A8 is very high while other circuits read normal. What is the single fault causing this?',
    faults: { a8TxvFailed: true },
    answer: ['a8TxvFailed'],
    knowledge: [{ slug: 'sporlan', label: 'Sporlan Valves & TXVs' }, { slug: 'system-diagnostics', label: 'System Diagnostics' }],
  },
  {
    id: 'multiple_defrosts',
    name: 'Four Circuits Stuck in Defrost',
    difficulty: 'Advanced',
    description: 'Monday morning store opening: Frozen food cases are all warm. Suction is significantly above setpoint. Four circuits (A2, A3, A4, A9) — all Brema units — are stuck in defrost and won\'t terminate. Head pressure is also elevated from the load spike. What is the likely common cause?',
    ambient: 70,
    timeOfDay: 8,
    faults: { a2DefrostStuck: true, a3DefrostStuck: true, a4DefrostStuck: true, a9DefrostStuck: true },
    answer: ['a2DefrostStuck', 'a3DefrostStuck', 'a4DefrostStuck', 'a9DefrostStuck'],
    knowledge: [{ slug: 'defrost-systems', label: 'Defrost Systems' }],
  },
  {
    id: 'undercharge_winter',
    name: 'Winter — Racks Struggling Despite Cold',
    difficulty: 'Intermediate',
    description: 'It\'s 3 AM in January, OAT is 5 °F. HP control is holding condensing at minimum. Despite the cold ambient helping head pressure, superheat is very high on every circuit and subcooling is near zero. Cases are warmer than normal. A slow R-448A leak went undetected.',
    ambient: 5,
    timeOfDay: 3,
    faults: { undercharge: true },
    answer: ['undercharge'],
    knowledge: [{ slug: 'system-diagnostics', label: 'System Diagnostics' }, { slug: 'refrigeration-fundamentals', label: 'Refrigeration Fundamentals' }],
  },
  {
    id: 'dirty_condenser_summer',
    name: 'High Head — Summer Service Call',
    difficulty: 'Beginner',
    description: 'Evening peak at 85 °F OAT. Head pressure is 35 psig above what the PT chart predicts for the measured condensing temperature. Discharge temps are elevated. The rack was last serviced in fall. Compressors are all running and amps are slightly high.',
    ambient: 85,
    timeOfDay: 19,
    faults: { dirtyCondenser: true, fan1Failed: true },
    answer: ['dirtyCondenser', 'fan1Failed'],
    knowledge: [{ slug: 'system-diagnostics', label: 'System Diagnostics' }],
  },
  {
    id: 'a2_iced',
    name: 'A2 Warm — But Superheat Is LOW',
    difficulty: 'Intermediate',
    ambient: 70,
    timeOfDay: 9,
    description: 'Circuit A2 is running ~10 °F warm and its load has fallen off the rack. If the TXV were starving it, A2\'s superheat would be high — but it reads about 4 °F, the lowest on the header. The case fans hum but barely move any air at the discharge grille. What happened to that coil overnight?',
    faults: { a2CoilIced: true },
    answer: ['a2CoilIced'],
    knowledge: [{ slug: 'defrost-systems', label: 'Defrost Systems' }, { slug: 'system-diagnostics', label: 'System Diagnostics' }],
  },
  {
    id: 'a8_floodback',
    name: 'LO-SH Alarm — Liquid Coming Back',
    difficulty: 'Advanced',
    ambient: 75,
    timeOfDay: 14,
    description: 'The rack is alarming low suction superheat — mixed SH at the header is ~4 °F and the suction line is frosting back toward the compressors. One circuit reads near-zero SH while its case actually runs slightly COLD. Which valve is hunting wide open, and why does it threaten all six EVI scrolls?',
    faults: { a8TxvOverfeeding: true },
    answer: ['a8TxvOverfeeding'],
    knowledge: [{ slug: 'sporlan', label: 'Sporlan Valves & TXVs' }, { slug: 'copeland', label: 'Copeland Compressors' }],
  },
]

// ── Mystery fault generator ─────────────────────────────────────────────────────
// Picks 1–2 random faults (respecting mutual exclusions) plus random weather/time
// so the rack never runs out of fresh service calls. The answer stays hidden until
// the diagnosis is submitted.
const MYSTERY_AMBIENTS = [5, 35, 55, 70, 85, 95]
const MYSTERY_HOURS    = [3, 8, 14, 19, 22]
function generateMystery(): Scenario {
  const faultCount = Math.random() < 0.55 ? 1 : 2
  const picked: FaultKey[] = []
  const pool = [...FAULT_DEFS]
  while (picked.length < faultCount && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length)
    const def = pool.splice(idx, 1)[0]
    if (picked.some(k => FAULT_DEFS.find(d => d.key === k)?.mutuallyExcludes?.includes(def.key) || def.mutuallyExcludes?.includes(k))) continue
    picked.push(def.key)
  }
  const faults: Partial<FaultState> = {}
  picked.forEach(k => { faults[k] = true })
  return {
    id: 'mystery',
    name: 'Mystery Fault',
    difficulty: picked.length > 1 ? 'Advanced' : 'Intermediate',
    ambient: MYSTERY_AMBIENTS[Math.floor(Math.random() * MYSTERY_AMBIENTS.length)],
    timeOfDay: MYSTERY_HOURS[Math.floor(Math.random() * MYSTERY_HOURS.length)],
    description: `The rack has ${picked.length === 1 ? 'one hidden fault' : 'two hidden faults'}. No story, no hints — read the controller, work the readings, and call it like a real service visit.`,
    faults,
    answer: picked,
    knowledge: [{ slug: 'system-diagnostics', label: 'System Diagnostics' }],
  }
}

// ── Compute engine ─────────────────────────────────────────────────────────────
// Design: −25 °F SST  |  Operating setpoint: −21 °F SST  |  HP control floor: 80 °F condensing
const OPERATING_SST = -21
const HP_CTRL_MIN   =  80
const BASE_APPROACH =  20
const C1_MIN_MOD    = 0.10   // ZFD25KVE minimum modulation (10%)
const BASE_CIRCUIT_SH = 8    // °F — TXV target SH for LT display cases

interface Alarm { code: string; severity: 'WARNING' | 'CRITICAL'; message: string }
type CompStatus = 'RUNNING' | 'STANDBY' | 'TRIPPED'
type CircuitStatus = 'OK' | 'TXV_FAIL' | 'DEF_STUCK' | 'SPARE' | 'FAN_OUT' | 'ICED' | 'DRIER' | 'OVERFEED'

interface RackResult {
  sst: number; suctionPsig: number; suctionGasTemp: number; suctionSH: number
  condensingBubble: number; dischargePsig: number; dischargeTemp: number; dischargeSH: number
  compressionRatio: number; subcooling: number
  compRunning: boolean[]; compStatus: CompStatus[]; compAmps: number[]
  c1Modulation: number        // 0.10–1.00 (digital scroll modulation %)
  totalAmps: number
  hpCtrlActive: boolean; approachDelta: number
  totalLoadMBH: number; totalCapMBH: number; fullCapMBH: number
  loadRatio: number           // totalLoadMBH / fullCapMBH (fraction of max available)
  stagingStatus: string
  circuitCaseTemps: number[]
  circuitSuperheatF: number[] // per-circuit SH; NaN = not applicable (defrost/spare)
  circuitStatuses: CircuitStatus[]
  alarms: Alarm[]
}

function computeRack(f: FaultState, ambient: number, timeOfDay: number, opSST: number = OPERATING_SST, hpMin: number = HP_CTRL_MIN): RackResult {
  const period = loadPeriod(timeOfDay)

  // ── Demand cooling ─────────────────────────────────────────────────────────
  const dcFactor = f.demandCoolingFailed ? 0.85 : 1.0

  // ── Condenser ──────────────────────────────────────────────────────────────
  let approach = BASE_APPROACH
  if (f.dirtyCondenser) approach += 12
  const fansFailed = (f.fan1Failed ? 1 : 0) + (f.fan2Failed ? 1 : 0)
  if (fansFailed === 1) approach += 9
  if (fansFailed === 2) approach += 24

  const rawCond = ambient + approach
  const hpCtrl  = rawCond < hpMin
  let condensing = Math.max(rawCond, hpMin)
  if (f.overcharge) condensing += 14

  // ── Charge effects ─────────────────────────────────────────────────────────
  let suctionSH  = 12
  let subcooling = 16
  if (f.undercharge)           { suctionSH += 22; subcooling -= 11 }
  if (f.overcharge)            { suctionSH -= 8;  subcooling += 18 }
  if (f.filterDrierRestricted) { suctionSH += 10; subcooling -= 6  }

  // ── Per-circuit SH base ────────────────────────────────────────────────────
  // Individual circuit SH (at case outlet) before mixing into suction header
  let baseCircSH = BASE_CIRCUIT_SH
  if (f.undercharge)           baseCircSH += 12
  if (f.overcharge)            baseCircSH = Math.max(0, baseCircSH - 4)
  if (f.filterDrierRestricted) baseCircSH += 16

  // ── Circuit load + per-circuit data ───────────────────────────────────────
  // Effective load multiplier: time-of-day curve × doors-open infiltration ×
  // ambient infiltration (warm store air leaks into LT cases on hot days)
  const loadMult  = period.mult
    * (f.doorsOpen ? 1.18 : 1)
    * (1 + Math.max(0, ambient - 75) * 0.003)
  const caseBump  = (f.doorsOpen ? 3.5 : 0) + Math.max(0, ambient - 90) * 0.08

  let totalLoadMBH = 0
  const circuitCaseTemps: number[]  = []
  const circuitSuperheatF: number[] = []
  const circuitStatuses: CircuitStatus[] = []

  for (const c of CIRCUITS) {
    if (!c.active) {
      circuitCaseTemps.push(0)
      circuitSuperheatF.push(NaN)
      circuitStatuses.push('SPARE')
      continue
    }
    const txvFailed = CIRCUIT_TXV_FAULT[c.id] ? f[CIRCUIT_TXV_FAULT[c.id]] : false
    const defStuck  = CIRCUIT_DEF_FAULT[c.id] ? f[CIRCUIT_DEF_FAULT[c.id]] : false
    // Case-level field faults — each pinned to a representative circuit
    const fanOut    = c.id === 'A6' && f.a6EvapFansOut
    const iced      = c.id === 'A2' && f.a2CoilIced
    const drierPlug = c.id === 'A4' && f.a4CaseDrierPlugged
    const overfeed  = c.id === 'A8' && f.a8TxvOverfeeding

    if (defStuck) {
      totalLoadMBH += c.designMBH * loadMult * 0.25
      circuitCaseTemps.push(c.caseTargetF + 28 + caseBump)
      circuitSuperheatF.push(NaN)
      circuitStatuses.push('DEF_STUCK')
    } else if (txvFailed) {
      totalLoadMBH += c.designMBH * loadMult * 0.08
      circuitCaseTemps.push(c.caseTargetF + 22 + caseBump)
      circuitSuperheatF.push(38 + Math.max(0, baseCircSH - BASE_CIRCUIT_SH))  // starved
      circuitStatuses.push('TXV_FAIL')
    } else if (drierPlug) {
      // Case drier restricting — starves like a dead TXV, but the rack drier ΔT is normal
      totalLoadMBH += c.designMBH * loadMult * 0.15
      circuitCaseTemps.push(c.caseTargetF + 18 + caseBump)
      circuitSuperheatF.push(32 + Math.max(0, baseCircSH - BASE_CIRCUIT_SH))
      circuitStatuses.push('DRIER')
    } else if (iced) {
      // Iced coil blocks airflow — low load: case warm, SH LOW (not high)
      totalLoadMBH += c.designMBH * loadMult * 0.4
      circuitCaseTemps.push(c.caseTargetF + 10 + caseBump)
      circuitSuperheatF.push(4)
      circuitStatuses.push('ICED')
    } else if (fanOut) {
      // Evap fans dead — air not moving; load falls off the rack while case warms
      totalLoadMBH += c.designMBH * loadMult * 0.5
      circuitCaseTemps.push(c.caseTargetF + 12 + caseBump)
      circuitSuperheatF.push(5)
      circuitStatuses.push('FAN_OUT')
    } else if (overfeed) {
      // TXV hunting wide open — coil flooded, SH collapses, liquid back to header
      totalLoadMBH += c.designMBH * loadMult * 1.08
      circuitCaseTemps.push(c.caseTargetF - 2 + caseBump)
      circuitSuperheatF.push(1)
      circuitStatuses.push('OVERFEED')
    } else {
      totalLoadMBH += c.designMBH * loadMult
      circuitCaseTemps.push(c.caseTargetF + caseBump)
      circuitSuperheatF.push(baseCircSH)
      circuitStatuses.push('OK')
    }
  }

  // A8 floodback drags the mixed rack superheat down toward slugging territory
  if (f.a8TxvOverfeeding) suctionSH = Math.max(2, suctionSH - 8)

  // ── Compressor staging — Protocol rack with digital scroll Lead ────────────
  // C1 (ZFD25KVE) modulates 10–100% to trim load.
  // Lag units (C2–C6) are fully on or off; staged on when C1 at 100% can't cover remaining load.
  const compFailed = [f.comp1Failed, f.comp2Failed, f.comp3Failed, f.comp4Failed, f.comp5Failed, f.comp6Failed]
  const compRunning: boolean[] = [false, false, false, false, false, false]
  let c1Modulation = 1.0

  if (!compFailed[0]) {
    const c1MaxMBH = COMP_SPECS[0].designMBH * dcFactor
    let lagCapMBH = 0
    for (let i = 1; i < COMP_SPECS.length; i++) {
      if (compFailed[i]) continue
      // Stage this Lag if C1 at full + already-staged Lags still can't meet load
      if (c1MaxMBH + lagCapMBH < totalLoadMBH) {
        compRunning[i] = true
        lagCapMBH += COMP_SPECS[i].designMBH * dcFactor
      }
    }
    compRunning[0] = true
    c1Modulation = Math.min(1.0, Math.max(C1_MIN_MOD, (totalLoadMBH - lagCapMBH) / c1MaxMBH))
  } else {
    // C1 failed — stage Lags in sequence until capacity meets load
    let stagedCap = 0
    for (let i = 1; i < COMP_SPECS.length; i++) {
      if (compFailed[i]) continue
      if (stagedCap < totalLoadMBH) {
        compRunning[i] = true
        stagedCap += COMP_SPECS[i].designMBH * dcFactor
      }
    }
  }

  const compStatus: CompStatus[] = COMP_SPECS.map((_, i) =>
    compFailed[i] ? 'TRIPPED' : compRunning[i] ? 'RUNNING' : 'STANDBY'
  )
  const runningCount  = compRunning.filter(Boolean).length

  // C1 delivers modulated capacity; Lags deliver full design capacity
  const c1ActualMBH = compRunning[0] ? COMP_SPECS[0].designMBH * dcFactor * c1Modulation : 0
  const lagActualMBH = COMP_SPECS.slice(1).reduce((sum, c, i) =>
    sum + (compRunning[i + 1] ? c.designMBH * dcFactor : 0), 0)
  const totalCapMBH = c1ActualMBH + lagActualMBH

  // Max possible capacity from all non-failed compressors (for load% gauge)
  const fullCapMBH = COMP_SPECS.reduce((sum, c, i) =>
    sum + (compFailed[i] ? 0 : c.designMBH * dcFactor), 0)

  // ── SST deviation from setpoint ────────────────────────────────────────────
  let sstDev = 0
  if (runningCount === 0) {
    sstDev = 45
  } else {
    const ratio = totalCapMBH > 0 ? totalLoadMBH / totalCapMBH : 99
    if (ratio > 1.0) sstDev = (ratio - 1.0) * 40
    else             sstDev = (ratio - 1.0) * 3
  }

  const sst            = opSST + sstDev
  const suctionPsig    = dewPsig(sst)
  const suctionGasTemp = sst + suctionSH

  // ── Discharge ──────────────────────────────────────────────────────────────
  condensing = Math.max(condensing, sst + 30)
  const dischargePsig  = bubblePsig(condensing)
  const baseDischargeSH = f.demandCoolingFailed ? 110 : 48
  const dischargeSH     = baseDischargeSH + Math.max(0, condensing - 85) * 0.3
  const dischargeTemp   = condensing + dischargeSH
  const compressionRatio = (dischargePsig + 14.696) / (suctionPsig + 14.696)

  // ── Amps ───────────────────────────────────────────────────────────────────
  let ampsMult = 1.0
  if (f.undercharge)         ampsMult *= 0.93
  if (f.overcharge)          ampsMult *= 1.08
  if (f.dirtyCondenser)      ampsMult *= 1.06
  if (fansFailed === 1)      ampsMult *= 1.04
  if (fansFailed === 2)      ampsMult *= 1.10
  if (f.demandCoolingFailed) ampsMult *= 1.04

  const compAmps  = COMP_SPECS.map((c, i) => {
    if (!compRunning[i]) return 0
    // C1 amps scale with modulation (digital scroll draws ~linearly with load)
    const modFactor = i === 0 ? (0.4 + 0.6 * c1Modulation) : 1.0
    return Math.round(c.rla * ampsMult * modFactor * 10) / 10
  })
  const totalAmps = compAmps.reduce((a, b) => a + b, 0)

  // ── Staging status ─────────────────────────────────────────────────────────
  const anyLagRunning = compRunning.slice(1).some(Boolean)
  const anyLagStandby = compStatus.slice(1).some(s => s === 'STANDBY')
  let stagingStatus: string
  if (runningCount === 0) {
    stagingStatus = 'All offline'
  } else if (!compFailed[0] && c1Modulation >= 0.92 && anyLagStandby) {
    stagingStatus = 'Stage-on imminent (~2–4 min)'
  } else if (!compFailed[0] && c1Modulation <= 0.18 && anyLagRunning) {
    stagingStatus = 'Stage-off pending (~3–5 min)'
  } else {
    stagingStatus = 'Staging stable'
  }

  // ── Alarms ─────────────────────────────────────────────────────────────────
  const alarms: Alarm[] = []

  if (runningCount === 0)
    alarms.push({ code: 'NO-COMP', severity: 'CRITICAL', message: 'All compressors offline — no refrigeration. Frozen food warming.' })

  if (suctionPsig <= 2.5)
    alarms.push({ code: 'LPCO', severity: 'CRITICAL', message: `Low Pressure Cutout — ${suctionPsig.toFixed(1)} psig. Compressors tripping on low pressure.` })
  else if (suctionPsig <= dewPsig(-25) + 0.5)
    alarms.push({ code: 'LP-W', severity: 'WARNING', message: `Suction near design floor — ${suctionPsig.toFixed(1)} psig (design: ${dewPsig(-25).toFixed(1)} psig / −25 °F SST).` })

  if (dischargePsig >= 350)
    alarms.push({ code: 'HPCO', severity: 'CRITICAL', message: `High Pressure Cutout — ${Math.round(dischargePsig)} psig. All compressors tripped.` })
  else if (dischargePsig >= 295)
    alarms.push({ code: 'HP-HIGH', severity: 'WARNING', message: `High discharge pressure — ${Math.round(dischargePsig)} psig. Approach ΔT: ${approach.toFixed(0)} °F.` })

  if (dischargeTemp >= 225)
    alarms.push({ code: 'HI-DT', severity: 'CRITICAL', message: `Discharge temp ${Math.round(dischargeTemp)} °F — compressors at risk. Demand cooling required.` })
  else if (dischargeTemp >= 200)
    alarms.push({ code: 'DT-W', severity: 'WARNING', message: `Elevated discharge temp — ${Math.round(dischargeTemp)} °F (EVI limit ~225 °F).` })

  if (f.demandCoolingFailed)
    alarms.push({ code: 'DC-FAIL', severity: 'CRITICAL', message: 'Demand cooling offline — liquid injection to EVI intermediate stage lost. All 6 compressors at shutdown risk.' })

  compStatus.forEach((s, i) => {
    if (s === 'TRIPPED') alarms.push({ code: `C${i + 1}-TRIP`, severity: 'CRITICAL', message: `Compressor ${i + 1} (${COMP_SPECS[i].model}, ${COMP_SPECS[i].group}) tripped on safety.` })
  })

  const stuckCount = CIRCUITS.filter(c => c.active && c.id in CIRCUIT_DEF_FAULT && f[CIRCUIT_DEF_FAULT[c.id]]).length
  if (stuckCount >= 4)
    alarms.push({ code: 'DEF-CRIT', severity: 'CRITICAL', message: `${stuckCount} circuits stuck in HG defrost — severe suction rise, frozen food at risk.` })
  else if (stuckCount >= 2)
    alarms.push({ code: 'DEF-WARN', severity: 'WARNING', message: `${stuckCount} circuits stuck in HG defrost — suction elevated.` })
  else if (stuckCount === 1)
    alarms.push({ code: 'DEF-1', severity: 'WARNING', message: '1 circuit stuck in HG defrost — monitor suction and case temps.' })

  const txvCount = CIRCUITS.filter(c => c.active && c.id in CIRCUIT_TXV_FAULT && f[CIRCUIT_TXV_FAULT[c.id]]).length
  if (txvCount >= 3)
    alarms.push({ code: 'TXV-MULTI', severity: 'CRITICAL', message: `${txvCount} TXVs not feeding — check liquid main for restriction or low head.` })
  else if (txvCount >= 1)
    alarms.push({ code: 'TXV-WARN', severity: 'WARNING', message: `${txvCount} TXV(s) not feeding — ${txvCount > 1 ? 'check liquid supply pressure and filter drier' : 'check TXV bulb position and external equalizer'}.` })

  if (subcooling <= 2)
    alarms.push({ code: 'FLASH-GAS', severity: 'WARNING', message: `Near-zero subcooling (${subcooling.toFixed(1)} °F) — flash gas in liquid line. Cases starving.` })

  if (suctionSH >= 32)
    alarms.push({ code: 'HI-SH', severity: 'WARNING', message: `High suction superheat — ${Math.round(suctionSH)} °F (EVI target 10–15 °F). Check charge, TXVs, drier.` })
  else if (suctionSH <= 5 && runningCount > 0)
    alarms.push({ code: 'LO-SH', severity: 'WARNING', message: `Low suction superheat — ${Math.round(suctionSH)} °F. Liquid floodback risk to EVI scrolls; check for an overfeeding TXV or flooded coil.` })

  const casesWarm = circuitCaseTemps.filter((t, i) => CIRCUITS[i].active && t >= CIRCUITS[i].caseTargetF + 15).length
  if (casesWarm > 0)
    alarms.push({ code: 'CASE-TEMP', severity: casesWarm >= 4 ? 'CRITICAL' : 'WARNING', message: `${casesWarm} circuit(s) significantly above target — frozen food at risk.` })

  return {
    sst, suctionPsig, suctionGasTemp, suctionSH,
    condensingBubble: condensing, dischargePsig, dischargeTemp, dischargeSH,
    compressionRatio, subcooling,
    compRunning, compStatus, compAmps, c1Modulation, totalAmps,
    hpCtrlActive: hpCtrl, approachDelta: approach,
    totalLoadMBH, totalCapMBH, fullCapMBH,
    loadRatio: fullCapMBH > 0 ? totalLoadMBH / fullCapMBH : 0,
    stagingStatus,
    circuitCaseTemps, circuitSuperheatF, circuitStatuses,
    alarms,
  }
}

// ── UI helpers ─────────────────────────────────────────────────────────────────
const MFR_COLOR: Record<Mfr, string> = {
  ORZ:   'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  BREMA: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  SPARE: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
}

const GROUP_COLOR: Record<string, string> = {
  Lead:   'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
  'Lag-1': 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  'Lag-2': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

// ── Main page component ────────────────────────────────────────────────────────
export default function ProtocolRackASimulatorPage() {
  const router = useRouter()
  const [faults, setFaults]       = useState<FaultState>(INITIAL_FAULTS)
  const [ambient, setAmbient]     = useState(70)
  const [timeOfDay, setTimeOfDay] = useState(14)   // 2pm default — daytime steady
  const [activeGroup, setActiveGroup] = useState<string>(FAULT_GROUPS[0])
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)
  const [userGuess, setUserGuess] = useState<FaultState>(INITIAL_FAULTS)
  const [submitted, setSubmitted] = useState(false)
  const [activeTab, setActiveTab] = useState<'faults' | 'scenarios' | 'field' | 'info'>('faults')

  // Adjustable rack settings (controller setpoints)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [opSST, setOpSST]   = useState(OPERATING_SST)  // operating saturated suction setpoint
  const [hpMin, setHpMin]   = useState(HP_CTRL_MIN)    // HP control condensing floor

  // Field Readings diagnostic
  const [fieldReadings, setFieldReadings] = useState<FieldReadings>(FIELD_EMPTY)
  const updateField = (key: string, val: string) => setFieldReadings(prev => ({ ...prev, [key]: val }))
  const fieldAnalysis = useMemo(() => analyzeField(fieldReadings, opSST), [fieldReadings, opSST])

  // Instructor reveal (free-play only)
  const [instructorReveal, setInstructorReveal] = useState(false)
  const [schematicOpen, setSchematicOpen] = useState(true)
  const [schemDetail, setSchemDetail] = useState<SchematicDetail | null>(null)

  // In a scenario the hidden scenario faults drive the sim; the Faults tab
  // becomes the diagnosis sheet and edits userGuess instead of the live faults.
  const inScenario   = activeScenario !== null
  const activeFaults = useMemo(
    () => (activeScenario ? { ...INITIAL_FAULTS, ...activeScenario.faults } : faults),
    [activeScenario, faults],
  )
  const base = useMemo(() => computeRack(activeFaults, ambient, timeOfDay, opSST, hpMin), [activeFaults, ambient, timeOfDay, opSST, hpMin])
  const period = loadPeriod(timeOfDay)

  // ── Live sensor layer — readings breathe around the model's steady state ──
  const live = useLiveReadings([
    { key: 'suction',   target: base.suctionPsig,    jitter: 0.15, wander: 0.45, period: 32, bias: 0.15 },
    { key: 'discharge', target: base.dischargePsig,  jitter: 0.60, wander: 2.5,  period: 50, bias: 1.0 },
    { key: 'sh',        target: base.suctionSH,      jitter: 0.25, wander: 1.3,  period: 26, bias: 0.4 },   // TXV hunting
    { key: 'sc',        target: base.subcooling,     jitter: 0.15, wander: 0.6,  period: 55, bias: 0.3 },
    { key: 'dt',        target: base.dischargeTemp,  jitter: 0.40, wander: 1.8,  period: 65, bias: 1.0 },
    { key: 'ampF',      target: 1,                   jitter: 0.004, wander: 0.014, period: 22 },
    { key: 'modWob',    target: 0,                   jitter: 0.008, wander: 0.045, period: 18 },            // digital scroll trimming
    // per-circuit case sensor deltas — each case cycles on its own phase/bias
    ...CIRCUITS.map((c, i) => ({ key: `circ${i}`, target: 0, jitter: 0.10, wander: 0.8, period: 70 + i * 6, bias: 0.7 })),
  ])

  // Display object — JSX reads this; alarms/staging logic stays on the clean model
  const result: RackResult = {
    ...base,
    suctionPsig:      live.suction,
    sst:              dewTempFrom(live.suction),
    suctionSH:        live.sh,
    suctionGasTemp:   dewTempFrom(live.suction) + live.sh,
    dischargePsig:    live.discharge,
    dischargeTemp:    live.dt,
    subcooling:       live.sc,
    compressionRatio: (live.discharge + 14.696) / (live.suction + 14.696),
    totalAmps:        base.totalAmps * live.ampF,
    compAmps:         base.compAmps.map(a => a > 0 ? Math.round(a * live.ampF * 10) / 10 : 0),
    c1Modulation:     base.compRunning[0]
      ? Math.min(1, Math.max(C1_MIN_MOD, base.c1Modulation + live.modWob))
      : base.c1Modulation,
    circuitCaseTemps: base.circuitCaseTemps.map((t, i) =>
      base.circuitStatuses[i] === 'SPARE' ? t : t + (live[`circ${i}`] ?? 0)),
    circuitSuperheatF: base.circuitSuperheatF.map((sh, i) =>
      Number.isFinite(sh) ? sh + (live[`circ${i}`] ?? 0) * 0.5 : sh),
  }

  function toggleFault(key: FaultKey) {
    const setter = inScenario ? setUserGuess : setFaults
    setter(prev => {
      const next = { ...prev, [key]: !prev[key] }
      const def = FAULT_DEFS.find(d => d.key === key)
      if (def?.mutuallyExcludes && !prev[key]) {
        for (const ex of def.mutuallyExcludes) next[ex] = false
      }
      return next
    })
  }

  function loadScenario(s: Scenario) {
    if (s.ambient   !== undefined) setAmbient(s.ambient)
    if (s.timeOfDay !== undefined) setTimeOfDay(s.timeOfDay)
    setActiveScenario(s)
    setUserGuess(INITIAL_FAULTS)
    setSubmitted(false)
    setActiveTab('faults')
  }

  function exitScenario() {
    setActiveScenario(null)
    setUserGuess(INITIAL_FAULTS)
    setSubmitted(false)
  }

  function submitDiagnosis() {
    if (!activeScenario || submitted) return
    setSubmitted(true)
    const correct = activeScenario.answer.filter(k => userGuess[k]).length
    const total   = activeScenario.answer.length
    const fp      = Object.entries(userGuess).filter(([k, v]) => v && !activeScenario.answer.includes(k as FaultKey)).length
    const pct     = Math.max(0, Math.round(((correct - fp * 0.5) / total) * 100))
    saveSimAttempt({
      rack: 'protocol-rack-a',
      scenarioId: activeScenario.id,
      scenarioName: activeScenario.name,
      difficulty: activeScenario.difficulty,
      mode: activeScenario.id === 'mystery' ? 'mystery' : 'scenario',
      score: pct, correct, total, falsePositives: fp,
    })
  }

  const score = (() => {
    if (!activeScenario || !submitted) return null
    const correct = activeScenario.answer.filter(k => userGuess[k]).length
    const total   = activeScenario.answer.length
    const fp      = Object.entries(userGuess).filter(([k, v]) => v && !activeScenario.answer.includes(k as FaultKey)).length
    const pct     = Math.max(0, Math.round(((correct - fp * 0.5) / total) * 100))
    return { correct, total, fp, pct }
  })()

  // Coach mode — after a scenario submit, hand the readings + the user's
  // diagnosis to ColdIQ chat for a senior-tech walkthrough of the call.
  function coachInColdIQ() {
    if (!activeScenario || !submitted) return
    const labelOf = (k: FaultKey) => FAULT_DEFS.find(d => d.key === k)?.label ?? k
    const picked = FAULT_DEFS.filter(d => userGuess[d.key]).map(d => d.label)
    const answer = activeScenario.answer.map(labelOf)
    const missed = activeScenario.answer.filter(k => !userGuess[k]).map(labelOf)
    const fps    = FAULT_DEFS.filter(d => userGuess[d.key] && !activeScenario.answer.includes(d.key)).map(d => d.label)
    const compLine = COMP_SPECS.map((c, i) => {
      const s = base.compStatus[i]
      if (s === 'TRIPPED') return `${c.id} TRIPPED`
      if (s === 'STANDBY') return `${c.id} standby`
      return `${c.id} ${result.compAmps[i].toFixed(1)}A${i === 0 ? ` (${Math.round(result.c1Modulation * 100)}% mod)` : ''}`
    }).join(' · ')
    const circLine = CIRCUITS.filter(c => c.active).map(c => {
      const i = CIRCUITS.indexOf(c)
      const sh = result.circuitSuperheatF[i]
      return `${c.id} ${result.circuitCaseTemps[i].toFixed(0)}°F/SH ${Number.isFinite(sh) ? sh.toFixed(0) : '—'}°F`
    }).join(' · ')
    const text = [
      '=== ColdIQ Simulator Coach Request ===',
      'System: Hussmann Protocol Rack — Unit A | R-448A | LT frozen food',
      `Scenario: ${activeScenario.name} (${activeScenario.difficulty})`,
      activeScenario.description,
      '',
      'READINGS AT SUBMIT:',
      `  Conditions: OAT ${ambient} °F · ${formatHour(timeOfDay)} (${period.label}, ${period.mult.toFixed(2)}×)`,
      `  Suction: ${result.suctionPsig.toFixed(1)} psig / ${result.sst.toFixed(1)} °F SST · SH ${result.suctionSH.toFixed(1)} °F`,
      `  Discharge: ${Math.round(result.dischargePsig)} psig / ${result.condensingBubble.toFixed(1)} °F sat · DT ${Math.round(result.dischargeTemp)} °F · SC ${result.subcooling.toFixed(1)} °F`,
      `  Compressors: ${compLine}`,
      `  Load: ${result.totalLoadMBH.toFixed(1)} of ${result.fullCapMBH.toFixed(1)} MBH (${Math.round(result.loadRatio * 100)}%) · staging: ${result.stagingStatus}`,
      `  Circuits: ${circLine}`,
      `  Alarms: ${base.alarms.length ? base.alarms.map(a => `[${a.code}] ${a.message}`).join(' | ') : 'none'}`,
      '',
      `MY DIAGNOSIS: ${picked.length ? picked.join(', ') : '(nothing selected)'}`,
      `CORRECT ANSWER: ${answer.join(', ')}`,
      missed.length ? `I MISSED: ${missed.join(', ')}` : '',
      fps.length ? `FALSE POSITIVES I PICKED: ${fps.join(', ')}` : '',
      '',
      'Coach me like a senior tech mentoring an apprentice:',
      '1. Which readings above were the strongest clues to the correct fault(s), and why?',
      '2. How do I tell the correct answer apart from the faults I wrongly picked (or missed)?',
      '3. What would I physically check first on-site to confirm?',
      'Reference the actual numbers above and keep it practical.',
    ].filter(Boolean).join('\n')
    try { localStorage.setItem('coldiq_prefill', text) } catch { /* ignore */ }
    router.push('/dashboard')
  }

  function resetAll() {
    setFaults(INITIAL_FAULTS)
    setAmbient(70)
    setTimeOfDay(14)
    setInstructorReveal(false)
    exitScenario()
  }

  const guessState       = inScenario ? userGuess : faults
  const activeFaultCount = inScenario ? 0 : Object.values(faults).filter(Boolean).length
  const runningCount     = result.compRunning.filter(Boolean).length
  const loadPct          = result.loadRatio * 100

  const validCaseTemps = result.circuitCaseTemps.filter(t => Number.isFinite(t))
  const trendSpecs = [
    { key: 'suction',    label: 'Suction',        unit: 'psig', value: result.suctionPsig },
    { key: 'discharge',  label: 'Discharge',      unit: 'psig', value: result.dischargePsig },
    { key: 'suctionSH',  label: 'Suction SH',     unit: '°F',   value: result.suctionSH },
    { key: 'subcooling', label: 'Subcooling',     unit: '°F',   value: result.subcooling },
    { key: 'totalAmps',  label: 'Total Amps',     unit: 'A',    value: result.totalAmps },
    { key: 'avgCase',    label: 'Avg Case Temp',  unit: '°F',   value: validCaseTemps.length ? validCaseTemps.reduce((a, b) => a + b, 0) / validCaseTemps.length : 0 },
  ]
  const trendHistory = useTrendHistory(trendSpecs)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">

      {/* Header */}
      <div className="safe-top bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/simulation')}
          className="p-1.5 -ml-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-400">Cold</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white">IQ</span>
        </div>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">Protocol Rack — Unit A</span>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {activeFaultCount > 0 && (
            <span className="text-xs bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
              {activeFaultCount} fault{activeFaultCount !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={resetAll}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      </div>

      <LearningTabBar />
      <div className="max-w-6xl mx-auto w-full px-4 py-4 space-y-4">

        {/* Scenario banner */}
        {activeScenario && (
          <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Target size={14} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">{activeScenario.name}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">
                    {activeScenario.difficulty}
                  </span>
                  <button onClick={exitScenario} className="ml-auto text-[11px] text-violet-600 dark:text-violet-400 underline">Exit scenario</button>
                </div>
                <p className="text-sm text-violet-700 dark:text-violet-300">{activeScenario.description}</p>

                {!submitted && (
                  <p className="text-[11px] text-violet-600/80 dark:text-violet-400/80 mt-2">
                    Read the controller and gauges below, then mark the root cause(s) in the <strong>Your Diagnosis</strong> tab and submit.
                  </p>
                )}

                {submitted && score && (
                  <div className="mt-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Trophy size={14} className={score.pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : score.pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'} />
                      <span className={`text-sm font-bold ${score.pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : score.pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        Score: {score.pct}%
                      </span>
                      <span className="text-[10px] text-slate-500">{score.correct}/{score.total} fault{score.total > 1 ? 's' : ''} identified</span>
                      {score.fp > 0 && <span className="text-[10px] text-red-500 dark:text-red-400">{score.fp} false positive{score.fp > 1 ? 's' : ''}</span>}
                    </div>
                    {activeScenario.answer.map(key => {
                      const def = FAULT_DEFS.find(d => d.key === key)
                      const hit = userGuess[key]
                      return (
                        <div key={key} className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded-lg ${hit ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30' : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30'}`}>
                          {hit ? <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" /> : <XCircle size={12} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />}
                          <div>
                            <span className={hit ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}>{def?.label}</span>
                            <span className="text-slate-500 ml-1.5">— {def?.hint}</span>
                          </div>
                        </div>
                      )
                    })}
                    {(activeScenario.knowledge?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><BookOpen size={10}/> Read more:</span>
                        {activeScenario.knowledge!.map(k => (
                          <button key={k.slug} onClick={() => router.push(`/knowledge/${k.slug}`)}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 hover:border-blue-400 dark:hover:border-blue-400 transition-colors">
                            {k.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-1 flex-wrap">
                      <button onClick={coachInColdIQ} className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5">
                        <GraduationCap size={12}/> Coach me through it
                      </button>
                      <button onClick={() => loadScenario(activeScenario)} className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg">Try Again</button>
                      {activeScenario.id === 'mystery' && (
                        <button onClick={() => loadScenario(generateMystery())} className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center gap-1"><Dices size={11}/> New Mystery</button>
                      )}
                      <button onClick={exitScenario} className="px-3 py-1.5 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg">Done</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* System dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Suction */}
          <div className={`bg-white dark:bg-slate-800 rounded-xl p-3 border ${
            result.suctionPsig <= 2.5 ? 'border-red-300 dark:border-red-500/40' :
            result.suctionPsig <= dewPsig(-25) + 0.5 ? 'border-amber-300 dark:border-amber-500/40' :
            'border-slate-200 dark:border-slate-700'}`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Suction</p>
            <p className={`text-xl font-bold ${
              result.suctionPsig <= 2.5 ? 'text-red-600 dark:text-red-400' :
              result.suctionPsig <= dewPsig(-25) + 0.5 ? 'text-amber-600 dark:text-amber-400' :
              'text-slate-900 dark:text-white'}`}>
              {result.suctionPsig.toFixed(1)} <span className="text-sm font-normal">psig</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{result.sst.toFixed(1)} °F SST (dew)</p>
            <p className="text-xs text-slate-400">SH: {result.suctionSH.toFixed(0)} °F (mixed)</p>
          </div>

          {/* Discharge */}
          <div className={`bg-white dark:bg-slate-800 rounded-xl p-3 border ${
            result.dischargePsig >= 350 ? 'border-red-300 dark:border-red-500/40' :
            result.dischargePsig >= 295 ? 'border-amber-300 dark:border-amber-500/40' :
            'border-slate-200 dark:border-slate-700'}`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Discharge</p>
            <p className={`text-xl font-bold ${
              result.dischargePsig >= 350 ? 'text-red-600 dark:text-red-400' :
              result.dischargePsig >= 295 ? 'text-amber-600 dark:text-amber-400' :
              'text-slate-900 dark:text-white'}`}>
              {Math.round(result.dischargePsig)} <span className="text-sm font-normal">psig</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{result.condensingBubble.toFixed(1)} °F sat (bubble)</p>
            <p className={`text-xs mt-0.5 ${result.dischargeTemp >= 225 ? 'text-red-600 dark:text-red-400 font-semibold' : result.dischargeTemp >= 200 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
              DT: {Math.round(result.dischargeTemp)} °F · SC: {result.subcooling.toFixed(1)} °F
            </p>
          </div>

          {/* Compressors running */}
          <div className={`bg-white dark:bg-slate-800 rounded-xl p-3 border ${
            runningCount === 0 ? 'border-red-300 dark:border-red-500/40' :
            runningCount <= 3 ? 'border-amber-300 dark:border-amber-500/40' :
            'border-slate-200 dark:border-slate-700'}`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Compressors</p>
            <p className={`text-xl font-bold ${
              runningCount === 0 ? 'text-red-600 dark:text-red-400' :
              runningCount <= 3 ? 'text-amber-600 dark:text-amber-400' :
              'text-slate-900 dark:text-white'}`}>
              {runningCount} <span className="text-sm font-normal">/ 6</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{result.totalAmps.toFixed(1)} A total (575V)</p>
            <p className="text-xs text-slate-400">CR: {result.compressionRatio.toFixed(2)}:1</p>
          </div>

          {/* System load — % of full available capacity */}
          <div className={`bg-white dark:bg-slate-800 rounded-xl p-3 border ${
            loadPct > 95 ? 'border-red-300 dark:border-red-500/40' :
            loadPct > 80 ? 'border-amber-300 dark:border-amber-500/40' :
            'border-slate-200 dark:border-slate-700'}`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">System Load</p>
            <p className={`text-xl font-bold ${
              loadPct > 95 ? 'text-red-600 dark:text-red-400' :
              loadPct > 80 ? 'text-amber-600 dark:text-amber-400' :
              'text-slate-900 dark:text-white'}`}>
              {Math.min(loadPct, 199).toFixed(0)}<span className="text-sm font-normal">%</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{result.totalLoadMBH.toFixed(1)} of {result.fullCapMBH.toFixed(1)} MBH</p>
            <p className="text-xs text-slate-400">{period.label} · {period.mult.toFixed(2)}×</p>
          </div>
        </div>

        {/* Rack schematic */}
        {(() => {
          const conceal = inScenario
          const visStatus = (s: CompStatus) => (s === 'RUNNING' ? 'run' as const : s === 'TRIPPED' ? 'trip' as const : 'standby' as const)
          return (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <button onClick={() => setSchematicOpen(v => !v)} className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
                <Wind size={13} className="text-slate-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Rack Schematic</span>
                {conceal && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">controller view — inspection cues hidden</span>}
                <span className={`ml-auto text-slate-400 transition-transform ${schematicOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {schematicOpen && (
                <div className="px-2 pb-2">
                  <SchematicViewer label="Protocol Rack — Unit A">
                  <ProtocolRackVisual
                    fansSpinning={conceal ? [true, true] : [!activeFaults.fan1Failed, !activeFaults.fan2Failed]}
                    fansFailed={conceal ? [false, false] : [activeFaults.fan1Failed, activeFaults.fan2Failed]}
                    dirtyCondenser={!conceal && activeFaults.dirtyCondenser}
                    comps={COMP_SPECS.map((c, i) => ({
                      label: c.id, status: visStatus(base.compStatus[i]), amps: result.compAmps[i],
                      mod: i === 0 ? result.c1Modulation : undefined,
                    }))}
                    drierRestricted={!conceal && activeFaults.filterDrierRestricted}
                    suctionPsig={result.suctionPsig}
                    dischargePsig={result.dischargePsig}
                    circuits={CIRCUITS.map((c, i) => {
                      const temp = result.circuitCaseTemps[i]
                      const rawStatus = base.circuitStatuses[i]
                      // In a scenario, per-circuit fault states (TXV starved, defrost stuck,
                      // iced coil, dead fans…) are inspection findings — show plain readings only
                      const status = conceal && rawStatus !== 'SPARE' ? 'OK' : rawStatus
                      const tempColor = !c.active ? '#94a3b8'
                        : temp >= c.caseTargetF + 15 ? '#ef4444'
                        : temp >= c.caseTargetF + 8 ? '#f59e0b' : '#10b981'
                      return {
                        id: c.id, status, temp, tempColor,
                        sh: result.circuitSuperheatF[i],
                        doors: c.active ? c.doors : undefined,
                        mbh: c.active ? c.designMBH : undefined,
                      }
                    })}
                    doorsOpen={!conceal && activeFaults.doorsOpen}
                    selectedId={schemDetail?.id ?? null}
                    onSelect={setSchemDetail}
                  />
                  </SchematicViewer>
                  {schemDetail && <SchematicInfoCard detail={schemDetail} onClose={() => setSchemDetail(null)} />}
                </div>
              )}
            </div>
          )
        })()}

        {/* Reading trends */}
        <TrendsCard specs={trendSpecs} history={trendHistory} />

        {/* Context sliders — Ambient + Time of day */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 space-y-3">
          <div className="flex items-center gap-4">
            <Wind size={15} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">Ambient / OAT</span>
              <input type="range" min={-20} max={110} value={ambient}
                onChange={e => setAmbient(Number(e.target.value))}
                className="flex-1 accent-blue-600" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-14 text-right">
                {ambient} °F
              </span>
            </div>
            {result.hpCtrlActive && (
              <span className="text-xs text-amber-600 dark:text-amber-400 flex-shrink-0">HP ctrl active</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Clock size={15} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">Time of day</span>
              <input type="range" min={0} max={23} value={timeOfDay}
                onChange={e => setTimeOfDay(Number(e.target.value))}
                className="flex-1 accent-violet-600" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 w-14 text-right">
                {formatHour(timeOfDay)}
              </span>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 text-right">
              {period.label} · {period.mult.toFixed(2)}×
            </span>
          </div>
        </div>

        {/* Rack settings — adjustable controller setpoints */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <button onClick={() => setSettingsOpen(v => !v)} className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
            <SlidersHorizontal size={14} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Rack Settings</span>
            <span className="text-[10px] text-slate-400 ml-1 truncate">{opSST}°F SST · HP floor {hpMin}°F</span>
            <span className={`ml-auto text-slate-400 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {settingsOpen && (
            <div className="px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-700">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Operating SST setpoint</span>
                  <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">{opSST}°F · {dewPsig(opSST).toFixed(1)} psig</span>
                </div>
                <input type="range" min={-30} max={-10} step={1} value={opSST}
                  onChange={e => setOpSST(Number(e.target.value))} className="w-full accent-emerald-500" />
                <p className="text-[9px] text-slate-400 mt-0.5">Design −25°F · default −21°F. Lower SST = colder cases but higher compression ratio.</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">HP control floor</span>
                  <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">{hpMin}°F · {bubblePsig(hpMin).toFixed(0)} psig</span>
                </div>
                <input type="range" min={70} max={95} step={1} value={hpMin}
                  onChange={e => setHpMin(Number(e.target.value))} className="w-full accent-amber-500" />
                <p className="text-[9px] text-slate-400 mt-0.5">Minimum condensing the controller holds. Default 80°F — fans cycle to maintain this floor.</p>
              </div>
              <div className="sm:col-span-2">
                <button onClick={() => { setOpSST(OPERATING_SST); setHpMin(HP_CTRL_MIN) }}
                  className="text-[10px] text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-2">Reset to defaults</button>
              </div>
            </div>
          )}
        </div>

        {/* Alarms */}
        {result.alarms.length > 0 && (
          <div className="space-y-1.5">
            {result.alarms.map((alarm, i) => (
              <div key={i} className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 border ${
                alarm.severity === 'CRITICAL'
                  ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                  : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'}`}>
                {alarm.severity === 'CRITICAL'
                  ? <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  : <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-bold mr-2 ${alarm.severity === 'CRITICAL' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                    [{alarm.code}]
                  </span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">{alarm.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {result.alarms.length === 0 && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-3 py-2.5">
            <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">System normal — all parameters within limits.</p>
          </div>
        )}

        {/* Compressor bank */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Compressor Bank — Protocol Sequencing
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              result.stagingStatus === 'All offline'
                ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                : result.stagingStatus.startsWith('Stage-on') || result.stagingStatus.startsWith('Stage-off')
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
              {result.stagingStatus}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {COMP_SPECS.map((comp, i) => {
              const status = result.compStatus[i]
              const amps   = result.compAmps[i]
              const isC1   = i === 0
              const cardCls = status === 'TRIPPED'
                ? 'bg-red-50 dark:bg-red-500/5 border-red-300 dark:border-red-500/40'
                : status === 'STANDBY'
                ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 opacity-70'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              return (
                <div key={comp.id} className={`rounded-xl border p-3 transition-all ${cardCls}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{comp.id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${GROUP_COLOR[comp.group]}`}>
                      {comp.group}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mb-1.5">{comp.model}</p>
                  {status === 'RUNNING' && (
                    <>
                      <div className="flex items-center gap-1 mb-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {amps.toFixed(1)} A
                        </span>
                      </div>
                      {isC1 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-0.5">
                          {Math.round(result.c1Modulation * 100)}% mod
                        </p>
                      )}
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        DT: {Math.round(result.dischargeTemp)} °F
                      </p>
                    </>
                  )}
                  {status === 'STANDBY' && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">STANDBY</span>
                    </div>
                  )}
                  {status === 'TRIPPED' && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">TRIPPED</span>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{comp.designMBH} MBH</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Circuit grid */}
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
            Remote Header A — Circuits
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {CIRCUITS.map((c, i) => {
              const rawStatus = result.circuitStatuses[i]
              // During a scenario, fault-name labels would give the answer away —
              // show plain readings (temp + SH) and let the tech work it out.
              const status   = inScenario && rawStatus !== 'SPARE' ? 'OK' : rawStatus
              const caseTemp = result.circuitCaseTemps[i]
              const sh       = result.circuitSuperheatF[i]
              const warnF    = c.caseTargetF + 8
              const critF    = c.caseTargetF + 15
              const isWarm   = c.active && caseTemp >= critF
              const isWarn   = c.active && caseTemp >= warnF && caseTemp < critF
              const shHigh   = !isNaN(sh) && sh >= 20
              const shCrit   = !isNaN(sh) && sh >= 35
              const shLow    = !isNaN(sh) && sh <= 5

              const borderCls = !c.active
                ? 'border-slate-100 dark:border-slate-700/50'
                : status === 'DEF_STUCK' ? 'border-amber-300 dark:border-amber-500/40'
                : status === 'TXV_FAIL' || status === 'DRIER' ? 'border-orange-300 dark:border-orange-500/40'
                : status === 'ICED' || status === 'FAN_OUT' ? 'border-cyan-300 dark:border-cyan-500/40'
                : status === 'OVERFEED' ? 'border-violet-300 dark:border-violet-500/40'
                : isWarm ? 'border-red-300 dark:border-red-500/40'
                : isWarn ? 'border-amber-200 dark:border-amber-500/30'
                : 'border-slate-200 dark:border-slate-700'

              const bgCls = !c.active
                ? 'bg-slate-50 dark:bg-slate-800/50'
                : status === 'DEF_STUCK' ? 'bg-amber-50 dark:bg-amber-500/5'
                : status === 'TXV_FAIL' || status === 'DRIER' ? 'bg-orange-50 dark:bg-orange-500/5'
                : status === 'ICED' || status === 'FAN_OUT' ? 'bg-cyan-50 dark:bg-cyan-500/5'
                : status === 'OVERFEED' ? 'bg-violet-50 dark:bg-violet-500/5'
                : isWarm ? 'bg-red-50 dark:bg-red-500/5'
                : 'bg-white dark:bg-slate-800'

              const faultLabel: Record<string, string> = {
                DEF_STUCK: 'HG defrost stuck',
                TXV_FAIL:  'TXV not feeding',
                DRIER:     'case drier plugged',
                ICED:      'coil iced solid',
                FAN_OUT:   'evap fans out',
                OVERFEED:  'TXV overfeeding',
              }
              const faultLabelCls: Record<string, string> = {
                DEF_STUCK: 'text-amber-600 dark:text-amber-400',
                TXV_FAIL:  'text-orange-600 dark:text-orange-400',
                DRIER:     'text-orange-600 dark:text-orange-400',
                ICED:      'text-cyan-700 dark:text-cyan-400',
                FAN_OUT:   'text-cyan-700 dark:text-cyan-400',
                OVERFEED:  'text-violet-600 dark:text-violet-400',
              }

              return (
                <div key={c.id} className={`rounded-xl border p-2.5 transition-all ${bgCls} ${borderCls}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{c.id}</span>
                    {c.active && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${MFR_COLOR[c.mfr]}`}>
                        {c.mfr}
                      </span>
                    )}
                    {!c.active && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">spare</span>
                    )}
                  </div>
                  {c.active ? (
                    <>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{c.doors} doors ({c.doorConfig})</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{c.designMBH.toFixed(2)} MBH</p>
                      {status !== 'OK' && status !== 'SPARE' && (
                        <p className={`text-xs font-semibold ${faultLabelCls[status]}`}>{faultLabel[status]}</p>
                      )}
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isWarm ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <span className={`text-xs font-medium ${isWarm ? 'text-red-600 dark:text-red-400' : isWarn ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {caseTemp.toFixed(0)} °F
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${
                        shCrit ? 'text-red-600 dark:text-red-400 font-semibold' :
                        shHigh ? 'text-amber-600 dark:text-amber-400' :
                        shLow  ? 'text-violet-600 dark:text-violet-400 font-medium' :
                        'text-slate-400 dark:text-slate-500'}`}>
                        SH: {isNaN(sh) ? '—' : `${sh.toFixed(0)} °F`}{shLow ? ' ↓' : shCrit ? ' ↑' : ''}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500">Capped off</p>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 px-1">
            A1/A6–A8: Hillphoenix ORZ · −15 °F evap · HG defrost 1×/day · 15 min failsafe &nbsp;|&nbsp;
            A2–A5/A9: Arneg Brema · −20 °F evap · HG defrost 2×/day · 15 min failsafe
          </p>
        </div>

        {/* Bottom tab panel */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            {(['faults', 'scenarios', 'field', 'info'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                {tab === 'faults'
                  ? (inScenario ? '🎯 Your Diagnosis' : `Fault Injection${activeFaultCount > 0 ? ` (${activeFaultCount})` : ''}`)
                  : tab === 'scenarios' ? 'Scenarios' : tab === 'field' ? '📋 Field Readings' : 'Rack Info'}
              </button>
            ))}
          </div>

          {/* Faults panel — free-play fault injection, or diagnosis sheet in a scenario */}
          {activeTab === 'faults' && (
            <div className="p-4">
              {inScenario && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex-1 min-w-[180px]">
                    Mark the root cause(s) you think are active, then submit. The readings above are driven by the hidden fault.
                  </p>
                  {!submitted && (
                    <button onClick={submitDiagnosis}
                      className="px-3 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex-shrink-0">
                      Submit Diagnosis
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-1 flex-wrap mb-4">
                {FAULT_GROUPS.map(g => {
                  const active = activeGroup === g
                  const count  = FAULT_DEFS.filter(d => d.group === g && guessState[d.key]).length
                  return (
                    <button key={g} onClick={() => setActiveGroup(g)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                      {g}{count > 0 && <span className={`ml-1 font-bold ${active ? 'text-blue-200' : (inScenario ? 'text-blue-500' : 'text-red-500')}`}>({count})</span>}
                    </button>
                  )
                })}
              </div>
              <div className="space-y-2">
                {FAULT_DEFS.filter(d => d.group === activeGroup).map(def => {
                  const checked  = guessState[def.key]
                  const disabled = inScenario && submitted
                  // Free play uses red (injecting a fault); diagnosis uses blue (marking a guess)
                  const onCls = inScenario
                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40'
                    : 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/40'
                  const textCls = checked
                    ? (inScenario ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-400')
                    : 'text-slate-700 dark:text-slate-200'
                  return (
                    <label key={def.key}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'} ${
                        checked ? onCls : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                      <input type="checkbox" checked={checked} disabled={disabled}
                        onChange={() => toggleFault(def.key)}
                        className={`mt-0.5 flex-shrink-0 ${inScenario ? 'accent-blue-600' : 'accent-red-500'}`} />
                      <div>
                        <p className={`text-sm font-medium ${textCls}`}>{def.label}</p>
                        {/* Hide the diagnostic hint while diagnosing — that would give the answer away */}
                        {!inScenario && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{def.hint}</p>}
                      </div>
                    </label>
                  )
                })}
              </div>

              {/* Instructor reveal — free-play only */}
              {!inScenario && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
                        <Eye size={13} className="text-slate-400" /> Instructor mode
                      </p>
                      <p className="text-[10px] text-slate-500">Reveal active faults + expected effects after a trainee gives their diagnosis</p>
                    </div>
                    <button onClick={() => setInstructorReveal(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${instructorReveal ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                      {instructorReveal ? <><EyeOff size={12}/> Hide faults</> : <><Eye size={12}/> Reveal faults</>}
                    </button>
                  </div>
                  {instructorReveal && (
                    <div className="mt-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Active faults · OAT {ambient}°F · {formatHour(timeOfDay)}</p>
                      {activeFaultCount === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">No faults active — system in normal operation</p>
                      ) : (
                        <div className="space-y-1.5">
                          {FAULT_DEFS.filter(d => faults[d.key]).map(d => (
                            <div key={d.key} className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
                              <AlertTriangle size={11} className="flex-shrink-0 mt-0.5 text-blue-500" />
                              <div><span className="font-medium">{d.label}</span><span className="text-blue-600/70 dark:text-blue-400/60 ml-1.5">— {d.hint}</span></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Field readings analyzer */}
          {activeTab === 'field' && (
            <div className="p-4">
              <FieldReadingsPanel
                fields={FIELD_DEFS}
                values={fieldReadings}
                onChange={updateField}
                onClear={() => setFieldReadings(FIELD_EMPTY)}
                derived={fieldAnalysis.derived}
                findings={fieldAnalysis.findings}
                footnote={`Analysis uses operating setpoint ${opSST}°F SST (${dewPsig(opSST).toFixed(1)} psig) — adjust in Rack Settings. R-448A PT data.`}
                intro="Enter what you measure at the rack — leave blanks for values you haven’t taken. The analyzer computes superheat, subcooling, approach ΔT and compression ratio, then flags likely issues."
              />
            </div>
          )}

          {/* Scenarios panel */}
          {activeTab === 'scenarios' && (
            <div className="p-4 space-y-3">
              <button onClick={() => loadScenario(generateMystery())}
                className="w-full text-left rounded-xl p-4 bg-violet-600 hover:bg-violet-700 text-white transition-colors">
                <div className="flex items-center gap-2 mb-0.5">
                  <Dices size={15} className="flex-shrink-0" />
                  <p className="text-sm font-semibold">Mystery Fault</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-white/20">Random</span>
                </div>
                <p className="text-xs text-violet-100">1–2 random hidden faults, random weather and time of day. Infinite replays — every call is a fresh diagnosis.</p>
              </button>
              {SCENARIOS.map(s => (
                <div key={s.id}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${
                    activeScenario?.id === s.id
                      ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-300 dark:border-violet-500/40'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                  onClick={() => loadScenario(s)}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.difficulty === 'Beginner'     ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                      s.difficulty === 'Intermediate' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                      'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                      {s.difficulty}
                    </span>
                    {s.ambient !== undefined && (
                      <span className="text-xs text-slate-400">OAT {s.ambient} °F</span>
                    )}
                    {s.timeOfDay !== undefined && (
                      <span className="text-xs text-slate-400">{formatHour(s.timeOfDay)}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Rack info panel */}
          {activeTab === 'info' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rack specs */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Rack Specifications</p>
                  <div className="space-y-1">
                    {[
                      ['Refrigerant', 'R-448A (HFO blend, ~10–15 °F glide)'],
                      ['Rack Type', 'Hussmann Protocol (EVI scroll sequencing)'],
                      ['Application', 'LT Frozen Food — all circuits'],
                      ['Design SST', '−25 °F (6.8 psig DEW)'],
                      ['Operating SST', '−21 °F (9.0 psig DEW)'],
                      ['Voltage', '575V / 3-phase / 60 Hz'],
                      ['MCA', '49.4 A'],
                      ['MOPD', '60 A'],
                      ['Design load', '132.70 MBH (incl. 3 spare circuits)'],
                      ['Active load', '105.70 MBH (9 circuits)'],
                      ['Demand cooling', 'Required — all 6 EVI scrolls'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex gap-2 text-xs">
                        <span className="text-slate-500 dark:text-slate-400 w-32 flex-shrink-0">{label}</span>
                        <span className="text-slate-700 dark:text-slate-200">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* R-448A glide explainer */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">R-448A Temperature Glide</p>
                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-3 mb-3">
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                      R-448A has a ~10–15 °F temperature glide. Bubble point ≠ dew point at the same pressure —
                      the gauge reads the same either way, but the saturation temperatures differ.
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-300">At −21 °F SST (operating setpoint):</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">• Suction gauge reads DEW side: {dewPsig(-21).toFixed(1)} psig</p>
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mt-1">At design condensing (~109 °F):</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">• Discharge gauge reads BUBBLE: {bubblePsig(109).toFixed(0)} psig</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">• DEW equivalent at same pressure: {dewTempFrom(bubblePsig(109)).toFixed(1)} °F</p>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Digital Scroll — C1 ZFD25KVE</p>
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      The Lead compressor (C1) is a <strong>digital/dual EVI scroll</strong> that modulates capacity
                      from 10–100% by rapidly cycling the scroll unloader solenoid. The Protocol controller uses
                      C1 to continuously trim system capacity before staging Lag units on or off.
                      This keeps SST stable and minimises compressor cycling.
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                      Amps scale approximately linearly with modulation (40% at min → 100% at full load).
                    </p>
                  </div>
                </div>
              </div>

              {/* Compressor groups */}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Compressor Groups</p>
                <div className="space-y-1.5">
                  {[
                    { group: 'Lead — modulates first, off last', comps: 'C1 — ZFD25KVE (digital EVI)', mbh: '10–30.0 MBH', note: '10–100% modulation range' },
                    { group: 'Lag-1 — on 2nd, off 2nd', comps: 'C2/C3 — ZF25KVE × 2', mbh: '23.5 MBH each', note: 'Staged on sequentially' },
                    { group: 'Lag-2 — on 3rd, off 1st', comps: 'C4/C5/C6 — ZF18KVE × 3', mbh: '18.6 MBH each', note: 'Staged on sequentially' },
                  ].map(r => (
                    <div key={r.group} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{r.group}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{r.comps} · {r.mbh} · {r.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time-of-day load curve */}
              <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 rounded-xl p-3">
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-2">Time-of-Day Load Curve</p>
                <div className="space-y-1">
                  {[
                    ['2 am – 6 am',  'Night setback',    '0.72×', 'Store closed — minimal door infiltration'],
                    ['6 am – 9 am',  'Morning pulldown', '1.10×', 'Store opening — heavy traffic, warm product'],
                    ['9 am – 5 pm',  'Daytime steady',   '1.00×', 'Normal trading — baseline load'],
                    ['5 pm – 9 pm',  'Evening peak',     '1.12×', 'Busiest period — maximum door openings'],
                    ['9 pm – 2 am',  'Late / overnight', '0.83×', 'Store closing — load tapering down'],
                  ].map(([time, label, mult, note]) => (
                    <div key={time} className="flex gap-2 text-xs">
                      <span className="text-violet-500 dark:text-violet-400 w-24 flex-shrink-0">{time}</span>
                      <span className="text-violet-700 dark:text-violet-300 w-32 flex-shrink-0 font-medium">{label}</span>
                      <span className="text-violet-600 dark:text-violet-400 w-10 flex-shrink-0">{mult}</span>
                      <span className="text-slate-500 dark:text-slate-400">{note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Defrost schedule */}
              <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Defrost Schedule (HG — all circuits)</p>
                <div className="space-y-1">
                  {[
                    ['ORZ (A1, A6, A7, A8)', '1× per day · 15 min time-limit failsafe'],
                    ['BREMA (A2, A3, A4, A5, A9)', '2× per day · 15 min time-limit failsafe'],
                    ['Termination (both)', 'Temperature-based (primary) — 15 min cuts over if not terminated'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-2 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 w-44 flex-shrink-0">{label}</span>
                      <span className="text-slate-700 dark:text-slate-200">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Source: Hillphoenix ORZ installation manual · Arneg Brema installation manual
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
