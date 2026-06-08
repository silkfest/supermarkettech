'use client'
export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home, RotateCcw, AlertTriangle, CheckCircle2, XCircle,
  Thermometer, Gauge, Zap, Activity, Wind, ChevronLeft, Info,
  Snowflake, Settings,
} from 'lucide-react'
import LearningTabBar from '@/components/layout/LearningTabBar'

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
const bubblePsig  = (t: number) => toGauge(ptInterp(t, R448A_BUBBLE))
const dewPsig     = (t: number) => toGauge(ptInterp(t, R448A_DEW))
const dewTempFrom = (psig: number) => ptInterpReverse(psig, R448A_DEW)

// ── Compressor specs ───────────────────────────────────────────────────────────
// Hussmann Protocol Rack — Unit A — Fortino's Mall Rd
// 575 V / 3-ph / 60 Hz  |  R-448A  |  LT Frozen Food  |  Design: −25 °F SST
// Total design capacity: 132.70 MBH (Copeland demand cooling required on all)

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
// Normal termination is temperature-based; 15 min is the time-limit failsafe.

type Mfr = 'ORZ' | 'BREMA' | 'SPARE'
interface Circuit {
  id: string; mfr: Mfr; doors: number; doorConfig: string
  designMBH: number; evapTargetF: number; active: boolean
  defrostsPerDay: number; defrostMaxMin: number
}

const CIRCUITS: Circuit[] = [
  { id: 'A1',  mfr: 'ORZ',   doors:  9, doorConfig: '4+5',     designMBH:  9.54, evapTargetF: -15, active: true,  defrostsPerDay: 1, defrostMaxMin: 15 },
  { id: 'A2',  mfr: 'BREMA', doors: 10, doorConfig: '5+5',     designMBH: 11.60, evapTargetF: -20, active: true,  defrostsPerDay: 2, defrostMaxMin: 15 },
  { id: 'A3',  mfr: 'BREMA', doors: 10, doorConfig: '5+5',     designMBH: 11.60, evapTargetF: -20, active: true,  defrostsPerDay: 2, defrostMaxMin: 15 },
  { id: 'A4',  mfr: 'BREMA', doors: 10, doorConfig: '5+5',     designMBH: 11.60, evapTargetF: -20, active: true,  defrostsPerDay: 2, defrostMaxMin: 15 },
  { id: 'A5',  mfr: 'BREMA', doors:  8, doorConfig: '3+5',     designMBH:  9.28, evapTargetF: -20, active: true,  defrostsPerDay: 2, defrostMaxMin: 15 },
  { id: 'A6',  mfr: 'ORZ',   doors: 10, doorConfig: '5+5',     designMBH: 10.60, evapTargetF: -15, active: true,  defrostsPerDay: 1, defrostMaxMin: 15 },
  { id: 'A7',  mfr: 'ORZ',   doors: 10, doorConfig: '5+5',     designMBH: 10.60, evapTargetF: -15, active: true,  defrostsPerDay: 1, defrostMaxMin: 15 },
  { id: 'A8',  mfr: 'ORZ',   doors: 16, doorConfig: '3+3+5+5', designMBH: 16.96, evapTargetF: -15, active: true,  defrostsPerDay: 1, defrostMaxMin: 15 },
  { id: 'A9',  mfr: 'BREMA', doors: 12, doorConfig: '3+4+5',   designMBH: 13.92, evapTargetF: -20, active: true,  defrostsPerDay: 2, defrostMaxMin: 15 },
  { id: 'A10', mfr: 'SPARE', doors:  0, doorConfig: '—',       designMBH:  9.00, evapTargetF: -20, active: false, defrostsPerDay: 1, defrostMaxMin: 15 },
  { id: 'A11', mfr: 'SPARE', doors:  0, doorConfig: '—',       designMBH:  9.00, evapTargetF: -20, active: false, defrostsPerDay: 1, defrostMaxMin: 15 },
  { id: 'A12', mfr: 'SPARE', doors:  0, doorConfig: '—',       designMBH:  9.00, evapTargetF: -20, active: false, defrostsPerDay: 1, defrostMaxMin: 15 },
]
// Active load: 105.70 MBH  |  Total incl. spares: 132.70 MBH

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
}

// per-circuit TXV and defrost fault lookup
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
  { key: 'comp1Failed', group: 'Compressors', label: 'C1 ZFD25KVE failed (Lead)',       hint: 'Lead EVI scroll offline — 30 MBH capacity lost immediately. Lag-1 & Lag-2 load up.' },
  { key: 'comp2Failed', group: 'Compressors', label: 'C2 ZF25KVE failed (Lag-1A)',      hint: 'One Lag-1 scroll down. C3 carries the Lag-1 group alone; 23.5 MBH lost.' },
  { key: 'comp3Failed', group: 'Compressors', label: 'C3 ZF25KVE failed (Lag-1B)',      hint: 'Second Lag-1 scroll down. Full Lag-1 group offline — 47 MBH lost total if C2 also failed.' },
  { key: 'comp4Failed', group: 'Compressors', label: 'C4 ZF18KVE failed (Lag-2A)',      hint: 'First Lag-2 scroll offline. C5 & C6 continue; 18.6 MBH lost.' },
  { key: 'comp5Failed', group: 'Compressors', label: 'C5 ZF18KVE failed (Lag-2B)',      hint: 'Second Lag-2 down. Only C6 remains in group; 37.2 MBH lost if C4 also failed.' },
  { key: 'comp6Failed', group: 'Compressors', label: 'C6 ZF18KVE failed (Lag-2C)',      hint: 'Full Lag-2 group offline — all three 18K scrolls down. 55.8 MBH lost.' },
  { key: 'demandCoolingFailed', group: 'Compressors', label: 'Demand cooling system failed', hint: 'All 6 EVI scrolls require liquid injection to intermediate stage. Loss = discharge temps spike to 200 °F+. Protect compressors immediately.' },
  { key: 'dirtyCondenser',  group: 'Condenser', label: 'Dirty condenser coil',      hint: 'Fouled coil raises approach ΔT — condensing and discharge pressure rise.' },
  { key: 'fan1Failed',      group: 'Condenser', label: 'Condenser fan #1 failed',   hint: 'Reduced airflow — head pressure rises ~12 psig.' },
  { key: 'fan2Failed',      group: 'Condenser', label: 'Condenser fan #2 failed',   hint: 'Both fans out: severe head pressure rise — approach ΔT +30 °F.' },
  { key: 'undercharge',     group: 'Charge', label: 'Undercharge (~20%)',            hint: 'High suction SH, low subcooling — EVI intermediate stage fed poorly, discharge temp rises. Cases struggle.', mutuallyExcludes: ['overcharge'] },
  { key: 'overcharge',      group: 'Charge', label: 'Overcharge (~15%)',             hint: 'High head pressure, high subcooling, low SH — liquid carryover risk to EVI scrolls.', mutuallyExcludes: ['undercharge'] },
  { key: 'filterDrierRestricted', group: 'Charge', label: 'Filter drier restricted', hint: 'ΔT across drier — all 9 circuits liquid-starved. High SH, cases warming.' },
  // A1–A9 TXV faults
  { key: 'a1TxvFailed',  group: 'Circuit TXV', label: 'A1 ORZ (9 doors) — TXV not feeding',   hint: 'A1 starved — coil overheats, 9.54 MBH load drops off suction. Suction falls; case warms.' },
  { key: 'a2TxvFailed',  group: 'Circuit TXV', label: 'A2 BREMA (10 doors) — TXV not feeding', hint: 'A2 starved — 11.60 MBH off suction. TXV bulb or equalizer suspect.' },
  { key: 'a3TxvFailed',  group: 'Circuit TXV', label: 'A3 BREMA (10 doors) — TXV not feeding', hint: 'A3 starved — twin to A2; check for common liquid supply issue.' },
  { key: 'a4TxvFailed',  group: 'Circuit TXV', label: 'A4 BREMA (10 doors) — TXV not feeding', hint: 'A4 starved — if A2, A3 & A4 all fail, suspect upstream liquid restriction.' },
  { key: 'a5TxvFailed',  group: 'Circuit TXV', label: 'A5 BREMA (8 doors) — TXV not feeding',  hint: 'A5 starved — 9.28 MBH lost; combined with A2–A4 TXV issues, check liquid main.' },
  { key: 'a6TxvFailed',  group: 'Circuit TXV', label: 'A6 ORZ (10 doors) — TXV not feeding',   hint: 'A6 starved — 10.60 MBH off suction. Check liquid solenoid operation.' },
  { key: 'a7TxvFailed',  group: 'Circuit TXV', label: 'A7 ORZ (10 doors) — TXV not feeding',   hint: 'A7 starved — twin to A6. Verify TXV bulb clamped on suction line.' },
  { key: 'a8TxvFailed',  group: 'Circuit TXV', label: 'A8 ORZ (16 doors) — TXV not feeding',   hint: 'A8 is the largest circuit (16.96 MBH). TXV failure here has the biggest single-circuit impact.' },
  { key: 'a9TxvFailed',  group: 'Circuit TXV', label: 'A9 BREMA (12 doors) — TXV not feeding',  hint: 'A9 starved — 13.92 MBH off suction. Second-largest circuit.' },
  // A1–A9 defrost faults
  { key: 'a1DefrostStuck',  group: 'Circuit Defrost', label: 'A1 ORZ (9 doors) — HG defrost stuck on',   hint: 'Hot gas circulating through A1 coil — case warms, suction rises. Net load spike on rack.' },
  { key: 'a2DefrostStuck',  group: 'Circuit Defrost', label: 'A2 BREMA (10 doors) — HG defrost stuck on', hint: 'A2 won\'t terminate. Suction rises; rack compressors load up to try to compensate.' },
  { key: 'a3DefrostStuck',  group: 'Circuit Defrost', label: 'A3 BREMA (10 doors) — HG defrost stuck on', hint: 'A3 stuck in defrost — combined with A2, rack suction rises significantly.' },
  { key: 'a4DefrostStuck',  group: 'Circuit Defrost', label: 'A4 BREMA (10 doors) — HG defrost stuck on', hint: 'A4 plus A2/A3 stuck = 3 of 4 Brema circuits in defrost. Frozen food at risk.' },
  { key: 'a5DefrostStuck',  group: 'Circuit Defrost', label: 'A5 BREMA (8 doors) — HG defrost stuck on',  hint: 'A5 stuck in defrost — 8-door section warming. Check defrost termination thermostat.' },
  { key: 'a6DefrostStuck',  group: 'Circuit Defrost', label: 'A6 ORZ (10 doors) — HG defrost stuck on',   hint: 'A6 stuck — hot gas through ORZ coil. Check pressure-termination or time-limit setting.' },
  { key: 'a7DefrostStuck',  group: 'Circuit Defrost', label: 'A7 ORZ (10 doors) — HG defrost stuck on',   hint: 'A7 stuck — paired with A6, two ORZ circuits in defrost. Suction high.' },
  { key: 'a8DefrostStuck',  group: 'Circuit Defrost', label: 'A8 ORZ (16 doors) — HG defrost stuck on',   hint: 'A8 is the largest circuit. Stuck defrost here causes the biggest single-circuit suction rise.' },
  { key: 'a9DefrostStuck',  group: 'Circuit Defrost', label: 'A9 BREMA (12 doors) — HG defrost stuck on',  hint: 'A9 stuck — 12-door section. Second highest load impact of any single circuit.' },
]

const FAULT_GROUPS = ['Compressors', 'Condenser', 'Charge', 'Circuit TXV', 'Circuit Defrost']

// ── Scenarios ──────────────────────────────────────────────────────────────────
interface Scenario {
  id: string; name: string; description: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  ambient?: number; faults: Partial<FaultState>; answer: FaultKey[]
}

const SCENARIOS: Scenario[] = [
  {
    id: 'lead_comp_down',
    name: 'Lead Compressor Down',
    difficulty: 'Beginner',
    description: 'Call at 2 AM — Protocol Rack A is alarming. The controller shows only 5 of 6 compressors active and suction is running 4 psig above setpoint. Case temps starting to climb. Which compressor failed, and why does losing this one hurt more than losing a Lag-2 unit?',
    faults: { comp1Failed: true },
    answer: ['comp1Failed'],
  },
  {
    id: 'demand_cooling',
    name: 'High Discharge Temp on All Comps',
    difficulty: 'Intermediate',
    description: 'All 6 compressors running but discharge temperature is approaching 210 °F on every unit simultaneously. Suction and head pressure look near-normal. No refrigerant alarms. What is the common system element that protects all 6 Copeland EVI scrolls from high discharge temps?',
    faults: { demandCoolingFailed: true },
    answer: ['demandCoolingFailed'],
  },
  {
    id: 'lag2_all_down',
    name: 'Full Lag-2 Group Offline',
    difficulty: 'Intermediate',
    description: 'Three separate safety trips took out C4, C5, and C6 overnight — all ZF18KVE units. Suction is 3 psig above setpoint and the frozen food cases are at 4 °F. The lead and Lag-1 group are running fine. How much capacity has been lost, and which circuits will warm first?',
    faults: { comp4Failed: true, comp5Failed: true, comp6Failed: true },
    answer: ['comp4Failed', 'comp5Failed', 'comp6Failed'],
  },
  {
    id: 'a8_txv_failed',
    name: 'Largest Circuit Starved',
    difficulty: 'Beginner',
    description: 'Circuit A8 case temps are rising while suction is running lower than setpoint. The 16-door ORZ section isn\'t pulling down. All other circuits look normal. What is the single fault causing this, and what does the drop in suction tell you about where the problem is?',
    faults: { a8TxvFailed: true },
    answer: ['a8TxvFailed'],
  },
  {
    id: 'multiple_defrosts',
    name: 'Four Circuits Stuck in Defrost',
    difficulty: 'Advanced',
    description: 'Monday morning: Frozen food cases are all warm. Suction is running significantly above setpoint. Four circuits (A2, A3, A4, A9) — all Brema units — are stuck in defrost and won\'t terminate. Head pressure is also elevated from the load spike. What is the likely common cause?',
    ambient: 70,
    faults: { a2DefrostStuck: true, a3DefrostStuck: true, a4DefrostStuck: true, a9DefrostStuck: true },
    answer: ['a2DefrostStuck', 'a3DefrostStuck', 'a4DefrostStuck', 'a9DefrostStuck'],
  },
  {
    id: 'undercharge_winter',
    name: 'Winter — Racks Struggling Despite Cold',
    difficulty: 'Intermediate',
    description: 'It\'s January, OAT is 5 °F. HP control is holding condensing at minimum. Despite the cold ambient helping head pressure, suction superheat is very high (38 °F) and subcooling is near zero. Cases are 4–6 °F warmer than normal. A slow R-448A leak went undetected.',
    ambient: 5,
    faults: { undercharge: true },
    answer: ['undercharge'],
  },
  {
    id: 'dirty_condenser_summer',
    name: 'High Head — Summer Service Call',
    difficulty: 'Beginner',
    description: 'OAT is 85 °F. Head pressure is 35 psig above what the PT chart predicts for the measured condensing temperature. Discharge temps are elevated. The rack was last serviced in fall. Compressors are all running and amps are slightly high.',
    ambient: 85,
    faults: { dirtyCondenser: true, fan1Failed: true },
    answer: ['dirtyCondenser', 'fan1Failed'],
  },
]

// ── Compute engine ─────────────────────────────────────────────────────────────
// Design: −25 °F SST  |  Operating setpoint: −21 °F SST  |  Store ambient: 70 °F
// HP control floor: condensing bubble ≥ 80 °F (ensures liquid supply at low ambient)
const OPERATING_SST = -21   // °F
const HP_CTRL_MIN   =  80   // °F condensing bubble
const BASE_APPROACH =  20   // °F (clean coil, all fans)

interface Alarm { code: string; severity: 'WARNING' | 'CRITICAL'; message: string }

interface RackResult {
  sst: number; suctionPsig: number; suctionGasTemp: number; suctionSH: number
  condensingBubble: number; dischargePsig: number; dischargeTemp: number; dischargeSH: number
  compressionRatio: number; subcooling: number
  compRunning: boolean[]; compAmps: number[]; totalAmps: number
  hpCtrlActive: boolean; approachDelta: number
  totalLoadMBH: number; totalCapMBH: number; loadRatio: number
  circuitCaseTemps: number[]
  circuitStatuses: ('OK' | 'TXV_FAIL' | 'DEF_STUCK' | 'SPARE')[]
  alarms: Alarm[]
}

function computeRack(f: FaultState, ambient: number): RackResult {
  // ── Compressor capacity ────────────────────────────────────────────────────
  const compRunning = [!f.comp1Failed, !f.comp2Failed, !f.comp3Failed, !f.comp4Failed, !f.comp5Failed, !f.comp6Failed]
  const runningCount = compRunning.filter(Boolean).length

  // Demand cooling loss: ~15 % capacity reduction + severe discharge temp spike
  const dcFactor = f.demandCoolingFailed ? 0.85 : 1.0
  const totalCapMBH = COMP_SPECS.reduce((sum, c, i) =>
    sum + (compRunning[i] ? c.designMBH * dcFactor : 0), 0)

  // ── Condenser ──────────────────────────────────────────────────────────────
  let approach = BASE_APPROACH
  if (f.dirtyCondenser) approach += 12
  const fansFailed = (f.fan1Failed ? 1 : 0) + (f.fan2Failed ? 1 : 0)
  if (fansFailed === 1) approach += 9
  if (fansFailed === 2) approach += 24

  const rawCond  = ambient + approach
  const hpCtrl  = rawCond < HP_CTRL_MIN
  let condensing = Math.max(rawCond, HP_CTRL_MIN)
  if (f.overcharge) condensing += 14

  // ── Charge effects ─────────────────────────────────────────────────────────
  let suctionSH = 12     // °F EVI scroll target superheat (~10–15 °F)
  let subcooling = 16    // °F
  if (f.undercharge)            { suctionSH += 22; subcooling -= 11 }
  if (f.overcharge)             { suctionSH -= 8;  subcooling += 18 }
  if (f.filterDrierRestricted)  { suctionSH += 10; subcooling -= 6  }

  // ── Circuit load calculation ───────────────────────────────────────────────
  let totalLoadMBH = 0
  const circuitCaseTemps: number[] = []
  const circuitStatuses: ('OK' | 'TXV_FAIL' | 'DEF_STUCK' | 'SPARE')[] = []

  for (const c of CIRCUITS) {
    if (!c.active) {
      circuitCaseTemps.push(0); circuitStatuses.push('SPARE'); continue
    }
    const txvKey = CIRCUIT_TXV_FAULT[c.id]
    const defKey = CIRCUIT_DEF_FAULT[c.id]
    const txvFailed = txvKey ? f[txvKey] : false
    const defStuck  = defKey ? f[defKey]  : false

    if (defStuck) {
      // Hot gas stuck — pumps heat back into case, adds partial spurious load
      totalLoadMBH += c.designMBH * 0.25  // reduced net cooling load
      circuitCaseTemps.push(18)           // case warming rapidly
      circuitStatuses.push('DEF_STUCK')
    } else if (txvFailed) {
      // TXV not feeding — circuit starved, minimal load drawn
      totalLoadMBH += c.designMBH * 0.08
      circuitCaseTemps.push(12)
      circuitStatuses.push('TXV_FAIL')
    } else {
      totalLoadMBH += c.designMBH
      circuitCaseTemps.push(0)
      circuitStatuses.push('OK')
    }
  }

  // ── SST deviation from setpoint ────────────────────────────────────────────
  // Protocol controller stages compressors to hold suction at setpoint.
  // If load exceeds capacity, suction rises. If greatly underloaded, falls slightly.
  let sstDev = 0
  if (runningCount === 0) {
    sstDev = 45   // no refrigeration — suction rises toward case temp
  } else {
    const ratio = totalLoadMBH / totalCapMBH
    if (ratio > 1.0)  sstDev =  (ratio - 1.0) * 40  // overloaded — suction climbs
    else if (ratio < 0.55) sstDev = (ratio - 0.55) * 4  // underloaded — suction dips slightly
  }

  const sst         = OPERATING_SST + sstDev
  const suctionPsig = dewPsig(sst)
  const suctionGasTemp = sst + suctionSH

  // ── Discharge ──────────────────────────────────────────────────────────────
  condensing = Math.max(condensing, sst + 30)
  const dischargePsig = bubblePsig(condensing)

  // Demand cooling loss → severe discharge superheat rise
  const baseDischargeSH = f.demandCoolingFailed ? 110 : 48
  const dischargeSH     = baseDischargeSH + Math.max(0, condensing - 85) * 0.3
  const dischargeTemp   = condensing + dischargeSH

  const compressionRatio = (dischargePsig + 14.696) / (suctionPsig + 14.696)

  // ── Amps ───────────────────────────────────────────────────────────────────
  let ampsMult = 1.0
  if (f.undercharge)    ampsMult *= 0.93
  if (f.overcharge)     ampsMult *= 1.08
  if (f.dirtyCondenser) ampsMult *= 1.06
  if (fansFailed === 1) ampsMult *= 1.04
  if (fansFailed === 2) ampsMult *= 1.10
  if (f.demandCoolingFailed) ampsMult *= 1.04  // slight amp rise from inefficiency

  const compAmps  = COMP_SPECS.map((c, i) => compRunning[i] ? Math.round(c.rla * ampsMult * 10) / 10 : 0)
  const totalAmps = compAmps.reduce((a, b) => a + b, 0)

  // ── Alarms ─────────────────────────────────────────────────────────────────
  const alarms: Alarm[] = []

  if (runningCount === 0)
    alarms.push({ code: 'NO-COMP', severity: 'CRITICAL', message: 'All compressors offline — no refrigeration. Frozen food warming.' })

  if (suctionPsig <= 2.5)
    alarms.push({ code: 'LPCO', severity: 'CRITICAL', message: `Low Pressure Cutout — ${suctionPsig.toFixed(1)} psig. Compressors tripping on low pressure.` })
  else if (suctionPsig <= dewPsig(-25) + 0.5)  // near/below design SST
    alarms.push({ code: 'LP-W', severity: 'WARNING', message: `Suction near design floor — ${suctionPsig.toFixed(1)} psig (design: ${dewPsig(-25).toFixed(1)} psig / −25 °F SST). Check for over-cooling or undercharge.` })

  if (dischargePsig >= 350)
    alarms.push({ code: 'HPCO', severity: 'CRITICAL', message: `High Pressure Cutout — ${Math.round(dischargePsig)} psig (R-448A bubble). All compressors tripped.` })
  else if (dischargePsig >= 295)
    alarms.push({ code: 'HP-HIGH', severity: 'WARNING', message: `High discharge pressure — ${Math.round(dischargePsig)} psig. Approach ΔT: ${approach.toFixed(0)} °F.` })

  if (dischargeTemp >= 225)
    alarms.push({ code: 'HI-DT', severity: 'CRITICAL', message: `Discharge temp ${Math.round(dischargeTemp)} °F — compressors at risk. Demand cooling required.` })
  else if (dischargeTemp >= 200)
    alarms.push({ code: 'DT-W', severity: 'WARNING', message: `Elevated discharge temp — ${Math.round(dischargeTemp)} °F (EVI limit ~225 °F).` })

  if (f.demandCoolingFailed)
    alarms.push({ code: 'DC-FAIL', severity: 'CRITICAL', message: 'Demand cooling offline — liquid injection to EVI intermediate stage lost. All 6 compressors at shutdown risk.' })

  compRunning.forEach((r, i) => {
    if (!r) alarms.push({ code: `C${i + 1}-TRIP`, severity: 'CRITICAL', message: `Compressor ${i + 1} (${COMP_SPECS[i].model}, ${COMP_SPECS[i].group}) not running.` })
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

  const casesWarm = circuitCaseTemps.filter((t, i) => CIRCUITS[i].active && t >= 10).length
  if (casesWarm > 0)
    alarms.push({ code: 'CASE-TEMP', severity: casesWarm >= 4 ? 'CRITICAL' : 'WARNING', message: `${casesWarm} circuit(s) above 10 °F — food safety threshold.` })

  return {
    sst, suctionPsig, suctionGasTemp, suctionSH,
    condensingBubble: condensing, dischargePsig, dischargeTemp, dischargeSH,
    compressionRatio, subcooling,
    compRunning, compAmps, totalAmps,
    hpCtrlActive: hpCtrl, approachDelta: approach,
    totalLoadMBH, totalCapMBH, loadRatio: runningCount > 0 ? totalLoadMBH / totalCapMBH : 99,
    circuitCaseTemps, circuitStatuses,
    alarms,
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const MFR_COLOR: Record<Mfr, string> = {
  ORZ:   'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  BREMA: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  SPARE: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
}

const GROUP_COLOR: Record<string, string> = {
  Lead:  'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
  'Lag-1': 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  'Lag-2': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

// ── Main page component ────────────────────────────────────────────────────────
export default function ProtocolRackASimulatorPage() {
  const router = useRouter()
  const [faults, setFaults]   = useState<FaultState>(INITIAL_FAULTS)
  const [ambient, setAmbient] = useState(70)
  const [activeGroup, setActiveGroup] = useState<string>(FAULT_GROUPS[0])
  const [scenarioMode, setScenarioMode] = useState<boolean>(false)
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)
  const [scenarioRevealed, setScenarioRevealed] = useState(false)
  const [activeTab, setActiveTab] = useState<'faults' | 'scenarios' | 'info'>('faults')

  const result = useMemo(() => computeRack(faults, ambient), [faults, ambient])

  function toggleFault(key: FaultKey) {
    setFaults(prev => {
      const next = { ...prev, [key]: !prev[key] }
      // mutual exclusion
      const def = FAULT_DEFS.find(d => d.key === key)
      if (def?.mutuallyExcludes && !prev[key]) {
        for (const ex of def.mutuallyExcludes) next[ex] = false
      }
      return next
    })
  }

  function loadScenario(s: Scenario) {
    setFaults({ ...INITIAL_FAULTS, ...s.faults })
    if (s.ambient !== undefined) setAmbient(s.ambient)
    setActiveScenario(s)
    setScenarioMode(true)
    setScenarioRevealed(false)
    setActiveTab('faults')
  }

  function resetAll() {
    setFaults(INITIAL_FAULTS)
    setAmbient(70)
    setScenarioMode(false)
    setActiveScenario(null)
    setScenarioRevealed(false)
  }

  const critAlarms = result.alarms.filter(a => a.severity === 'CRITICAL')
  const warnAlarms = result.alarms.filter(a => a.severity === 'WARNING')
  const activeFaultCount = Object.values(faults).filter(Boolean).length

  const runningCount = result.compRunning.filter(Boolean).length
  const loadPct      = result.totalCapMBH > 0 ? Math.min(result.loadRatio * 100, 200) : 0

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
                <Activity size={14} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">{activeScenario.name}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">
                    {activeScenario.difficulty}
                  </span>
                </div>
                <p className="text-sm text-violet-700 dark:text-violet-300">{activeScenario.description}</p>
                {!scenarioRevealed ? (
                  <button onClick={() => setScenarioRevealed(true)}
                    className="mt-2 text-xs font-medium text-violet-600 dark:text-violet-400 underline">
                    Reveal answer
                  </button>
                ) : (
                  <div className="mt-2 p-2 bg-white dark:bg-slate-800 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Active faults:</p>
                    {activeScenario.answer.map(key => {
                      const def = FAULT_DEFS.find(d => d.key === key)
                      return def ? (
                        <p key={key} className="text-xs text-slate-500 dark:text-slate-400">• {def.label}</p>
                      ) : null
                    })}
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
            <p className="text-xs text-slate-400">SH: {result.suctionSH.toFixed(0)} °F</p>
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
              DT: {Math.round(result.dischargeTemp)} °F
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
            <p className="text-xs text-slate-400">{result.totalCapMBH.toFixed(1)} MBH cap.</p>
          </div>

          {/* System load */}
          <div className={`bg-white dark:bg-slate-800 rounded-xl p-3 border ${
            result.loadRatio > 1.2 ? 'border-red-300 dark:border-red-500/40' :
            result.loadRatio > 0.95 ? 'border-amber-300 dark:border-amber-500/40' :
            'border-slate-200 dark:border-slate-700'}`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">System Load</p>
            <p className={`text-xl font-bold ${
              result.loadRatio > 1.2 ? 'text-red-600 dark:text-red-400' :
              result.loadRatio > 0.95 ? 'text-amber-600 dark:text-amber-400' :
              'text-slate-900 dark:text-white'}`}>
              {Math.min(loadPct, 199).toFixed(0)}<span className="text-sm font-normal">%</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{result.totalLoadMBH.toFixed(1)} / {result.totalCapMBH.toFixed(1)} MBH</p>
            <p className="text-xs text-slate-400">SC: {result.subcooling.toFixed(1)} °F</p>
          </div>
        </div>

        {/* Ambient slider */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-4">
          <Wind size={15} className="text-slate-400 flex-shrink-0" />
          <div className="flex-1 flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 w-28 flex-shrink-0">Ambient / OAT</span>
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
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
            Compressor Bank — Protocol Sequencing
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {COMP_SPECS.map((comp, i) => {
              const running = result.compRunning[i]
              const amps    = result.compAmps[i]
              return (
                <div key={comp.id} className={`rounded-xl border p-3 transition-all ${
                  running
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    : 'bg-red-50 dark:bg-red-500/5 border-red-300 dark:border-red-500/40'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{comp.id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${GROUP_COLOR[comp.group]}`}>
                      {comp.group}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mb-1">{comp.model}</p>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${running ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className={`text-xs font-medium ${running ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {running ? `${amps.toFixed(1)} A` : 'TRIPPED'}
                    </span>
                  </div>
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
              const status   = result.circuitStatuses[i]
              const caseTemp = result.circuitCaseTemps[i]
              const isWarm   = c.active && caseTemp >= 10
              const isWarn   = c.active && caseTemp >= 5 && caseTemp < 10

              const borderCls = !c.active
                ? 'border-slate-100 dark:border-slate-700/50'
                : status === 'DEF_STUCK' ? 'border-amber-300 dark:border-amber-500/40'
                : status === 'TXV_FAIL'  ? 'border-orange-300 dark:border-orange-500/40'
                : isWarm ? 'border-red-300 dark:border-red-500/40'
                : isWarn ? 'border-amber-200 dark:border-amber-500/30'
                : 'border-slate-200 dark:border-slate-700'

              const bgCls = !c.active
                ? 'bg-slate-50 dark:bg-slate-800/50'
                : status === 'DEF_STUCK' ? 'bg-amber-50 dark:bg-amber-500/5'
                : status === 'TXV_FAIL'  ? 'bg-orange-50 dark:bg-orange-500/5'
                : isWarm ? 'bg-red-50 dark:bg-red-500/5'
                : 'bg-white dark:bg-slate-800'

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
                      {status === 'DEF_STUCK' && (
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">HG defrost stuck</p>
                      )}
                      {status === 'TXV_FAIL' && (
                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">TXV not feeding</p>
                      )}
                      {status === 'OK' && (
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${isWarm ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <span className={`text-xs font-medium ${isWarm ? 'text-red-600 dark:text-red-400' : isWarn ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {caseTemp === 0 ? '0' : caseTemp.toFixed(0)} °F
                          </span>
                        </div>
                      )}
                      {(status === 'DEF_STUCK' || status === 'TXV_FAIL') && (
                        <p className={`text-xs font-bold mt-0.5 ${caseTemp >= 10 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          ~{caseTemp.toFixed(0)} °F
                        </p>
                      )}
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
          {/* Tab bar */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            {(['faults', 'scenarios', 'info'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                {tab === 'faults' ? `Fault Injection${activeFaultCount > 0 ? ` (${activeFaultCount})` : ''}` : tab === 'scenarios' ? 'Scenarios' : 'Rack Info'}
              </button>
            ))}
          </div>

          {/* Faults panel */}
          {activeTab === 'faults' && (
            <div className="p-4">
              {/* Group tabs */}
              <div className="flex gap-1 flex-wrap mb-4">
                {FAULT_GROUPS.map(g => {
                  const active = activeGroup === g
                  const count  = FAULT_DEFS.filter(d => d.group === g && faults[d.key]).length
                  return (
                    <button key={g} onClick={() => setActiveGroup(g)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                        active
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                      {g}{count > 0 && <span className={`ml-1 font-bold ${active ? 'text-blue-200' : 'text-red-500'}`}>({count})</span>}
                    </button>
                  )
                })}
              </div>
              <div className="space-y-2">
                {FAULT_DEFS.filter(d => d.group === activeGroup).map(def => (
                  <label key={def.key}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      faults[def.key]
                        ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/40'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                    <input type="checkbox" checked={faults[def.key]}
                      onChange={() => toggleFault(def.key)}
                      className="mt-0.5 accent-red-500 flex-shrink-0" />
                    <div>
                      <p className={`text-sm font-medium ${faults[def.key] ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                        {def.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{def.hint}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Scenarios panel */}
          {activeTab === 'scenarios' && (
            <div className="p-4 space-y-3">
              {SCENARIOS.map(s => (
                <div key={s.id}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${
                    activeScenario?.id === s.id
                      ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-300 dark:border-violet-500/40'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                  onClick={() => loadScenario(s)}>
                  <div className="flex items-center gap-2 mb-1">
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
                      R-448A has a ~10–15 °F temperature glide, meaning bubble point ≠ dew point at the same pressure.
                      The gauge reads the same pressure whether you're measuring bubble or dew, but the temperatures differ.
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-300">At −21 °F SST (operating setpoint):</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">• Suction gauge reads DEW side: {dewPsig(-21).toFixed(1)} psig</p>
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mt-1">At design condensing (~109 °F):</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">• Discharge gauge reads BUBBLE: {bubblePsig(109).toFixed(0)} psig</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">• DEW equivalent at same pressure: {dewTempFrom(bubblePsig(109)).toFixed(1)} °F</p>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Compressor Groups</p>
                  <div className="space-y-1.5">
                    {[
                      { group: 'Lead (on 1st, off last)', comps: 'C1 — ZFD25KVE (dual EVI)', mbh: '30.0 MBH', note: '~23% of total capacity' },
                      { group: 'Lag-1 (on 2nd)', comps: 'C2/C3 — ZF25KVE × 2', mbh: '47.0 MBH', note: '~35% of total capacity' },
                      { group: 'Lag-2 (on 3rd)', comps: 'C4/C5/C6 — ZF18KVE × 3', mbh: '55.8 MBH', note: '~42% of total capacity' },
                    ].map(r => (
                      <div key={r.group} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{r.group}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{r.comps} · {r.mbh} · {r.note}</p>
                      </div>
                    ))}
                  </div>
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
