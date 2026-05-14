'use client'
export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home, RotateCcw, AlertTriangle, CheckCircle2, XCircle,
  Thermometer, Gauge, Wind, Zap, Activity, Info,
  ChevronUp, MessageSquare, Trophy, Target, Package,
} from 'lucide-react'

// ── R-404A Saturation P-T table (psia) — extended to 150 °F ─────────────────
const R404A_PT: [number, number][] = [
  [-40, 10.5], [-35, 12.0], [-30, 13.8], [-25, 15.8], [-20, 17.9],
  [-15, 20.4], [-10, 23.1], [-5,  26.1], [0,   29.4], [5,   33.1],
  [10,  37.1], [15,  41.5], [20,  46.4], [25,  51.6], [30,  57.4],
  [35,  63.6], [40,  70.4], [45,  77.7], [50,  85.7], [55,  94.2],
  [60, 103.4], [65, 113.3], [70, 123.9], [75, 135.3], [80, 147.5],
  [85, 160.5], [90, 174.4], [95, 189.1], [100,204.8], [105,221.4],
  [110,239.0], [115,257.7], [120,277.4], [125,298.2], [130,320.2],
  [135,342.0], [140,365.0], [145,390.0], [150,416.0],
]

function ptLookup(tempF: number): number {
  if (tempF <= R404A_PT[0][0]) return R404A_PT[0][1]
  if (tempF >= R404A_PT[R404A_PT.length - 1][0]) return R404A_PT[R404A_PT.length - 1][1]
  for (let i = 0; i < R404A_PT.length - 1; i++) {
    const [t0, p0] = R404A_PT[i]
    const [t1, p1] = R404A_PT[i + 1]
    if (tempF >= t0 && tempF <= t1) {
      const frac = (tempF - t0) / (t1 - t0)
      return p0 + frac * (p1 - p0)
    }
  }
  return R404A_PT[0][1]
}

const toGauge = (psia: number) => Math.max(psia - 14.696, 0)

// Reverse PT lookup — convert gauge pressure (psig) → saturation temperature (°F)
function ptReverse(psig: number): number {
  const psia = psig + 14.696
  if (psia <= R404A_PT[0][1]) return R404A_PT[0][0]
  if (psia >= R404A_PT[R404A_PT.length - 1][1]) return R404A_PT[R404A_PT.length - 1][0]
  for (let i = 0; i < R404A_PT.length - 1; i++) {
    const [t0, p0] = R404A_PT[i]
    const [t1, p1] = R404A_PT[i + 1]
    if (psia >= p0 && psia <= p1) return t0 + (psia - p0) / (p1 - p0) * (t1 - t0)
  }
  return R404A_PT[0][0]
}

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
  { key: 'comp1Failed',         label: 'Compressor 1 failed',           hint: 'Off on safety — remaining 3 carry the load',                 group: 'Compressors' },
  { key: 'comp2Failed',         label: 'Compressor 2 failed',           hint: 'Off on safety — remaining carry the load',                   group: 'Compressors' },
  { key: 'comp3Failed',         label: 'Compressor 3 failed',           hint: 'Off on safety — remaining carry the load',                   group: 'Compressors' },
  { key: 'comp4Failed',         label: 'Compressor 4 failed',           hint: 'Off on safety — remaining carry the load',                   group: 'Compressors' },
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
const HP_CTRL_MIN_COND_SAT = 85  // °F sat ≈ 146 psig

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
  lpcoPsig:     1.0,
  lpcoWarnPsig: 2.5,
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
  alarms: Alarm[]
}

interface LTState {
  suctionSatTemp: number; suctionPsig: number; suctionGasTemp: number; superheat: number
  dischargeSatTemp: number; dischargePsig: number; dischargeTemp: number; compressionRatio: number
  compRunning: boolean[]; compAmps: number[]
  caseTemp: number; alarms: Alarm[]
}

// ── MT compute ────────────────────────────────────────────────────────────────
function computeMT(f: FaultState, oat: number, hpCtrlSatTemp: number, mtSatSetpoint: number): SystemState {
  // Condenser approach delta — starts at 15 °F (clean coil, all fans running)
  let approachDelta      = 15
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
  if (f.dirtyCondenser) { approachDelta += 14; dischargeSuperheat += 8; ampsMultiplier *= 1.07 }
  const fansFailed = (f.fan1Failed ? 1 : 0) + (f.fan2Failed ? 1 : 0)
  if (fansFailed === 1) { approachDelta += 9;  dischargeSuperheat += 6;  ampsMultiplier *= 1.05 }
  if (fansFailed === 2) { approachDelta += 26; dischargeSuperheat += 20; ampsMultiplier *= 1.13 }

  // Head pressure control floor — fans cycle off / HP valve modulates to maintain minimum
  const rawCondensingTemp = oat + approachDelta
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

  // ── Clamp ─────────────────────────────────────────────────────────────────
  subcooling        = Math.max(subcooling, 0.3)
  superheat         = Math.max(superheat, 0)
  oilDiff           = Math.max(oilDiff, 0)
  condensingSatTemp = Math.max(condensingSatTemp, suctionSatTemp + 20)

  // ── Derived values ────────────────────────────────────────────────────────
  const suctionPsia       = ptLookup(suctionSatTemp)
  const dischargePsia     = ptLookup(condensingSatTemp)
  const suctionPsig       = Math.max(toGauge(suctionPsia), 0.1)
  const dischargePsig     = toGauge(dischargePsia) + ncExtraGauge
  const compressionRatio  = (dischargePsig + 14.696) / (suctionPsig + 14.696)
  const suctionGasTemp    = suctionSatTemp + superheat
  const liquidTemp        = condensingSatTemp - subcooling
  const dischargeTemp     = condensingSatTemp + dischargeSuperheat
  const filterDrierDeltaT = f.filterDrierRestricted ? 9 : 0
  const oilPressurePsig   = suctionPsig + oilDiff
  const compAmps          = compRunning.map(r => r ? Math.round(BASELINE.baseAmps * ampsMultiplier * 10) / 10 : 0)

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
    nonCondensables: f.nonCondensables, hpCtrlActive, alarms,
  }
}

// ── LT Booster compute ────────────────────────────────────────────────────────
function computeLT(f: FaultState, mtSuctionSatTemp: number, ltSatSetpoint: number): LTState {
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
  const suctionPsia      = ptLookup(suctionSatTemp)
  const dischargePsia    = ptLookup(dischargeSatTemp)
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
]

// ── Diagnose text ─────────────────────────────────────────────────────────────
function buildDiagnoseText(mt: SystemState, lt: LTState, oat: number, caseTemps: number[]): string {
  const allAlarms = [...mt.alarms, ...lt.alarms]
  const mtCases   = STORE_LINEUP.filter(s => s.circuit === 'MT')
  const ltCases   = STORE_LINEUP.filter(s => s.circuit === 'LT')
  return [
    '=== ColdIQ Rack Simulator — Diagnostic Snapshot ===',
    'System: Hussmann Parallel Rack | R-404A | MT + LT Booster',
    '',
    `ENVIRONMENT:`,
    `  Outdoor Ambient Temp (OAT): ${oat} °F`,
    `  Head Pressure Control: ${mt.hpCtrlActive ? `ACTIVE — holding condensing at ${Math.round(mt.condensingTemp)}°F sat min` : 'Off (OAT above minimum)'}`,
    '',
    `MT CIRCUIT (Setpoint: 20 °F SST / ${toGauge(ptLookup(20)).toFixed(1)} psig):`,
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
    `LT BOOSTER CIRCUIT (Setpoint: −20 °F SST / ${toGauge(ptLookup(-20)).toFixed(1)} psig):`,
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
    hpCtrlPsig:    165,  // HP control minimum discharge set point (psig)
    mtSuctionPsig:  32,  // MT suction set point (psig) — ~20 °F SST on R-404A
    ltSuctionPsig:   3,  // LT booster suction set point (psig) — ~−20 °F SST on R-404A
  })

  // Scenario state
  const [scenarioMode,   setScenarioMode]   = useState(false)
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)
  const [userGuess,      setUserGuess]      = useState<FaultState>(INITIAL_FAULTS)
  const [submitted,      setSubmitted]      = useState(false)

  // Active values — scenarios override free-play faults and OAT
  const activeFaults = scenarioMode && activeScenario ? { ...INITIAL_FAULTS, ...activeScenario.faults } : faults
  const activeOat    = scenarioMode ? (activeScenario?.oat ?? 80) : oat

  // Derive sat-temp equivalents from the configured psig set points
  const hpCtrlSatTemp  = ptReverse(rackConfig.hpCtrlPsig)
  const mtSatSetpoint  = ptReverse(rackConfig.mtSuctionPsig)
  const ltSatSetpoint  = ptReverse(rackConfig.ltSuctionPsig)

  const mt = useMemo(() => computeMT(activeFaults, activeOat, hpCtrlSatTemp, mtSatSetpoint), [activeFaults, activeOat, hpCtrlSatTemp, mtSatSetpoint])
  const lt = useMemo(() => computeLT(activeFaults, mt.suctionSatTemp, ltSatSetpoint), [activeFaults, mt.suctionSatTemp, ltSatSetpoint])

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
  function diagnoseInColdIQ() {
    try { localStorage.setItem('coldiq_prefill', buildDiagnoseText(mt, lt, activeOat, caseTemps)) } catch { /* ignore */ }
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

  // Clean-condenser condensing sat for reference (HP ctrl floor applied)
  const cleanCondensingPsig = Math.round(toGauge(ptLookup(Math.max(activeOat + 15, hpCtrlSatTemp))))

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col">

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-2 flex-wrap z-10">
        <button onClick={() => router.push('/')} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
          <Home size={16}/>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-sm font-semibold text-white">Hussmann Parallel Rack · R-404A · MT + LT</h1>
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
          <MessageSquare size={12}/> Diagnose
        </button>

        <button
          onClick={scenarioMode ? exitScenarioMode : enterScenarioMode}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            scenarioMode ? 'bg-violet-600 text-white border-violet-500' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600'
          }`}
        >
          <Target size={12}/> {scenarioMode ? 'Exit Scenario' : 'Scenario Mode'}
        </button>

        {!scenarioMode && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
          >
            <RotateCcw size={12}/> Reset
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel — fault injection / diagnosis ── */}
        <div className={`${showFaults ? 'flex' : 'hidden'} md:flex flex-col w-56 lg:w-60 flex-shrink-0 bg-slate-800 border-r border-slate-700 overflow-y-auto`}>
          <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {scenarioMode ? '🎯 Your Diagnosis' : 'Fault Injection'}
            </span>
            <button onClick={() => setShowFaults(false)} className="md:hidden text-slate-500 hover:text-white">
              <ChevronUp size={14}/>
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

                {/* HP Control Set Point */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">HP Control Set Point</span>
                    <span className="text-[11px] font-mono font-semibold text-amber-300">{rackConfig.hpCtrlPsig} psig</span>
                  </div>
                  <input
                    type="range" min={130} max={200} step={5}
                    value={rackConfig.hpCtrlPsig}
                    onChange={e => setRackConfig(c => ({ ...c, hpCtrlPsig: Number(e.target.value) }))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                    <span>130</span>
                    <span className="text-slate-500">
                      {hpCtrlSatTemp.toFixed(1)}°F sat · fans cycle below OAT ~{Math.round(hpCtrlSatTemp - 15)}°F
                    </span>
                    <span>200</span>
                  </div>
                </div>

                {/* MT Suction Set Point */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">MT Suction Set Point</span>
                    <span className="text-[11px] font-mono font-semibold text-emerald-300">{rackConfig.mtSuctionPsig} psig</span>
                  </div>
                  <input
                    type="range" min={20} max={45} step={1}
                    value={rackConfig.mtSuctionPsig}
                    onChange={e => setRackConfig(c => ({ ...c, mtSuctionPsig: Number(e.target.value) }))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                    <span>20</span>
                    <span className="text-slate-500">{mtSatSetpoint.toFixed(1)}°F SST</span>
                    <span>45</span>
                  </div>
                </div>

                {/* LT Suction Set Point */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">LT Suction Set Point</span>
                    <span className="text-[11px] font-mono font-semibold text-blue-300">{rackConfig.ltSuctionPsig} psig</span>
                  </div>
                  <input
                    type="range" min={1} max={10} step={1}
                    value={rackConfig.ltSuctionPsig}
                    onChange={e => setRackConfig(c => ({ ...c, ltSuctionPsig: Number(e.target.value) }))}
                    className="w-full accent-blue-400"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                    <span>1</span>
                    <span className="text-slate-500">{ltSatSetpoint.toFixed(1)}°F SST</span>
                    <span>10</span>
                  </div>
                </div>

                <button
                  onClick={() => setRackConfig({ hpCtrlPsig: 165, mtSuctionPsig: 32, ltSuctionPsig: 3 })}
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

        {/* ── Mobile fault toggle button ── */}
        <button
          onClick={() => setShowFaults(v => !v)}
          className="md:hidden fixed bottom-4 right-4 z-20 bg-amber-500 text-white rounded-full px-4 py-2 text-xs font-semibold shadow-lg flex items-center gap-1.5"
        >
          <Zap size={12}/>
          {showFaults ? 'Hide' : scenarioMode ? 'Diagnose' : `Faults${activeFaultCount > 0 ? ` (${activeFaultCount})` : ''}`}
        </button>

        {/* ── Readings panel ── */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
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

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-500 w-12 text-right flex-shrink-0">−20 °F</span>
                <input
                  type="range" min={-20} max={115} step={5}
                  value={activeOat}
                  onChange={e => setOat(Number(e.target.value))}
                  disabled={scenarioMode}
                  className="flex-1 accent-blue-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-500 w-10 flex-shrink-0">115 °F</span>
                <span className={`text-2xl font-bold font-mono tabular-nums w-20 text-right flex-shrink-0 ${oatColor}`}>
                  {activeOat}°F
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] text-slate-500">
                <span>
                  HP Control:{' '}
                  <span className={mt.hpCtrlActive ? 'text-amber-400 font-medium' : 'text-slate-500'}>
                    {mt.hpCtrlActive
                      ? `Active — holding ${Math.round(mt.condensingTemp)}°F sat / ${Math.round(toGauge(ptLookup(mt.condensingTemp)))} psig (set ${rackConfig.hpCtrlPsig} psig)`
                      : `Off (set point ${rackConfig.hpCtrlPsig} psig / ${hpCtrlSatTemp.toFixed(1)}°F sat)`}
                  </span>
                </span>
                <span>
                  Expected discharge at this OAT:{' '}
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
                <ReadingRow label="Discharge pressure" value={`${mt.dischargePsig.toFixed(1)} psig`} sub={`${(mt.dischargePsig + 14.696).toFixed(1)} psia`}
                  dot={dotColor(mt.dischargePsig, SAFETY.hpcoWarnPsig, SAFETY.hpcoPsig)}
                  color={statusColor(mt.dischargePsig, SAFETY.hpcoWarnPsig, SAFETY.hpcoPsig)}
                  note={mt.nonCondensables ? `≈ ${Math.round(mt.dischargePsig - 28)} psig without non-cond.` : undefined} />
                <ReadingRow label="Condensing sat temp" value={`${mt.condensingTemp.toFixed(1)} °F`} sub="from PT"
                  color={mt.hpCtrlActive ? 'text-amber-400' : 'text-slate-300'}
                  note={mt.hpCtrlActive ? 'HP control active — minimum setpoint' : undefined} />
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
              <Card title="R-404A Normal Ranges" icon={<Info size={13}/>}>
                <div className="text-[10px] text-slate-500 space-y-0.5 py-1 leading-relaxed">
                  <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">MT Circuit — configured {rackConfig.mtSuctionPsig} psig / {mtSatSetpoint.toFixed(1)}°F SST</div>
                  <div><span className="text-slate-400 w-32 inline-block">Suction setpoint</span> {rackConfig.mtSuctionPsig} psig ({mtSatSetpoint.toFixed(1)}°F sat)</div>
                  <div><span className="text-slate-400 w-32 inline-block">Discharge (HP ctrl)</span> {rackConfig.hpCtrlPsig} psig min</div>
                  <div><span className="text-slate-400 w-32 inline-block">Suction SH</span> 15–25 °F</div>
                  <div><span className="text-slate-400 w-32 inline-block">Subcooling</span> 10–20 °F (clear glass)</div>
                  <div><span className="text-slate-400 w-32 inline-block">Discharge temp</span> 130–200 °F</div>
                  <div><span className="text-slate-400 w-32 inline-block">Oil diff</span> 20–25 psi (Y825)</div>
                  <div className="text-[9px] font-semibold text-blue-400 uppercase tracking-wider mt-2 mb-1">LT Booster — configured {rackConfig.ltSuctionPsig} psig / {ltSatSetpoint.toFixed(1)}°F SST</div>
                  <div><span className="text-slate-400 w-32 inline-block">LT suction setpoint</span> {rackConfig.ltSuctionPsig} psig ({ltSatSetpoint.toFixed(1)}°F sat)</div>
                  <div><span className="text-slate-400 w-32 inline-block">LT ratio</span> 2.0–3.5 : 1</div>
                  <div><span className="text-slate-400 w-32 inline-block">LT superheat</span> 10–20 °F</div>
                  <div className="text-[9px] font-semibold text-cyan-400 uppercase tracking-wider mt-2 mb-1">HP Control — configured {rackConfig.hpCtrlPsig} psig</div>
                  <div><span className="text-slate-400 w-32 inline-block">Min cond sat</span> {hpCtrlSatTemp.toFixed(1)}°F sat ({rackConfig.hpCtrlPsig} psig)</div>
                  <div><span className="text-slate-400 w-32 inline-block">Activates below</span> OAT ~{Math.round(hpCtrlSatTemp - 15)}°F (clean rack)</div>
                  <div><span className="text-slate-400 w-32 inline-block">Typical range</span> 155–175 psig (rack setup sheet)</div>
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
      </div>
    </div>
  )
}
