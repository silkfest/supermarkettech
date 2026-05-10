'use client'
export const dynamic = 'force-dynamic'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home, ArrowLeft, RotateCcw, AlertTriangle, CheckCircle2,
  Thermometer, Gauge, Wind, Zap, Activity, Info, ChevronDown, ChevronUp,
} from 'lucide-react'

// ── R-404A Saturation P-T table (psia) ───────────────────────────────────────
// Source: ASHRAE refrigerant property data. Display in psig (= psia - 14.696).
const R404A_PT: [number, number][] = [
  [-40, 10.5], [-35, 12.0], [-30, 13.8], [-25, 15.8], [-20, 17.9],
  [-15, 20.4], [-10, 23.1], [-5,  26.1], [0,   29.4], [5,   33.1],
  [10,  37.1], [15,  41.5], [20,  46.4], [25,  51.6], [30,  57.4],
  [35,  63.6], [40,  70.4], [45,  77.7], [50,  85.7], [55,  94.2],
  [60, 103.4], [65, 113.3], [70, 123.9], [75, 135.3], [80, 147.5],
  [85, 160.5], [90, 174.4], [95, 189.1], [100,204.8], [105,221.4],
  [110,239.0], [115,257.7], [120,277.4], [125,298.2], [130,320.2],
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

/** Convert psia → psig */
const toGauge = (psia: number) => Math.max(psia - 14.696, 0)

// ── Fault state ───────────────────────────────────────────────────────────────

type FaultKey =
  | 'highAmbient' | 'poorVentilation'
  | 'dirtyCondenser' | 'fan1Failed' | 'fan2Failed'
  | 'underchargeModerate' | 'underchargeSevere' | 'overcharge'
  | 'filterDrierRestricted'
  | 'comp1Failed' | 'comp2Failed' | 'comp3Failed' | 'comp4Failed'
  | 'txvNotFeeding' | 'defrostStuckOn'
  | 'oilLow' | 'nonCondensables'

type FaultState = Record<FaultKey, boolean>

const INITIAL_FAULTS: FaultState = {
  highAmbient: false, poorVentilation: false,
  dirtyCondenser: false, fan1Failed: false, fan2Failed: false,
  underchargeModerate: false, underchargeSevere: false, overcharge: false,
  filterDrierRestricted: false,
  comp1Failed: false, comp2Failed: false, comp3Failed: false, comp4Failed: false,
  txvNotFeeding: false, defrostStuckOn: false,
  oilLow: false, nonCondensables: false,
}

interface FaultDef {
  key: FaultKey
  label: string
  hint: string
  group: string
  mutuallyExcludes?: FaultKey[]
}

const FAULT_DEFS: FaultDef[] = [
  // Environment
  { key: 'highAmbient',       label: 'High ambient (+20 °F)',  hint: '80 → 100 °F outdoor — hot summer day',               group: 'Environment' },
  { key: 'poorVentilation',   label: 'Poor machine room vent', hint: 'Warm room heats compressors — discharge temp rises',  group: 'Environment' },
  // Condenser
  { key: 'dirtyCondenser',    label: 'Dirty condenser coil',   hint: 'Fouled fins increase approach ΔT by ~15 °F',          group: 'Condenser' },
  { key: 'fan1Failed',        label: 'Condenser fan #1 failed',hint: 'Loses ~50 % airflow — head pressure rises',           group: 'Condenser' },
  { key: 'fan2Failed',        label: 'Condenser fan #2 failed',hint: 'Both fans out: severe head pressure rise',            group: 'Condenser' },
  // Refrigerant charge
  { key: 'underchargeModerate', label: 'Undercharge (moderate ~15 %)', hint: 'Low suction, high SH, subcooling drops',         group: 'Charge', mutuallyExcludes: ['underchargeSevere', 'overcharge'] },
  { key: 'underchargeSevere',   label: 'Undercharge (severe ~30 %)',   hint: 'Very high SH, near-zero SC, flash gas in sight glass', group: 'Charge', mutuallyExcludes: ['underchargeModerate', 'overcharge'] },
  { key: 'overcharge',          label: 'Overcharge (~15 %)',           hint: 'High head, very high SC, low SH, flood-back risk',    group: 'Charge', mutuallyExcludes: ['underchargeModerate', 'underchargeSevere'] },
  // Liquid line
  { key: 'filterDrierRestricted', label: 'Filter drier restricted',  hint: 'Temp drop across drier, starved TXVs, high SH',  group: 'Liquid line' },
  // Compressors
  { key: 'comp1Failed', label: 'Compressor 1 failed', hint: 'Off on safety — remaining 3 carry the load', group: 'Compressors' },
  { key: 'comp2Failed', label: 'Compressor 2 failed', hint: 'Off on safety — remaining carry the load',   group: 'Compressors' },
  { key: 'comp3Failed', label: 'Compressor 3 failed', hint: 'Off on safety — remaining carry the load',   group: 'Compressors' },
  { key: 'comp4Failed', label: 'Compressor 4 failed', hint: 'Off on safety — remaining carry the load',   group: 'Compressors' },
  // Load / TXV
  { key: 'txvNotFeeding',   label: 'TXV not feeding',        hint: 'Cases starved — suction drops, high SH, rising case temps', group: 'Load / TXV' },
  { key: 'defrostStuckOn',  label: 'Defrost stuck on',       hint: 'One circuit won\'t terminate — suction rises, case warms',  group: 'Load / TXV' },
  // Oil & misc
  { key: 'oilLow',           label: 'Low oil (Y825 fault)',   hint: 'Oil differential below 10 psi — OFC will trip compressor',  group: 'Oil / Misc' },
  { key: 'nonCondensables',  label: 'Non-condensables',       hint: 'Air in system — high discharge pressure vs temperature',   group: 'Oil / Misc' },
]

const FAULT_GROUPS = ['Environment', 'Condenser', 'Charge', 'Liquid line', 'Compressors', 'Load / TXV', 'Oil / Misc']

// ── Physics model ─────────────────────────────────────────────────────────────

// Hussmann parallel rack R-404A baseline — MT circuit (0 °F to 40 °F application)
// Suction setpoint per setup sheet: 10 °F sat (22.4 psig). HP/LP cutouts on setup sheet.
// Y825 oil diff valve: 20–25 psi above suction (Hussmann P/N 0427598_E, Section 3-5).
const BASELINE = {
  ambient:            80,   // °F
  suctionSatTemp:     10,   // °F sat (≈ 22.4 psig for R-404A — from setup sheet)
  condensingSatTemp:  95,   // °F sat (15 °F approach above 80 °F ambient)
  superheat:          20,   // °F total rack suction superheat
  subcooling:         15,   // °F
  dischargeSuperheat: 75,   // °F above condensing sat temp (normal range 60–100 °F)
  oilDiff:            22,   // psi differential — Y825 valve normal 20–25 psi
  caseTemp:           36,   // °F average case temperature
  baseAmps:           21,   // A per compressor (460V/3Ph — varies by model)
}

// Safety thresholds
// NOTE: HP/LP setpoints are on the electrical cabinet setup sheet (site-specific).
// Values below are typical for Hussmann R-404A parallel racks.
const SAFETY = {
  hpcoPsig:        400,   // psig HP cutout (≈ setup sheet; ~414.7 psia for R-404A)
  hpcoWarnPsig:    355,   // psig warning threshold
  lpcoPsig:         10,   // psig LP cutout for MT (≈ setup sheet; ~−12 °F sat)
  lpcoWarnPsig:     15,   // psig LP warning
  highDischargeF:  225,   // °F high discharge temp alarm (liquid injection activates earlier)
  warnDischargeF:  210,   // °F discharge temp warning
  oilTripDiff:      10,   // psi OFC trip differential (Y825 normal: 20–25 psi)
  oilWarnDiff:      18,   // psi warning
}

interface Alarm { code: string; severity: 'WARNING' | 'CRITICAL'; message: string }
interface SystemState {
  ambient: number
  suctionSatTemp: number; suctionPsig: number; suctionGasTemp: number; suctionSuperheat: number
  condensingTemp: number; dischargePsig: number; dischargeTemp: number; dischargeSuperheat: number
  compressionRatio: number
  liquidTemp: number; subcooling: number; filterDrierDeltaT: number
  oilDiff: number; oilPressurePsig: number
  compRunning: boolean[]; compAmps: number[]
  caseTemp: number
  nonCondensables: boolean
  alarms: Alarm[]
}

function computeReadings(f: FaultState): SystemState {
  let ambient           = BASELINE.ambient
  let suctionSatTemp    = BASELINE.suctionSatTemp
  let condensingSatTemp = BASELINE.condensingSatTemp
  let superheat         = BASELINE.superheat
  let subcooling        = BASELINE.subcooling
  let dischargeSuperheat = BASELINE.dischargeSuperheat
  let oilDiff           = BASELINE.oilDiff
  let caseTemp          = BASELINE.caseTemp
  let ampsMultiplier    = 1.0
  let ncExtraGauge      = 0      // extra psig from non-condensables
  const compRunning     = [true, true, true, true]

  // ── Environment ────────────────────────────────────────────────
  if (f.highAmbient) {
    ambient           += 20    // 80 → 100 °F
    condensingSatTemp += 20    // approach unchanged → condensing rises with ambient
    dischargeSuperheat += 6
    ampsMultiplier    *= 1.10
  }
  if (f.poorVentilation) {
    dischargeSuperheat += 18   // warm room → hot discharge
    ampsMultiplier    *= 1.06
  }

  // ── Condenser ─────────────────────────────────────────────────
  if (f.dirtyCondenser) {
    condensingSatTemp  += 14   // approach degrades 15 → 29 °F
    dischargeSuperheat += 8
    ampsMultiplier     *= 1.07
  }
  const fansFailed = (f.fan1Failed ? 1 : 0) + (f.fan2Failed ? 1 : 0)
  if (fansFailed === 1) {
    condensingSatTemp  += 9
    dischargeSuperheat += 6
    ampsMultiplier     *= 1.05
  } else if (fansFailed === 2) {
    condensingSatTemp  += 26   // approaching HPCO
    dischargeSuperheat += 20
    ampsMultiplier     *= 1.13
  }

  // ── Refrigerant charge ────────────────────────────────────────
  if (f.underchargeModerate && !f.underchargeSevere) {
    suctionSatTemp     -= 8    // low mass flow → low suction
    condensingSatTemp  -= 7    // head also drops
    superheat          += 22   // TXVs starved
    subcooling         -= 10   // drops toward zero
    dischargeSuperheat += 18   // high ratio + high entering superheat
    ampsMultiplier     *= 0.94
    caseTemp           += 4
  }
  if (f.underchargeSevere) {
    suctionSatTemp     -= 18
    condensingSatTemp  -= 12
    superheat          += 52
    subcooling         -= 14   // → ~1 °F (flash gas in sight glass)
    dischargeSuperheat += 42
    ampsMultiplier     *= 0.86
    caseTemp           += 10
  }
  if (f.overcharge) {
    suctionSatTemp     += 6    // flooding → suction rises
    condensingSatTemp  += 20   // liquid flooding condenser
    superheat          -= 14   // flood-back risk
    subcooling         += 22   // very high
    dischargeSuperheat -= 18   // cooler discharge (for now — liquid slugging is different)
    ampsMultiplier     *= 1.10
  }

  // ── Liquid line ───────────────────────────────────────────────
  if (f.filterDrierRestricted) {
    suctionSatTemp     -= 5    // restriction starves TXVs
    superheat          += 12
    caseTemp           += 3
    // filterDrierDeltaT shows the temperature drop across the drier
  }

  // ── Compressors ───────────────────────────────────────────────
  if (f.comp1Failed) compRunning[0] = false
  if (f.comp2Failed) compRunning[1] = false
  if (f.comp3Failed) compRunning[2] = false
  if (f.comp4Failed) compRunning[3] = false
  const runningCount = compRunning.filter(Boolean).length
  const failedCount  = 4 - runningCount
  if (failedCount > 0) {
    suctionSatTemp     += failedCount * 4.5   // reduced pumping capacity
    dischargeSuperheat += failedCount * 3
    caseTemp           += failedCount * 3.5
    if (runningCount > 0) {
      ampsMultiplier   *= (4 / runningCount) * 0.90  // remaining comps load up
    }
  }

  // ── Load / TXV ────────────────────────────────────────────────
  if (f.txvNotFeeding) {
    suctionSatTemp     -= 12   // very low suction (pump-down effect)
    condensingSatTemp  -= 10   // head drops with low load
    superheat          += 28   // very high SH at rack header
    dischargeSuperheat += 22
    caseTemp           += 8
  }
  if (f.defrostStuckOn) {
    suctionSatTemp     += 7    // hot gas returns to suction header
    caseTemp           += 12   // case warming fast
    if (superheat > 8) superheat -= 8  // flood-back as gas condenses in case
  }

  // ── Oil ───────────────────────────────────────────────────────
  if (f.oilLow) {
    oilDiff = 8   // well below OFC trip threshold (Y825 normal 20–25 psi)
  }

  // ── Non-condensables ─────────────────────────────────────────
  if (f.nonCondensables) {
    ncExtraGauge       = 28    // extra psig NOT corresponding to sat temp
    dischargeSuperheat += 10
    ampsMultiplier     *= 1.05
  }

  // ── Clamp physical limits ─────────────────────────────────────
  subcooling        = Math.max(subcooling, 0.3)
  superheat         = Math.max(superheat, 0)
  oilDiff           = Math.max(oilDiff, 0)
  // Condensing must stay above suction (min 20 °F differential for real compression)
  condensingSatTemp = Math.max(condensingSatTemp, suctionSatTemp + 20)

  // ── Derived values ────────────────────────────────────────────
  const suctionPsia       = ptLookup(suctionSatTemp)
  const dischargePsia     = ptLookup(condensingSatTemp)
  const suctionPsig       = Math.max(toGauge(suctionPsia), 0.1)
  const dischargePsig     = toGauge(dischargePsia) + ncExtraGauge
  const compressionRatio  = (dischargePsig + 14.696) / (suctionPsig + 14.696)
  const suctionGasTemp    = suctionSatTemp + superheat
  const liquidTemp        = condensingSatTemp - subcooling
  const dischargeTemp     = condensingSatTemp + dischargeSuperheat
  const filterDrierDeltaT = f.filterDrierRestricted ? 9 : 0  // °F temp drop across blocked drier
  const oilPressurePsig   = suctionPsig + oilDiff

  // Compressor amps with small randomisation for realism
  const compAmps = compRunning.map(r => {
    if (!r) return 0
    const raw = BASELINE.baseAmps * ampsMultiplier
    return Math.round(raw * 10) / 10
  })

  // ── Alarms ────────────────────────────────────────────────────
  const alarms: Alarm[] = []

  if (dischargePsig >= SAFETY.hpcoPsig) {
    alarms.push({ code: 'HPCO', severity: 'CRITICAL', message: `High Pressure Cutout — ${Math.round(dischargePsig)} psig (limit ${SAFETY.hpcoPsig} psig). All compressors tripped.` })
  } else if (dischargePsig >= SAFETY.hpcoWarnPsig) {
    alarms.push({ code: 'HP-HIGH', severity: 'WARNING', message: `High discharge pressure warning — ${Math.round(dischargePsig)} psig (approaching ${SAFETY.hpcoPsig} psig HPCO)` })
  }

  if (suctionPsig <= SAFETY.lpcoPsig) {
    alarms.push({ code: 'LPCO', severity: 'CRITICAL', message: `Low Pressure Cutout — ${suctionPsig.toFixed(1)} psig (limit ${SAFETY.lpcoPsig} psig). Compressors tripped.` })
  } else if (suctionPsig <= SAFETY.lpcoWarnPsig) {
    alarms.push({ code: 'LP-LOW', severity: 'WARNING', message: `Low suction pressure warning — ${suctionPsig.toFixed(1)} psig (limit ${SAFETY.lpcoPsig} psig)` })
  }

  if (dischargeTemp >= SAFETY.highDischargeF) {
    alarms.push({ code: 'HI-DT', severity: 'CRITICAL', message: `High discharge temperature — ${Math.round(dischargeTemp)} °F. Liquid injection active. Compressor at risk (310 °F = trip per Hussmann spec).` })
  } else if (dischargeTemp >= SAFETY.warnDischargeF) {
    alarms.push({ code: 'HI-DT-W', severity: 'WARNING', message: `Elevated discharge temperature — ${Math.round(dischargeTemp)} °F (limit ${SAFETY.highDischargeF} °F)` })
  }

  if (oilDiff <= SAFETY.oilTripDiff) {
    alarms.push({ code: 'OFC', severity: 'CRITICAL', message: `Oil Failure Control — ${Math.round(oilDiff)} psi differential (Y825 valve normal: 20–25 psi). Compressor protected.` })
  } else if (oilDiff <= SAFETY.oilWarnDiff) {
    alarms.push({ code: 'OIL-W', severity: 'WARNING', message: `Low oil pressure differential — ${Math.round(oilDiff)} psi (normal 20–25 psi above suction per Hussmann Y825 spec)` })
  }

  if (superheat >= 45) {
    alarms.push({ code: 'HI-SH', severity: 'WARNING', message: `High suction superheat — ${Math.round(superheat)} °F. Check refrigerant charge, TXV bulb contact, and filter drier.` })
  } else if (superheat <= 4 && runningCount > 0) {
    alarms.push({ code: 'LO-SH', severity: 'WARNING', message: `Low suction superheat — ${Math.round(superheat)} °F. Flood-back risk to compressors. Check TXV adjustment and defrost termination.` })
  }

  if (subcooling <= 1.5) {
    alarms.push({ code: 'FLASH-GAS', severity: 'WARNING', message: `Near-zero subcooling (${subcooling.toFixed(1)} °F) — flash gas likely in liquid line. Sight glass will show bubbles.` })
  }

  if (caseTemp >= 42) {
    alarms.push({ code: 'CASE-TEMP', severity: 'WARNING', message: `Case temperature high — ${Math.round(caseTemp)} °F. Check defrost termination, refrigerant, and TXV operation.` })
  }

  compRunning.forEach((r, i) => {
    if (!r) alarms.push({ code: `COMP${i + 1}`, severity: 'CRITICAL', message: `Compressor ${i + 1} not running` })
  })

  if (f.nonCondensables) {
    alarms.push({ code: 'NON-COND', severity: 'WARNING', message: `Possible non-condensables — discharge pressure elevated beyond what temperature alone would cause. Compare PT relationship: at ${Math.round(dischargePsig - ncExtraGauge)} psig (pure refrigerant) sat temp = ${Math.round(condensingSatTemp)} °F, but gauge reads ${Math.round(dischargePsig)} psig.` })
  }
  if (f.defrostStuckOn) {
    alarms.push({ code: 'DEFROST', severity: 'WARNING', message: 'Koolgas/defrost circuit stuck on — case temperatures rising, suction pressure elevated' })
  }

  return {
    ambient, suctionSatTemp, suctionPsig, suctionGasTemp, suctionSuperheat: superheat,
    condensingTemp: condensingSatTemp, dischargePsig, dischargeTemp, dischargeSuperheat,
    compressionRatio, liquidTemp, subcooling, filterDrierDeltaT,
    oilDiff, oilPressurePsig,
    compRunning, compAmps, caseTemp,
    nonCondensables: f.nonCondensables,
    alarms,
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function statusColor(val: number, warn: number, alarm: number, reversed = false) {
  const bad  = reversed ? val <= alarm : val >= alarm
  const warn2 = reversed ? val <= warn  : val >= warn
  if (bad)   return 'text-red-400'
  if (warn2) return 'text-amber-400'
  return 'text-emerald-400'
}

function dotColor(val: number, warn: number, alarm: number, reversed = false) {
  const bad  = reversed ? val <= alarm : val >= alarm
  const warn2 = reversed ? val <= warn  : val >= warn
  if (bad)   return 'bg-red-500'
  if (warn2) return 'bg-amber-400'
  return 'bg-emerald-500'
}

interface ReadingRowProps {
  label: string
  value: string
  sub?: string
  dot?: string   // dot colour class
  color?: string // value colour class
  note?: string
}
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
        {note && <div className="text-[9px] text-amber-400 mt-0">{note}</div>}
      </div>
    </div>
  )
}

interface CardProps { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }
function Card({ title, icon, children, className = '' }: CardProps) {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 border-b border-slate-700">
        <span className="text-slate-400">{icon}</span>
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-3 py-1.5">{children}</div>
    </div>
  )
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

interface ToggleProps { active: boolean; onChange: () => void; label: string; hint: string; disabled?: boolean }
function FaultToggle({ active, onChange, label, hint, disabled }: ToggleProps) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      title={hint}
      className={[
        'w-full flex items-start gap-2 px-3 py-2 text-left rounded-lg transition-all text-xs',
        active
          ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
          : 'bg-slate-700/40 border border-transparent text-slate-400 hover:bg-slate-700 hover:text-slate-200',
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {/* Pill indicator */}
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
  const [faults, setFaults] = useState<FaultState>(INITIAL_FAULTS)
  const [showFaults, setShowFaults] = useState(true)
  const [revealFaults, setRevealFaults] = useState(false)

  const state = useMemo(() => computeReadings(faults), [faults])

  const activeFaultCount = Object.values(faults).filter(Boolean).length
  const hasCritical = state.alarms.some(a => a.severity === 'CRITICAL')
  const hasWarning  = state.alarms.some(a => a.severity === 'WARNING')

  const systemStatus = hasCritical ? 'ALARM' : hasWarning ? 'WARNING' : 'NORMAL'
  const statusBadgeClass = hasCritical
    ? 'bg-red-500/20 text-red-400 border-red-500/40'
    : hasWarning
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'

  function toggleFault(key: FaultKey) {
    const def = FAULT_DEFS.find(d => d.key === key)
    setFaults(prev => {
      const next = { ...prev, [key]: !prev[key] }
      // Clear mutually exclusive faults
      if (!prev[key] && def?.mutuallyExcludes) {
        def.mutuallyExcludes.forEach(ex => { next[ex] = false })
      }
      return next
    })
  }

  function resetAll() {
    setFaults(INITIAL_FAULTS)
    setRevealFaults(false)
  }

  // Grouped faults for the panel
  const faultsByGroup = FAULT_GROUPS.map(g => ({
    group: g,
    faults: FAULT_DEFS.filter(d => d.group === g),
  }))

  // Compute range indicators for key values
  const { suctionPsig: sp, dischargePsig: dp, dischargeTemp: dt, suctionSuperheat: sh, subcooling: sc, oilDiff: od } = state

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col">

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => router.push('/')} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
          <Home size={16}/>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-semibold text-white">Hussmann Parallel Rack · R-404A</h1>
            <span className="hidden sm:inline text-[10px] text-slate-500">MT Simulation · 4 × Copeland Scroll</span>
          </div>
          <p className="text-[10px] text-slate-500 hidden md:block">
            Suction setpoint: 10 °F sat (22 psig) · HP cutout: 400 psig · Oil diff: 20–25 psi (Y825)
          </p>
        </div>

        {/* System status */}
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusBadgeClass}`}>
          {systemStatus}
        </span>

        {activeFaultCount > 0 && (
          <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-full">
            {activeFaultCount} fault{activeFaultCount > 1 ? 's' : ''} active
          </span>
        )}

        <button
          onClick={resetAll}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
        >
          <RotateCcw size={12}/> Reset
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Fault panel (left / collapsible on mobile) ── */}
        <div className={`${showFaults ? 'flex' : 'hidden'} md:flex flex-col w-56 lg:w-60 flex-shrink-0 bg-slate-800 border-r border-slate-700 overflow-y-auto`}>
          <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fault Injection</span>
            <button onClick={() => setShowFaults(false)} className="md:hidden text-slate-500 hover:text-white">
              <ChevronUp size={14}/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {faultsByGroup.map(({ group, faults: defs }) => (
              <div key={group}>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest px-1 mb-1">{group}</p>
                <div className="space-y-1">
                  {defs.map(d => (
                    <FaultToggle
                      key={d.key}
                      active={faults[d.key]}
                      label={d.label}
                      hint={d.hint}
                      onChange={() => toggleFault(d.key)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Diagnose hint */}
          <div className="p-3 border-t border-slate-700">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Set one or more faults, then use <strong className="text-slate-400">ColdIQ Expert</strong> to diagnose the readings — paste the symptoms into chat and see if you can identify the root cause.
            </p>
          </div>
        </div>

        {/* ── Mobile fault toggle ── */}
        <button
          onClick={() => setShowFaults(v => !v)}
          className="md:hidden fixed bottom-4 right-4 z-20 bg-amber-500 text-white rounded-full px-4 py-2 text-xs font-semibold shadow-lg flex items-center gap-1.5"
        >
          <Zap size={12}/>
          {showFaults ? 'Hide faults' : `Faults${activeFaultCount > 0 ? ` (${activeFaultCount})` : ''}`}
        </button>

        {/* ── Readings panel (right) ── */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          <div className="max-w-4xl mx-auto space-y-3">

            {/* Alarms */}
            {state.alarms.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-700 flex items-center gap-2">
                  <AlertTriangle size={13} className="text-amber-400"/>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Active Alarms</span>
                  <span className="ml-auto text-[10px] text-slate-500">{state.alarms.length} active</span>
                </div>
                <div className="p-2 space-y-1">
                  {state.alarms.map(a => (
                    <div key={a.code} className={`flex items-start gap-2 px-2.5 py-2 rounded-lg text-xs ${a.severity === 'CRITICAL' ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'}`}>
                      <AlertTriangle size={11} className="flex-shrink-0 mt-0.5"/>
                      <div>
                        <span className="font-mono font-bold mr-2">{a.code}</span>
                        <span>{a.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Row 1: Suction + Discharge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Suction side */}
              <Card title="Suction Side" icon={<Gauge size={13}/>}>
                <ReadingRow
                  label="Suction pressure"
                  value={`${sp.toFixed(1)} psig`}
                  sub={`${state.suctionPsig > 0 ? (state.suctionPsig + 14.696).toFixed(1) : '—'} psia`}
                  dot={dotColor(sp, SAFETY.lpcoWarnPsig + 3, SAFETY.lpcoPsig, true)}
                  color={statusColor(sp, SAFETY.lpcoWarnPsig + 3, SAFETY.lpcoPsig, true)}
                />
                <ReadingRow
                  label="Suction sat temp"
                  value={`${state.suctionSatTemp.toFixed(1)} °F`}
                  sub="from PT"
                  color="text-slate-300"
                />
                <ReadingRow
                  label="Suction gas temp"
                  value={`${state.suctionGasTemp.toFixed(1)} °F`}
                  color="text-slate-300"
                />
                <ReadingRow
                  label="Suction superheat"
                  value={`${sh.toFixed(1)} °F`}
                  dot={sh > 40 || sh < 5 ? 'bg-amber-400' : 'bg-emerald-500'}
                  color={sh > 40 ? 'text-amber-400' : sh < 5 ? 'text-amber-400' : 'text-emerald-400'}
                  note={sh > 40 ? 'HIGH — check charge/TXV' : sh < 5 ? 'LOW — flood-back risk' : undefined}
                />
              </Card>

              {/* Discharge side */}
              <Card title="Discharge Side" icon={<Thermometer size={13}/>}>
                <ReadingRow
                  label="Discharge pressure"
                  value={`${dp.toFixed(1)} psig`}
                  sub={`${(dp + 14.696).toFixed(1)} psia`}
                  dot={dotColor(dp, SAFETY.hpcoWarnPsig, SAFETY.hpcoPsig)}
                  color={statusColor(dp, SAFETY.hpcoWarnPsig, SAFETY.hpcoPsig)}
                  note={state.nonCondensables ? `≈ ${Math.round(dp - 28)} psig without non-cond.` : undefined}
                />
                <ReadingRow
                  label="Condensing sat temp"
                  value={`${state.condensingTemp.toFixed(1)} °F`}
                  sub="from PT"
                  color="text-slate-300"
                />
                <ReadingRow
                  label="Discharge temp"
                  value={`${dt.toFixed(0)} °F`}
                  dot={dotColor(dt, SAFETY.warnDischargeF, SAFETY.highDischargeF)}
                  color={statusColor(dt, SAFETY.warnDischargeF, SAFETY.highDischargeF)}
                  note={dt >= SAFETY.highDischargeF ? 'Liquid injection active' : undefined}
                />
                <ReadingRow
                  label="Discharge superheat"
                  value={`${state.dischargeSuperheat.toFixed(0)} °F`}
                  color="text-slate-300"
                />
                <ReadingRow
                  label="Compression ratio"
                  value={`${state.compressionRatio.toFixed(2)} : 1`}
                  color={state.compressionRatio > 8 ? 'text-amber-400' : state.compressionRatio > 10 ? 'text-red-400' : 'text-slate-300'}
                />
              </Card>
            </div>

            {/* Row 2: Liquid line + System */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Liquid line */}
              <Card title="Liquid Line" icon={<Activity size={13}/>}>
                <ReadingRow
                  label="Liquid line temp"
                  value={`${state.liquidTemp.toFixed(1)} °F`}
                  color="text-slate-300"
                />
                <ReadingRow
                  label="Subcooling"
                  value={`${sc.toFixed(1)} °F`}
                  dot={sc < 3 ? 'bg-red-500' : sc < 8 ? 'bg-amber-400' : sc > 30 ? 'bg-amber-400' : 'bg-emerald-500'}
                  color={sc < 3 ? 'text-red-400' : sc < 8 ? 'text-amber-400' : sc > 30 ? 'text-amber-400' : 'text-emerald-400'}
                  note={sc < 2 ? 'Flash gas — check charge' : sc > 30 ? 'Very high — check overcharge' : undefined}
                />
                {state.filterDrierDeltaT > 0 && (
                  <ReadingRow
                    label="Drier ΔT (upstream→outlet)"
                    value={`${state.filterDrierDeltaT} °F`}
                    dot="bg-amber-400"
                    color="text-amber-400"
                    note="Restricted — replace core"
                  />
                )}
                <ReadingRow
                  label="Sight glass"
                  value={sc < 2 ? 'BUBBLES' : sc < 6 ? 'CLOUDY' : 'CLEAR'}
                  color={sc < 2 ? 'text-red-400' : sc < 6 ? 'text-amber-400' : 'text-emerald-400'}
                />
                <ReadingRow label="Ambient" value={`${state.ambient} °F`} color="text-slate-300"/>
              </Card>

              {/* Oil system */}
              <Card title="Oil System (Y825 Valve)" icon={<Wind size={13}/>}>
                <ReadingRow
                  label="Oil diff pressure"
                  value={`${od.toFixed(0)} psi`}
                  dot={dotColor(od, SAFETY.oilWarnDiff, SAFETY.oilTripDiff, true)}
                  color={statusColor(od, SAFETY.oilWarnDiff, SAFETY.oilTripDiff, true)}
                  note={od <= SAFETY.oilTripDiff ? 'OFC will trip compressor' : od <= SAFETY.oilWarnDiff ? 'Low — adjust Y825' : 'Normal 20–25 psi above suction'}
                />
                <ReadingRow
                  label="Oil pressure (abs)"
                  value={`${state.oilPressurePsig.toFixed(0)} psig`}
                  color="text-slate-300"
                />
                <div className="py-1 text-[10px] text-slate-500 leading-relaxed mt-0.5">
                  Y825 target: {Math.round(sp)} + 20–25 = {Math.round(sp + 20)}–{Math.round(sp + 25)} psig
                </div>
              </Card>
            </div>

            {/* Row 3: Compressors */}
            <Card title="Compressors — 4 × Copeland Scroll" icon={<Zap size={13}/>}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
                {state.compRunning.map((running, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-2.5 border text-center ${
                      running
                        ? 'bg-slate-700/40 border-slate-600'
                        : 'bg-red-500/10 border-red-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                      <div className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}/>
                      <span className="text-[10px] font-semibold text-slate-300">COMP {i + 1}</span>
                    </div>
                    <div className={`text-sm font-mono font-bold ${running ? 'text-white' : 'text-red-400'}`}>
                      {running ? `${state.compAmps[i].toFixed(1)} A` : 'OFF'}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      {running ? 'Running' : 'Tripped'}
                    </div>
                  </div>
                ))}
              </div>
              {/* Load summary */}
              <div className="mt-1 py-1 border-t border-slate-700/50 flex items-center gap-4 text-[10px] text-slate-500">
                <span><span className="text-slate-400 font-medium">{state.compRunning.filter(Boolean).length}</span> of 4 running</span>
                <span>Total load: <span className="text-slate-400 font-medium">{state.compAmps.reduce((s, a) => s + a, 0).toFixed(1)} A</span></span>
                {state.compRunning.filter(Boolean).length < 4 && (
                  <span className="text-amber-400">↑ Amps elevated — carrying extra load</span>
                )}
              </div>
            </Card>

            {/* Row 4: Case temps + normal ranges reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <Card title="Case Temperatures" icon={<Thermometer size={13}/>}>
                <ReadingRow
                  label="Average case temp"
                  value={`${state.caseTemp.toFixed(1)} °F`}
                  dot={state.caseTemp > 42 ? 'bg-red-500' : state.caseTemp > 38 ? 'bg-amber-400' : 'bg-emerald-500'}
                  color={state.caseTemp > 42 ? 'text-red-400' : state.caseTemp > 38 ? 'text-amber-400' : 'text-emerald-400'}
                  note={state.caseTemp > 42 ? 'Product safety at risk' : undefined}
                />
                <div className="py-1 text-[10px] text-slate-500">Target setpoint: 35 °F · Warning: &gt; 40 °F</div>
              </Card>

              {/* Quick reference */}
              <Card title="R-404A Normal Ranges (MT)" icon={<Info size={13}/>}>
                <div className="text-[10px] text-slate-500 space-y-0.5 py-1 leading-relaxed">
                  <div><span className="text-slate-400 w-32 inline-block">Suction pressure</span> 18–28 psig (0–10 °F sat)</div>
                  <div><span className="text-slate-400 w-32 inline-block">Discharge pressure</span> 150–250 psig</div>
                  <div><span className="text-slate-400 w-32 inline-block">Suction superheat</span> 15–25 °F (rack header)</div>
                  <div><span className="text-slate-400 w-32 inline-block">Subcooling</span> 10–20 °F (clear sight glass)</div>
                  <div><span className="text-slate-400 w-32 inline-block">Discharge temp</span> 130–200 °F</div>
                  <div><span className="text-slate-400 w-32 inline-block">Oil differential</span> 20–25 psi (Y825 valve)</div>
                  <div><span className="text-slate-400 w-32 inline-block">Compression ratio</span> 4.5 – 7 : 1</div>
                </div>
              </Card>
            </div>

            {/* Reveal faults panel (for training) */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-300 font-medium">Instructor mode — reveal active faults</p>
                <p className="text-[10px] text-slate-500">Use after the trainee has given their diagnosis</p>
              </div>
              <button
                onClick={() => setRevealFaults(v => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  revealFaults
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {revealFaults ? 'Hide faults' : 'Reveal faults'}
              </button>
            </div>

            {revealFaults && (
              <div className="bg-slate-800 border border-amber-500/30 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-2">Active faults</p>
                {activeFaultCount === 0 ? (
                  <p className="text-xs text-slate-400 italic">No faults active — system is in normal operation</p>
                ) : (
                  <div className="space-y-1">
                    {FAULT_DEFS.filter(d => faults[d.key]).map(d => (
                      <div key={d.key} className="flex items-start gap-2 text-xs text-amber-300">
                        <AlertTriangle size={11} className="flex-shrink-0 mt-0.5 text-amber-500"/>
                        <div>
                          <span className="font-medium">{d.label}</span>
                          <span className="text-amber-400/60 ml-1.5">— {d.hint}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer note */}
            <div className="text-[10px] text-slate-600 text-center pb-2 leading-relaxed">
              Based on Hussmann Parallel Rack Systems I/O Manual P/N 0427598_E · R-404A · 4 × Copeland Scroll compressors (assumed) ·
              Setpoints shown are typical — actual values on equipment setup sheet inside electrical cabinet
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
