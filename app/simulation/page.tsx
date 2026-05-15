'use client'
export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home, RotateCcw, AlertTriangle, CheckCircle2, XCircle,
  Thermometer, Gauge, Wind, Zap, Activity, Info,
  ChevronUp, MessageSquare, Trophy, Target, Package,
} from 'lucide-react'

// ── Refrigerant saturation P-T data (psia) — manufacturer-sourced ────────────
// R-404A: Arkema/Forane data via learnmetrics.com (liquid bubble + vapor dew columns)
// R-448A: Honeywell Solstice N40 / Opteon XP40 data via learnmetrics.com
//         Values 105–120 °F interpolated (source data corrupted in that range)
// R-407A: National Refrigerants 7th Ed. Reference Guide + igasusa.com
// All values in psia = psig + 14.696.
// BUBBLE = liquid / saturated-liquid point → use for condensing / high side
// DEW    = vapor  / saturated-vapor  point → use for evaporating / suction side

const R404A_BUBBLE: [number, number][] = [
  [-40, 19.6], [-35, 22.2], [-30, 25.0], [-25, 28.1], [-20, 31.5],
  [-15, 35.2], [-10, 39.3], [-5,  43.6], [0,   48.4], [5,   53.5],
  [10,  59.0], [15,  64.9], [20,  71.3], [25,  78.1], [30,  85.4],
  [35,  93.3], [40, 101.6], [45, 110.5], [50, 120.0], [55, 130.0],
  [60, 140.7], [65, 152.0], [70, 164.0], [75, 176.7], [80, 190.1],
  [85, 204.2], [90, 219.2], [95, 234.9], [100,251.5], [105,268.9],
  [110,287.2], [115,306.5], [120,326.8], [125,348.0], [130,370.4],
  [135,393.8], [140,418.4], [145,444.3], [150,471.5],
]
const R404A_DEW: [number, number][] = [
  [-40, 19.0], [-35, 21.5], [-30, 24.3], [-25, 27.4], [-20, 30.7],
  [-15, 34.4], [-10, 38.3], [-5,  42.6], [0,   47.3], [5,   52.4],
  [10,  57.8], [15,  63.7], [20,  70.0], [25,  76.8], [30,  84.0],
  [35,  91.8], [40, 100.1], [45, 108.9], [50, 118.3], [55, 128.3],
  [60, 138.9], [65, 150.2], [70, 162.1], [75, 174.8], [80, 188.1],
  [85, 202.2], [90, 217.1], [95, 232.8], [100,248.9], [105,266.8],
  [110,285.1], [115,304.3], [120,324.6], [125,345.9], [130,368.2],
  [135,391.7], [140,416.4], [145,442.4], [150,469.8],
]

// R-448A has significant temperature glide (~10–15 °F / 10–15 psig at operating conditions)
const R448A_BUBBLE: [number, number][] = [
  [-40, 19.4], [-35, 22.0], [-30, 24.9], [-25, 28.0], [-20, 31.4],
  [-15, 35.1], [-10, 39.2], [-5,  43.6], [0,   48.4], [5,   53.6],
  [10,  59.2], [15,  65.3], [20,  71.8], [25,  78.7], [30,  86.2],
  [35,  94.2], [40, 102.7], [45, 111.8], [50, 121.5], [55, 131.8],
  [60, 142.7], [65, 154.3], [70, 166.6], [75, 179.6], [80, 193.3],
  [85, 207.8], [90, 223.1], [95, 239.1], [100,256.0], [105,275.7],
  [110,295.7], [115,314.7], [120,334.7], [125,354.1], [130,376.7],
  [135,400.2], [140,424.9], [145,450.6], [150,477.5],
]
const R448A_DEW: [number, number][] = [
  [-40, 14.7], [-35, 16.6], [-30, 18.9], [-25, 21.5], [-20, 24.3],
  [-15, 27.4], [-10, 30.8], [-5,  34.5], [0,   38.6], [5,   43.0],
  [10,  47.8], [15,  53.1], [20,  58.7], [25,  64.8], [30,  71.3],
  [35,  78.4], [40,  85.9], [45,  94.0], [50, 102.7], [55, 112.0],
  [60, 121.9], [65, 132.4], [70, 143.7], [75, 155.6], [80, 168.3],
  [85, 181.7], [90, 195.9], [95, 211.0], [100,227.0], [105,245.7],
  [110,264.7], [115,283.7], [120,302.7], [125,321.2], [130,343.2],
  [135,366.5], [140,391.0], [145,416.8], [150,444.1],
]

// R-407A has significant temperature glide (~8–13 °F / 8–12 psig at operating conditions)
const R407A_BUBBLE: [number, number][] = [
  [-40, 18.6], [-35, 21.1], [-30, 23.9], [-25, 26.9], [-20, 30.3],
  [-15, 33.9], [-10, 37.9], [-5,  42.2], [0,   46.9], [5,   52.0],
  [10,  57.5], [15,  63.4], [20,  69.8], [25,  76.7], [30,  84.0],
  [35,  91.9], [40, 100.3], [45, 109.3], [50, 118.7], [55, 128.7],
  [60, 139.7], [65, 151.7], [70, 163.7], [75, 176.7], [80, 189.7],
  [85, 204.7], [90, 219.7], [95, 235.7], [100,252.7], [105,269.7],
  [110,288.7], [115,307.7], [120,328.7], [125,349.7], [130,372.7],
  [135,396.7], [140,420.7], [145,446.6], [150,473.6],
]
const R407A_DEW: [number, number][] = [
  [-40, 14.2], [-35, 15.7], [-30, 18.0], [-25, 20.5], [-20, 23.2],
  [-15, 26.2], [-10, 29.6], [-5,  33.2], [0,   37.2], [5,   41.6],
  [10,  46.3], [15,  51.4], [20,  57.0], [25,  63.0], [30,  69.5],
  [35,  76.5], [40,  84.1], [45,  92.1], [50, 100.8], [55, 110.0],
  [60, 119.7], [65, 130.7], [70, 141.7], [75, 153.7], [80, 166.7],
  [85, 179.7], [90, 193.7], [95, 208.7], [100,224.7], [105,241.7],
  [110,259.7], [115,278.7], [120,298.7], [125,319.7], [130,341.7],
  [135,364.7], [140,389.7], [145,415.7], [150,443.0],
]

type Refrigerant = 'R-404A' | 'R-448A' | 'R-407A'

interface PTData {
  /** Bubble (liquid / saturated-liquid) pressure in psia — use for condensing / high side */
  bubble: [number, number][]
  /** Dew (vapor / saturated-vapor) pressure in psia — use for evaporating / suction side */
  dew: [number, number][]
}
// Keep alias so existing function signatures compile unchanged
type PTTable = PTData

const PT_TABLES: Record<Refrigerant, PTData> = {
  'R-404A': { bubble: R404A_BUBBLE, dew: R404A_DEW },
  'R-448A': { bubble: R448A_BUBBLE, dew: R448A_DEW },
  'R-407A': { bubble: R407A_BUBBLE, dew: R407A_DEW },
}

// Default rack set points per refrigerant (psig) — correct values for 20 °F MT SST,
// −20 °F LT SST, and 85 °F condensing sat temp HP control floor
const REFRIGERANT_DEFAULTS: Record<Refrigerant, { hpCtrlPsig: number; mtSuctionPsig: number; ltSuctionPsig: number }> = {
  'R-404A': { hpCtrlPsig: 190, mtSuctionPsig: 55, ltSuctionPsig: 16 },
  'R-448A': { hpCtrlPsig: 193, mtSuctionPsig: 44, ltSuctionPsig: 10 },
  'R-407A': { hpCtrlPsig: 190, mtSuctionPsig: 42, ltSuctionPsig:  9 },
}

const SLIDER_RANGES: Record<Refrigerant, { hp: [number, number]; mt: [number, number]; lt: [number, number, number] }> = {
  'R-404A': { hp: [160, 315], mt: [30, 80], lt: [5, 22, 1] },
  'R-448A': { hp: [155, 315], mt: [20, 65], lt: [1, 15, 1] },
  'R-407A': { hp: [155, 310], mt: [18, 62], lt: [1, 14, 1] },
}

// ── P-T interpolation helpers ──────────────────────────────────────────────────
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

/** Evaporating sat temp → psia (dew / suction side) */
function ptDew(tempF: number, pt: PTData): number { return ptInterp(tempF, pt.dew) }
/** Condensing sat temp → psia (bubble / high side) */
function ptBubble(tempF: number, pt: PTData): number { return ptInterp(tempF, pt.bubble) }
/** Suction psig → evaporating sat temp (dew side) */
function ptDewReverse(psig: number, pt: PTData): number { return ptInterpReverse(psig, pt.dew) }
/** High-side psig → condensing sat temp (bubble side) */
function ptBubbleReverse(psig: number, pt: PTData): number { return ptInterpReverse(psig, pt.bubble) }

const toGauge = (psia: number) => Math.max(psia - 14.696, 0)

// Legacy aliases — most suction-side callers can keep using these unchanged;
// condensing-side callers have been updated to ptBubble / ptBubbleReverse explicitly.
function ptLookup(tempF: number, pt: PTData = PT_TABLES['R-404A']): number { return ptDew(tempF, pt) }
function ptReverse(psig: number, pt: PTData = PT_TABLES['R-404A']): number { return ptDewReverse(psig, pt) }

// ── Fault types ───────────────────────────────────────────────────────────────
// NOTE: 'highAmbient' removed — OAT is now a continuous slider, not a fault toggle.
type FaultKey =
  | 'poorVentilation'
  | 'dirtyCondenser' | 'fan1Failed' | 'fan2Failed'
  | 'underchargeModerate' | 'underchargeSevere' | 'overcharge'
  | 'filterDrierRestricted'
  | 'comp1Failed' | 'comp2Failed' | 'comp3Failed' | 'comp4Failed'
  | 'txvNotFeeding' | 'defrostStuckOn'
  | 'oilLow' | 'nonCondensables'
  | 'ltComp1Failed' | 'ltComp2Failed'
  | 'ltTxvNotFeeding' | 'ltDefrostStuckOn'
  | 'liquidLineRestriction'
  | 'comp1ValveWorn'

type FaultState = Record<FaultKey, boolean>

const INITIAL_FAULTS: FaultState = {
  poorVentilation: false,
  dirtyCondenser: false, fan1Failed: false, fan2Failed: false,
  underchargeModerate: false, underchargeSevere: false, overcharge: false,
  filterDrierRestricted: false,
  comp1Failed: false, comp2Failed: false, comp3Failed: false, comp4Failed: false,
  txvNotFeeding: false, defrostStuckOn: false,
  oilLow: false, nonCondensables: false,
  ltComp1Failed: false, ltComp2Failed: false,
  ltTxvNotFeeding: false, ltDefrostStuckOn: false,
  liquidLineRestriction: false,
  comp1ValveWorn: false,
}

interface FaultDef {
  key: FaultKey; label: string; hint: string; group: string
  mutuallyExcludes?: FaultKey[]
}

const FAULT_DEFS: FaultDef[] = [
  { key: 'poorVentilation',     label: 'Poor machine room vent',        hint: 'Hot machine room heats compressors — discharge temp rises',  group: 'Machine Room' },
  { key: 'dirtyCondenser',      label: 'Dirty condenser coil',          hint: 'Fouled fins raise approach ΔT by ~14 °F',                    group: 'Condenser' },
  { key: 'fan1Failed',          label: 'Condenser fan #1 failed',       hint: 'Loses ~50 % airflow — head pressure rises',                  group: 'Condenser' },
  { key: 'fan2Failed',          label: 'Condenser fan #2 failed',       hint: 'Both fans out: severe head pressure rise',                   group: 'Condenser' },
  { key: 'underchargeModerate', label: 'Undercharge (moderate ~15 %)',  hint: 'Low suction, high SH, subcooling drops',                     group: 'Charge', mutuallyExcludes: ['underchargeSevere', 'overcharge'] },
  { key: 'underchargeSevere',   label: 'Undercharge (severe ~30 %)',    hint: 'Very high SH, near-zero SC, flash gas in sight glass',       group: 'Charge', mutuallyExcludes: ['underchargeModerate', 'overcharge'] },
  { key: 'overcharge',          label: 'Overcharge (~15 %)',             hint: 'High head, very high SC, low SH, flood-back risk',           group: 'Charge', mutuallyExcludes: ['underchargeModerate', 'underchargeSevere'] },
  { key: 'filterDrierRestricted', label: 'Filter drier restricted',     hint: 'Temp drop across drier, starved TXVs, high SH',              group: 'Liquid line' },
  { key: 'liquidLineRestriction', label: 'Liquid line restriction (upstream)', hint: 'Partial blockage before filter drier — high SH, but drier ΔT is normal; restriction is elsewhere in liquid main', group: 'Liquid line' },
  { key: 'comp1Failed',         label: 'Compressor 1 failed',           hint: 'Off on safety — remaining 3 carry the load',                 group: 'Compressors' },
  { key: 'comp2Failed',         label: 'Compressor 2 failed',           hint: 'Off on safety — remaining carry the load',                   group: 'Compressors' },
  { key: 'comp3Failed',         label: 'Compressor 3 failed',           hint: 'Off on safety — remaining carry the load',                   group: 'Compressors' },
  { key: 'comp4Failed',         label: 'Compressor 4 failed',           hint: 'Off on safety — remaining carry the load',                   group: 'Compressors' },
  { key: 'comp1ValveWorn', label: 'Comp 1 — worn valves (bypassing)', hint: 'Internal bypass — comp still runs, amps look near-normal, but capacity is reduced ~35%; hard to find without individual analysis', group: 'Compressors' },
  { key: 'txvNotFeeding',       label: 'MT TXV not feeding',            hint: 'Cases starved — suction drops, high SH, rising case temps',  group: 'MT Load' },
  { key: 'defrostStuckOn',      label: 'MT defrost stuck on',           hint: 'Circuit won\'t terminate — suction rises, case warms',       group: 'MT Load' },
  { key: 'ltComp1Failed',       label: 'LT Booster #1 failed',          hint: 'One LT booster off — suction rises, cases warm',             group: 'LT Booster' },
  { key: 'ltComp2Failed',       label: 'LT Booster #2 failed',          hint: 'Both LT boosters out — severe LT case warming',              group: 'LT Booster' },
  { key: 'ltTxvNotFeeding',     label: 'LT TXV not feeding',            hint: 'LT cases starved — very low suction, high SH',               group: 'LT Booster' },
  { key: 'ltDefrostStuckOn',    label: 'LT defrost stuck on',           hint: 'LT circuit won\'t terminate — frozen food warming fast',     group: 'LT Booster' },
  { key: 'oilLow',              label: 'Low oil (Y825 fault)',           hint: 'Oil differential below 10 psi — OFC will trip compressor',   group: 'Oil / Misc' },
  { key: 'nonCondensables',     label: 'Non-condensables',               hint: 'Air in system — head elevated beyond PT relationship',       group: 'Oil / Misc' },
]

const FAULT_GROUPS = ['Machine Room', 'Condenser', 'Charge', 'Liquid line', 'Compressors', 'MT Load', 'LT Booster', 'Oil / Misc']

// ── Baselines & safety limits ─────────────────────────────────────────────────
const BASELINE = {
  suctionSatTemp:     20,   // °F SST — MT setpoint
  superheat:          20,   // °F total rack suction superheat
  subcooling:         15,   // °F
  dischargeSuperheat: 75,   // °F above condensing sat temp
  oilDiff:            22,   // psi — Y825 valve normal 20–25 psi
  caseTemp:           36,   // °F average MT case temperature
  baseAmps:           21,   // A per compressor (460 V / 3 Ph)
}
// Head pressure control: minimum condensing sat temp (models HP control valve/fan cycling)
// Hussmann standard HPC setpoint: 85 °F sat ≈ 146 psig (commonly displayed as ~165 psig on older gauges)
// Activates whenever OAT + approach would fall below this floor (typically OAT < 70 °F on a clean rack)
const HP_CTRL_MIN_COND_SAT = 85  // °F sat ≈ 190 psig (R-404A bubble) / 193 psig (R-448A) / 190 psig (R-407A)

const SAFETY = {
  hpcoPsig:        400,
  hpcoWarnPsig:    355,
  lpcoPsig:         14,
  lpcoWarnPsig:     22,
  highDischargeF:  225,
  warnDischargeF:  210,
  oilTripDiff:      10,
  oilWarnDiff:      18,
}

const LT_BASELINE = {
  suctionSatTemp: -20,  // °F SST — typical LT frozen food
  superheat:       15,
  caseTemp:        -5,  // °F target
  baseAmps:        15,
}

const LT_SAFETY = {
  lpcoPsig:     5.0,   // ≈ −38 °F SST on R-404A dew — deep restriction / severe fault
  lpcoWarnPsig: 9.0,   // ≈ −29 °F SST on R-404A dew — trips on ltTxvNotFeeding (−32 °F → 8.5 psig)
  highCaseTemp: 10,
  warnCaseTemp:  5,
  highSH:       30,
}

// ── Store load profile ────────────────────────────────────────────────────────
interface CaseSection {
  name: string; equipment: string; count: number
  setpoint: number        // °F target
  sensitivity: number     // how quickly it tracks aggregate rack deviation
  warnTemp: number        // °F — customer concern
  criticalTemp: number    // °F — food safety threshold
  circuit: 'MT' | 'LT'
}

const STORE_LINEUP: CaseSection[] = [
  // ── MT Circuit ────────────────────────────────────────────────────────────
  { name: 'Produce',          equipment: 'Multideck Cases',        count: 1,  setpoint: 38, sensitivity: 1.3, warnTemp: 41, criticalTemp: 45, circuit: 'MT' },
  { name: 'Dairy',            equipment: 'Reach-In Cases',         count: 1,  setpoint: 36, sensitivity: 1.0, warnTemp: 40, criticalTemp: 44, circuit: 'MT' },
  { name: 'Cheese',           equipment: 'Island / Multideck',     count: 1,  setpoint: 38, sensitivity: 0.9, warnTemp: 41, criticalTemp: 45, circuit: 'MT' },
  { name: 'Walk-in Coolers',  equipment: 'WIC',                    count: 3,  setpoint: 38, sensitivity: 0.4, warnTemp: 41, criticalTemp: 45, circuit: 'MT' },
  // ── LT Circuit ────────────────────────────────────────────────────────────
  { name: 'Frozen Food',      equipment: 'Hussmann RL-5 Doors',    count: 10, setpoint:  0, sensitivity: 1.1, warnTemp:  5, criticalTemp: 10, circuit: 'LT' },
  { name: 'Walk-in Freezers', equipment: 'WIF',                    count: 3,  setpoint: -5, sensitivity: 0.5, warnTemp:  3, criticalTemp: 10, circuit: 'LT' },
  { name: 'Bunker Cases',     equipment: 'DT Display Tables',      count: 3,  setpoint:  0, sensitivity: 1.4, warnTemp:  5, criticalTemp: 10, circuit: 'LT' },
]

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Alarm { code: string; severity: 'WARNING' | 'CRITICAL'; message: string }

interface SystemState {
  ambient: number
  suctionSatTemp: number; suctionPsig: number; suctionGasTemp: number; suctionSuperheat: number
  condensingTemp: number; dischargePsig: number; dischargeTemp: number; dischargeSuperheat: number
  compressionRatio: number
  liquidTemp: number; subcooling: number; filterDrierDeltaT: number
  oilDiff: number; oilPressurePsig: number
  compRunning: boolean[]; compAmps: number[]
  caseTemp: number; nonCondensables: boolean
  hpCtrlActive: boolean
  approachDelta: number
  fansActive: number; fansCycling: boolean
  liquidLinePsig: number
  expectedDischargePsig: number; dischargeDeviation: number
  alarms: Alarm[]
}

interface LTState {
  suctionSatTemp: number; suctionPsig: number; suctionGasTemp: number; superheat: number
  dischargeSatTemp: number; dischargePsig: number; dischargeTemp: number; compressionRatio: number
  compRunning: boolean[]; compAmps: number[]
  caseTemp: number; alarms: Alarm[]
}

// ── Field Readings diagnostic ─────────────────────────────────────────────────
interface Finding {
  severity: 'critical' | 'warning' | 'info' | 'ok'
  label: string
  measurement: string
  causes: string[]
  checks: string[]
}

const FIELD_EMPTY = {
  oat: '', mtSuctionPsig: '', mtSuctionTemp: '', ltSuctionPsig: '', ltSuctionTemp: '',
  dischargePsig: '', dischargeTemp: '', liquidLineTemp: '',
  drierInTemp: '', drierOutTemp: '', oilDiffPsi: '',
  mtCompsRunning: '', ltCompsRunning: '',
}
type FieldReadings = typeof FIELD_EMPTY

// ── MT compute ────────────────────────────────────────────────────────────────
function computeMT(f: FaultState, oat: number, hpCtrlSatTemp: number, mtSatSetpoint: number, pt: PTTable = PT_TABLES['R-404A']): SystemState {
  // Condenser approach accumulator — starts at 15 °F (clean coil, all fans running)
  let baseApproach       = 15
  let suctionSatTemp     = mtSatSetpoint
  let superheat          = BASELINE.superheat
  let subcooling         = BASELINE.subcooling
  let dischargeSuperheat = BASELINE.dischargeSuperheat
  let oilDiff            = BASELINE.oilDiff
  let caseTemp           = BASELINE.caseTemp
  let ampsMultiplier     = 1.0
  let ncExtraGauge       = 0
  const compRunning      = [true, true, true, true]

  // ── OAT-driven physics ───────────────────────────────────────────────────
  // Low ambient: liquid stacks in condenser → more subcooling; extreme cold → slugging risk
  if (oat < 40) {
    const coldOffset = Math.min(40 - oat, 40)
    subcooling += coldOffset * 0.5          // up to +20 °F SC from liquid migration
  }
  // High ambient: compressor heat soak, increased case infiltration load
  if (oat > 90) {
    const hotOffset = oat - 90
    dischargeSuperheat += hotOffset * 0.4
    ampsMultiplier     *= 1 + hotOffset * 0.004
    caseTemp           += hotOffset * 0.08  // heat infiltration into MT cases
  }

  // ── Machine room ─────────────────────────────────────────────────────────
  if (f.poorVentilation) { dischargeSuperheat += 18; ampsMultiplier *= 1.06 }

  // ── Condenser faults (each adds to approach delta) ───────────────────────
  if (f.dirtyCondenser) { baseApproach += 14; dischargeSuperheat += 8; ampsMultiplier *= 1.07 }
  const fansFailed = (f.fan1Failed ? 1 : 0) + (f.fan2Failed ? 1 : 0)
  if (fansFailed === 1) { baseApproach += 9;  dischargeSuperheat += 6;  ampsMultiplier *= 1.05 }
  if (fansFailed === 2) { baseApproach += 26; dischargeSuperheat += 20; ampsMultiplier *= 1.13 }

  // Head pressure control floor — fans cycle off / HP valve modulates to maintain minimum
  const rawCondensingTemp = oat + baseApproach
  const hpCtrlActive      = rawCondensingTemp < hpCtrlSatTemp
  let condensingSatTemp   = Math.max(rawCondensingTemp, hpCtrlSatTemp)

  // ── Charge faults ─────────────────────────────────────────────────────────
  if (f.underchargeModerate && !f.underchargeSevere) {
    suctionSatTemp -= 8; condensingSatTemp -= 7; superheat += 22; subcooling -= 10; dischargeSuperheat += 18; ampsMultiplier *= 0.94; caseTemp += 4
  }
  if (f.underchargeSevere) {
    suctionSatTemp -= 18; condensingSatTemp -= 12; superheat += 52; subcooling -= 14; dischargeSuperheat += 42; ampsMultiplier *= 0.86; caseTemp += 10
  }
  if (f.overcharge) {
    suctionSatTemp += 6; condensingSatTemp += 20; superheat -= 14; subcooling += 22; dischargeSuperheat -= 18; ampsMultiplier *= 1.10
  }
  if (f.filterDrierRestricted) { suctionSatTemp -= 5; superheat += 12; caseTemp += 3 }

  // ── Compressor faults ─────────────────────────────────────────────────────
  if (f.comp1Failed) compRunning[0] = false
  if (f.comp2Failed) compRunning[1] = false
  if (f.comp3Failed) compRunning[2] = false
  if (f.comp4Failed) compRunning[3] = false
  const runningCount = compRunning.filter(Boolean).length
  const failedCount  = 4 - runningCount
  if (failedCount > 0) {
    suctionSatTemp += failedCount * 4.5; dischargeSuperheat += failedCount * 3; caseTemp += failedCount * 3.5
    if (runningCount > 0) ampsMultiplier *= (4 / runningCount) * 0.90
  }

  // ── Load faults ───────────────────────────────────────────────────────────
  if (f.txvNotFeeding)  { suctionSatTemp -= 12; condensingSatTemp -= 10; superheat += 28; dischargeSuperheat += 22; caseTemp += 8 }
  if (f.defrostStuckOn) { suctionSatTemp += 7; caseTemp += 12; if (superheat > 8) superheat -= 8 }

  // ── Oil / Misc ────────────────────────────────────────────────────────────
  if (f.oilLow)          { oilDiff = 8 }
  if (f.nonCondensables) { ncExtraGauge = 28; dischargeSuperheat += 10; ampsMultiplier *= 1.05 }
  if (f.liquidLineRestriction) {
    // Restriction upstream of drier: cases starve, high SH, low liquid pressure
    // Importantly: filter drier ΔT is NORMAL (restriction is before it)
    suctionSatTemp  -= 8
    superheat       += 18
    subcooling      -= 10
    caseTemp        += 5
    ampsMultiplier  *= 0.95
  }
  if (f.comp1ValveWorn) {
    // Comp 1 still running but bypassing internally — reduced capacity
    suctionSatTemp     += 3
    dischargeSuperheat += 22
    ampsMultiplier     *= 0.97
    caseTemp           += 2.5
  }

  // ── Clamp ─────────────────────────────────────────────────────────────────
  subcooling        = Math.max(subcooling, 0.3)
  superheat         = Math.max(superheat, 0)
  oilDiff           = Math.max(oilDiff, 0)
  condensingSatTemp = Math.max(condensingSatTemp, suctionSatTemp + 20)

  // ── Derived values ────────────────────────────────────────────────────────
  const suctionPsia       = ptDew(suctionSatTemp, pt)       // suction reads dew-point pressure
  const dischargePsia     = ptBubble(condensingSatTemp, pt)  // high side reads bubble-point pressure
  const suctionPsig       = Math.max(toGauge(suctionPsia), 0.1)
  const dischargePsig     = toGauge(dischargePsia) + ncExtraGauge
  const compressionRatio  = (dischargePsig + 14.696) / (suctionPsig + 14.696)
  const suctionGasTemp    = suctionSatTemp + superheat
  const liquidTemp        = condensingSatTemp - subcooling
  const dischargeTemp     = condensingSatTemp + dischargeSuperheat
  const filterDrierDeltaT     = f.filterDrierRestricted ? 9 : 0
  const oilPressurePsig       = suctionPsig + oilDiff
  const compAmps              = compRunning.map(r => r ? Math.round(BASELINE.baseAmps * ampsMultiplier * 10) / 10 : 0)

  // Approach ΔT — how far condensing sat temp is above OAT (clean rack baseline = 15 °F)
  const approachDelta         = condensingSatTemp - oat

  // Fan staging — when HP ctrl is active, fans cycle to hold head pressure
  const fansRunning           = 4 - fansFailed
  const fansCycling           = hpCtrlActive && fansFailed === 0
  const fansActive            = fansCycling ? Math.max(1, Math.round(fansRunning * Math.min(1, oat / (hpCtrlSatTemp - 10)))) : fansRunning

  // Liquid line pressure — discharge minus nominal ~8 psig line loss to cases
  const liquidLinePsig        = Math.max(dischargePsig - 8, 0)

  // Expected discharge at this OAT on a clean, healthy rack (condensing side → bubble)
  const expectedDischargePsig = toGauge(ptBubble(Math.max(oat + 15, hpCtrlSatTemp), pt))
  const dischargeDeviation    = dischargePsig - expectedDischargePsig

  // ── Alarms ────────────────────────────────────────────────────────────────
  const alarms: Alarm[] = []
  if (dischargePsig >= SAFETY.hpcoPsig)
    alarms.push({ code: 'HPCO',      severity: 'CRITICAL', message: `High Pressure Cutout — ${Math.round(dischargePsig)} psig (limit ${SAFETY.hpcoPsig} psig). All compressors tripped.` })
  else if (dischargePsig >= SAFETY.hpcoWarnPsig)
    alarms.push({ code: 'HP-HIGH',   severity: 'WARNING',  message: `High discharge pressure — ${Math.round(dischargePsig)} psig (approaching ${SAFETY.hpcoPsig} psig HPCO)` })
  if (suctionPsig <= SAFETY.lpcoPsig)
    alarms.push({ code: 'LPCO',      severity: 'CRITICAL', message: `Low Pressure Cutout — ${suctionPsig.toFixed(1)} psig (limit ${SAFETY.lpcoPsig} psig).` })
  else if (suctionPsig <= SAFETY.lpcoWarnPsig)
    alarms.push({ code: 'LP-LOW',    severity: 'WARNING',  message: `Low suction pressure — ${suctionPsig.toFixed(1)} psig (warn ${SAFETY.lpcoWarnPsig} psig, cutout ${SAFETY.lpcoPsig} psig)` })
  if (dischargeTemp >= SAFETY.highDischargeF)
    alarms.push({ code: 'HI-DT',     severity: 'CRITICAL', message: `High discharge temp — ${Math.round(dischargeTemp)} °F. Liquid injection active.` })
  else if (dischargeTemp >= SAFETY.warnDischargeF)
    alarms.push({ code: 'HI-DT-W',  severity: 'WARNING',  message: `Elevated discharge temp — ${Math.round(dischargeTemp)} °F (limit ${SAFETY.highDischargeF} °F)` })
  if (oilDiff <= SAFETY.oilTripDiff)
    alarms.push({ code: 'OFC',       severity: 'CRITICAL', message: `Oil Failure Control — ${Math.round(oilDiff)} psi diff (Y825 normal: 20–25 psi). Compressor protected.` })
  else if (oilDiff <= SAFETY.oilWarnDiff)
    alarms.push({ code: 'OIL-W',    severity: 'WARNING',  message: `Low oil pressure differential — ${Math.round(oilDiff)} psi (normal 20–25 psi above suction)` })
  if (superheat >= 45)
    alarms.push({ code: 'HI-SH',    severity: 'WARNING',  message: `High MT suction superheat — ${Math.round(superheat)} °F. Check charge, TXV bulb, filter drier.` })
  else if (superheat <= 4 && runningCount > 0)
    alarms.push({ code: 'LO-SH',    severity: 'WARNING',  message: `Low MT suction superheat — ${Math.round(superheat)} °F. Flood-back risk.` })
  if (subcooling <= 1.5)
    alarms.push({ code: 'FLASH-GAS',severity: 'WARNING',  message: `Near-zero subcooling (${subcooling.toFixed(1)} °F) — flash gas likely in liquid line.` })
  if (caseTemp >= 42)
    alarms.push({ code: 'MT-CASE',  severity: 'WARNING',  message: `MT case temperature high — ${Math.round(caseTemp)} °F.` })
  compRunning.forEach((r, i) => { if (!r) alarms.push({ code: `COMP${i + 1}`, severity: 'CRITICAL', message: `Compressor ${i + 1} not running` }) })
  if (f.nonCondensables)
    alarms.push({ code: 'NON-COND', severity: 'WARNING',  message: `Non-condensables — head ${Math.round(dischargePsig)} psig vs PT-only ${Math.round(dischargePsig - ncExtraGauge)} psig at ${Math.round(condensingSatTemp)} °F sat.` })
  if (f.liquidLineRestriction)
    alarms.push({ code: 'LL-RESTR', severity: 'WARNING', message: `Liquid line restriction — high superheat ${Math.round(superheat)}°F but drier ΔT normal. Suspect isolation valve, solenoid, or check valve.` })
  if (f.comp1ValveWorn)
    alarms.push({ code: 'VALVE-W', severity: 'WARNING', message: `Comp 1 valve wear suspected — running but capacity ~35% reduced. Verify amps vs expected; check discharge temp individually.` })
  if (f.defrostStuckOn)
    alarms.push({ code: 'MT-DEF',   severity: 'WARNING',  message: 'MT defrost stuck on — case temperatures rising, suction elevated' })
  // Low ambient
  if (hpCtrlActive && oat <= 20)
    alarms.push({ code: 'LOW-AMB',  severity: oat < 0 ? 'CRITICAL' : 'WARNING', message: `OAT ${oat}°F — HP control holding condensing at ${Math.round(condensingSatTemp)}°F sat. Monitor for liquid migration.` })
  if (oat < 0)
    alarms.push({ code: 'CRANKCASE',severity: 'WARNING',  message: 'Extreme low ambient — confirm crankcase heaters energized before compressor start.' })

  return {
    ambient: oat, suctionSatTemp, suctionPsig, suctionGasTemp, suctionSuperheat: superheat,
    condensingTemp: condensingSatTemp, dischargePsig, dischargeTemp, dischargeSuperheat,
    compressionRatio, liquidTemp, subcooling, filterDrierDeltaT,
    oilDiff, oilPressurePsig, compRunning, compAmps, caseTemp,
    nonCondensables: f.nonCondensables, hpCtrlActive,
    approachDelta, fansActive, fansCycling,
    liquidLinePsig, expectedDischargePsig, dischargeDeviation,
    alarms,
  }
}

// ── LT Booster compute ────────────────────────────────────────────────────────
function computeLT(f: FaultState, mtSuctionSatTemp: number, ltSatSetpoint: number, pt: PTTable = PT_TABLES['R-404A']): LTState {
  let suctionSatTemp   = ltSatSetpoint
  let superheat        = LT_BASELINE.superheat
  let caseTemp         = LT_BASELINE.caseTemp
  let ampsMultiplier   = 1.0
  const compRunning    = [true, true]
  const dischargeSatTemp = mtSuctionSatTemp  // boosters discharge into MT suction header

  if (f.ltComp1Failed) { compRunning[0] = false; suctionSatTemp += 8; caseTemp += 8; ampsMultiplier *= 1.80 }
  if (f.ltComp2Failed) { compRunning[1] = false; suctionSatTemp += 18; caseTemp += 18 }
  if (f.ltTxvNotFeeding)   { suctionSatTemp -= 12; superheat += 25; caseTemp += 12 }
  if (f.ltDefrostStuckOn)  { suctionSatTemp += 8;  caseTemp  += 18; if (superheat > 5) superheat -= 5 }

  superheat      = Math.max(superheat, 0)
  suctionSatTemp = Math.min(suctionSatTemp, dischargeSatTemp - 12)

  const runningCount     = compRunning.filter(Boolean).length
  const suctionPsia      = ptDew(suctionSatTemp, pt)    // LT suction: evaporating (dew)
  const dischargePsia    = ptDew(dischargeSatTemp, pt)  // LT discharge = MT suction header (dew)
  const suctionPsig      = Math.max(toGauge(suctionPsia), 0.1)
  const dischargePsig    = toGauge(dischargePsia)
  const compressionRatio = (dischargePsig + 14.696) / (suctionPsig + 14.696)
  const suctionGasTemp   = suctionSatTemp + superheat
  const dischargeSuperheat = 40 + (compressionRatio - 2.5) * 10
  const dischargeTemp    = dischargeSatTemp + dischargeSuperheat
  const compAmps         = compRunning.map(r => r ? Math.round(LT_BASELINE.baseAmps * ampsMultiplier * 10) / 10 : 0)

  const alarms: Alarm[] = []
  if (suctionPsig <= LT_SAFETY.lpcoPsig)
    alarms.push({ code: 'LT-LPCO',   severity: 'CRITICAL', message: `LT Low Pressure Cutout — ${suctionPsig.toFixed(1)} psig. Negative pressure risk.` })
  else if (suctionPsig <= LT_SAFETY.lpcoWarnPsig)
    alarms.push({ code: 'LT-LP-W',   severity: 'WARNING',  message: `LT Low suction warning — ${suctionPsig.toFixed(1)} psig.` })
  if (caseTemp >= LT_SAFETY.highCaseTemp)
    alarms.push({ code: 'LT-CASE',   severity: 'CRITICAL', message: `LT case temp ${Math.round(caseTemp)} °F — frozen food at risk.` })
  else if (caseTemp >= LT_SAFETY.warnCaseTemp)
    alarms.push({ code: 'LT-CASE-W', severity: 'WARNING',  message: `LT case temp warning — ${Math.round(caseTemp)} °F (target −5 to 0 °F).` })
  if (superheat >= LT_SAFETY.highSH)
    alarms.push({ code: 'LT-HI-SH',  severity: 'WARNING',  message: `LT high superheat — ${superheat.toFixed(1)} °F. Check TXV bulb and LT charge.` })
  compRunning.forEach((r, i) => { if (!r) alarms.push({ code: `LT-B${i + 1}`, severity: 'CRITICAL', message: `LT Booster ${i + 1} not running` }) })
  if (f.ltDefrostStuckOn)
    alarms.push({ code: 'LT-DEF',    severity: 'WARNING',  message: 'LT defrost stuck on — frozen food cases warming rapidly' })
  if (runningCount === 0)
    alarms.push({ code: 'LT-NOCOMP', severity: 'CRITICAL', message: 'All LT boosters offline — no LT pumping. Case temps rising.' })

  return {
    suctionSatTemp, suctionPsig, suctionGasTemp, superheat,
    dischargeSatTemp, dischargePsig, dischargeTemp, compressionRatio,
    compRunning, compAmps, caseTemp, alarms,
  }
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
interface Scenario {
  id: string; name: string; description: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  oat?: number              // OAT locked during scenario (if omitted, defaults to 80 °F)
  faults: Partial<FaultState>; answer: FaultKey[]
}

const SCENARIOS: Scenario[] = [
  {
    id: 'summer_head',
    name: 'Head Pressure Running High',
    difficulty: 'Beginner',
    oat: 100,
    description: 'Service call on a hot summer day — OAT 100 °F. Discharge pressure 340+ psig (normal is 200–240 psig for this store). Machine room maintenance hasn\'t been done since spring. What are the contributing mechanical faults?',
    faults: { dirtyCondenser: true, fan1Failed: true },
    answer: ['dirtyCondenser', 'fan1Failed'],
  },
  {
    id: 'gradual_warmup',
    name: 'Cases Getting Warm (Gradual)',
    difficulty: 'Intermediate',
    oat: 80,
    description: 'MT cases have been slowly warming over 2 weeks — about 2–3 °F per week. No sudden alarms. Subcooling is low and the sight glass shows some flashing.',
    faults: { underchargeModerate: true, filterDrierRestricted: true },
    answer: ['underchargeModerate', 'filterDrierRestricted'],
  },
  {
    id: 'monday_lt',
    name: 'Monday Morning Frozen Food Mess',
    difficulty: 'Beginner',
    oat: 72,
    description: 'Opened the store Monday. All LT (frozen food) cases above 10 °F. MT medium-temp side seems fine. Defrost was scheduled to run at 4 AM.',
    faults: { ltDefrostStuckOn: true },
    answer: ['ltDefrostStuckOn'],
  },
  {
    id: 'oil_fault',
    name: 'Overnight Oil Pressure Alarm',
    difficulty: 'Intermediate',
    oat: 70,
    description: 'Overnight call — oil pressure alarm tripped Comp 3. It\'s now off. Oil differential reading 8 psi on the gauge. Remaining compressor amps are elevated.',
    faults: { oilLow: true, comp3Failed: true },
    answer: ['oilLow', 'comp3Failed'],
  },
  {
    id: 'lt_no_pulldown',
    name: 'LT Won\'t Pull Down After Repair',
    difficulty: 'Advanced',
    oat: 80,
    description: 'LT circuit was worked on last week (defrost board swap). Since then it won\'t pull down. LT booster suction very low, superheats extremely high, LT cases at 15 °F and rising. MT running fine.',
    faults: { ltTxvNotFeeding: true, ltComp1Failed: true },
    answer: ['ltTxvNotFeeding', 'ltComp1Failed'],
  },
  {
    id: 'winter_low_amb',
    name: 'Winter — Cases Running Warm',
    difficulty: 'Intermediate',
    oat: 15,
    description: 'January service call — outdoor temp 15 °F. Head pressure seems unusually low; the tech notes the HP control valve is holding condensing at minimum. MT cases are warm and subcooling is very high. A slow leak went unnoticed over the fall.',
    faults: { underchargeModerate: true },
    answer: ['underchargeModerate'],
  },
  {
    id: 'non_condensables',
    name: 'Head Pressure Divorces the PT Chart',
    difficulty: 'Advanced',
    oat: 80,
    description: 'Summer service call, OAT 80 °F. The head pressure is running ~28 psig higher than what the PT chart says it should be for the measured condensing temperature. Condenser coil looks clean, all fans running. What is causing the gap between the PT reading and the actual gauge pressure?',
    faults: { nonCondensables: true },
    answer: ['nonCondensables'],
  },
  {
    id: 'll_restriction',
    name: 'High Superheat — Clean Drier',
    difficulty: 'Intermediate',
    oat: 85,
    description: 'Cases getting warm. MT suction superheat is 38 °F — way above normal. You replace the filter drier core expecting that to fix it. Subcooling is still low after the change, and SH is still high. The drier shows only a 1 °F temperature drop. What else could be restricting the liquid line?',
    faults: { liquidLineRestriction: true },
    answer: ['liquidLineRestriction'],
  },
  {
    id: 'worn_valve',
    name: 'Subtle Capacity Loss — Amps Look Fine',
    difficulty: 'Advanced',
    oat: 90,
    description: 'Cases are trending 3–4 °F warmer than normal. The suction pressure is slightly higher than the set point. All four compressors appear to be running — amps look near-normal. No alarms have tripped. Discharge temperature on Comp 1 seems higher than the others. What is the likely internal fault on Comp 1?',
    faults: { comp1ValveWorn: true },
    answer: ['comp1ValveWorn'],
  },
]

// ── Diagnose text ─────────────────────────────────────────────────────────────
function buildDiagnoseText(mt: SystemState, lt: LTState, oat: number, caseTemps: number[], refrigerant: string = 'R-404A', pt: PTData = PT_TABLES['R-404A']): string {
  const allAlarms = [...mt.alarms, ...lt.alarms]
  const mtCases   = STORE_LINEUP.filter(s => s.circuit === 'MT')
  const ltCases   = STORE_LINEUP.filter(s => s.circuit === 'LT')
  return [
    '=== ColdIQ Rack Simulator — Diagnostic Snapshot ===',
    `System: Hussmann Parallel Rack | ${refrigerant} | MT + LT Booster`,
    '',
    `ENVIRONMENT:`,
    `  Outdoor Ambient Temp (OAT): ${oat} °F`,
    `  Head Pressure Control: ${mt.hpCtrlActive ? `ACTIVE — holding condensing at ${Math.round(mt.condensingTemp)}°F sat min` : 'Off (OAT above minimum)'}`,
    '',
    `MT CIRCUIT (Setpoint: 20 °F SST / ${toGauge(ptDew(20, pt)).toFixed(1)} psig):`,
    `  Suction:           ${mt.suctionPsig.toFixed(1)} psig  /  ${mt.suctionSatTemp.toFixed(1)} °F SST`,
    `  Suction superheat: ${mt.suctionSuperheat.toFixed(1)} °F`,
    `  Discharge:         ${mt.dischargePsig.toFixed(1)} psig  /  ${mt.condensingTemp.toFixed(1)} °F sat`,
    `  Discharge temp:    ${Math.round(mt.dischargeTemp)} °F`,
    `  Subcooling:        ${mt.subcooling.toFixed(1)} °F  —  Sight glass: ${mt.subcooling < 2 ? 'BUBBLES' : mt.subcooling < 6 ? 'CLOUDY' : 'CLEAR'}`,
    `  Oil differential:  ${mt.oilDiff.toFixed(0)} psi (Y825 normal 20–25 psi)`,
    `  Compression ratio: ${mt.compressionRatio.toFixed(2)} : 1`,
    `  Compressors: ${mt.compRunning.filter(Boolean).length} / 4 running  —  ${mt.compAmps.filter(a => a > 0).map(a => a.toFixed(1)).join(' / ')} A`,
    ...(mt.filterDrierDeltaT > 0 ? [`  Filter drier ΔT: ${mt.filterDrierDeltaT} °F — restricted!`] : []),
    '',
    `LT BOOSTER CIRCUIT (Setpoint: −20 °F SST / ${toGauge(ptDew(-20, pt)).toFixed(1)} psig):`,
    `  LT suction:    ${lt.suctionPsig.toFixed(1)} psig  /  ${lt.suctionSatTemp.toFixed(1)} °F SST`,
    `  LT superheat:  ${lt.superheat.toFixed(1)} °F`,
    `  LT discharge:  ${lt.dischargePsig.toFixed(1)} psig  →  MT suction header`,
    `  LT comp ratio: ${lt.compressionRatio.toFixed(2)} : 1`,
    `  LT boosters: ${lt.compRunning.filter(Boolean).length} / 2 running  —  ${lt.compAmps.filter(a => a > 0).map(a => a.toFixed(1)).join(' / ')} A`,
    '',
    'STORE LINEUP — CASE TEMPERATURES:',
    '  MT Circuit:',
    ...mtCases.map((s, i) => {
      const temp = caseTemps[i]
      const flag = temp >= s.criticalTemp ? ' ⚠ CRITICAL' : temp >= s.warnTemp ? ' ↑ HIGH' : ''
      return `    ${s.name} (${s.equipment} × ${s.count}): ${temp.toFixed(1)} °F${flag}`
    }),
    '  LT Circuit (Frozen Food):',
    ...ltCases.map((s, i) => {
      const temp = caseTemps[mtCases.length + i]
      const flag = temp >= s.criticalTemp ? ' ⚠ CRITICAL' : temp >= s.warnTemp ? ' ↑ HIGH' : ''
      return `    ${s.name} (${s.equipment} × ${s.count}): ${temp.toFixed(1)} °F${flag}`
    }),
    '',
    `Active alarms: ${allAlarms.length}${allAlarms.length === 0 ? ' — System NORMAL' : ''}`,
    ...allAlarms.map(a => `  [${a.severity}] ${a.code}: ${a.message}`),
    '',
    allAlarms.length > 0
      ? 'Based on these readings and case lineup, diagnose the most likely root cause(s) and what you would check first on site.'
      : 'System appears normal. Describe what these readings indicate about the health of this rack system.',
  ].join('\n')
}

// ── Field analysis engine ─────────────────────────────────────────────────────
type RackCfg = { hpCtrlPsig: number; mtSuctionPsig: number; ltSuctionPsig: number }

function analyzeFieldReadings(r: FieldReadings, hpCtrlSatTemp: number, cfg: RackCfg, pt: PTTable = PT_TABLES['R-404A']): { derived: Record<string, number | null>; findings: Finding[] } {
  const n = (s: string) => s.trim() === '' ? null : Number(s)
  const oat            = n(r.oat)
  const dischargePsig  = n(r.dischargePsig)
  const dischargeTemp  = n(r.dischargeTemp)
  const mtSuctionPsig  = n(r.mtSuctionPsig)
  const mtSuctionTemp  = n(r.mtSuctionTemp)
  const ltSuctionPsig  = n(r.ltSuctionPsig)
  const ltSuctionTemp  = n(r.ltSuctionTemp)
  const liquidLineTemp = n(r.liquidLineTemp)
  const drierInTemp    = n(r.drierInTemp)
  const drierOutTemp   = n(r.drierOutTemp)
  const oilDiffPsi     = n(r.oilDiffPsi)

  const condensingSatTemp     = dischargePsig  !== null ? ptBubbleReverse(dischargePsig, pt)  : null
  const mtSatTemp             = mtSuctionPsig  !== null ? ptDewReverse(mtSuctionPsig, pt)     : null
  const ltSatTemp             = ltSuctionPsig  !== null ? ptDewReverse(ltSuctionPsig, pt)     : null
  const mtSuperheat           = mtSatTemp      !== null && mtSuctionTemp  !== null ? mtSuctionTemp  - mtSatTemp      : null
  const ltSuperheat           = ltSatTemp      !== null && ltSuctionTemp  !== null ? ltSuctionTemp  - ltSatTemp      : null
  const subcooling            = condensingSatTemp !== null && liquidLineTemp !== null ? condensingSatTemp - liquidLineTemp : null
  const dischargeSuperheat    = condensingSatTemp !== null && dischargeTemp !== null  ? dischargeTemp  - condensingSatTemp : null
  const approachDelta         = condensingSatTemp !== null && oat !== null ? condensingSatTemp - oat : null
  const drierDeltaT           = drierInTemp !== null && drierOutTemp !== null ? drierInTemp - drierOutTemp : null
  const mtCompRatio           = dischargePsig !== null && mtSuctionPsig !== null ? (dischargePsig + 14.696) / (mtSuctionPsig + 14.696) : null
  const ltCompRatio           = mtSuctionPsig !== null && ltSuctionPsig !== null ? (mtSuctionPsig + 14.696) / (ltSuctionPsig + 14.696) : null
  const expectedCondSatTemp   = oat !== null ? Math.max(oat + 15, hpCtrlSatTemp) : null
  const expectedDischargePsig = expectedCondSatTemp !== null ? toGauge(ptBubble(expectedCondSatTemp, pt)) : null
  const dischargeDeviation    = dischargePsig !== null && expectedDischargePsig !== null ? dischargePsig - expectedDischargePsig : null
  const hpCtrlFloor           = condensingSatTemp !== null ? condensingSatTemp <= hpCtrlSatTemp + 1 : false
  const mtSuctionDev          = mtSuctionPsig !== null ? mtSuctionPsig - cfg.mtSuctionPsig : null
  const ltSuctionDev          = ltSuctionPsig !== null ? ltSuctionPsig - cfg.ltSuctionPsig : null

  const findings: Finding[] = []

  // Approach delta
  if (approachDelta !== null) {
    if (approachDelta > 28)
      findings.push({ severity: 'critical', label: 'Very high approach ΔT', measurement: `${approachDelta.toFixed(1)}°F (normal 12–18°F)`,
        causes: ['Badly fouled condenser coil', 'Multiple condenser fans failed', 'Non-condensables in system', 'Machine room hot air recirculation'],
        checks: ['Wash condenser coil', 'Verify all fans spinning at full speed', 'Compare discharge psig vs PT equivalent — gap = non-condensables', 'Inspect machine room louvres / baffles'] })
    else if (approachDelta > 18)
      findings.push({ severity: 'warning', label: 'Elevated approach ΔT', measurement: `${approachDelta.toFixed(1)}°F (normal 12–18°F)`,
        causes: ['Partially fouled condenser coil', 'One fan failed or reduced speed', 'Airflow restriction'],
        checks: ['Inspect condenser coil', 'Verify fan amp draw and blade condition', 'Check all louvres fully open'] })
  }

  // Discharge vs expected
  if (dischargeDeviation !== null && oat !== null) {
    if (dischargeDeviation > 50)
      findings.push({ severity: 'critical', label: 'Discharge well above expected for OAT', measurement: `${Math.round(dischargePsig!)} psig actual vs ~${Math.round(expectedDischargePsig!)} psig expected at ${oat}°F OAT`,
        causes: ['Dirty condenser coil', 'Fan failure(s)', 'Non-condensables', 'Poor ventilation', 'Overcharge'],
        checks: ['Cross-reference approach ΔT', 'Count fans running and check amps', 'Compare discharge psig vs PT sat — if psig exceeds PT, non-condensables likely'] })
    else if (dischargeDeviation > 25)
      findings.push({ severity: 'warning', label: 'Discharge above expected for OAT', measurement: `${Math.round(dischargePsig!)} psig vs ~${Math.round(expectedDischargePsig!)} psig expected`,
        causes: ['Partial condenser fouling', 'Fan at reduced speed', 'Slight overcharge'],
        checks: ['Inspect condenser coil', 'Verify all fans running at design speed'] })
    else if (dischargeDeviation < -20 && !hpCtrlFloor)
      findings.push({ severity: 'warning', label: 'Discharge lower than expected', measurement: `${Math.round(dischargePsig!)} psig vs ~${Math.round(expectedDischargePsig!)} psig expected`,
        causes: ['HP control set point lower than configured', 'Undercharge pulling head down'],
        checks: ['Verify HP control set point on rack controller display', 'Check subcooling — if very low, undercharge is pulling head down'] })
  }

  // MT superheat
  if (mtSuperheat !== null) {
    if (mtSuperheat > 50)
      findings.push({ severity: 'critical', label: 'Very high MT suction superheat', measurement: `${mtSuperheat.toFixed(1)}°F (target 15–25°F)`,
        causes: ['Severe undercharge', 'TXV bulb failed or lost charge', 'Filter drier severely restricted', 'Liquid line blocked'],
        checks: ['Check subcooling and sight glass immediately', 'Feel liquid line for ΔT across drier', 'Inspect TXV bulb contact and clamp', 'Weigh refrigerant charge'] })
    else if (mtSuperheat > 30)
      findings.push({ severity: 'warning', label: 'High MT suction superheat', measurement: `${mtSuperheat.toFixed(1)}°F (target 15–25°F)`,
        causes: ['Moderate undercharge', 'TXV hunting or partially closed', 'Filter drier partially restricted', 'Low load'],
        checks: ['Check subcooling — if < 8°F, suspect undercharge', 'Measure drier in/out ΔT', 'Verify TXV superheat setting'] })
    else if (mtSuperheat < 5 && mtSuperheat >= 0)
      findings.push({ severity: 'warning', label: 'Low MT superheat — floodback risk', measurement: `${mtSuperheat.toFixed(1)}°F (target 15–25°F)`,
        causes: ['Overcharge', 'TXV overfeeding', 'Defrost stuck on', 'Low load on partially idle circuit'],
        checks: ['Check subcooling — if > 30°F, suspect overcharge', 'Verify TXV setting', 'Check MT defrost termination'] })
    else if (mtSuperheat < 0)
      findings.push({ severity: 'critical', label: 'Negative MT superheat — active floodback', measurement: `${mtSuperheat.toFixed(1)}°F — liquid at suction header`,
        causes: ['Severe overcharge', 'TXV wide open', 'Defrost stuck on with flooded circuit'],
        checks: ['Immediate liquid slugging risk', 'Check crankcase sight glass for oil foaming', 'Recover excess charge if overcharged'] })
  }

  // Subcooling
  if (subcooling !== null) {
    if (subcooling < 3)
      findings.push({ severity: 'critical', label: 'Near-zero subcooling — flash gas', measurement: `${subcooling.toFixed(1)}°F (target 10–20°F)`,
        causes: ['Undercharge', 'Restricted filter drier creating pressure drop', 'Head pressure too low', 'Long liquid line with elevation rise'],
        checks: ['Check sight glass — bubbles confirm flash gas', 'Measure drier ΔT', 'Weigh charge', 'Verify head pressure at set point'] })
    else if (subcooling < 8)
      findings.push({ severity: 'warning', label: 'Low subcooling', measurement: `${subcooling.toFixed(1)}°F (target 10–20°F)`,
        causes: ['Marginal charge', 'Partial drier restriction reducing liquid pressure'],
        checks: ['Inspect sight glass for intermittent bubbling', 'Measure drier in/out ΔT', 'Compare with expected charge weight'] })
    else if (subcooling > 30)
      findings.push({ severity: 'warning', label: 'High subcooling', measurement: `${subcooling.toFixed(1)}°F (target 10–20°F)`,
        causes: ['Overcharge', 'Low ambient — liquid migrating to condenser/receiver', 'Liquid backup from downstream restriction'],
        checks: ['Check OAT — if low and HP ctrl active, may be normal', 'If high OAT + high SC, suspect overcharge — recover excess'] })
  }

  // LT superheat
  if (ltSuperheat !== null) {
    if (ltSuperheat > 35)
      findings.push({ severity: 'critical', label: 'Very high LT booster superheat', measurement: `${ltSuperheat.toFixed(1)}°F (target 10–20°F)`,
        causes: ['LT TXV bulb failed or lost contact', 'LT drier restricted', 'LT severe undercharge', 'Liquid solenoid not opening'],
        checks: ['Verify LT TXV bulb clamped on suction line', 'Check ΔT across LT drier', 'Inspect liquid solenoid to frozen cases'] })
    else if (ltSuperheat > 25)
      findings.push({ severity: 'warning', label: 'High LT booster superheat', measurement: `${ltSuperheat.toFixed(1)}°F (target 10–20°F)`,
        causes: ['LT TXV not feeding adequately', 'Partial LT drier restriction', 'LT moderate undercharge'],
        checks: ['Check LT TXV bulb position and external equalizer', 'Check drier ΔT on LT liquid feed'] })
    else if (ltSuperheat < 4 && ltSuperheat >= 0)
      findings.push({ severity: 'warning', label: 'Low LT superheat — liquid carryover risk', measurement: `${ltSuperheat.toFixed(1)}°F (target 10–20°F)`,
        causes: ['LT TXV overfeeding', 'LT defrost stuck on', 'Low LT load'],
        checks: ['Verify LT defrost has terminated', 'Check LT TXV setting', 'Watch LT booster for slugging signs'] })
  }

  // Discharge superheat
  if (dischargeSuperheat !== null && dischargeSuperheat > 100)
    findings.push({ severity: 'critical', label: 'Very high discharge superheat', measurement: `${dischargeSuperheat.toFixed(0)}°F above condensing sat`,
      causes: ['High suction SH driving discharge up', 'Poor compressor valve efficiency', 'High compression ratio'],
      checks: ['Correlate with MT suction superheat', 'Verify liquid injection is functioning', 'Check discharge temp sensor accuracy'] })
  else if (dischargeSuperheat !== null && dischargeSuperheat > 80)
    findings.push({ severity: 'warning', label: 'Elevated discharge superheat', measurement: `${dischargeSuperheat.toFixed(0)}°F above condensing sat`,
      causes: ['Elevated suction superheat', 'High compression ratio', 'High OAT combined with other faults'],
      checks: ['Correlate with suction superheat — usually linked'] })

  // Filter drier
  if (drierDeltaT !== null) {
    if (drierDeltaT > 8)
      findings.push({ severity: 'critical', label: 'Filter drier severely restricted', measurement: `ΔT = ${drierDeltaT.toFixed(1)}°F across drier`,
        causes: ['Drier core saturated with moisture or debris', 'Drier icing (moisture in system)'],
        checks: ['Replace drier core immediately', 'After replacement check subcooling and sight glass', 'Nitrogen purge and vacuum if moisture confirmed'] })
    else if (drierDeltaT > 3)
      findings.push({ severity: 'warning', label: 'Filter drier showing restriction', measurement: `ΔT = ${drierDeltaT.toFixed(1)}°F across drier`,
        causes: ['Drier core partially saturated'],
        checks: ['Plan drier core replacement', 'Monitor sight glass for bubbling downstream of drier'] })
  }

  // Oil differential
  if (oilDiffPsi !== null) {
    if (oilDiffPsi < 10)
      findings.push({ severity: 'critical', label: 'Oil differential below OFC trip point', measurement: `${oilDiffPsi.toFixed(0)} psi (Y825 target 20–25 psi above suction)`,
        causes: ['Y825 valve out of adjustment', 'Low oil in separator', 'Oil logged in system', 'Oil pump failure'],
        checks: ['Adjust Y825 needle valve — DO NOT restart compressor until oil issue resolved', 'Check oil sight glass in separator', 'Inspect oil return lines from cases'] })
    else if (oilDiffPsi < 18)
      findings.push({ severity: 'warning', label: 'Low oil differential', measurement: `${oilDiffPsi.toFixed(0)} psi (Y825 target 20–25 psi above suction)`,
        causes: ['Y825 valve needs adjustment', 'Oil level slightly low'],
        checks: ['Adjust Y825 — clockwise raises differential', 'Monitor oil sight glass level'] })
  }

  // MT suction vs setpoint
  if (mtSuctionDev !== null && Math.abs(mtSuctionDev) > 6)
    findings.push({ severity: 'warning',
      label: mtSuctionDev > 0 ? 'MT suction above set point' : 'MT suction below set point',
      measurement: `${n(r.mtSuctionPsig)?.toFixed(1)} psig vs ${cfg.mtSuctionPsig} psig configured set point`,
      causes: mtSuctionDev > 0
        ? ['Excess load', 'Defrost stuck on', 'TXV overfeeding', 'Overcharge']
        : ['Undercharge', 'TXV not feeding', 'Low load', 'Set point needs adjustment'],
      checks: mtSuctionDev > 0
        ? ['Check MT case loads and defrost status', 'Verify suction set point on rack controller']
        : ['Check subcooling and sight glass for undercharge', 'Verify all TXVs feeding properly'] })

  // LT suction vs setpoint
  if (ltSuctionDev !== null && Math.abs(ltSuctionDev) > 2)
    findings.push({ severity: 'warning',
      label: ltSuctionDev > 0 ? 'LT suction above set point' : 'LT suction below set point',
      measurement: `${n(r.ltSuctionPsig)?.toFixed(1)} psig vs ${cfg.ltSuctionPsig} psig configured set point`,
      causes: ltSuctionDev > 0 ? ['LT defrost stuck on', 'High frozen food load', 'LT TXV overfeeding'] : ['LT undercharge', 'LT TXV not feeding', 'Low LT load'],
      checks: ['Check LT defrost status', 'Verify LT TXV bulb and feeding', 'Inspect LT case temps'] })

  // High compression ratio
  if (mtCompRatio !== null && mtCompRatio > 10)
    findings.push({ severity: 'warning', label: 'High MT compression ratio', measurement: `${mtCompRatio.toFixed(2)} : 1 (normal 4–8 : 1)`,
      causes: ['Combination of low suction + elevated discharge'],
      checks: ['Address root causes separately — high ratio stresses compressor valves and raises discharge temp'] })

  // All OK
  const hasData = [dischargePsig, mtSuctionPsig, liquidLineTemp, mtSuctionTemp].some(v => v !== null)
  if (findings.length === 0 && hasData)
    findings.push({ severity: 'ok', label: 'No significant deviations found', measurement: '',
      causes: [], checks: ['Readings appear within normal range for this rack config — enter more measurements for a fuller picture'] })

  return {
    derived: { condensingSatTemp, mtSatTemp, ltSatTemp, mtSuperheat, ltSuperheat, subcooling, dischargeSuperheat, approachDelta, drierDeltaT, mtCompRatio, ltCompRatio, expectedDischargePsig, dischargeDeviation },
    findings,
  }
}

function buildFieldDiagnoseText(r: FieldReadings, derived: Record<string, number | null>, findings: Finding[], cfg: RackCfg): string {
  const fmt  = (v: number | null, dec = 1, unit = '') => v === null ? '—' : `${v.toFixed(dec)}${unit}`
  const fmtR = (v: string, unit: string) => v.trim() ? `${v} ${unit}` : '—'
  return [
    '=== ColdIQ Field Readings Diagnostic ===',
    'System: Hussmann Parallel Rack | R-404A',
    `Rack config: HP ctrl ${cfg.hpCtrlPsig} psig | MT suction ${cfg.mtSuctionPsig} psig | LT suction ${cfg.ltSuctionPsig} psig`,
    '',
    'FIELD MEASUREMENTS:',
    `  OAT:                 ${fmtR(r.oat, '°F')}`,
    `  MT Suction:          ${fmtR(r.mtSuctionPsig, 'psig')}  /  Line temp: ${fmtR(r.mtSuctionTemp, '°F')}`,
    `  LT Suction:          ${fmtR(r.ltSuctionPsig, 'psig')}  /  Line temp: ${fmtR(r.ltSuctionTemp, '°F')}`,
    `  Discharge:           ${fmtR(r.dischargePsig, 'psig')}  /  Discharge temp: ${fmtR(r.dischargeTemp, '°F')}`,
    `  Liquid line temp:    ${fmtR(r.liquidLineTemp, '°F')}`,
    ...(r.drierInTemp || r.drierOutTemp ? [`  Filter drier:        In ${fmtR(r.drierInTemp, '°F')} → Out ${fmtR(r.drierOutTemp, '°F')}`] : []),
    ...(r.oilDiffPsi      ? [`  Oil differential:   ${fmtR(r.oilDiffPsi, 'psi')}`] : []),
    ...(r.mtCompsRunning  ? [`  MT compressors:     ${r.mtCompsRunning} running`]  : []),
    ...(r.ltCompsRunning  ? [`  LT boosters:        ${r.ltCompsRunning} running`]  : []),
    '',
    'CALCULATED VALUES:',
    `  Condensing sat temp: ${fmt(derived.condensingSatTemp, 1, '°F sat')}`,
    `  MT sat temp:         ${fmt(derived.mtSatTemp, 1, '°F sat')}`,
    `  MT superheat:        ${fmt(derived.mtSuperheat, 1, '°F')}`,
    `  Subcooling:          ${fmt(derived.subcooling, 1, '°F')}`,
    `  Discharge superheat: ${fmt(derived.dischargeSuperheat, 0, '°F')}`,
    `  Approach ΔT:         ${fmt(derived.approachDelta, 1, '°F')}`,
    `  MT comp ratio:       ${fmt(derived.mtCompRatio, 2, ' : 1')}`,
    ...(derived.ltSatTemp      !== null ? [`  LT sat temp:         ${fmt(derived.ltSatTemp, 1, '°F sat')}`]      : []),
    ...(derived.ltSuperheat    !== null ? [`  LT superheat:        ${fmt(derived.ltSuperheat, 1, '°F')}`]         : []),
    ...(derived.ltCompRatio    !== null ? [`  LT comp ratio:       ${fmt(derived.ltCompRatio, 2, ' : 1')}`]       : []),
    ...(derived.drierDeltaT    !== null ? [`  Filter drier ΔT:     ${fmt(derived.drierDeltaT, 1, '°F')}`]        : []),
    `  Expected discharge:  ${fmt(derived.expectedDischargePsig, 0, ' psig')} at this OAT`,
    `  Deviation:           ${derived.dischargeDeviation !== null ? (derived.dischargeDeviation >= 0 ? '+' : '') + derived.dischargeDeviation.toFixed(0) + ' psig vs expected' : '—'}`,
    '',
    `FINDINGS (${findings.length}):`,
    ...findings.map(f =>
      [`  [${f.severity.toUpperCase()}] ${f.label}${f.measurement ? ' — ' + f.measurement : ''}`,
       ...(f.causes.length ? ['    Possible causes: ' + f.causes.join(', ')] : []),
       ...(f.checks.length ? ['    Check first: ' + f.checks[0]] : []),
      ].join('\n')),
    '',
    'Based on these field readings and findings, what is the most likely root cause and what should I check next on site?',
  ].join('\n')
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function statusColor(val: number, warn: number, alarm: number, reversed = false) {
  const bad  = reversed ? val <= alarm : val >= alarm
  const wrn  = reversed ? val <= warn  : val >= warn
  if (bad) return 'text-red-400'
  if (wrn) return 'text-amber-400'
  return 'text-emerald-400'
}
function dotColor(val: number, warn: number, alarm: number, reversed = false) {
  const bad  = reversed ? val <= alarm : val >= alarm
  const wrn  = reversed ? val <= warn  : val >= warn
  if (bad) return 'bg-red-500'
  if (wrn) return 'bg-amber-400'
  return 'bg-emerald-500'
}
function caseTempColor(temp: number, s: CaseSection) {
  if (temp >= s.criticalTemp) return 'text-red-400'
  if (temp >= s.warnTemp)     return 'text-amber-400'
  return 'text-emerald-400'
}
function caseDotColor(temp: number, s: CaseSection) {
  if (temp >= s.criticalTemp) return 'bg-red-500'
  if (temp >= s.warnTemp)     return 'bg-amber-400'
  return 'bg-emerald-500'
}

interface ReadingRowProps { label: string; value: string; sub?: string; dot?: string; color?: string; note?: string }
function ReadingRow({ label, value, sub, dot, color, note }: ReadingRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
      <div className="text-xs text-slate-400 flex items-center gap-1.5 min-w-0">
        {dot && <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-right ml-2 flex-shrink-0">
        <span className={`text-sm font-mono font-semibold tabular-nums ${color ?? 'text-white'}`}>{value}</span>
        {sub && <span className="text-[10px] text-slate-500 ml-1">{sub}</span>}
        {note && <div className="text-[9px] text-amber-400">{note}</div>}
      </div>
    </div>
  )
}

interface CardProps { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string; accent?: string }
function Card({ title, icon, children, className = '', accent = 'bg-slate-700/50 border-slate-700' }: CardProps) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl overflow-hidden ${className}`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${accent}`}>
        <span className="text-slate-400">{icon}</span>
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-3 py-1.5">{children}</div>
    </div>
  )
}

interface FieldInputProps { label: string; value: string; onChange: (v: string) => void; unit: string; placeholder?: string; hint?: string }
function FieldInput({ label, value, onChange, unit, placeholder, hint }: FieldInputProps) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="w-36 flex-shrink-0">
        <div className="text-[10px] text-slate-400 leading-tight">{label}</div>
        {hint && <div className="text-[9px] text-slate-600">{hint}</div>}
      </div>
      <div className="relative flex-1">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '—'}
          className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-2.5 py-1.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">{unit}</span>
      </div>
    </div>
  )
}

interface ToggleProps { active: boolean; onChange: () => void; label: string; hint: string; disabled?: boolean }
function FaultToggle({ active, onChange, label, hint, disabled }: ToggleProps) {
  return (
    <button
      onClick={onChange} disabled={disabled} title={hint}
      className={[
        'w-full flex items-start gap-2 px-3 py-2 text-left rounded-lg transition-all text-xs',
        active   ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300' : 'bg-slate-700/40 border border-transparent text-slate-400 hover:bg-slate-700 hover:text-slate-200',
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <div className={`mt-0.5 flex-shrink-0 w-7 h-3.5 rounded-full transition-colors flex items-center px-0.5 ${active ? 'bg-amber-500' : 'bg-slate-600'}`}>
        <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${active ? 'translate-x-3.5' : 'translate-x-0'}`} />
      </div>
      <span className="leading-snug">{label}</span>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SimulationPage() {
  const router = useRouter()

  // Free-play state
  const [faults,       setFaults]       = useState<FaultState>(INITIAL_FAULTS)
  const [oat,          setOat]          = useState(80)        // °F — outdoor ambient
  const [showFaults,   setShowFaults]   = useState(true)
  const [revealFaults, setRevealFaults] = useState(false)

  // Rack configuration — matches what techs read from the rack controller / setup sheet
  const [rackSettingsOpen, setRackSettingsOpen] = useState(false)
  const [rackConfig, setRackConfig] = useState({
    refrigerant:   'R-404A' as Refrigerant,
    hpCtrlPsig:    190,  // HP control min discharge psig — ~85 °F condensing sat (R-404A bubble)
    mtSuctionPsig:  55,  // MT suction set point (psig) — ~20 °F SST on R-404A dew
    ltSuctionPsig:  16,  // LT booster suction set point (psig) — ~−20 °F SST on R-404A dew
  })

  // Field Readings diagnostic tab
  const [diagTab,       setDiagTab]       = useState<'sim' | 'field'>('sim')
  const [fieldReadings, setFieldReadings] = useState<FieldReadings>(FIELD_EMPTY)
  const updateField = (key: keyof FieldReadings, val: string) =>
    setFieldReadings(prev => ({ ...prev, [key]: val }))

  // Scenario state
  const [scenarioMode,   setScenarioMode]   = useState(false)
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)
  const [userGuess,      setUserGuess]      = useState<FaultState>(INITIAL_FAULTS)
  const [submitted,      setSubmitted]      = useState(false)

  // Active values — scenarios override free-play faults and OAT
  const activeFaults = scenarioMode && activeScenario ? { ...INITIAL_FAULTS, ...activeScenario.faults } : faults
  const activeOat    = scenarioMode ? (activeScenario?.oat ?? 80) : oat

  // Derive sat-temp equivalents from the configured psig set points
  const pt             = PT_TABLES[rackConfig.refrigerant]
  const hpCtrlSatTemp  = ptBubbleReverse(rackConfig.hpCtrlPsig, pt)   // HP ctrl → condensing sat temp (bubble)
  const mtSatSetpoint  = ptDewReverse(rackConfig.mtSuctionPsig, pt)   // MT suction → evap sat temp (dew)
  const ltSatSetpoint  = ptDewReverse(rackConfig.ltSuctionPsig, pt)   // LT suction → evap sat temp (dew)

  const mt = useMemo(() => computeMT(activeFaults, activeOat, hpCtrlSatTemp, mtSatSetpoint, pt), [activeFaults, activeOat, hpCtrlSatTemp, mtSatSetpoint, pt])
  const lt = useMemo(() => computeLT(activeFaults, mt.suctionSatTemp, ltSatSetpoint, pt), [activeFaults, mt.suctionSatTemp, ltSatSetpoint, pt])

  // Individual case temperatures — deviation from aggregate caseTemp × sensitivity
  const caseTemps = useMemo(() => STORE_LINEUP.map(s => {
    if (s.circuit === 'MT') return s.setpoint + (mt.caseTemp - BASELINE.caseTemp) * s.sensitivity
    else                     return s.setpoint + (lt.caseTemp - LT_BASELINE.caseTemp) * s.sensitivity
  }), [mt.caseTemp, lt.caseTemp])

  const allAlarms    = [...mt.alarms, ...lt.alarms]
  const hasCritical  = allAlarms.some(a => a.severity === 'CRITICAL')
  const hasWarning   = allAlarms.some(a => a.severity === 'WARNING')
  const systemStatus = hasCritical ? 'ALARM' : hasWarning ? 'WARNING' : 'NORMAL'
  const statusBadge  = hasCritical
    ? 'bg-red-500/20 text-red-400 border-red-500/40'
    : hasWarning ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'

  const activeFaultCount = scenarioMode ? 0 : Object.values(faults).filter(Boolean).length

  function toggleFault(key: FaultKey) {
    const def = FAULT_DEFS.find(d => d.key === key)
    setFaults(prev => {
      const next = { ...prev, [key]: !prev[key] }
      if (!prev[key] && def?.mutuallyExcludes) def.mutuallyExcludes.forEach(ex => { next[ex] = false })
      return next
    })
  }
  function toggleGuess(key: FaultKey) {
    const def = FAULT_DEFS.find(d => d.key === key)
    setUserGuess(prev => {
      const next = { ...prev, [key]: !prev[key] }
      if (!prev[key] && def?.mutuallyExcludes) def.mutuallyExcludes.forEach(ex => { next[ex] = false })
      return next
    })
  }

  function resetAll() { setFaults(INITIAL_FAULTS); setOat(80); setRevealFaults(false) }
  function enterScenarioMode() { setScenarioMode(true); setActiveScenario(null); setUserGuess(INITIAL_FAULTS); setSubmitted(false) }
  function exitScenarioMode()  { setScenarioMode(false); setActiveScenario(null); setUserGuess(INITIAL_FAULTS); setSubmitted(false) }
  function loadScenario(s: Scenario) { setActiveScenario(s); setUserGuess(INITIAL_FAULTS); setSubmitted(false) }
  function submitDiagnosis() { setSubmitted(true) }
  const fieldAnalysis = useMemo(
    () => analyzeFieldReadings(fieldReadings, hpCtrlSatTemp, rackConfig, pt),
    [fieldReadings, hpCtrlSatTemp, rackConfig, pt]
  )

  function diagnoseInColdIQ() {
    try { localStorage.setItem('coldiq_prefill', buildDiagnoseText(mt, lt, activeOat, caseTemps, rackConfig.refrigerant, pt)) } catch { /* ignore */ }
    router.push('/dashboard')
  }

  function diagnoseField() {
    try { localStorage.setItem('coldiq_prefill', buildFieldDiagnoseText(fieldReadings, fieldAnalysis.derived, fieldAnalysis.findings, rackConfig)) } catch { /* ignore */ }
    router.push('/dashboard')
  }

  const score = (() => {
    if (!activeScenario || !submitted) return null
    const correct = activeScenario.answer.filter(k => userGuess[k]).length
    const total   = activeScenario.answer.length
    const fp      = Object.entries(userGuess).filter(([k, v]) => v && !activeScenario.answer.includes(k as FaultKey)).length
    const pct     = Math.max(0, Math.round(((correct - fp * 0.5) / total) * 100))
    return { correct, total, fp, pct }
  })()

  const faultsByGroup = FAULT_GROUPS.map(g => ({ group: g, faults: FAULT_DEFS.filter(d => d.group === g) }))

  // OAT colour helper
  const oatColor = activeOat <= 32 ? 'text-blue-300'
    : activeOat <= 60 ? 'text-cyan-300'
    : activeOat <= 85 ? 'text-emerald-400'
    : activeOat <= 100 ? 'text-amber-400'
    : 'text-red-400'

  // Clean-condenser condensing sat for reference (HP ctrl floor applied); condensing → bubble
  const cleanCondensingPsig = Math.round(toGauge(ptBubble(Math.max(activeOat + 15, hpCtrlSatTemp), pt)))

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col">

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-2 flex-wrap z-10">
        <button onClick={() => router.push('/')} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
          <Home size={16}/>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-sm font-semibold text-white"><span className="hidden sm:inline">Hussmann Parallel Rack · </span>{rackConfig.refrigerant} · MT + LT</h1>
            <span className="hidden sm:inline text-[10px] text-slate-500">4 × Copeland Scroll MT + 2 × Booster LT</span>
          </div>
          <p className="text-[10px] text-slate-500 hidden md:block">
            MT: {mtSatSetpoint.toFixed(1)}°F SST ({rackConfig.mtSuctionPsig} psig) · LT: {ltSatSetpoint.toFixed(1)}°F SST ({rackConfig.ltSuctionPsig} psig) · HP ctrl: {rackConfig.hpCtrlPsig} psig · OAT: <span className={oatColor}>{activeOat} °F</span>
          </p>
        </div>

        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusBadge}`}>{systemStatus}</span>

        {!scenarioMode && activeFaultCount > 0 && (
          <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-full">
            {activeFaultCount} fault{activeFaultCount > 1 ? 's' : ''}
          </span>
        )}

        <button
          onClick={diagnoseInColdIQ}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          title="Send current readings snapshot to ColdIQ Expert chat"
        >
          <MessageSquare size={12}/><span className="hidden sm:inline"> Diagnose</span>
        </button>

        <button
          onClick={scenarioMode ? exitScenarioMode : enterScenarioMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            scenarioMode ? 'bg-violet-600 text-white border-violet-500' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600'
          }`}
          title={scenarioMode ? 'Exit Scenario Mode' : 'Scenario Mode'}
        >
          <Target size={12}/><span className="hidden sm:inline"> {scenarioMode ? 'Exit Scenario' : 'Scenario'}</span>
        </button>

        {!scenarioMode && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
            title="Reset all faults"
          >
            <RotateCcw size={12}/><span className="hidden sm:inline"> Reset</span>
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Mobile backdrop for fault/settings panel ── */}
        {showFaults && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setShowFaults(false)}
          />
        )}

        {/* ── Left panel — fault injection / diagnosis ── */}
        <div className={`${showFaults ? 'flex' : 'hidden'} md:flex flex-col fixed inset-y-0 left-0 w-72 z-30 md:relative md:inset-auto md:w-56 lg:w-60 md:flex-shrink-0 bg-slate-800 border-r border-slate-700 overflow-y-auto`}>
          <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {scenarioMode ? '🎯 Your Diagnosis' : 'Fault Injection'}
            </span>
            <button onClick={() => setShowFaults(false)} className="md:hidden p-1.5 -mr-1 text-slate-400 hover:text-white active:bg-slate-700 rounded-lg">
              <ChevronUp size={16}/>
            </button>
          </div>

          {scenarioMode && !activeScenario && (
            <div className="p-3 text-[10px] text-slate-500 leading-relaxed">
              Pick a scenario from the readings panel, then toggle what you think is causing the symptoms.
            </div>
          )}

          {/* ── Rack Settings (collapsible) ── */}
          <div className="border-b border-slate-700">
            <button
              onClick={() => setRackSettingsOpen(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
            >
              <span>Rack Settings</span>
              <span className={`transition-transform ${rackSettingsOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>

            {rackSettingsOpen && (
              <div className="px-3 pb-3 space-y-4">

                {/* Refrigerant */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">Refrigerant</span>
                    <span className="text-[11px] font-mono font-semibold text-violet-300">{rackConfig.refrigerant}</span>
                  </div>
                  <div className="flex gap-1">
                    {(['R-404A', 'R-448A', 'R-407A'] as Refrigerant[]).map(ref => (
                      <button
                        key={ref}
                        onClick={() => setRackConfig(c => ({ ...c, refrigerant: ref, ...REFRIGERANT_DEFAULTS[ref] }))}
                        className={[
                          'flex-1 text-[10px] font-medium py-1 rounded-md border transition-colors',
                          rackConfig.refrigerant === ref
                            ? 'bg-violet-600/30 border-violet-500/60 text-violet-200'
                            : 'bg-slate-700/40 border-slate-600 text-slate-400 hover:text-slate-200 hover:bg-slate-700',
                        ].join(' ')}
                      >
                        {ref}
                      </button>
                    ))}
                  </div>
                  <div className="text-[9px] text-slate-600 mt-1 leading-snug">
                    {rackConfig.refrigerant === 'R-404A' && 'Legacy HFC — being phased out. Most existing stores.'}
                    {rackConfig.refrigerant === 'R-448A' && 'Opteon XP40 — common R-404A retrofit. Set points ~2–3 psig lower.'}
                    {rackConfig.refrigerant === 'R-407A' && 'Lower-pressure blend — set points ~12–14 psig lower (MT). LT nears vacuum at deep temps.'}
                  </div>
                </div>

                {/* HP Control Set Point */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">HP Control Set Point</span>
                    <span className="text-[11px] font-mono font-semibold text-amber-300">{rackConfig.hpCtrlPsig} psig</span>
                  </div>
                  <input
                    type="range" min={SLIDER_RANGES[rackConfig.refrigerant].hp[0]} max={SLIDER_RANGES[rackConfig.refrigerant].hp[1]} step={5}
                    value={rackConfig.hpCtrlPsig}
                    onChange={e => setRackConfig(c => ({ ...c, hpCtrlPsig: Number(e.target.value) }))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                    <span>{SLIDER_RANGES[rackConfig.refrigerant].hp[0]}</span>
                    <span className="text-slate-500">
                      {hpCtrlSatTemp.toFixed(1)}°F sat · fans cycle below OAT ~{Math.round(hpCtrlSatTemp - 15)}°F
                    </span>
                    <span>{SLIDER_RANGES[rackConfig.refrigerant].hp[1]}</span>
                  </div>
                </div>

                {/* MT Suction Set Point */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">MT Suction Set Point</span>
                    <span className="text-[11px] font-mono font-semibold text-emerald-300">{rackConfig.mtSuctionPsig} psig</span>
                  </div>
                  <input
                    type="range" min={SLIDER_RANGES[rackConfig.refrigerant].mt[0]} max={SLIDER_RANGES[rackConfig.refrigerant].mt[1]} step={1}
                    value={rackConfig.mtSuctionPsig}
                    onChange={e => setRackConfig(c => ({ ...c, mtSuctionPsig: Number(e.target.value) }))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                    <span>{SLIDER_RANGES[rackConfig.refrigerant].mt[0]}</span>
                    <span className="text-slate-500">{mtSatSetpoint.toFixed(1)}°F SST</span>
                    <span>{SLIDER_RANGES[rackConfig.refrigerant].mt[1]}</span>
                  </div>
                </div>

                {/* LT Suction Set Point */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">LT Suction Set Point</span>
                    <span className="text-[11px] font-mono font-semibold text-blue-300">{rackConfig.ltSuctionPsig} psig</span>
                  </div>
                  <input
                    type="range" min={SLIDER_RANGES[rackConfig.refrigerant].lt[0]} max={SLIDER_RANGES[rackConfig.refrigerant].lt[1]} step={SLIDER_RANGES[rackConfig.refrigerant].lt[2]}
                    value={rackConfig.ltSuctionPsig}
                    onChange={e => setRackConfig(c => ({ ...c, ltSuctionPsig: Number(e.target.value) }))}
                    className="w-full accent-blue-400"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                    <span>{SLIDER_RANGES[rackConfig.refrigerant].lt[0]}</span>
                    <span className="text-slate-500">{ltSatSetpoint.toFixed(1)}°F SST</span>
                    <span>{SLIDER_RANGES[rackConfig.refrigerant].lt[1]}</span>
                  </div>
                </div>

                <button
                  onClick={() => setRackConfig(c => ({ ...c, ...REFRIGERANT_DEFAULTS[c.refrigerant] }))}
                  className="text-[9px] text-slate-500 hover:text-slate-300 underline underline-offset-2"
                >
                  Reset to defaults
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {faultsByGroup.map(({ group, faults: defs }) => (
              <div key={group}>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest px-1 mb-1">{group}</p>
                <div className="space-y-1">
                  {defs.map(d => (
                    <FaultToggle
                      key={d.key}
                      active={scenarioMode ? userGuess[d.key] : faults[d.key]}
                      label={d.label}
                      hint={scenarioMode ? 'Toggle if you think this is a root cause' : d.hint}
                      disabled={scenarioMode && (!activeScenario || submitted)}
                      onChange={() => scenarioMode ? toggleGuess(d.key) : toggleFault(d.key)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-slate-700">
            {scenarioMode && activeScenario && !submitted && (
              <button onClick={submitDiagnosis} className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors">
                Submit Diagnosis
              </button>
            )}
            {scenarioMode && submitted && score && (
              <div className="text-center">
                <div className={`text-2xl font-bold ${score.pct >= 80 ? 'text-emerald-400' : score.pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                  {score.pct}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {score.correct}/{score.total} correct{score.fp > 0 ? ` · ${score.fp} false +ve` : ''}
                </div>
              </div>
            )}
            {!scenarioMode && (
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Set faults + OAT slider, then <strong className="text-slate-400">Diagnose</strong> to pre-fill ColdIQ chat.
              </p>
            )}
          </div>
        </div>

        {/* ── Mobile fault toggle button — hidden when panel is open (panel has own close button) ── */}
        {!showFaults && (
          <button
            onClick={() => setShowFaults(true)}
            className="md:hidden fixed bottom-5 right-4 z-20 bg-amber-500 text-white rounded-full px-4 py-2.5 text-xs font-semibold shadow-lg flex items-center gap-1.5"
          >
            <Zap size={13}/>
            {scenarioMode ? 'Diagnose' : `Faults${activeFaultCount > 0 ? ` (${activeFaultCount})` : ''}`}
          </button>
        )}

        {/* ── Readings panel + tab bar ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tab bar */}
          <div className="flex-shrink-0 border-b border-slate-700 flex bg-slate-800">
            <button onClick={() => setDiagTab('sim')}
              className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${diagTab === 'sim' ? 'text-blue-400 border-blue-500' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}>
              🔧 Fault Simulator
            </button>
            <button onClick={() => setDiagTab('field')}
              className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${diagTab === 'field' ? 'text-emerald-400 border-emerald-500' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}>
              📋 Field Readings
            </button>
          </div>

          {diagTab === 'field' ? (
          /* ── Field Readings Diagnostic ─────────────────────────────────── */
          <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">

            {/* Left: input form */}
            <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-slate-700 md:overflow-y-auto p-4 space-y-1 pb-24 md:pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300">Enter Your Readings</span>
                <button onClick={() => setFieldReadings(FIELD_EMPTY)} className="text-[10px] text-slate-500 hover:text-slate-300 underline underline-offset-2">Clear all</button>
              </div>

              <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">Enter what you see on site — leave blank any values you haven&apos;t measured yet. Calculations update instantly.</p>

              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest pt-1 pb-0.5">Environment</div>
              <FieldInput label="Outdoor Ambient (OAT)" value={fieldReadings.oat} onChange={v => updateField('oat', v)} unit="°F" placeholder="e.g. 75" />

              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest pt-3 pb-0.5">MT Circuit</div>
              <FieldInput label="MT Suction Pressure" value={fieldReadings.mtSuctionPsig} onChange={v => updateField('mtSuctionPsig', v)} unit="psig" placeholder="e.g. 55" hint="gauge at rack header" />
              <FieldInput label="MT Suction Line Temp" value={fieldReadings.mtSuctionTemp} onChange={v => updateField('mtSuctionTemp', v)} unit="°F" placeholder="e.g. 42" hint="pipe temp at rack" />

              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest pt-3 pb-0.5">LT Booster Circuit</div>
              <FieldInput label="LT Suction Pressure" value={fieldReadings.ltSuctionPsig} onChange={v => updateField('ltSuctionPsig', v)} unit="psig" placeholder="e.g. 3" hint="booster suction gauge" />
              <FieldInput label="LT Suction Line Temp" value={fieldReadings.ltSuctionTemp} onChange={v => updateField('ltSuctionTemp', v)} unit="°F" placeholder="e.g. -8" hint="pipe temp at booster" />

              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest pt-3 pb-0.5">Discharge Side</div>
              <FieldInput label="Discharge Pressure" value={fieldReadings.dischargePsig} onChange={v => updateField('dischargePsig', v)} unit="psig" placeholder="e.g. 165" hint="rack discharge header" />
              <FieldInput label="Discharge Line Temp" value={fieldReadings.dischargeTemp} onChange={v => updateField('dischargeTemp', v)} unit="°F" placeholder="e.g. 185" hint="pipe temp at discharge" />

              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest pt-3 pb-0.5">Liquid Line</div>
              <FieldInput label="Liquid Line Temp" value={fieldReadings.liquidLineTemp} onChange={v => updateField('liquidLineTemp', v)} unit="°F" placeholder="e.g. 78" hint="after condenser / at receiver" />

              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest pt-3 pb-0.5">Filter Drier (optional)</div>
              <FieldInput label="Drier Inlet Temp" value={fieldReadings.drierInTemp} onChange={v => updateField('drierInTemp', v)} unit="°F" placeholder="e.g. 80" />
              <FieldInput label="Drier Outlet Temp" value={fieldReadings.drierOutTemp} onChange={v => updateField('drierOutTemp', v)} unit="°F" placeholder="e.g. 77" hint="ΔT > 3°F = restriction" />

              <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest pt-3 pb-0.5">Oil &amp; Compressors</div>
              <FieldInput label="Oil Diff Pressure" value={fieldReadings.oilDiffPsi} onChange={v => updateField('oilDiffPsi', v)} unit="psi" placeholder="e.g. 22" hint="Y825 — target 20–25 psi above suc" />
              <FieldInput label="MT Compressors" value={fieldReadings.mtCompsRunning} onChange={v => updateField('mtCompsRunning', v)} unit="running" placeholder="e.g. 3" hint="how many are running" />
              <FieldInput label="LT Boosters" value={fieldReadings.ltCompsRunning} onChange={v => updateField('ltCompsRunning', v)} unit="running" placeholder="e.g. 2" />

              <div className="pt-4">
                <button onClick={diagnoseField}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors">
                  <MessageSquare size={13}/> Ask ColdIQ AI About These Readings
                </button>
              </div>
            </div>

            {/* Right: derived calculations + findings */}
            <div className="flex-1 md:overflow-y-auto p-4 space-y-4 pb-24 md:pb-4">

              {/* Derived values */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-700 flex items-center gap-2">
                  <Activity size={13} className="text-slate-400"/>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Calculated Values</span>
                </div>
                <div className="px-3 py-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  {(() => {
                    const d = fieldAnalysis.derived
                    const row = (label: string, val: number | null, dec: number, unit: string, note?: string, color?: string) => (
                      val === null ? null :
                      <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0">
                        <span className="text-[10px] text-slate-400">{label}</span>
                        <div className="text-right">
                          <span className={`text-sm font-mono font-semibold tabular-nums ${color ?? 'text-white'}`}>{val.toFixed(dec)} {unit}</span>
                          {note && <div className="text-[9px] text-amber-400">{note}</div>}
                        </div>
                      </div>
                    )
                    return [
                      row('Condensing sat temp', d.condensingSatTemp, 1, '°F sat'),
                      row('MT sat temp (suction)', d.mtSatTemp, 1, '°F sat'),
                      row('MT superheat', d.mtSuperheat, 1, '°F',
                        d.mtSuperheat !== null && d.mtSuperheat > 30 ? 'HIGH' : d.mtSuperheat !== null && d.mtSuperheat < 5 ? 'LOW' : undefined,
                        d.mtSuperheat !== null && (d.mtSuperheat > 30 || d.mtSuperheat < 5) ? 'text-amber-400' : 'text-emerald-400'),
                      row('Subcooling', d.subcooling, 1, '°F',
                        d.subcooling !== null && d.subcooling < 3 ? 'FLASH GAS' : d.subcooling !== null && d.subcooling < 8 ? 'LOW' : undefined,
                        d.subcooling !== null && d.subcooling < 8 ? 'text-amber-400' : 'text-emerald-400'),
                      row('Discharge superheat', d.dischargeSuperheat, 0, '°F',
                        d.dischargeSuperheat !== null && d.dischargeSuperheat > 80 ? 'HIGH' : undefined,
                        d.dischargeSuperheat !== null && d.dischargeSuperheat > 80 ? 'text-amber-400' : 'text-white'),
                      row('Approach ΔT', d.approachDelta, 1, '°F',
                        d.approachDelta !== null && d.approachDelta > 18 ? 'ELEVATED' : undefined,
                        d.approachDelta !== null && d.approachDelta > 18 ? 'text-amber-400' : 'text-emerald-400'),
                      row('MT compression ratio', d.mtCompRatio, 2, ': 1',
                        d.mtCompRatio !== null && d.mtCompRatio > 10 ? 'HIGH' : undefined,
                        d.mtCompRatio !== null && d.mtCompRatio > 10 ? 'text-amber-400' : 'text-white'),
                      row('LT sat temp (suction)', d.ltSatTemp, 1, '°F sat'),
                      row('LT superheat', d.ltSuperheat, 1, '°F',
                        d.ltSuperheat !== null && d.ltSuperheat > 25 ? 'HIGH' : d.ltSuperheat !== null && d.ltSuperheat < 4 ? 'LOW' : undefined,
                        d.ltSuperheat !== null && (d.ltSuperheat > 25 || d.ltSuperheat < 4) ? 'text-amber-400' : 'text-emerald-400'),
                      row('LT compression ratio', d.ltCompRatio, 2, ': 1'),
                      row('Filter drier ΔT', d.drierDeltaT, 1, '°F',
                        d.drierDeltaT !== null && d.drierDeltaT > 3 ? 'RESTRICTED' : undefined,
                        d.drierDeltaT !== null && d.drierDeltaT > 3 ? 'text-amber-400' : 'text-emerald-400'),
                      row('Expected discharge', d.expectedDischargePsig, 0, 'psig'),
                      d.dischargeDeviation !== null ? (
                        <div key="dev" className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0">
                          <span className="text-[10px] text-slate-400">Discharge deviation</span>
                          <span className={`text-sm font-mono font-semibold tabular-nums ${Math.abs(d.dischargeDeviation) > 25 ? 'text-amber-400' : 'text-slate-300'}`}>
                            {d.dischargeDeviation >= 0 ? '+' : ''}{d.dischargeDeviation.toFixed(0)} psig
                          </span>
                        </div>
                      ) : null,
                    ]
                  })()}
                </div>
              </div>

              {/* Findings */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-700 flex items-center gap-2">
                  <AlertTriangle size={13} className="text-slate-400"/>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Findings</span>
                  <span className="ml-auto text-[10px] text-slate-500">{fieldAnalysis.findings.length} result{fieldAnalysis.findings.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="p-3 space-y-3">
                  {fieldAnalysis.findings.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">Enter readings on the left to see analysis</p>
                  ) : fieldAnalysis.findings.map((f, i) => (
                    <div key={i} className={`rounded-lg border p-3 ${
                      f.severity === 'critical' ? 'bg-red-500/10 border-red-500/40' :
                      f.severity === 'warning'  ? 'bg-amber-500/10 border-amber-500/40' :
                      f.severity === 'ok'       ? 'bg-emerald-500/10 border-emerald-500/40' :
                      'bg-slate-700/40 border-slate-600'}`}>
                      <div className="flex items-start gap-2 mb-1.5">
                        {f.severity === 'critical' ? <XCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5"/> :
                         f.severity === 'warning'  ? <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5"/> :
                         f.severity === 'ok'       ? <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0 mt-0.5"/> :
                         <Info size={13} className="text-slate-400 flex-shrink-0 mt-0.5"/>}
                        <div className="min-w-0">
                          <span className={`text-xs font-semibold ${
                            f.severity === 'critical' ? 'text-red-300' :
                            f.severity === 'warning'  ? 'text-amber-300' :
                            f.severity === 'ok'       ? 'text-emerald-300' : 'text-slate-300'}`}>{f.label}</span>
                          {f.measurement && <span className="text-[10px] text-slate-400 ml-1.5">{f.measurement}</span>}
                        </div>
                      </div>
                      {f.causes.length > 0 && (
                        <div className="ml-5 mb-1">
                          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Possible causes: </span>
                          <span className="text-[10px] text-slate-400">{f.causes.join(' · ')}</span>
                        </div>
                      )}
                      {f.checks.map((c, j) => (
                        <div key={j} className="ml-5 flex items-start gap-1.5 mt-0.5">
                          <span className="text-[9px] text-slate-600 mt-0.5">→</span>
                          <span className="text-[10px] text-slate-400 leading-snug">{c}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-slate-600 text-center pb-2">
                Rack config used: HP ctrl {rackConfig.hpCtrlPsig} psig · MT suc {rackConfig.mtSuctionPsig} psig · LT suc {rackConfig.ltSuctionPsig} psig — adjust in Rack Settings
              </p>
            </div>
          </div>
          ) : (
          /* ── Sim readings (existing) ─────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto p-3 md:p-4 pb-24 md:pb-4">
            <div className="max-w-4xl mx-auto space-y-3">

            {/* ── OAT Slider ── */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Thermometer size={13} className="text-slate-400"/>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Outdoor Ambient Temperature (OAT)</span>
                </div>
                {scenarioMode && (
                  <span className="text-[10px] px-2 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full">
                    {activeScenario ? 'Set by scenario' : 'Locked in scenario mode'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 hidden xs:block w-12 text-right flex-shrink-0">−20°F</span>
                <input
                  type="range" min={-20} max={115} step={5}
                  value={activeOat}
                  onChange={e => setOat(Number(e.target.value))}
                  disabled={scenarioMode}
                  className="flex-1 min-w-0 accent-blue-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-500 hidden xs:block w-10 flex-shrink-0">115°F</span>
                <span className={`text-xl sm:text-2xl font-bold font-mono tabular-nums flex-shrink-0 ${oatColor}`}>
                  {activeOat}°F
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] text-slate-500">
                <span>
                  HP Control:{' '}
                  <span className={mt.hpCtrlActive ? 'text-amber-400 font-medium' : 'text-slate-500'}>
                    {mt.hpCtrlActive
                      ? `Active — holding ${Math.round(mt.condensingTemp)}°F sat / ${Math.round(toGauge(ptBubble(mt.condensingTemp, pt)))} psig (set ${rackConfig.hpCtrlPsig} psig)`
                      : `Off (set point ${rackConfig.hpCtrlPsig} psig / ${hpCtrlSatTemp.toFixed(1)}°F sat)`}
                  </span>
                </span>
                <span>
                  Condenser fans:{' '}
                  <span className={mt.fansCycling ? 'text-amber-400 font-medium' : mt.fansActive < 4 ? 'text-red-400 font-medium' : 'text-emerald-400 font-medium'}>
                    {mt.fansCycling
                      ? `Cycling — HP ctrl maintaining head (≈${mt.fansActive} of 4 active)`
                      : `${mt.fansActive} of 4 running`}
                  </span>
                </span>
                <span>
                  Expected discharge:{' '}
                  <span className="text-slate-400">{cleanCondensingPsig} psig</span>
                </span>
                {activeOat < 32 && <span className="text-blue-300 font-medium">Below freezing — monitor for ice on coil</span>}
                {activeOat > 95 && <span className="text-amber-400 font-medium">High heat load — inspect condenser fan operation</span>}
              </div>
            </div>

            {/* ── Scenario picker / active scenario ── */}
            {scenarioMode && (
              <div className="bg-violet-900/30 border border-violet-500/40 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-violet-900/40 border-b border-violet-500/30 flex items-center gap-2">
                  <Target size={13} className="text-violet-400"/>
                  <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Scenario Mode</span>
                </div>
                {!activeScenario ? (
                  <div className="p-3 space-y-2">
                    <p className="text-[11px] text-slate-400 mb-2">Pick a scenario. Readings will update — diagnose using the left panel.</p>
                    {SCENARIOS.map(s => (
                      <button key={s.id} onClick={() => loadScenario(s)}
                        className="w-full text-left px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-white">{s.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                            s.difficulty === 'Beginner' ? 'bg-emerald-500/20 text-emerald-400' :
                            s.difficulty === 'Advanced' ? 'bg-red-500/20 text-red-400' :
                            'bg-amber-500/20 text-amber-400'}`}>{s.difficulty}</span>
                          {s.oat !== undefined && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                              (s.oat ?? 80) <= 32 ? 'bg-blue-500/20 text-blue-300' :
                              (s.oat ?? 80) >= 90 ? 'bg-orange-500/20 text-orange-300' :
                              'bg-slate-700 text-slate-400'}`}>
                              OAT {s.oat}°F
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{s.description}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{activeScenario.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                            activeScenario.difficulty === 'Beginner' ? 'bg-emerald-500/20 text-emerald-400' :
                            activeScenario.difficulty === 'Advanced' ? 'bg-red-500/20 text-red-400' :
                            'bg-amber-500/20 text-amber-400'}`}>{activeScenario.difficulty}</span>
                          {activeScenario.oat !== undefined && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                              (activeScenario.oat ?? 80) <= 32 ? 'bg-blue-500/20 text-blue-300' :
                              (activeScenario.oat ?? 80) >= 90 ? 'bg-orange-500/20 text-orange-300' :
                              'bg-slate-700 text-slate-400'}`}>OAT {activeScenario.oat}°F</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{activeScenario.description}</p>
                      </div>
                      <button onClick={() => setActiveScenario(null)} className="text-slate-500 hover:text-slate-300 text-[10px]">Change</button>
                    </div>

                    {submitted && score && (
                      <div className="mt-3 p-3 rounded-lg bg-slate-800 border border-slate-700 space-y-2">
                        <div className="flex items-center gap-2">
                          <Trophy size={14} className={score.pct >= 80 ? 'text-emerald-400' : score.pct >= 50 ? 'text-amber-400' : 'text-red-400'}/>
                          <span className={`text-sm font-bold ${score.pct >= 80 ? 'text-emerald-400' : score.pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                            Score: {score.pct}%
                          </span>
                          <span className="text-[10px] text-slate-500">{score.correct}/{score.total} fault{score.total > 1 ? 's' : ''} identified</span>
                          {score.fp > 0 && <span className="text-[10px] text-red-400">{score.fp} false positive{score.fp > 1 ? 's' : ''}</span>}
                        </div>
                        {activeScenario.answer.map(key => {
                          const def = FAULT_DEFS.find(d => d.key === key)
                          const hit = userGuess[key]
                          return (
                            <div key={key} className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded-lg ${hit ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                              {hit ? <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0 mt-0.5"/> : <XCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5"/>}
                              <div>
                                <span className={hit ? 'text-emerald-300' : 'text-red-300'}>{def?.label}</span>
                                <span className="text-slate-500 ml-1.5">— {def?.hint}</span>
                              </div>
                            </div>
                          )
                        })}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => loadScenario(activeScenario)} className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg">Try Again</button>
                          <button onClick={() => setActiveScenario(null)} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg">New Scenario</button>
                        </div>
                      </div>
                    )}
                    {!submitted && (
                      <p className="text-[10px] text-slate-500 mt-2">
                        Look at the readings below, then toggle faults in the <strong className="text-slate-400">Your Diagnosis</strong> panel. Hit <strong className="text-slate-400">Submit Diagnosis</strong> when ready.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Active alarms ── */}
            {allAlarms.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-700 flex items-center gap-2">
                  <AlertTriangle size={13} className="text-amber-400"/>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Active Alarms</span>
                  <span className="ml-auto text-[10px] text-slate-500">{allAlarms.length} active</span>
                </div>
                <div className="p-2 space-y-1">
                  {allAlarms.map((a, i) => (
                    <div key={`${a.code}-${i}`} className={`flex items-start gap-2 px-2.5 py-2 rounded-lg text-xs ${a.severity === 'CRITICAL' ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'}`}>
                      <AlertTriangle size={11} className="flex-shrink-0 mt-0.5"/>
                      <div><span className="font-mono font-bold mr-2">{a.code}</span><span>{a.message}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MT Suction + Discharge ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card title="MT Suction Side" icon={<Gauge size={13}/>}>
                <ReadingRow label="Suction pressure" value={`${mt.suctionPsig.toFixed(1)} psig`} sub={`${(mt.suctionPsig + 14.696).toFixed(1)} psia`}
                  dot={dotColor(mt.suctionPsig, SAFETY.lpcoWarnPsig, SAFETY.lpcoPsig, true)}
                  color={statusColor(mt.suctionPsig, SAFETY.lpcoWarnPsig, SAFETY.lpcoPsig, true)} />
                <ReadingRow label="Suction sat temp" value={`${mt.suctionSatTemp.toFixed(1)} °F`} sub="from PT" color="text-slate-300" />
                <ReadingRow label="Suction gas temp" value={`${mt.suctionGasTemp.toFixed(1)} °F`} color="text-slate-300" />
                <ReadingRow label="Suction superheat" value={`${mt.suctionSuperheat.toFixed(1)} °F`}
                  dot={mt.suctionSuperheat > 40 || mt.suctionSuperheat < 5 ? 'bg-amber-400' : 'bg-emerald-500'}
                  color={mt.suctionSuperheat > 40 ? 'text-amber-400' : mt.suctionSuperheat < 5 ? 'text-amber-400' : 'text-emerald-400'}
                  note={mt.suctionSuperheat > 40 ? 'HIGH — check charge/TXV' : mt.suctionSuperheat < 5 ? 'LOW — flood-back risk' : undefined} />
              </Card>

              <Card title="MT Discharge Side" icon={<Thermometer size={13}/>}>
                {/* Expected vs actual discharge banner */}
                <div className={`mx-0 mt-1 mb-2 px-2.5 py-1.5 rounded-lg text-[10px] flex items-center justify-between ${
                  mt.dischargeDeviation > 50 ? 'bg-red-500/15 border border-red-500/30 text-red-300' :
                  mt.dischargeDeviation > 25 ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300' :
                  'bg-slate-700/40 border border-slate-700 text-slate-400'}`}>
                  <span>Expected at {activeOat}°F OAT</span>
                  <span className="font-mono font-semibold">
                    ~{Math.round(mt.expectedDischargePsig)} psig
                    <span className={`ml-2 ${mt.dischargeDeviation > 25 ? 'text-amber-300 font-bold' : mt.dischargeDeviation < -15 ? 'text-blue-300' : 'text-slate-500'}`}>
                      ({mt.dischargeDeviation >= 0 ? '+' : ''}{Math.round(mt.dischargeDeviation)})
                    </span>
                  </span>
                </div>
                <ReadingRow label="Discharge pressure" value={`${mt.dischargePsig.toFixed(1)} psig`} sub={`${(mt.dischargePsig + 14.696).toFixed(1)} psia`}
                  dot={dotColor(mt.dischargePsig, SAFETY.hpcoWarnPsig, SAFETY.hpcoPsig)}
                  color={statusColor(mt.dischargePsig, SAFETY.hpcoWarnPsig, SAFETY.hpcoPsig)}
                  note={mt.nonCondensables ? `≈ ${Math.round(mt.dischargePsig - 28)} psig without non-cond.` : undefined} />
                <ReadingRow label="Condensing sat temp" value={`${mt.condensingTemp.toFixed(1)} °F`} sub="from PT"
                  color={mt.hpCtrlActive ? 'text-amber-400' : 'text-slate-300'}
                  note={mt.hpCtrlActive ? 'HP control active — minimum setpoint' : undefined} />
                <ReadingRow label="Approach ΔT" value={`${mt.approachDelta.toFixed(1)} °F`}
                  dot={mt.approachDelta > 25 ? 'bg-red-500' : mt.approachDelta > 18 ? 'bg-amber-400' : mt.hpCtrlActive ? 'bg-amber-400' : 'bg-emerald-500'}
                  color={mt.approachDelta > 25 ? 'text-red-400' : mt.approachDelta > 18 ? 'text-amber-400' : mt.hpCtrlActive ? 'text-amber-400' : 'text-emerald-400'}
                  note={mt.approachDelta > 25 ? 'High — dirty coil / fan fault' : mt.approachDelta > 18 ? 'Elevated — inspect condenser' : mt.hpCtrlActive ? 'HP ctrl floor — not airside ΔT' : 'Normal (12–18 °F clean rack)'} />
                <ReadingRow label="Discharge temp" value={`${Math.round(mt.dischargeTemp)} °F`}
                  dot={dotColor(mt.dischargeTemp, SAFETY.warnDischargeF, SAFETY.highDischargeF)}
                  color={statusColor(mt.dischargeTemp, SAFETY.warnDischargeF, SAFETY.highDischargeF)}
                  note={mt.dischargeTemp >= SAFETY.highDischargeF ? 'Liquid injection active' : undefined} />
                <ReadingRow label="Discharge superheat" value={`${mt.dischargeSuperheat.toFixed(0)} °F`} color="text-slate-300" />
                <ReadingRow label="Compression ratio" value={`${mt.compressionRatio.toFixed(2)} : 1`}
                  color={mt.compressionRatio > 10 ? 'text-red-400' : mt.compressionRatio > 8 ? 'text-amber-400' : 'text-slate-300'} />
              </Card>
            </div>

            {/* ── Liquid line + Oil ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card title="Liquid Line" icon={<Activity size={13}/>}>
                <ReadingRow label="Liquid line pressure" value={`${mt.liquidLinePsig.toFixed(1)} psig`}
                  sub="discharge − 8 psig loss"
                  color="text-slate-300" />
                <ReadingRow label="Liquid line temp" value={`${mt.liquidTemp.toFixed(1)} °F`} color="text-slate-300" />
                <ReadingRow label="Subcooling" value={`${mt.subcooling.toFixed(1)} °F`}
                  dot={mt.subcooling < 3 ? 'bg-red-500' : mt.subcooling < 8 ? 'bg-amber-400' : mt.subcooling > 30 ? 'bg-amber-400' : 'bg-emerald-500'}
                  color={mt.subcooling < 3 ? 'text-red-400' : mt.subcooling < 8 ? 'text-amber-400' : mt.subcooling > 30 ? 'text-amber-400' : 'text-emerald-400'}
                  note={mt.subcooling < 2 ? 'Flash gas — check charge' : mt.subcooling > 25 ? 'High SC — liquid stacking (low ambient?)' : undefined} />
                {mt.filterDrierDeltaT > 0 && (
                  <ReadingRow label="Drier ΔT (in→out)" value={`${mt.filterDrierDeltaT} °F`} dot="bg-amber-400" color="text-amber-400" note="Restricted — replace core" />
                )}
                <ReadingRow label="Sight glass" value={mt.subcooling < 2 ? 'BUBBLES' : mt.subcooling < 6 ? 'CLOUDY' : 'CLEAR'}
                  color={mt.subcooling < 2 ? 'text-red-400' : mt.subcooling < 6 ? 'text-amber-400' : 'text-emerald-400'} />
                <ReadingRow label="Outdoor ambient" value={`${activeOat} °F`}
                  color={oatColor} />
              </Card>

              <Card title="Oil System (Y825 Valve)" icon={<Wind size={13}/>}>
                <ReadingRow label="Oil diff pressure" value={`${mt.oilDiff.toFixed(0)} psi`}
                  dot={dotColor(mt.oilDiff, SAFETY.oilWarnDiff, SAFETY.oilTripDiff, true)}
                  color={statusColor(mt.oilDiff, SAFETY.oilWarnDiff, SAFETY.oilTripDiff, true)}
                  note={mt.oilDiff <= SAFETY.oilTripDiff ? 'OFC will trip compressor' : mt.oilDiff <= SAFETY.oilWarnDiff ? 'Low — adjust Y825' : 'Normal 20–25 psi above suction'} />
                <ReadingRow label="Oil pressure (abs)" value={`${mt.oilPressurePsig.toFixed(0)} psig`} color="text-slate-300" />
                <div className="py-1 text-[10px] text-slate-500 leading-relaxed mt-0.5">
                  Y825 target: {Math.round(mt.suctionPsig)} + 20–25 = {Math.round(mt.suctionPsig + 20)}–{Math.round(mt.suctionPsig + 25)} psig
                </div>
              </Card>
            </div>

            {/* ── MT Compressors ── */}
            <Card title="MT Compressors — 4 × Copeland Scroll" icon={<Zap size={13}/>}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
                {mt.compRunning.map((running, i) => (
                  <div key={i} className={`rounded-lg p-2.5 border text-center ${running ? 'bg-slate-700/40 border-slate-600' : 'bg-red-500/10 border-red-500/40'}`}>
                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                      <div className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}/>
                      <span className="text-[10px] font-semibold text-slate-300">COMP {i + 1}</span>
                    </div>
                    <div className={`text-sm font-mono font-bold ${running ? 'text-white' : 'text-red-400'}`}>
                      {running ? `${mt.compAmps[i].toFixed(1)} A` : 'OFF'}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{running ? 'Running' : 'Tripped'}</div>
                  </div>
                ))}
              </div>
              <div className="mt-1 py-1 border-t border-slate-700/50 flex items-center gap-4 text-[10px] text-slate-500">
                <span><span className="text-slate-400 font-medium">{mt.compRunning.filter(Boolean).length}</span> of 4 running</span>
                <span>Total: <span className="text-slate-400 font-medium">{mt.compAmps.reduce((s, a) => s + a, 0).toFixed(1)} A</span></span>
                {mt.compRunning.filter(Boolean).length < 4 && <span className="text-amber-400">↑ Remaining amps elevated</span>}
              </div>
            </Card>

            {/* ── LT Booster ── */}
            <Card title="LT Booster Circuit — 2 × Scroll (−20 °F SST setpoint)" icon={<Zap size={13}/>}
              accent="bg-blue-900/40 border-blue-700/50" className="border-blue-700/40">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 py-1">
                <div>
                  <ReadingRow label="LT suction pressure" value={`${lt.suctionPsig.toFixed(1)} psig`} sub={`${(lt.suctionPsig + 14.696).toFixed(1)} psia`}
                    dot={dotColor(lt.suctionPsig, LT_SAFETY.lpcoWarnPsig, LT_SAFETY.lpcoPsig, true)}
                    color={statusColor(lt.suctionPsig, LT_SAFETY.lpcoWarnPsig, LT_SAFETY.lpcoPsig, true)} />
                  <ReadingRow label="LT suction sat temp" value={`${lt.suctionSatTemp.toFixed(1)} °F`} sub="from PT" color="text-slate-300" />
                  <ReadingRow label="LT superheat" value={`${lt.superheat.toFixed(1)} °F`}
                    dot={lt.superheat > 25 ? 'bg-amber-400' : lt.superheat < 5 ? 'bg-amber-400' : 'bg-emerald-500'}
                    color={lt.superheat > 25 ? 'text-amber-400' : lt.superheat < 5 ? 'text-amber-400' : 'text-emerald-400'}
                    note={lt.superheat > 25 ? 'HIGH — check TXV/charge' : undefined} />
                  <ReadingRow label="LT compression ratio" value={`${lt.compressionRatio.toFixed(2)} : 1`} color="text-slate-300" />
                </div>
                <div>
                  <ReadingRow label="LT discharge (→MT suction)" value={`${lt.dischargePsig.toFixed(1)} psig`} sub={`${lt.dischargeSatTemp.toFixed(0)} °F sat`} color="text-blue-300" />
                  <ReadingRow label="LT discharge temp" value={`${Math.round(lt.dischargeTemp)} °F`} color="text-slate-300" />
                  <ReadingRow label="LT case temp (avg)" value={`${lt.caseTemp.toFixed(1)} °F`}
                    dot={lt.caseTemp >= LT_SAFETY.highCaseTemp ? 'bg-red-500' : lt.caseTemp >= LT_SAFETY.warnCaseTemp ? 'bg-amber-400' : 'bg-emerald-500'}
                    color={lt.caseTemp >= LT_SAFETY.highCaseTemp ? 'text-red-400' : lt.caseTemp >= LT_SAFETY.warnCaseTemp ? 'text-amber-400' : 'text-emerald-400'}
                    note={lt.caseTemp >= LT_SAFETY.highCaseTemp ? 'Frozen food at risk!' : undefined} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 mt-1 border-t border-slate-700/50">
                {lt.compRunning.map((running, i) => (
                  <div key={i} className={`rounded-lg p-2 border text-center ${running ? 'bg-slate-700/40 border-slate-600' : 'bg-red-500/10 border-red-500/40'}`}>
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <div className={`w-2 h-2 rounded-full ${running ? 'bg-blue-400 animate-pulse' : 'bg-red-500'}`}/>
                      <span className="text-[10px] font-semibold text-slate-300">LT BOOST {i + 1}</span>
                    </div>
                    <div className={`text-sm font-mono font-bold ${running ? 'text-blue-200' : 'text-red-400'}`}>
                      {running ? `${lt.compAmps[i].toFixed(1)} A` : 'OFF'}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{running ? 'Running' : 'Tripped'}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Store Load Profile ── */}
            <Card title="Store Load Profile — Case Temperatures" icon={<Package size={13}/>}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 pt-1">
                {/* MT cases */}
                <div>
                  <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mb-2">MT Circuit — Medium Temp</p>
                  {STORE_LINEUP.filter(s => s.circuit === 'MT').map(s => {
                    const idx  = STORE_LINEUP.indexOf(s)
                    const temp = caseTemps[idx]
                    return (
                      <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-slate-700/30 last:border-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${caseDotColor(temp, s)}`}/>
                          <div className="min-w-0">
                            <span className="text-xs text-slate-300 font-medium">{s.name}</span>
                            <span className="text-[9px] text-slate-500 ml-1">× {s.count} {s.equipment}</span>
                          </div>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <span className={`text-sm font-mono font-bold tabular-nums ${caseTempColor(temp, s)}`}>{temp.toFixed(1)}°F</span>
                          <div className="text-[9px] text-slate-600">tgt {s.setpoint}°F</div>
                        </div>
                      </div>
                    )
                  })}
                  <div className="text-[9px] text-slate-600 mt-1.5">⚠ Food safety: &gt;45 °F</div>
                </div>

                {/* LT cases */}
                <div className="mt-4 sm:mt-0">
                  <p className="text-[9px] font-semibold text-blue-500/70 uppercase tracking-widest mb-2">LT Circuit — Frozen Food</p>
                  {STORE_LINEUP.filter(s => s.circuit === 'LT').map(s => {
                    const idx  = STORE_LINEUP.indexOf(s)
                    const temp = caseTemps[idx]
                    return (
                      <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-slate-700/30 last:border-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${caseDotColor(temp, s)}`}/>
                          <div className="min-w-0">
                            <span className="text-xs text-slate-300 font-medium">{s.name}</span>
                            <span className="text-[9px] text-slate-500 ml-1">× {s.count} {s.equipment}</span>
                          </div>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <span className={`text-sm font-mono font-bold tabular-nums ${caseTempColor(temp, s)}`}>{temp.toFixed(1)}°F</span>
                          <div className="text-[9px] text-slate-600">tgt {s.setpoint}°F</div>
                        </div>
                      </div>
                    )
                  })}
                  <div className="text-[9px] text-slate-600 mt-1.5">⚠ Food safety: &gt;10 °F (frozen)</div>
                </div>
              </div>
            </Card>

            {/* ── Reference + Instructor reveal ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card title="Normal Ranges" icon={<Info size={13}/>}>
                <div className="text-[10px] text-slate-500 space-y-0.5 py-1 leading-relaxed">
                  <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">MT Circuit — {rackConfig.mtSuctionPsig} psig / {mtSatSetpoint.toFixed(1)}°F SST</div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400">Suction setpoint</span><span>{rackConfig.mtSuctionPsig} psig ({mtSatSetpoint.toFixed(1)}°F)</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400">Discharge (HP ctrl)</span><span>{rackConfig.hpCtrlPsig} psig min</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400">Suction SH</span><span>15–25 °F</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400">Subcooling</span><span>10–20 °F</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400">Discharge temp</span><span>130–200 °F</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400">Oil diff</span><span>20–25 psi (Y825)</span></div>
                  <div className="text-[9px] font-semibold text-blue-400 uppercase tracking-wider mt-2 mb-1">LT Booster — {rackConfig.ltSuctionPsig} psig / {ltSatSetpoint.toFixed(1)}°F SST</div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400">LT suction setpoint</span><span>{rackConfig.ltSuctionPsig} psig ({ltSatSetpoint.toFixed(1)}°F)</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400">LT ratio</span><span>2.0–3.5 : 1</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400">LT superheat</span><span>10–20 °F</span></div>
                  <div className="text-[9px] font-semibold text-cyan-400 uppercase tracking-wider mt-2 mb-1">HP Control — {rackConfig.hpCtrlPsig} psig</div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400">Min cond sat</span><span>{hpCtrlSatTemp.toFixed(1)}°F ({rackConfig.hpCtrlPsig} psig)</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400">Activates below OAT</span><span>~{Math.round(hpCtrlSatTemp - 15)}°F</span></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-400">Typical range</span><span>155–175 psig</span></div>
                </div>
              </Card>

              {!scenarioMode ? (
                <div className="space-y-3">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-300 font-medium">Instructor mode — reveal active faults</p>
                      <p className="text-[10px] text-slate-500">Use after trainee gives their diagnosis</p>
                    </div>
                    <button
                      onClick={() => setRevealFaults(v => !v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${revealFaults ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      {revealFaults ? 'Hide faults' : 'Reveal faults'}
                    </button>
                  </div>
                  {revealFaults && (
                    <div className="bg-slate-800 border border-amber-500/30 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-2">Active faults · OAT {activeOat} °F</p>
                      {activeFaultCount === 0 ? (
                        <p className="text-xs text-slate-400 italic">No faults active — system in normal operation</p>
                      ) : (
                        <div className="space-y-1">
                          {FAULT_DEFS.filter(d => faults[d.key]).map(d => (
                            <div key={d.key} className="flex items-start gap-2 text-xs text-amber-300">
                              <AlertTriangle size={11} className="flex-shrink-0 mt-0.5 text-amber-500"/>
                              <div><span className="font-medium">{d.label}</span><span className="text-amber-400/60 ml-1.5">— {d.hint}</span></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-center">
                  <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                    Instructor reveal disabled in scenario mode.<br/>Exit scenario mode to use it.
                  </p>
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-600 text-center pb-2 leading-relaxed">
              Based on Hussmann Parallel Rack Systems I/O Manual P/N 0427598_E · R-404A · MT 20 °F SST / LT −20 °F SST ·
              Setpoints are typical — actual values on equipment setup sheet inside electrical cabinet
            </div>

          </div>
          </div>
          )}

        </div>
      </div>
    </div>
  )
}
