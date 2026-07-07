'use client'
export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  RotateCcw, AlertTriangle, CheckCircle2, XCircle, Droplets,
  Gauge, Target, Trophy, Dices, BookOpen, Moon,
  Eye, EyeOff, Zap, GraduationCap, Flame, Snowflake,
} from 'lucide-react'
import LearningTabBar from '@/components/layout/LearningTabBar'
import PageHeader from '@/components/PageHeader'
import TrendsCard, { useTrendHistory } from '@/components/simulation/TrendsCard'
import { useLiveReadings } from '@/components/simulation/useLiveReadings'
import DtBunkerVisual from '@/components/simulation/visuals/DtBunkerVisual'
import CaseCircuitTrainer from '@/components/simulation/CaseCircuitTrainer'
import { useIsMobile } from '@/components/simulation/useIsMobile'
import SchematicViewer, { SchematicInfoCard, type SchematicDetail } from '@/components/simulation/visuals/SchematicViewer'
import { saveSimAttempt } from '@/lib/simulation/attempts'

// ── R-448A saturation P-T (vapor/dew — used for suction & superheat) ───────────
// Verified points from the PT ground-truth table in CLAUDE.md; low-end values
// extrapolated and treated as approximate.
const R448A_PT: [number, number][] = [
  [-40, 1.6], [-30, 5.3], [-20, 9.8], [-10, 16.4], [0, 24.3],
  [10, 33.8], [20, 44.6], [40, 76], [65, 117.7], [75, 140.9],
]
function satPsig(tempF: number): number {
  const t = Math.min(Math.max(tempF, R448A_PT[0][0]), R448A_PT[R448A_PT.length - 1][0])
  for (let i = 0; i < R448A_PT.length - 1; i++) {
    const [t1, p1] = R448A_PT[i], [t2, p2] = R448A_PT[i + 1]
    if (t >= t1 && t <= t2) return p1 + ((t - t1) / (t2 - t1)) * (p2 - p1)
  }
  return R448A_PT[R448A_PT.length - 1][1]
}
function satTempF(psig: number): number {
  const p = Math.min(Math.max(psig, R448A_PT[0][1]), R448A_PT[R448A_PT.length - 1][1])
  for (let i = 0; i < R448A_PT.length - 1; i++) {
    const [t1, p1] = R448A_PT[i], [t2, p2] = R448A_PT[i + 1]
    if (p >= p1 && p <= p2) return t1 + ((p - p1) / (p2 - p1)) * (t2 - t1)
  }
  return R448A_PT[R448A_PT.length - 1][0]
}

// ── Design constants — Hussmann-style 8 ft single-deck frozen island ────────────
const DESIGN_SST = -21        // °F saturated suction at the case (≈ 9.4 psig R-448A dew)
const DESIGN_SH = 8           // °F TXV superheat
const DESIGN_DISCHARGE = -12  // °F discharge air
const FAN_AMPS = 0.4          // A per evap fan motor (2 total)
const HEATER_AMPS = 4.2       // A per defrost heater element @ 208 V (2 total)
const DT_OPEN_F = 55          // DT switch opens (terminates defrost)
const KLIXON_CLOSE_F = 20     // fan delay klixon closes at/below this coil temp

// ── Faults ────────────────────────────────────────────────────────────────────
type FaultKey =
  | 'txvStarved' | 'txvFlooding' | 'liquidRestricted'
  | 'coilIced' | 'blockedReturn' | 'curtainTorn'
  | 'fan1Dead' | 'fansDeadBoth' | 'klixonStuckOpen'
  | 'dtStuckClosed' | 'dtFailedOpen' | 'hiLimitOpen' | 'heaterOneOpen' | 'defrostContactorWelded'

type FaultState = Record<FaultKey, boolean>
const INITIAL_FAULTS = {
  txvStarved: false, txvFlooding: false, liquidRestricted: false,
  coilIced: false, blockedReturn: false, curtainTorn: false,
  fan1Dead: false, fansDeadBoth: false, klixonStuckOpen: false,
  dtStuckClosed: false, dtFailedOpen: false, hiLimitOpen: false,
  heaterOneOpen: false, defrostContactorWelded: false,
} satisfies FaultState

interface FaultDef { key: FaultKey; label: string; hint: string; group: string; mutuallyExcludes?: FaultKey[] }
const FAULT_DEFS: FaultDef[] = [
  { key: 'txvStarved',     label: 'TXV starving (underfeeding)', hint: 'Low suction with HIGH superheat — coil half-fed, case warms. Check bulb charge and inlet strainer', group: 'TXV / Refrigerant', mutuallyExcludes: ['txvFlooding'] },
  { key: 'txvFlooding',    label: 'TXV flooding (bulb loose / overfeed)', hint: 'Superheat near zero — liquid past the coil to the rack. Slugging risk; strap and insulate the bulb', group: 'TXV / Refrigerant', mutuallyExcludes: ['txvStarved'] },
  { key: 'liquidRestricted', label: 'Liquid line strainer plugged', hint: 'Same starved signature as a bad TXV (high SH, warm case) but the restriction is upstream — feel for a temperature drop across the strainer', group: 'TXV / Refrigerant' },
  { key: 'coilIced',       label: 'Coil iced solid', hint: 'Frost blocks airflow: LOW suction AND LOW superheat with fans running. The ice is the symptom — find the defrost fault behind it', group: 'Airflow / Load' },
  { key: 'blockedReturn',  label: 'Product blocking return air grille', hint: 'Overstocked above the load line — air short-cycles, product on top warms while readings look near-normal', group: 'Airflow / Load' },
  { key: 'curtainTorn',    label: 'Night curtain torn / left off', hint: 'Extra infiltration all night: frost load climbs, morning product temps drift up. Worst in humid stores', group: 'Airflow / Load' },
  { key: 'fan1Dead',       label: 'Evap fan #1 motor burned out', hint: 'One fan spins, one doesn\'t — 0.4 A missing on the clamp. Airflow halves, temps go uneven along the case', group: 'Fans (Electrical)', mutuallyExcludes: ['fansDeadBoth'] },
  { key: 'fansDeadBoth',   label: 'Both evap fans dead', hint: 'Zero fan amps WITH voltage present — motors or harness. Cold coil + dead fans + good voltage = motors', group: 'Fans (Electrical)', mutuallyExcludes: ['fan1Dead'] },
  { key: 'klixonStuckOpen', label: 'Fan delay klixon stuck open', hint: 'Coil is cold, motors are good, but 0 V past the klixon — fans never restart after defrost. The most-missed case fault', group: 'Fans (Electrical)' },
  { key: 'dtStuckClosed',  label: 'DT switch stuck closed', hint: 'Defrost never terminates on temperature — runs to failsafe every cycle. Coil steams, product spikes during every defrost', group: 'Defrost (Electrical)', mutuallyExcludes: ['dtFailedOpen'] },
  { key: 'dtFailedOpen',   label: 'DT switch failed open', hint: 'Defrost terminates the instant it starts — coil never clears and ices over a week. DT reads OPEN even with a cold coil (should be closed)', group: 'Defrost (Electrical)', mutuallyExcludes: ['dtStuckClosed'] },
  { key: 'hiLimitOpen',    label: 'Heater hi-limit open', hint: 'Voltage reaches the heater circuit but 0 A — the hi-limit klixon upstream of the elements is open. Coil ices over days', group: 'Defrost (Electrical)' },
  { key: 'heaterOneOpen',  label: 'One heater element open', hint: 'Half heater amps (4.2 A instead of 8.4 A) — partial defrosts leave ice building at one end of the coil', group: 'Defrost (Electrical)' },
  { key: 'defrostContactorWelded', label: 'Defrost contactor welded closed', hint: 'Heater amps present DURING REFRIGERATION — heaters fight the coil 24/7. Suction high, case warm, energy bill wrecked', group: 'Defrost (Electrical)' },
]
const FAULT_GROUPS = ['TXV / Refrigerant', 'Airflow / Load', 'Fans (Electrical)', 'Defrost (Electrical)']

interface Alarm { code: string; severity: 'CRITICAL' | 'WARNING'; message: string }

interface CaseResult {
  suctionPsig: number; sst: number; sh: number
  coilTempF: number; frostPct: number; airflow: number
  dischargeAirF: number; returnAirF: number; productF: number
  fanAmps: [number, number]; fansSpinning: [boolean, boolean]
  heaterAmps: number; heaterVolts: number
  dtClosed: boolean; klixonClosed: boolean
  alarms: Alarm[]
}

// ── Compute engine ────────────────────────────────────────────────────────────
function computeCase(f: FaultState, rh: number, defrost: boolean, night: boolean): CaseResult {
  // ── Frost: humidity drives the baseline; missed/partial defrosts stack on top
  let frost = Math.max(0, (rh - 30) / 40) * 22            // 0–22 % between defrosts
  if (f.heaterOneOpen) frost += 25                        // half-power defrosts never quite clear
  if (f.hiLimitOpen || f.dtFailedOpen) frost += 45        // defrosts produce no melt
  if (f.coilIced) frost = 95
  if (f.curtainTorn && night) frost += 10
  frost = Math.min(100, frost)

  // ── Airflow (0–1)
  const klixonStuck = f.klixonStuckOpen
  let airflow = 1
  if (f.fan1Dead) airflow = 0.55
  if (f.fansDeadBoth || klixonStuck) airflow = 0
  if (f.blockedReturn) airflow = Math.min(airflow, 0.6)
  if (frost > 55) airflow *= Math.max(0.1, 1 - (frost - 55) / 50)

  // ── Refrigeration-side state
  let suctionPsig = satPsig(DESIGN_SST)
  let sh = DESIGN_SH
  if (f.txvStarved)       { suctionPsig -= 3.2; sh += 18 }
  if (f.liquidRestricted) { suctionPsig -= 2.8; sh += 14 }
  if (f.txvFlooding)      { suctionPsig += 1.5; sh = 1 }
  if (f.defrostContactorWelded && !defrost) { suctionPsig += 3.5 }
  // low airflow = low load: suction AND superheat sag together
  suctionPsig -= (1 - airflow) * 3.0
  if (!f.txvStarved && !f.liquidRestricted) sh = Math.max(1.5, sh - (1 - airflow) * 5)
  suctionPsig = Math.max(1.5, suctionPsig)
  const sst = satTempF(suctionPsig)

  // ── Coil temperature
  let coilTempF = sst + 3 * airflow + 1.5
  if (f.defrostContactorWelded && !defrost) coilTempF += 12

  // ── Defrost snapshot (mid-defrost): pumped down, fans off, heaters (should be) on
  let heaterAmps = 0
  let heaterVolts = 0
  if (defrost) {
    const relayDropped = f.dtFailedOpen                     // DT open → control ends defrost immediately
    heaterVolts = relayDropped ? 0 : 208
    if (!relayDropped && !f.hiLimitOpen) heaterAmps = f.heaterOneOpen ? HEATER_AMPS : HEATER_AMPS * 2
    // coil mid-defrost: warming if heaters work, stone cold if not
    if (heaterAmps >= HEATER_AMPS * 2 - 0.1) coilTempF = f.dtStuckClosed ? 62 : 38
    else if (heaterAmps > 0) coilTempF = 22
    else coilTempF = sst + 4                                // no heat — coil just sits cold
    suctionPsig = satPsig(DESIGN_SST) + 0.8                 // LLS closed; stub sees the rack header
    sh = 0
  } else if (f.defrostContactorWelded) {
    heaterAmps = HEATER_AMPS * 2
    heaterVolts = 208
  }

  // ── DT + klixon states
  const dtClosed = f.dtStuckClosed ? true : f.dtFailedOpen ? false : coilTempF < DT_OPEN_F
  const klixonClosed = !f.klixonStuckOpen && coilTempF <= KLIXON_CLOSE_F

  // ── Fans
  const fanPowered = !defrost && klixonClosed
  const fansSpinning: [boolean, boolean] = [
    fanPowered && !f.fan1Dead && !f.fansDeadBoth,
    fanPowered && !f.fansDeadBoth,
  ]
  const fanAmps: [number, number] = [fansSpinning[0] ? FAN_AMPS : 0, fansSpinning[1] ? FAN_AMPS : 0]

  // ── Air & product temps
  let dischargeAirF: number
  let returnAirF: number
  if (!defrost && airflow > 0.25) {
    dischargeAirF = sst + 9 + (sh > 16 ? 5 : 0) + (1 - airflow) * 4
    returnAirF = dischargeAirF + 4 + (night && !f.curtainTorn ? -1.5 : 0) + (f.curtainTorn && night ? 3 : 0)
  } else {
    // stagnant (fans off / defrost): both probes drift toward the tub air
    returnAirF = DESIGN_DISCHARGE + 8 + (defrost ? 4 : 10)
    dischargeAirF = returnAirF - 1
  }
  let productF = -8
  productF += (1 - airflow) * 14
  if (f.defrostContactorWelded && !defrost) productF += 10
  if (f.txvStarved || f.liquidRestricted) productF += 7
  if (f.blockedReturn) productF += 5
  if (f.curtainTorn && night) productF += 4
  if (frost > 70) productF += 4
  if (defrost) productF += f.dtStuckClosed ? 9 : 3

  // ── Alarms (case controller view — clean model, no sensor noise)
  const alarms: Alarm[] = []
  if (productF >= 10) alarms.push({ code: 'PROD-HI', severity: 'CRITICAL', message: `Product at ${Math.round(productF)} °F — frozen food at risk.` })
  else if (productF >= 0) alarms.push({ code: 'PROD-W', severity: 'WARNING', message: `Product drifting — ${Math.round(productF)} °F (target ≤ −8 °F).` })
  if (!defrost && airflow < 0.25) alarms.push({ code: 'AIRFLOW', severity: 'CRITICAL', message: 'No discharge air — air curtain collapsed. Check fans, klixon, and coil frost.' })
  if (!defrost && sh >= 20) alarms.push({ code: 'SH-HI', severity: 'WARNING', message: `Superheat ${Math.round(sh)} °F — coil starving. TXV or liquid supply.` })
  if (!defrost && sh <= 2.5 && airflow > 0.25) alarms.push({ code: 'SH-LO', severity: 'WARNING', message: `Superheat ${sh.toFixed(1)} °F — floodback to the rack. Check TXV bulb.` })
  if (!defrost && heaterAmps > 1) alarms.push({ code: 'HTR-REF', severity: 'CRITICAL', message: `${heaterAmps.toFixed(1)} A on the heater circuit during refrigeration — defrost contactor welded.` })
  if (defrost && heaterVolts > 0 && heaterAmps < 1) alarms.push({ code: 'HTR-FAIL', severity: 'CRITICAL', message: 'Defrost commanded, 208 V present, 0 A — no heater current. Hi-limit or elements.' })
  if (defrost && heaterAmps > 1 && heaterAmps < HEATER_AMPS * 2 - 0.5) alarms.push({ code: 'HTR-HALF', severity: 'WARNING', message: `Heater current ${heaterAmps.toFixed(1)} A (expect ${(HEATER_AMPS * 2).toFixed(1)} A) — one element open.` })
  if (defrost && f.dtStuckClosed) alarms.push({ code: 'DEF-LONG', severity: 'WARNING', message: 'Defrost running long — termination temperature never reached (failsafe timer will end it).' })
  if (frost >= 70) alarms.push({ code: 'FROST', severity: 'WARNING', message: `Coil frost ${Math.round(frost)} % — defrost performance failing.` })

  return {
    suctionPsig, sst, sh, coilTempF, frostPct: frost, airflow,
    dischargeAirF, returnAirF, productF,
    fanAmps, fansSpinning, heaterAmps, heaterVolts,
    dtClosed, klixonClosed, alarms,
  }
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
interface Scenario {
  id: string; name: string; description: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  rh?: number; night?: boolean
  faults: Partial<FaultState>; answer: FaultKey[]
  knowledge?: { slug: string; label: string }[]
}

const SCENARIOS: Scenario[] = [
  {
    id: 'fans_silent',
    name: 'Warm Bunker, Fans Silent',
    difficulty: 'Intermediate',
    rh: 45,
    description: 'Store called: ice cream soft in the DT bunker. You arrive to find the case dead quiet — no fan noise, no discharge air. The coil is COLD and mostly clear, both fan motors spin freely by hand, and there\'s 120 V at the case. Defrost ran overnight. What single component keeps good fans off a cold coil?',
    faults: { klixonStuckOpen: true },
    answer: ['klixonStuckOpen'],
    knowledge: [{ slug: 'defrost-systems', label: 'Defrost Systems' }, { slug: 'system-diagnostics', label: 'System Diagnostics' }],
  },
  {
    id: 'half_amps',
    name: 'Ice Creeping Up One End',
    difficulty: 'Intermediate',
    rh: 55,
    description: 'The manager scrapes frost off one end of this bunker every morning. Product temps are only slightly up. Flip the case into defrost and put your amp clamp on the heater feed — what do the numbers tell you?',
    faults: { heaterOneOpen: true },
    answer: ['heaterOneOpen'],
    knowledge: [{ slug: 'defrost-systems', label: 'Defrost Systems' }, { slug: 'math-electrical', label: 'Math & Electrical' }],
  },
  {
    id: 'iced_monday',
    name: 'Iced Solid — But Defrost "Runs"',
    difficulty: 'Advanced',
    rh: 60,
    description: 'Coil is a block of ice. The controller log shows defrost initiating on schedule every 6 hours all week. In defrost you measure 208 V at the heater circuit but ZERO amps. The elements ohm out fine. What\'s open between the contactor and the elements?',
    faults: { hiLimitOpen: true, coilIced: true },
    answer: ['hiLimitOpen'],
    knowledge: [{ slug: 'defrost-systems', label: 'Defrost Systems' }],
  },
  {
    id: 'starved_case',
    name: 'Warm Case, Coil Half Frosted',
    difficulty: 'Beginner',
    rh: 45,
    description: 'Product at +2 °F and climbing. Fans run strong, coil is clean but only frosted across the first half. Suction at the case reads low with superheat over 25 °F. The rack is healthy and other cases on this line are fine. What\'s starving this coil?',
    faults: { txvStarved: true },
    answer: ['txvStarved'],
    knowledge: [{ slug: 'sporlan', label: 'Sporlan TXVs' }, { slug: 'refrigeration-fundamentals', label: 'Refrigeration Fundamentals' }],
  },
  {
    id: 'floodback',
    name: 'Rack Tech Complains About Slugging',
    difficulty: 'Advanced',
    rh: 45,
    description: 'The rack tech says the LT suction header off this circuit runs frosted back to the compressors and superheat at the case reads 1 °F. The case itself is holding temp. Nobody has touched the TXV — but somebody did change a fan motor last month, working right beside the suction line. What would you check on the TXV?',
    faults: { txvFlooding: true },
    answer: ['txvFlooding'],
    knowledge: [{ slug: 'sporlan', label: 'Sporlan TXVs' }, { slug: 'refrigeration-fundamentals', label: 'Refrigeration Fundamentals' }],
  },
  {
    id: 'welded',
    name: 'Case Warm, Coil Clear and Suction High',
    difficulty: 'Advanced',
    rh: 45,
    description: 'This bunker won\'t pull down: product +4 °F, suction pressure ABOVE normal, superheat normal, coil completely clear of frost — almost dry. Fans fine. It defrosts fine. Clamp the heater circuit while the case is IN REFRIGERATION and explain the reading.',
    faults: { defrostContactorWelded: true },
    answer: ['defrostContactorWelded'],
    knowledge: [{ slug: 'defrost-systems', label: 'Defrost Systems' }, { slug: 'math-electrical', label: 'Math & Electrical' }],
  },
  {
    id: 'one_fan',
    name: 'The Uneven Bunker',
    difficulty: 'Beginner',
    rh: 45,
    description: 'Product at one end of the island reads 6 °F warmer than the other end. Discharge air is weak. Listen at the grille and clamp the fan circuit — 0.4 A where you expect 0.8 A. Call it.',
    faults: { fan1Dead: true },
    answer: ['fan1Dead'],
    knowledge: [{ slug: 'math-electrical', label: 'Math & Electrical' }, { slug: 'walk-in-troubleshooting', label: 'Walk-In Troubleshooting' }],
  },
  {
    id: 'defrost_forever',
    name: 'Defrost That Never Ends',
    difficulty: 'Intermediate',
    rh: 50,
    description: 'Every defrost runs the full failsafe time — 45 minutes — and the case steams like a sauna. Product spikes to +8 °F during each cycle. A healthy defrost on this case terminates in ~20 minutes on temperature. Which device should be ending the defrost, and how is it failing?',
    faults: { dtStuckClosed: true },
    answer: ['dtStuckClosed'],
    knowledge: [{ slug: 'defrost-systems', label: 'Defrost Systems' }],
  },
  {
    id: 'ices_weekly',
    name: 'Re-Ices Every Week',
    difficulty: 'Advanced',
    rh: 60,
    description: 'You steamed this coil clean last Friday. It\'s Wednesday and it\'s icing again. The heaters ohm fine and pull full amps — when they run. But the controller log shows every defrost terminating after ninety seconds. With the coil at −18 °F, you check the DT switch for continuity: OPEN. Should it be?',
    faults: { dtFailedOpen: true },
    answer: ['dtFailedOpen'],
    knowledge: [{ slug: 'defrost-systems', label: 'Defrost Systems' }],
  },
  {
    id: 'overstocked',
    name: 'Holiday Overstock',
    difficulty: 'Beginner',
    rh: 45,
    description: 'The week before the holiday, grocery packed this island a foot above the load line. Top-layer product reads +5 °F while everything below is fine. Suction, superheat and fan amps all read near normal. What\'s wrong — and is it even a service problem?',
    faults: { blockedReturn: true },
    answer: ['blockedReturn'],
    knowledge: [{ slug: 'hussmann', label: 'Hussmann Cases' }],
  },
]

const MYSTERY_RHS = [35, 45, 55, 65]
function generateMystery(): Scenario {
  const def = FAULT_DEFS[Math.floor(Math.random() * FAULT_DEFS.length)]
  const faults: Partial<FaultState> = { [def.key]: true }
  return {
    id: 'mystery',
    name: 'Mystery Fault',
    difficulty: 'Intermediate',
    rh: MYSTERY_RHS[Math.floor(Math.random() * MYSTERY_RHS.length)],
    night: Math.random() < 0.3,
    description: 'The bunker has one hidden fault. Work it like a real call: read the case, clamp the circuits, flip it into defrost if you need the heater rung live — then call it.',
    faults,
    answer: [def.key],
    knowledge: [{ slug: 'hussmann', label: 'Hussmann Cases' }, { slug: 'system-diagnostics', label: 'System Diagnostics' }],
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DtBunkerSimulatorPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [faults, setFaults] = useState<FaultState>(INITIAL_FAULTS)
  const [rh, setRh] = useState(45)
  const [night, setNight] = useState(false)
  const [defrost, setDefrost] = useState(false)
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)
  const [userGuess, setUserGuess] = useState<FaultState>(INITIAL_FAULTS)
  const [submitted, setSubmitted] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [instructorReveal, setInstructorReveal] = useState(false)
  const [schematicOpen, setSchematicOpen] = useState(true)
  const [wiringOpen, setWiringOpen] = useState(false)
  const [schemDetail, setSchemDetail] = useState<SchematicDetail | null>(null)

  const inScenario = activeScenario !== null
  const activeFaults = useMemo(
    () => (activeScenario ? { ...INITIAL_FAULTS, ...activeScenario.faults } : faults),
    [activeScenario, faults],
  )
  const activeRh = inScenario ? (activeScenario.rh ?? 45) : rh
  const activeNight = inScenario ? (activeScenario.night ?? false) : night

  // mode toggle stays live inside scenarios — flipping into defrost to clamp the
  // heater circuit is half the diagnosis
  const base = useMemo(() => computeCase(activeFaults, activeRh, defrost, activeNight), [activeFaults, activeRh, defrost, activeNight])

  const live = useLiveReadings([
    { key: 'suction',  target: base.suctionPsig,   jitter: 0.15, wander: 0.5,  period: 30, bias: 0.2 },
    { key: 'sh',       target: base.sh,            jitter: 0.2,  wander: 1.2,  period: 24, bias: 0.3 },
    { key: 'disch',    target: base.dischargeAirF, jitter: 0.2,  wander: 0.8,  period: 50, bias: 0.5 },
    { key: 'return',   target: base.returnAirF,    jitter: 0.2,  wander: 0.9,  period: 55, bias: 0.5 },
    { key: 'product',  target: base.productF,      jitter: 0.05, wander: 0.4,  period: 90, bias: 0.4 },
    { key: 'coil',     target: base.coilTempF,     jitter: 0.15, wander: 0.6,  period: 40, bias: 0.3 },
    { key: 'ampF',     target: 1,                  jitter: 0.006, wander: 0.012, period: 20 },
  ])

  const result: CaseResult = {
    ...base,
    suctionPsig: live.suction,
    sst: satTempF(live.suction),
    sh: base.sh === 0 ? 0 : Math.max(0.3, live.sh),
    dischargeAirF: live.disch,
    returnAirF: live.return,
    productF: live.product,
    coilTempF: live.coil,
    fanAmps: [base.fanAmps[0] * live.ampF, base.fanAmps[1] * live.ampF] as [number, number],
    heaterAmps: base.heaterAmps * live.ampF,
  }

  const trendSpecs = [
    { key: 'suction', label: 'Suction',       unit: 'psig', value: result.suctionPsig },
    { key: 'sh',      label: 'Superheat',     unit: '°F',   value: result.sh },
    { key: 'disch',   label: 'Discharge Air', unit: '°F',   value: result.dischargeAirF },
    { key: 'product', label: 'Product',       unit: '°F',   value: result.productF },
    { key: 'coil',    label: 'Coil Temp',     unit: '°F',   value: result.coilTempF },
  ]
  const trendHistory = useTrendHistory(trendSpecs)

  function toggleFault(key: FaultKey) {
    const def = FAULT_DEFS.find(d => d.key === key)
    const setter = inScenario ? setUserGuess : setFaults
    setter(prev => {
      const next = { ...prev, [key]: !prev[key] }
      if (!prev[key] && def?.mutuallyExcludes) def.mutuallyExcludes.forEach(ex => { next[ex] = false })
      return next
    })
  }

  function loadScenario(s: Scenario) {
    setActiveScenario(s); setUserGuess(INITIAL_FAULTS); setSubmitted(false); setPickerOpen(false); setDefrost(false)
  }
  function exitScenario() { setActiveScenario(null); setUserGuess(INITIAL_FAULTS); setSubmitted(false) }
  function resetAll() {
    setFaults(INITIAL_FAULTS); setRh(45); setNight(false); setDefrost(false); setInstructorReveal(false)
    exitScenario()
  }

  function submitDiagnosis() {
    if (!activeScenario) return
    setSubmitted(true)
    const correct = activeScenario.answer.filter(k => userGuess[k]).length
    const total = activeScenario.answer.length
    const fp = Object.entries(userGuess).filter(([k, v]) => v && !activeScenario.answer.includes(k as FaultKey)).length
    const pct = Math.max(0, Math.round(((correct - fp * 0.5) / total) * 100))
    saveSimAttempt({
      rack: 'dt-bunker',
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
    const total = activeScenario.answer.length
    const fp = Object.entries(userGuess).filter(([k, v]) => v && !activeScenario.answer.includes(k as FaultKey)).length
    const pct = Math.max(0, Math.round(((correct - fp * 0.5) / total) * 100))
    return { correct, total, fp, pct }
  })()

  function coachInColdIQ() {
    if (!activeScenario || !submitted) return
    const labelOf = (k: FaultKey) => FAULT_DEFS.find(d => d.key === k)?.label ?? k
    const picked = FAULT_DEFS.filter(d => userGuess[d.key]).map(d => d.label)
    const answer = activeScenario.answer.map(labelOf)
    const missed = activeScenario.answer.filter(k => !userGuess[k]).map(labelOf)
    const fps = FAULT_DEFS.filter(d => userGuess[d.key] && !activeScenario.answer.includes(d.key)).map(d => d.label)
    const text = [
      '=== ColdIQ Simulator Coach Request ===',
      'System: DT Bunker frozen island display case | R-448A LT circuit off the rack | electric defrost',
      `Scenario: ${activeScenario.name} (${activeScenario.difficulty})`,
      activeScenario.description,
      '',
      'READINGS AT SUBMIT:',
      `  Mode: ${defrost ? 'DEFROST (snapshot mid-cycle)' : 'refrigeration'} · store RH ${activeRh}% · ${activeNight ? 'night (curtain hours)' : 'day'}`,
      `  Suction at case: ${result.suctionPsig.toFixed(1)} psig / ${result.sst.toFixed(1)} °F SST · superheat ${defrost ? 'n/a (pumped out)' : `${result.sh.toFixed(1)} °F`}`,
      `  Coil: ${result.coilTempF.toFixed(0)} °F · frost ${Math.round(result.frostPct)} %`,
      `  Air: discharge ${result.dischargeAirF.toFixed(0)} °F · return ${result.returnAirF.toFixed(0)} °F · product ${result.productF.toFixed(1)} °F`,
      `  Fan amps: F1 ${result.fanAmps[0].toFixed(1)} A · F2 ${result.fanAmps[1].toFixed(1)} A (0.4 A each expected when running)`,
      `  Heater circuit: ${result.heaterVolts} V · ${result.heaterAmps.toFixed(1)} A (8.4 A expected in a healthy defrost)`,
      `  DT switch: ${result.dtClosed ? 'CLOSED' : 'OPEN'} · fan delay klixon: ${result.klixonClosed ? 'CLOSED' : 'OPEN'}`,
      `  Alarms: ${base.alarms.length ? base.alarms.map(a => `[${a.code}] ${a.message}`).join(' | ') : 'none'}`,
      '',
      `MY DIAGNOSIS: ${picked.length ? picked.join(', ') : '(nothing selected)'}`,
      `CORRECT ANSWER: ${answer.join(', ')}`,
      missed.length ? `I MISSED: ${missed.join(', ')}` : '',
      fps.length ? `FALSE POSITIVES I PICKED: ${fps.join(', ')}` : '',
      '',
      'Coach me like a senior tech mentoring an apprentice:',
      '1. Which readings above were the strongest clues to the correct fault, and why?',
      '2. How do I tell the correct answer apart from the faults I wrongly picked (or missed)?',
      '3. What would I physically check first at the case to confirm — meter, clamp, or hands?',
      'Reference the actual numbers above and keep it practical.',
    ].filter(Boolean).join('\n')
    try { localStorage.setItem('coldiq_prefill', text) } catch { /* ignore */ }
    router.push('/dashboard')
  }

  const activeFaultCount = inScenario ? 0 : Object.values(faults).filter(Boolean).length
  const hasCritical = base.alarms.some(a => a.severity === 'CRITICAL')
  const hasWarning = base.alarms.some(a => a.severity === 'WARNING')
  const statusBadge = hasCritical
    ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40'
    : hasWarning ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'

  const faultsByGroup = FAULT_GROUPS.map(g => ({ group: g, defs: FAULT_DEFS.filter(d => d.group === g) }))
  const guessState = inScenario ? userGuess : faults

  // Scenario concealment: a tech walking up SEES fans spinning (or not), frost,
  // and heater glow — those stay truthful. Internal states (TXV feed, why a fan
  // is stopped, DT/klixon contacts, half-power heaters) hide behind the meter.
  const conceal = inScenario
  const expectedDt = base.coilTempF < DT_OPEN_F
  const expectedKlix = base.coilTempF <= KLIXON_CLOSE_F
  const productColor = base.productF >= 10 ? '#ef4444' : base.productF >= 0 ? '#f59e0b' : '#10b981'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">

      {/* Header */}
      <PageHeader
        title="DT Bunker Case"
        home={false}
        back="/simulation"
        variant="learning"
        className="flex-wrap sm:flex-nowrap gap-2 sm:gap-3 py-3"
        actions={
          <>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusBadge}`}>
              {hasCritical ? 'ALARM' : hasWarning ? 'WARNING' : 'NORMAL'}
            </span>
            {activeFaultCount > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                {activeFaultCount} fault{activeFaultCount !== 1 ? 's' : ''}
              </span>
            )}
            <button onClick={resetAll}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              <RotateCcw size={13} />
              Reset
            </button>
          </>
        }
      />

      <LearningTabBar />
      <div className="max-w-6xl mx-auto w-full px-4 py-4 space-y-4">

        {/* Scenario picker / banner */}
        <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-violet-100 dark:bg-violet-500/20 border-b border-violet-200 dark:border-violet-500/30 flex items-center gap-2">
            <Target size={13} className="text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wider">Scenarios</span>
            {!inScenario && (
              <button onClick={() => setPickerOpen(o => !o)} className="ml-auto text-[11px] text-violet-600 dark:text-violet-400 underline">
                {pickerOpen ? 'Hide' : 'Browse scenarios'}
              </button>
            )}
            {inScenario && (
              <button onClick={exitScenario} className="ml-auto text-[11px] text-violet-600 dark:text-violet-400 underline">Exit scenario</button>
            )}
          </div>

          {!inScenario && !pickerOpen && (
            <div className="p-3 flex items-center gap-2 flex-wrap">
              <p className="text-xs text-slate-500 dark:text-slate-400 flex-1 min-w-[200px]">
                Free play — toggle faults below and watch the case respond. Or test yourself:
              </p>
              <button onClick={() => loadScenario(generateMystery())}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
                <Dices size={12} /> Mystery Fault
              </button>
              <button onClick={() => setPickerOpen(true)}
                className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300 rounded-lg hover:border-violet-400">
                Guided scenarios
              </button>
            </div>
          )}

          {!inScenario && pickerOpen && (
            <div className="p-3 space-y-2">
              <button onClick={() => loadScenario(generateMystery())}
                className="w-full text-left px-3 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors">
                <div className="flex items-center gap-2 mb-0.5">
                  <Dices size={13} />
                  <span className="text-xs font-semibold">Mystery Fault</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-white/20">Random</span>
                </div>
                <p className="text-[10px] text-violet-100">One hidden fault — refrigeration or electrical. Clamp, probe, call it.</p>
              </button>
              {SCENARIOS.map(s => (
                <button key={s.id} onClick={() => loadScenario(s)}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-slate-900 dark:text-white">{s.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                      s.difficulty === 'Beginner' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                      s.difficulty === 'Advanced' ? 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                      'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}`}>{s.difficulty}</span>
                    {s.rh !== undefined && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">RH {s.rh}%</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{s.description}</p>
                </button>
              ))}
            </div>
          )}

          {inScenario && activeScenario && (
            <div className="p-3">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{activeScenario.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                  activeScenario.difficulty === 'Beginner' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                  activeScenario.difficulty === 'Advanced' ? 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                  'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}`}>{activeScenario.difficulty}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">RH {activeRh}%</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{activeScenario.description}</p>

              {!submitted && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                  Read the case, clamp the circuits (flip into 🔥 Defrost to energize the heater rung), mark your diagnosis below, then submit.
                </p>
              )}

              {submitted && score && (
                <div className="mt-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className={score.pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : score.pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'} />
                    <span className={`text-sm font-bold ${score.pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : score.pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                      Score: {score.pct}%
                    </span>
                    <span className="text-[10px] text-slate-500">{score.correct}/{score.total} identified</span>
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
                  {score.fp > 0 && (
                    <>
                      <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 pt-1">You also flagged (not part of this fault):</p>
                      {FAULT_DEFS.filter(d => userGuess[d.key] && !activeScenario.answer.includes(d.key)).map(d => (
                        <div key={d.key} className="flex items-start gap-2 text-xs px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                          <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"/>
                          <div>
                            <span className="text-amber-700 dark:text-amber-300">{d.label}</span>
                            <span className="text-slate-500 ml-1.5">— would show: {d.hint}. Not present here.</span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {(activeScenario.knowledge?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1"><BookOpen size={10} /> Read more:</span>
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
                      <button onClick={() => loadScenario(generateMystery())} className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center gap-1"><Dices size={11} /> New Mystery</button>
                    )}
                    <button onClick={exitScenario} className="px-3 py-1.5 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg">Done</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Case mode toggle — refrigeration / defrost */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
            <button onClick={() => setDefrost(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${!defrost ? 'bg-cyan-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
              <Snowflake size={12}/> Refrigeration
            </button>
            <button onClick={() => setDefrost(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${defrost ? 'bg-orange-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
              <Flame size={12}/> Defrost
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 flex-1 min-w-[180px]">
            {defrost
              ? 'Mid-defrost snapshot — liquid solenoid closed, fans held off by the klixon, heaters commanded on. Clamp the heater circuit here.'
              : 'Normal refrigeration — TXV feeding, fans running (if the klixon allows), heaters off.'}
          </p>
          <button onClick={() => setNight(n => !n)} disabled={inScenario}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${activeNight
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>
            <Moon size={12}/> Night {activeNight ? 'ON' : 'off'}
          </button>
        </div>

        {/* Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Suction at Case</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{result.suctionPsig.toFixed(1)} <span className="text-xs font-normal text-slate-400">psig</span></p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {result.sst.toFixed(1)} °F SST · {defrost ? 'pumped out' : `SH ${result.sh.toFixed(1)} °F`}
            </p>
          </div>
          <div className={`bg-white dark:bg-slate-800 rounded-xl p-3 border ${!defrost && base.airflow < 0.25 ? 'border-red-300 dark:border-red-500/40' : 'border-slate-200 dark:border-slate-700'}`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Discharge Air</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{result.dischargeAirF.toFixed(0)} <span className="text-xs font-normal text-slate-400">°F</span></p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">return {result.returnAirF.toFixed(0)} °F · design {DESIGN_DISCHARGE} °F</p>
          </div>
          <div className={`bg-white dark:bg-slate-800 rounded-xl p-3 border ${base.productF >= 10 ? 'border-red-300 dark:border-red-500/40' : base.productF >= 0 ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-700'}`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Product</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{result.productF.toFixed(1)} <span className="text-xs font-normal text-slate-400">°F</span></p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">keep ≤ 0 °F · target −8 °F</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Coil</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{result.coilTempF.toFixed(0)} <span className="text-xs font-normal text-slate-400">°F</span></p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">frost {Math.round(base.frostPct)} %</p>
          </div>
        </div>

        {/* Case schematic */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <button onClick={() => setSchematicOpen(v => !v)} className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
            <Gauge size={13} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Case Cross-Section</span>
            {conceal && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">walk-up view — meter states hidden</span>}
            <span className={`ml-auto text-slate-400 transition-transform ${schematicOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {schematicOpen && (
            <div className="px-2 pb-2">
              <SchematicViewer label="DT Bunker — cross-section">
                <DtBunkerVisual
                  fansSpinning={base.fansSpinning}
                  fansFailed={conceal ? [false, false] : [activeFaults.fan1Dead || activeFaults.fansDeadBoth, activeFaults.fansDeadBoth]}
                  frostPct={base.frostPct}
                  heatersOn={base.heaterAmps > 1}
                  heaterHalf={!conceal && activeFaults.heaterOneOpen}
                  defrostMode={defrost}
                  txvState={conceal ? 'normal' : activeFaults.txvStarved || activeFaults.liquidRestricted ? 'starved' : activeFaults.txvFlooding ? 'flooding' : 'normal'}
                  dtState={(conceal ? expectedDt : base.dtClosed) ? 'closed' : 'open'}
                  klixonClosed={conceal ? expectedKlix : base.klixonClosed}
                  curtainDeployed={activeNight && !activeFaults.curtainTorn}
                  curtainFault={!conceal && activeFaults.curtainTorn}
                  suctionPsig={result.suctionPsig}
                  coilTempF={result.coilTempF}
                  dischargeAirF={result.dischargeAirF}
                  returnAirF={result.returnAirF}
                  productF={result.productF}
                  productColor={productColor}
                  airflowOk={!defrost && base.airflow > 0.25}
                  layout={isMobile ? 'tall' : 'wide'}
                  selectedId={schemDetail?.id ?? null}
                  onSelect={setSchemDetail}
                />
              </SchematicViewer>
              {schemDetail && <SchematicInfoCard detail={schemDetail} onClose={() => setSchemDetail(null)} />}
            </div>
          )}
        </div>

        {/* Electrical checks — the meter never lies, even in scenarios */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={13} className="text-amber-500" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Electrical Checks</p>
            <span className="text-[10px] text-slate-400 hidden sm:inline">clamp + continuity — measured live, even mid-scenario</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Fan 1 amps</p>
              <p className={`text-sm font-bold tabular-nums ${result.fanAmps[0] > 0.1 ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>{result.fanAmps[0].toFixed(1)} A</p>
              <p className="text-[9px] text-slate-400">expect {FAN_AMPS} A running</p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Fan 2 amps</p>
              <p className={`text-sm font-bold tabular-nums ${result.fanAmps[1] > 0.1 ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>{result.fanAmps[1].toFixed(1)} A</p>
              <p className="text-[9px] text-slate-400">expect {FAN_AMPS} A running</p>
            </div>
            <div className={`rounded-lg border p-2 ${!defrost && result.heaterAmps > 1 ? 'border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Heater amps</p>
              <p className={`text-sm font-bold tabular-nums ${!defrost && result.heaterAmps > 1 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{result.heaterAmps.toFixed(1)} A</p>
              <p className="text-[9px] text-slate-400">{(HEATER_AMPS * 2).toFixed(1)} A healthy defrost</p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Heater voltage</p>
              <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{result.heaterVolts} V</p>
              <p className="text-[9px] text-slate-400">at the element feed</p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">DT continuity</p>
              <p className={`text-sm font-bold ${base.dtClosed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{base.dtClosed ? 'CLOSED' : 'OPEN'}</p>
              <p className="text-[9px] text-slate-400">closed when coil cold</p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Klixon continuity</p>
              <p className={`text-sm font-bold ${base.klixonClosed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{base.klixonClosed ? 'CLOSED' : 'OPEN'}</p>
              <p className="text-[9px] text-slate-400">closed ≤ {KLIXON_CLOSE_F} °F coil</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
            Coil is at {result.coilTempF.toFixed(0)} °F — so the DT should read {expectedDt ? 'CLOSED' : 'OPEN'} and the
            klixon should read {expectedKlix ? 'CLOSED' : 'OPEN'}. A switch disagreeing with its coil temperature is your fault.
          </p>
        </div>

        {/* Reading trends */}
        <TrendsCard specs={trendSpecs} history={trendHistory} />

        {/* Store conditions */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
          <div className="flex items-center gap-4">
            <Droplets size={15} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">Store humidity</span>
              <input type="range" min={30} max={70} step={5} value={activeRh}
                onChange={e => setRh(Number(e.target.value))}
                disabled={inScenario}
                className="flex-1 accent-blue-600 disabled:opacity-50" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 w-14 text-right tabular-nums">{activeRh} %</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 ml-7">
            Open frozen islands live and die by store humidity — every point of RH is more frost on the coil
            between defrosts. Watch the frost percentage as you drag.
            {inScenario && ' (locked by scenario)'}
          </p>
        </div>

        {/* Alarms */}
        {base.alarms.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <AlertTriangle size={13} className="text-amber-500 dark:text-amber-400" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Active Alarms</span>
              <span className="ml-auto text-[10px] text-slate-500">{base.alarms.length} active</span>
            </div>
            <div className="p-2 space-y-1">
              {base.alarms.map((a, i) => (
                <div key={`${a.code}-${i}`} className={`flex items-start gap-2 px-2.5 py-2 rounded-lg text-xs ${a.severity === 'CRITICAL' ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300' : 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300'}`}>
                  <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                  <div><span className="font-mono font-bold mr-2">{a.code}</span><span>{a.message}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fault toggles / diagnosis */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Gauge size={13} className="text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              {inScenario ? '🎯 Your Diagnosis' : 'Fault Injection'}
            </span>
            {inScenario && !submitted && (
              <button onClick={submitDiagnosis}
                className="ml-auto px-3 py-1 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
                Submit Diagnosis
              </button>
            )}
            {!inScenario && (
              <button onClick={() => setInstructorReveal(v => !v)}
                className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${instructorReveal ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                title="Instructor mode — reveal active faults">
                {instructorReveal ? <><EyeOff size={11} /> Hide</> : <><Eye size={11} /> Reveal</>}
              </button>
            )}
          </div>
          {!inScenario && instructorReveal && (
            <div className="px-3 pt-3">
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Instructor reveal — active faults · RH {activeRh}%</p>
                {activeFaultCount === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">No faults active — case in normal operation</p>
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
            </div>
          )}
          <div className="p-3 grid sm:grid-cols-2 gap-x-4 gap-y-3">
            {faultsByGroup.map(({ group, defs }) => (
              <div key={group}>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{group}</p>
                <div className="space-y-1">
                  {defs.map(d => {
                    const active = guessState[d.key]
                    const disabled = inScenario && submitted
                    return (
                      <button key={d.key} onClick={() => !disabled && toggleFault(d.key)}
                        disabled={disabled}
                        className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                          active
                            ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40'
                            : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        } ${disabled ? 'opacity-60 cursor-default' : ''}`}>
                        <span className={`mt-0.5 w-3 h-3 rounded-full flex-shrink-0 border ${active ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600'}`} />
                        <span className="min-w-0">
                          <span className={`block text-xs font-medium ${active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>{d.label}</span>
                          {!inScenario && <span className="block text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">{d.hint}</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Case wiring trainer */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <button onClick={() => setWiringOpen(v => !v)} className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
            <Zap size={13} className="text-amber-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Case Wiring Trainer</span>
            <span className="text-[10px] text-slate-400 ml-1 hidden sm:inline">fan + defrost circuits — hopscotch with a meter</span>
            <span className={`ml-auto text-slate-400 transition-transform ${wiringOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {wiringOpen && (
            <div className="px-4 pb-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <CaseCircuitTrainer defrostMode={defrost} />
            </div>
          )}
        </div>

        <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center pb-4 leading-relaxed">
          8 ft single-deck frozen island (DT bunker) · R-448A LT circuit off the rack · {DESIGN_SST} °F design SST ·
          TXV + electric defrost (2 × {HEATER_AMPS} A elements @ 208 V) · DT terminates ~{DT_OPEN_F} °F ·
          fan delay klixon closes ≤ {KLIXON_CLOSE_F} °F · 2 × {FAN_AMPS} A evap fans
        </div>

      </div>
    </div>
  )
}
