'use client'
export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  RotateCcw, AlertTriangle, CheckCircle2, XCircle, Wind,
  ChevronLeft, Thermometer, Gauge, Target, Trophy, Dices, BookOpen, Snowflake,
  Eye, EyeOff, SlidersHorizontal, ClipboardList,
} from 'lucide-react'
import LearningTabBar from '@/components/layout/LearningTabBar'
import TrendsCard, { useTrendHistory } from '@/components/simulation/TrendsCard'
import { useLiveReadings } from '@/components/simulation/useLiveReadings'
import Co2BoosterVisual from '@/components/simulation/visuals/Co2BoosterVisual'
import FieldReadingsPanel, { type Finding, type FieldDef, type DerivedRow } from '@/components/simulation/FieldReadings'
import { saveSimAttempt } from '@/lib/simulation/attempts'

// ── R-744 (CO2) saturation P-T data ───────────────────────────────────────────
// psig vs °F, saturated. Critical point: 87.8 °F / ~1056 psig — no saturation
// above that; the high side runs as a transcritical gas cooler instead.
const CO2_PT: [number, number][] = [
  [-40, 131], [-30, 162], [-20, 198], [-10, 240], [0, 288],
  [10, 342], [20, 403], [30, 471], [38, 531], [50, 638],
  [60, 735], [70, 842], [80, 960], [87, 1046],
]
const CO2_CRITICAL_F = 87.8

function satPsig(tempF: number): number {
  const t = Math.min(Math.max(tempF, CO2_PT[0][0]), CO2_PT[CO2_PT.length - 1][0])
  for (let i = 0; i < CO2_PT.length - 1; i++) {
    const [t1, p1] = CO2_PT[i], [t2, p2] = CO2_PT[i + 1]
    if (t >= t1 && t <= t2) return p1 + ((t - t1) / (t2 - t1)) * (p2 - p1)
  }
  return CO2_PT[CO2_PT.length - 1][1]
}
function satTempF(psig: number): number {
  const p = Math.min(Math.max(psig, CO2_PT[0][1]), CO2_PT[CO2_PT.length - 1][1])
  for (let i = 0; i < CO2_PT.length - 1; i++) {
    const [t1, p1] = CO2_PT[i], [t2, p2] = CO2_PT[i + 1]
    if (p >= p1 && p <= p2) return t1 + ((p - p1) / (p2 - p1)) * (t2 - t1)
  }
  return CO2_PT[CO2_PT.length - 1][0]
}

// ── Faults ────────────────────────────────────────────────────────────────────
type FaultKey =
  | 'gcFouled' | 'gcFan1Failed' | 'gcFan2Failed'
  | 'hpvStuckClosed' | 'hpvStuckOpen'
  | 'fgbvStuckClosed' | 'fgbvStuckOpen'
  | 'mtComp1Failed' | 'ltComp1Failed'
  | 'undercharge' | 'mtEevStarved' | 'ltDefrostStuck' | 'mtDoorsOpen'

type FaultState = Record<FaultKey, boolean>
const INITIAL_FAULTS = {
  gcFouled: false, gcFan1Failed: false, gcFan2Failed: false,
  hpvStuckClosed: false, hpvStuckOpen: false,
  fgbvStuckClosed: false, fgbvStuckOpen: false,
  mtComp1Failed: false, ltComp1Failed: false,
  undercharge: false, mtEevStarved: false, ltDefrostStuck: false,
  mtDoorsOpen: false,
} satisfies FaultState

interface FaultDef { key: FaultKey; label: string; hint: string; group: string; mutuallyExcludes?: FaultKey[] }
const FAULT_DEFS: FaultDef[] = [
  { key: 'gcFouled',       label: 'Gas cooler fouled',          hint: 'Dirty fins raise gas cooler approach ~12 °F — head climbs, worst on hot days', group: 'Gas Cooler' },
  { key: 'gcFan1Failed',   label: 'Gas cooler fan #1 failed',   hint: 'Reduced airflow — approach rises ~8 °F',                                       group: 'Gas Cooler' },
  { key: 'gcFan2Failed',   label: 'Gas cooler fan #2 failed',   hint: 'Both fans out is severe — approach rises ~22 °F',                              group: 'Gas Cooler' },
  { key: 'hpvStuckClosed', label: 'High pressure valve stuck closed', hint: 'Gas cooler pressure climbs while flash tank starves — high SH everywhere', group: 'Valves', mutuallyExcludes: ['hpvStuckOpen'] },
  { key: 'hpvStuckOpen',   label: 'High pressure valve stuck open',   hint: 'High side dumps into flash tank — receiver pressure climbs, head falls',  group: 'Valves', mutuallyExcludes: ['hpvStuckClosed'] },
  { key: 'fgbvStuckClosed', label: 'Flash gas bypass valve stuck closed', hint: 'Flash gas can\'t vent — receiver pressure climbs toward relief valve', group: 'Valves', mutuallyExcludes: ['fgbvStuckOpen'] },
  { key: 'fgbvStuckOpen',  label: 'Flash gas bypass valve stuck open',   hint: 'Receiver vents continuously — MT suction loaded with flash gas, amps up', group: 'Valves', mutuallyExcludes: ['fgbvStuckClosed'] },
  { key: 'mtComp1Failed',  label: 'MT compressor 1 failed',     hint: 'MT suction rises — and the LT boosters discharge into it, so LT suffers too',   group: 'Compressors' },
  { key: 'ltComp1Failed',  label: 'LT compressor 1 failed',     hint: 'LT suction rises — frozen food cases warm',                                     group: 'Compressors' },
  { key: 'undercharge',    label: 'Low CO2 charge',             hint: 'Receiver level low — flash gas at EEVs, high SH, cases warm',                   group: 'Charge / Load' },
  { key: 'mtEevStarved',   label: 'MT case EEV starved (Dairy)', hint: 'One MT circuit starved — its case warms while others hold',                    group: 'Charge / Load' },
  { key: 'ltDefrostStuck', label: 'LT defrost stuck on',        hint: 'LT circuit won\'t terminate — frozen food warming fast',                        group: 'Charge / Load' },
  { key: 'mtDoorsOpen',    label: 'MT case doors propped open', hint: 'Stocking crew left dairy/deli doors open — infiltration lifts MT suction and case temps; amps climb. No controller alarm — read the load.', group: 'Charge / Load' },
]
const FAULT_GROUPS = ['Gas Cooler', 'Valves', 'Compressors', 'Charge / Load']

// ── Design constants ──────────────────────────────────────────────────────────
const MT_SST = 23           // °F — medium temp saturated suction (≈ 425 psig)
const LT_SST = -22          // °F — low temp saturated suction (≈ 190 psig)
const FLASH_TANK_SET = 38   // °F sat ≈ 531 psig receiver set point
const RV_WARN_PSIG = 640    // flash tank relief valve approach warning
const RV_LIFT_PSIG = 690    // relief valve lift
const BASE_APPROACH = 5     // °F gas cooler approach, clean coil
const MT_BASE_AMPS = 28
const LT_BASE_AMPS = 17

const MT_CASES = [
  { name: 'Dairy',   setpoint: 36 },
  { name: 'Meat',    setpoint: 30 },
  { name: 'Deli',    setpoint: 34 },
  { name: 'Produce', setpoint: 38 },
]
const LT_CASES = [
  { name: 'Frozen Food', setpoint: -8 },
  { name: 'Ice Cream',   setpoint: -12 },
]

interface Alarm { code: string; severity: 'CRITICAL' | 'WARNING'; message: string }

interface RackResult {
  transcritical: boolean
  gcOutletTemp: number; headPsig: number; condensingTemp: number | null
  flashPsig: number; flashSatTemp: number
  mtSuctionPsig: number; mtSST: number; mtSH: number
  ltSuctionPsig: number; ltSST: number; ltSH: number
  mtCompRunning: boolean[]; ltCompRunning: boolean[]
  mtAmps: number[]; ltAmps: number[]
  mtCaseTemps: number[]; ltCaseTemps: number[]
  rvMarginPsig: number
  alarms: Alarm[]
}

// ── Compute engine ────────────────────────────────────────────────────────────
function computeRack(f: FaultState, oat: number, mtSet: number = MT_SST, ltSet: number = LT_SST, flashSet: number = FLASH_TANK_SET): RackResult {
  // Gas cooler approach — base + fouling/fan faults
  let approach = BASE_APPROACH
  if (f.gcFouled) approach += 12
  if (f.gcFan1Failed) approach += 8
  if (f.gcFan2Failed) approach += f.gcFan1Failed ? 14 : 22

  const gcOutletTemp = oat + approach
  const transcritical = gcOutletTemp >= 80

  // High side pressure
  let headPsig: number
  let condensingTemp: number | null
  if (transcritical) {
    // optimal gas cooler pressure ≈ (2.7 × T_out °C + 6.1) bar — standard CO2 control curve
    const tC = (gcOutletTemp - 32) / 1.8
    headPsig = Math.max((2.7 * tC + 6.1) * 14.5 - 14.7, 1080)
    condensingTemp = null
  } else {
    condensingTemp = Math.max(gcOutletTemp + 8, 50)   // head pressure control floor 50 °F
    headPsig = satPsig(condensingTemp)
  }
  if (f.hpvStuckClosed) headPsig += 140
  if (f.hpvStuckOpen)   headPsig = Math.max(headPsig - 130, transcritical ? 1000 : satPsig(Math.max(oat, 50)))

  // Flash tank / receiver
  let flashPsig = satPsig(flashSet)
  if (f.hpvStuckOpen)    flashPsig += 85
  if (f.fgbvStuckClosed) flashPsig += 75
  if (f.fgbvStuckOpen)   flashPsig -= 45
  if (f.undercharge)     flashPsig -= 50
  if (f.hpvStuckClosed)  flashPsig -= 65
  const flashSatTemp = satTempF(flashPsig)
  const rvMarginPsig = RV_LIFT_PSIG - flashPsig

  // MT circuit
  let mtSuctionPsig = satPsig(mtSet)
  let mtSH = 14
  if (f.mtComp1Failed)  { mtSuctionPsig += 28 }
  if (f.fgbvStuckOpen)  { mtSuctionPsig += 30; mtSH += 3 }
  if (f.undercharge)    { mtSuctionPsig -= 30; mtSH += 18 }
  if (f.hpvStuckClosed) { mtSuctionPsig -= 35; mtSH += 24 }
  if (f.mtEevStarved)   { mtSuctionPsig -= 14; mtSH += 10 }
  if (f.mtDoorsOpen)    { mtSuctionPsig += 18; mtSH = Math.max(4, mtSH - 2) }
  // Hot-day infiltration: store load rises with ambient — suction doesn't hold
  // setpoint as crisply at 100 °F as at 70 °F
  if (oat > 88) mtSuctionPsig += (oat - 88) * 0.9
  const mtSSTnow = satTempF(mtSuctionPsig)

  // LT circuit — LT compressors discharge into the MT suction header
  let ltSuctionPsig = satPsig(ltSet)
  let ltSH = 12
  if (f.ltComp1Failed)  { ltSuctionPsig += 32 }
  if (f.ltDefrostStuck) { ltSuctionPsig += 20 }
  if (f.undercharge)    { ltSuctionPsig -= 22; ltSH += 14 }
  if (f.hpvStuckClosed) { ltSuctionPsig -= 24; ltSH += 18 }
  const ltSSTnow = satTempF(ltSuctionPsig)

  // Compressors
  const mtCompRunning = [!f.mtComp1Failed, true, true]
  const ltCompRunning = [!f.ltComp1Failed, true]
  let mtAmpsMult = 1
  if (f.mtComp1Failed) mtAmpsMult *= 1.24
  if (f.fgbvStuckOpen) mtAmpsMult *= 1.18
  if (f.mtDoorsOpen)   mtAmpsMult *= 1.09
  if (headPsig > 1300) mtAmpsMult *= 1 + (headPsig - 1300) / 2500
  let ltAmpsMult = 1
  if (f.ltComp1Failed) ltAmpsMult *= 1.28
  if (f.mtComp1Failed) ltAmpsMult *= 1.08      // LT discharge header (MT suction) is elevated
  const mtAmps = mtCompRunning.map(r => r ? Math.round(MT_BASE_AMPS * mtAmpsMult * 10) / 10 : 0)
  const ltAmps = ltCompRunning.map(r => r ? Math.round(LT_BASE_AMPS * ltAmpsMult * 10) / 10 : 0)

  // Case temps
  let mtCaseOffset = 0
  if (f.mtComp1Failed)  mtCaseOffset += 5
  if (f.undercharge)    mtCaseOffset += 4
  if (f.hpvStuckClosed) mtCaseOffset += 6
  if (f.fgbvStuckOpen)  mtCaseOffset += 3
  if (f.mtDoorsOpen)    mtCaseOffset += 4
  if (oat > 90)         mtCaseOffset += (oat - 90) * 0.07
  const mtCaseTemps = MT_CASES.map(c =>
    c.setpoint + mtCaseOffset + (f.mtEevStarved && c.name === 'Dairy' ? 9 : 0))

  let ltCaseOffset = 0
  if (f.ltComp1Failed)  ltCaseOffset += 8
  if (f.ltDefrostStuck) ltCaseOffset += 13
  if (f.undercharge)    ltCaseOffset += 3
  if (f.hpvStuckClosed) ltCaseOffset += 5
  if (f.mtComp1Failed)  ltCaseOffset += 2
  const ltCaseTemps = LT_CASES.map(c => c.setpoint + ltCaseOffset)

  // Alarms
  const alarms: Alarm[] = []
  if (headPsig >= 1550)
    alarms.push({ code: 'GC-HI', severity: 'CRITICAL', message: `Gas cooler pressure ${Math.round(headPsig)} psig — high pressure trip imminent.` })
  else if (headPsig >= 1450)
    alarms.push({ code: 'GC-HI-W', severity: 'WARNING', message: `Gas cooler pressure elevated — ${Math.round(headPsig)} psig.` })
  if (flashPsig >= RV_LIFT_PSIG)
    alarms.push({ code: 'FT-RV', severity: 'CRITICAL', message: `Flash tank ${Math.round(flashPsig)} psig — relief valve lifting (set ${RV_LIFT_PSIG} psig). CO2 venting.` })
  else if (flashPsig >= RV_WARN_PSIG)
    alarms.push({ code: 'FT-HI', severity: 'WARNING', message: `Flash tank ${Math.round(flashPsig)} psig — approaching relief valve (${RV_LIFT_PSIG} psig).` })
  if (flashPsig <= 440)
    alarms.push({ code: 'FT-LO', severity: 'WARNING', message: `Flash tank ${Math.round(flashPsig)} psig — receiver pressure low; check charge and HPV feed.` })
  if (ltSuctionPsig <= 150)
    alarms.push({ code: 'LT-LPCO', severity: 'CRITICAL', message: `LT suction ${Math.round(ltSuctionPsig)} psig — low pressure cutout.` })
  mtCompRunning.forEach((r, i) => { if (!r) alarms.push({ code: `MT-C${i + 1}`, severity: 'CRITICAL', message: `MT compressor ${i + 1} off on safety.` }) })
  ltCompRunning.forEach((r, i) => { if (!r) alarms.push({ code: `LT-C${i + 1}`, severity: 'CRITICAL', message: `LT compressor ${i + 1} off on safety.` }) })
  if (mtSH >= 30)
    alarms.push({ code: 'MT-SH', severity: 'WARNING', message: `MT superheat ${Math.round(mtSH)} °F — circuits starving.` })
  if (ltSH >= 28)
    alarms.push({ code: 'LT-SH', severity: 'WARNING', message: `LT superheat ${Math.round(ltSH)} °F — circuits starving.` })
  const worstLt = Math.max(...ltCaseTemps)
  if (worstLt >= 10)
    alarms.push({ code: 'LT-CASE', severity: 'CRITICAL', message: `LT case at ${Math.round(worstLt)} °F — frozen food at risk.` })
  else if (worstLt >= 0)
    alarms.push({ code: 'LT-CASE-W', severity: 'WARNING', message: `LT cases warming — ${Math.round(worstLt)} °F.` })
  const worstMt = Math.max(...mtCaseTemps.map((t, i) => t - MT_CASES[i].setpoint))
  if (worstMt >= 8)
    alarms.push({ code: 'MT-CASE', severity: 'WARNING', message: `MT case ${Math.round(worstMt)} °F above set point.` })
  if (f.ltDefrostStuck)
    alarms.push({ code: 'LT-DEF', severity: 'WARNING', message: 'LT defrost running long — termination not reached.' })

  return {
    transcritical, gcOutletTemp, headPsig, condensingTemp,
    flashPsig, flashSatTemp,
    mtSuctionPsig, mtSST: mtSSTnow, mtSH,
    ltSuctionPsig, ltSST: ltSSTnow, ltSH,
    mtCompRunning, ltCompRunning, mtAmps, ltAmps,
    mtCaseTemps, ltCaseTemps, rvMarginPsig, alarms,
  }
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
interface Scenario {
  id: string; name: string; description: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  oat?: number
  faults: Partial<FaultState>; answer: FaultKey[]
  knowledge?: { slug: string; label: string }[]
}

const SCENARIOS: Scenario[] = [
  {
    id: 'hot_day_high_head',
    name: 'First Hot Day — Head Through the Roof',
    difficulty: 'Beginner',
    oat: 95,
    description: 'First 95 °F day of the year and the rack is in transcritical with gas cooler pressure pushing 1,500 psig — well above the control curve for this ambient. Compressor amps are climbing. The gas cooler hasn\'t been touched since fall. What\'s driving the head above the expected optimum?',
    faults: { gcFouled: true },
    answer: ['gcFouled'],
    knowledge: [{ slug: 'gas-coolers', label: 'Gas Coolers' }, { slug: 'carnot', label: 'Carnot CO2 Racks' }],
  },
  {
    id: 'flash_gas_flood',
    name: 'MT Compressors Slammed',
    difficulty: 'Intermediate',
    oat: 75,
    description: 'MT suction is running well above set point and MT amps are 18 % high on every compressor, but the MT cases are only slightly warm and LT looks normal. Flash tank pressure is a touch low. What valve fault loads the MT suction group without a refrigeration load behind it?',
    faults: { fgbvStuckOpen: true },
    answer: ['fgbvStuckOpen'],
    knowledge: [{ slug: 'pressure-regulators', label: 'Pressure Regulators' }, { slug: 'carnot', label: 'Carnot CO2 Racks' }],
  },
  {
    id: 'receiver_climbing',
    name: 'Receiver Creeping Toward the Relief Valve',
    difficulty: 'Intermediate',
    oat: 70,
    description: 'Flash tank pressure has climbed from its normal ~530 psig to over 600 psig and is still rising. The relief valve lifts at 690. Cases are fine — for now. Which valve has stopped doing its job?',
    faults: { fgbvStuckClosed: true },
    answer: ['fgbvStuckClosed'],
    knowledge: [{ slug: 'pressure-relief-valves', label: 'Pressure Relief Valves' }, { slug: 'pressure-regulators', label: 'Pressure Regulators' }],
  },
  {
    id: 'starved_everything',
    name: 'High Head AND Starved Cases',
    difficulty: 'Advanced',
    oat: 80,
    description: 'Gas cooler pressure is way above the control curve while the flash tank is low and superheat is high on every MT and LT circuit at once. Cases warming store-wide. One component sits between the gas cooler and the flash tank — what state is it in?',
    faults: { hpvStuckClosed: true },
    answer: ['hpvStuckClosed'],
    knowledge: [{ slug: 'pressure-regulators', label: 'Pressure Regulators' }, { slug: 'gas-coolers', label: 'Gas Coolers' }],
  },
  {
    id: 'frozen_warming',
    name: 'Frozen Food Warming, MT Fine',
    difficulty: 'Beginner',
    oat: 65,
    description: 'Frozen food at 5 °F and rising, ice cream soft. LT suction above set point. MT side normal, gas cooler normal, flash tank normal. Defrost ran at 4 AM. Where do you look?',
    faults: { ltDefrostStuck: true },
    answer: ['ltDefrostStuck'],
    knowledge: [{ slug: 'defrost-systems', label: 'Defrost Systems' }],
  },
  {
    id: 'slow_leak',
    name: 'The Slow CO2 Leak',
    difficulty: 'Intermediate',
    oat: 72,
    description: 'Over two weeks: flash tank pressure trending down, superheats trending up on both MT and LT, and cases drifting warm. CO2 racks lose charge faster than HFC racks when they leak — and this one has been leaking a while. What\'s the underlying problem?',
    faults: { undercharge: true },
    answer: ['undercharge'],
    knowledge: [{ slug: 'carnot', label: 'Carnot CO2 Racks' }, { slug: 'refrigeration-fundamentals', label: 'Refrigeration Fundamentals' }],
  },
]

const MYSTERY_OATS = [20, 45, 65, 75, 85, 95, 105]
function generateMystery(): Scenario {
  const faultCount = Math.random() < 0.6 ? 1 : 2
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
    oat: MYSTERY_OATS[Math.floor(Math.random() * MYSTERY_OATS.length)],
    description: `The rack has ${picked.length === 1 ? 'one hidden fault' : 'two hidden faults'}. Read the gauges and call it.`,
    faults,
    answer: picked,
    knowledge: [{ slug: 'carnot', label: 'Carnot CO2 Racks' }, { slug: 'system-diagnostics', label: 'System Diagnostics' }],
  }
}

// ── Field Readings diagnostic ───────────────────────────────────────────────────
// Enter measured values from a transcritical CO2 booster → derived calcs + findings.
const CO2_FIELD_EMPTY = {
  oat: '', gcOutletTemp: '', headPsig: '',
  flashPsig: '', mtSuctionPsig: '', mtSuctionTemp: '',
  ltSuctionPsig: '', ltSuctionTemp: '',
}
type Co2FieldReadings = typeof CO2_FIELD_EMPTY

const CO2_FIELD_DEFS: FieldDef[] = [
  { key: 'oat',           label: 'Outdoor Ambient (OAT)',     unit: '°F',   placeholder: 'e.g. 85',   section: 'Environment' },
  { key: 'gcOutletTemp',  label: 'Gas cooler outlet temp',    unit: '°F',   placeholder: 'e.g. 90',   hint: 'refrigerant leaving the gas cooler', section: 'High Side' },
  { key: 'headPsig',      label: 'Gas cooler / head pressure',unit: 'psig', placeholder: 'e.g. 1300' },
  { key: 'flashPsig',     label: 'Flash tank pressure',       unit: 'psig', placeholder: 'e.g. 530',  hint: 'receiver pressure', section: 'Flash Tank' },
  { key: 'mtSuctionPsig', label: 'MT suction pressure',       unit: 'psig', placeholder: 'e.g. 420',  section: 'MT Circuit' },
  { key: 'mtSuctionTemp', label: 'MT suction line temp',      unit: '°F',   placeholder: 'e.g. 35' },
  { key: 'ltSuctionPsig', label: 'LT suction pressure',       unit: 'psig', placeholder: 'e.g. 190',  section: 'LT Circuit' },
  { key: 'ltSuctionTemp', label: 'LT suction line temp',      unit: '°F',   placeholder: 'e.g. -10' },
]

function analyzeCo2Field(r: Co2FieldReadings, mtSet: number, ltSet: number, flashSet: number): { derived: DerivedRow[]; findings: Finding[] } {
  const num = (s: string) => (s.trim() === '' ? null : Number(s))
  const oat      = num(r.oat)
  const gcOutlet = num(r.gcOutletTemp)
  const headPsig = num(r.headPsig)
  const flashPsig = num(r.flashPsig)
  const mtPsig   = num(r.mtSuctionPsig)
  const mtTemp   = num(r.mtSuctionTemp)
  const ltPsig   = num(r.ltSuctionPsig)
  const ltTemp   = num(r.ltSuctionTemp)

  const optimalHead = gcOutlet !== null && gcOutlet >= 80
    ? (() => { const tC = (gcOutlet - 32) / 1.8; return Math.max((2.7 * tC + 6.1) * 14.5 - 14.7, 1080) })()
    : null
  const headDev    = headPsig !== null && optimalHead !== null ? headPsig - optimalHead : null
  const gcApproach = gcOutlet !== null && oat !== null ? gcOutlet - oat : null
  const mtSST      = mtPsig !== null ? satTempF(mtPsig) : null
  const mtSH       = mtSST !== null && mtTemp !== null ? mtTemp - mtSST : null
  const ltSST      = ltPsig !== null ? satTempF(ltPsig) : null
  const ltSH       = ltSST !== null && ltTemp !== null ? ltTemp - ltSST : null
  const rvMargin   = flashPsig !== null ? RV_LIFT_PSIG - flashPsig : null
  const flashSat   = flashPsig !== null ? satTempF(flashPsig) : null
  const mtDev      = mtPsig !== null ? mtPsig - satPsig(mtSet) : null
  const ltDev      = ltPsig !== null ? ltPsig - satPsig(ltSet) : null

  const findings: Finding[] = []

  if (gcApproach !== null) {
    if (gcApproach > 18)
      findings.push({ severity: 'critical', label: 'Very high gas cooler approach', measurement: `${gcApproach.toFixed(1)}°F outlet above OAT (target <8°F)`,
        causes: ['Fouled gas cooler coil', 'Multiple gas cooler fans failed', 'Airflow restriction'],
        checks: ['Wash gas cooler coil', 'Verify all GC fans at full speed', 'In transcritical, high approach pushes head far above the optimum'] })
    else if (gcApproach > 10)
      findings.push({ severity: 'warning', label: 'Elevated gas cooler approach', measurement: `${gcApproach.toFixed(1)}°F outlet above OAT (target <8°F)`,
        causes: ['Partial gas cooler fouling', 'One GC fan reduced/failed'],
        checks: ['Inspect gas cooler coil', 'Check GC fan amp draw'] })
  }

  if (headDev !== null) {
    if (headDev > 120)
      findings.push({ severity: 'critical', label: 'Head well above control curve', measurement: `${Math.round(headPsig!)} psig vs ~${Math.round(optimalHead!)} psig optimum`,
        causes: ['Gas cooler fouled / fans down', 'High pressure valve stuck closed', 'HPV not optimizing'],
        checks: ['Cross-check gas cooler approach', 'Inspect HPV — stuck closed raises GC pressure while starving the flash tank'] })
    else if (headDev > 60)
      findings.push({ severity: 'warning', label: 'Head above control curve', measurement: `${Math.round(headPsig!)} psig vs ~${Math.round(optimalHead!)} psig optimum`,
        causes: ['Partial GC fouling', 'HPV not optimizing'],
        checks: ['Inspect gas cooler', 'Verify HPV setpoint and operation'] })
  }

  if (flashPsig !== null) {
    if (rvMargin !== null && rvMargin <= 0)
      findings.push({ severity: 'critical', label: 'Flash tank at relief valve', measurement: `${Math.round(flashPsig)} psig — RV lifts at ${RV_LIFT_PSIG} psig`,
        causes: ['Flash gas bypass valve stuck closed', 'HPV stuck open flooding the receiver'],
        checks: ['CO2 venting — act now', 'Check FGBV — stuck closed traps flash gas', 'Verify HPV is not dumping into the receiver'] })
    else if (flashPsig >= RV_WARN_PSIG)
      findings.push({ severity: 'warning', label: 'Flash tank approaching relief valve', measurement: `${Math.round(flashPsig)} psig (RV ${RV_LIFT_PSIG} psig)`,
        causes: ['FGBV stuck closed', 'Excess flash gas not venting'],
        checks: ['Inspect flash gas bypass valve', 'Watch the trend toward the RV'] })
    else if (flashPsig <= 440)
      findings.push({ severity: 'warning', label: 'Flash tank pressure low', measurement: `${Math.round(flashPsig)} psig (set ~${Math.round(satPsig(flashSet))} psig)`,
        causes: ['Low CO2 charge', 'HPV stuck closed starving the receiver', 'FGBV stuck open venting'],
        checks: ['Check receiver level / charge', 'Inspect HPV and FGBV operation'] })
  }

  if (mtSH !== null) {
    if (mtSH > 25)
      findings.push({ severity: 'warning', label: 'High MT superheat', measurement: `${mtSH.toFixed(1)}°F (target ~14°F)`,
        causes: ['Low charge', 'MT case EEV starved', 'HPV stuck closed starving liquid'],
        checks: ['Check flash tank / charge', 'Inspect MT EEV feed', 'Cross-check head + flash for an HPV fault'] })
    else if (mtSH < 4)
      findings.push({ severity: 'warning', label: 'Low MT superheat — floodback risk', measurement: `${mtSH.toFixed(1)}°F (target ~14°F)`,
        causes: ['EEV overfeeding', 'FGBV stuck open loading the MT suction'],
        checks: ['Verify EEV control', 'Check flash gas bypass valve'] })
  }

  if (ltSH !== null && ltSH > 24)
    findings.push({ severity: 'warning', label: 'High LT superheat', measurement: `${ltSH.toFixed(1)}°F (target ~12°F)`,
      causes: ['Low charge', 'LT case EEV starved', 'HPV stuck closed'],
      checks: ['Check charge / flash tank', 'Inspect LT EEV feed'] })

  if (mtDev !== null && Math.abs(mtDev) > 25)
    findings.push({ severity: 'warning', label: mtDev > 0 ? 'MT suction above setpoint' : 'MT suction below setpoint',
      measurement: `${Math.round(mtPsig!)} psig vs ${Math.round(satPsig(mtSet))} psig (${mtSet}°F SST)`,
      causes: mtDev > 0 ? ['MT compressor down', 'FGBV stuck open loading MT suction', 'Excess load'] : ['Low charge', 'HPV stuck closed', 'EEV starved'],
      checks: mtDev > 0 ? ['Check MT compressors and FGBV'] : ['Check charge and HPV/EEV feed'] })

  if (ltDev !== null && Math.abs(ltDev) > 25)
    findings.push({ severity: 'warning', label: ltDev > 0 ? 'LT suction above setpoint' : 'LT suction below setpoint',
      measurement: `${Math.round(ltPsig!)} psig vs ${Math.round(satPsig(ltSet))} psig (${ltSet}°F SST)`,
      causes: ltDev > 0 ? ['LT compressor down', 'LT defrost stuck on'] : ['Low charge', 'HPV stuck closed'],
      checks: ['Check LT compressors and defrost', 'Verify charge'] })

  const hasData = [headPsig, flashPsig, mtPsig, ltPsig, gcOutlet].some(v => v !== null)
  if (findings.length === 0 && hasData)
    findings.push({ severity: 'ok', label: 'No significant deviations found', measurement: '',
      causes: [], checks: ['Readings appear within normal range for this rack — enter more measurements for a fuller picture'] })

  const derived: DerivedRow[] = [
    { label: 'Gas cooler approach', value: gcApproach, unit: '°F',
      note: gcApproach !== null && gcApproach > 10 ? 'HIGH' : undefined,
      color: gcApproach !== null && gcApproach > 10 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
      tooltip: 'Gas cooler outlet temp minus OAT. On a clean CO2 gas cooler this is under ~8°F. A high approach in transcritical drives head far above the optimum.' },
    { label: 'Optimal head (curve)', value: optimalHead, dec: 0, unit: 'psig' },
    { label: 'Head vs optimum', value: headDev, dec: 0, unit: 'psig',
      note: headDev !== null && headDev > 60 ? 'HIGH' : undefined,
      color: headDev !== null && headDev > 60 ? 'text-amber-600 dark:text-amber-400' : undefined },
    { label: 'Flash tank sat temp', value: flashSat, unit: '°F sat' },
    { label: 'Relief valve margin', value: rvMargin, dec: 0, unit: 'psig',
      note: rvMargin !== null && rvMargin < 50 ? 'LOW' : undefined,
      color: rvMargin !== null && rvMargin < 50 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400' },
    { label: 'MT sat temp', value: mtSST, unit: '°F sat' },
    { label: 'MT superheat', value: mtSH, unit: '°F',
      note: mtSH !== null ? (mtSH > 25 ? 'HIGH' : mtSH < 4 ? 'LOW' : undefined) : undefined,
      color: mtSH !== null && (mtSH > 25 || mtSH < 4) ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
    { label: 'LT sat temp', value: ltSST, unit: '°F sat' },
    { label: 'LT superheat', value: ltSH, unit: '°F',
      note: ltSH !== null && ltSH > 24 ? 'HIGH' : undefined,
      color: ltSH !== null && ltSH > 24 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
  ]

  return { derived, findings }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Co2BoosterSimulatorPage() {
  const router = useRouter()
  const [faults, setFaults] = useState<FaultState>(INITIAL_FAULTS)
  const [oat, setOat]       = useState(75)
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)
  const [userGuess, setUserGuess]           = useState<FaultState>(INITIAL_FAULTS)
  const [submitted, setSubmitted]           = useState(false)
  const [pickerOpen, setPickerOpen]         = useState(false)

  // Adjustable rack settings (controller setpoints)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mtSet, setMtSet]       = useState(MT_SST)
  const [ltSet, setLtSet]       = useState(LT_SST)
  const [flashSet, setFlashSet] = useState(FLASH_TANK_SET)

  // Field Readings diagnostic
  const [fieldOpen, setFieldOpen] = useState(false)
  const [fieldReadings, setFieldReadings] = useState<Co2FieldReadings>(CO2_FIELD_EMPTY)
  const updateField = (key: string, val: string) => setFieldReadings(prev => ({ ...prev, [key]: val }))
  const fieldAnalysis = useMemo(() => analyzeCo2Field(fieldReadings, mtSet, ltSet, flashSet), [fieldReadings, mtSet, ltSet, flashSet])

  // Instructor reveal (free-play only)
  const [instructorReveal, setInstructorReveal] = useState(false)
  const [schematicOpen, setSchematicOpen] = useState(true)

  const inScenario   = activeScenario !== null
  const activeFaults = useMemo(
    () => (activeScenario ? { ...INITIAL_FAULTS, ...activeScenario.faults } : faults),
    [activeScenario, faults],
  )
  const activeOat    = inScenario ? (activeScenario.oat ?? 75) : oat

  const base = useMemo(() => computeRack(activeFaults, activeOat, mtSet, ltSet, flashSet), [activeFaults, activeOat, mtSet, ltSet, flashSet])

  // ── Live sensor layer — readings breathe around the model's steady state ──
  const live = useLiveReadings([
    { key: 'head',      target: base.headPsig,      jitter: 2.2,  wander: 9,    period: 48, bias: 3 },
    { key: 'flash',     target: base.flashPsig,     jitter: 0.8,  wander: 3.5,  period: 60, bias: 1.5 },
    { key: 'mtSuction', target: base.mtSuctionPsig, jitter: 1.0,  wander: 4,    period: 34, bias: 1.2 },
    { key: 'ltSuction', target: base.ltSuctionPsig, jitter: 0.7,  wander: 2.5,  period: 38, bias: 0.8 },
    { key: 'mtSH',      target: base.mtSH,          jitter: 0.25, wander: 1.4,  period: 26, bias: 0.4 },  // EEV hunting
    { key: 'ltSH',      target: base.ltSH,          jitter: 0.25, wander: 1.2,  period: 30, bias: 0.4 },
    { key: 'gcOut',     target: base.gcOutletTemp,  jitter: 0.20, wander: 0.8,  period: 70, bias: 0.5 },
    { key: 'ampF',      target: 1,                  jitter: 0.005, wander: 0.015, period: 24 },
    // per-case sensor deltas
    ...MT_CASES.map((c, i) => ({ key: `mtCase${i}`, target: 0, jitter: 0.10, wander: 0.9, period: 72 + i * 8, bias: 0.7 })),
    ...LT_CASES.map((c, i) => ({ key: `ltCase${i}`, target: 0, jitter: 0.10, wander: 0.7, period: 84 + i * 9, bias: 0.6 })),
  ])

  // Display object — JSX reads this; alarm logic stays on the clean model
  const result: RackResult = {
    ...base,
    headPsig:      live.head,
    flashPsig:     live.flash,
    flashSatTemp:  satTempF(live.flash),
    rvMarginPsig:  RV_LIFT_PSIG - live.flash,
    mtSuctionPsig: live.mtSuction,
    mtSST:         satTempF(live.mtSuction),
    ltSuctionPsig: live.ltSuction,
    ltSST:         satTempF(live.ltSuction),
    mtSH:          live.mtSH,
    ltSH:          live.ltSH,
    gcOutletTemp:  live.gcOut,
    mtAmps:        base.mtAmps.map(a => a > 0 ? Math.round(a * live.ampF * 10) / 10 : 0),
    ltAmps:        base.ltAmps.map(a => a > 0 ? Math.round(a * live.ampF * 10) / 10 : 0),
    mtCaseTemps:   base.mtCaseTemps.map((t, i) => t + (live[`mtCase${i}`] ?? 0)),
    ltCaseTemps:   base.ltCaseTemps.map((t, i) => t + (live[`ltCase${i}`] ?? 0)),
  }

  const trendSpecs = [
    { key: 'head',      label: result.transcritical ? 'Gas Cooler' : 'Head', unit: 'psig', value: result.headPsig, decimals: 0 },
    { key: 'flash',     label: 'Flash Tank',   unit: 'psig', value: result.flashPsig, decimals: 0 },
    { key: 'mtSuction', label: 'MT Suction',   unit: 'psig', value: result.mtSuctionPsig, decimals: 0 },
    { key: 'ltSuction', label: 'LT Suction',   unit: 'psig', value: result.ltSuctionPsig, decimals: 0 },
    { key: 'mtSH',      label: 'MT Superheat', unit: '°F',   value: result.mtSH },
    { key: 'ltCase',    label: 'Frozen Case',  unit: '°F',   value: result.ltCaseTemps[0] },
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
    setActiveScenario(s); setUserGuess(INITIAL_FAULTS); setSubmitted(false); setPickerOpen(false)
  }
  function exitScenario() { setActiveScenario(null); setUserGuess(INITIAL_FAULTS); setSubmitted(false) }
  function resetAll() {
    setFaults(INITIAL_FAULTS); setOat(75)
    setMtSet(MT_SST); setLtSet(LT_SST); setFlashSet(FLASH_TANK_SET)
    setInstructorReveal(false)
    exitScenario()
  }

  function submitDiagnosis() {
    if (!activeScenario) return
    setSubmitted(true)
    const correct = activeScenario.answer.filter(k => userGuess[k]).length
    const total   = activeScenario.answer.length
    const fp      = Object.entries(userGuess).filter(([k, v]) => v && !activeScenario.answer.includes(k as FaultKey)).length
    const pct     = Math.max(0, Math.round(((correct - fp * 0.5) / total) * 100))
    saveSimAttempt({
      rack: 'co2-booster',
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

  const activeFaultCount = inScenario ? 0 : Object.values(faults).filter(Boolean).length
  const hasCritical = result.alarms.some(a => a.severity === 'CRITICAL')
  const hasWarning  = result.alarms.some(a => a.severity === 'WARNING')
  const statusBadge = hasCritical
    ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40'
    : hasWarning ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
    : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'

  const faultsByGroup = FAULT_GROUPS.map(g => ({ group: g, defs: FAULT_DEFS.filter(d => d.group === g) }))
  const guessState = inScenario ? userGuess : faults

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">

      {/* Header */}
      <div className="safe-top bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.push('/simulation')}
          className="p-1.5 -ml-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          title="Back to rack selection">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-blue-400">Cold</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white">IQ</span>
        </div>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">CO2 Transcritical Booster</span>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
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
        </div>
      </div>

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
                Free play — toggle faults below and watch the readings. Or test yourself:
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
                <p className="text-[10px] text-violet-100">1–2 random hidden faults, random weather.</p>
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
                    {s.oat !== undefined && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">OAT {s.oat}°F</span>
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
                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">OAT {activeOat}°F</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{activeScenario.description}</p>

              {!submitted && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                  Read the gauges below, mark your diagnosis in the fault list, then submit.
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
                  <div className="flex gap-2 pt-1">
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

        {/* System dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`bg-white dark:bg-slate-800 rounded-xl p-3 border ${
            result.headPsig >= 1450 ? 'border-red-300 dark:border-red-500/40' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">{result.transcritical ? 'Gas Cooler' : 'Head'}</p>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                result.transcritical
                  ? 'bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                  : 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300'}`}>
                {result.transcritical ? 'TRANSCRITICAL' : 'SUBCRITICAL'}
              </span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{Math.round(result.headPsig)} <span className="text-xs font-normal text-slate-400">psig</span></p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {result.transcritical
                ? `GC outlet ${Math.round(result.gcOutletTemp)} °F — no condensing above ${CO2_CRITICAL_F} °F`
                : `condensing ${Math.round(result.condensingTemp ?? 0)} °F sat`}
            </p>
          </div>

          <div className={`bg-white dark:bg-slate-800 rounded-xl p-3 border ${
            result.flashPsig >= RV_WARN_PSIG || result.flashPsig <= 440 ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-700'}`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Flash Tank</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{Math.round(result.flashPsig)} <span className="text-xs font-normal text-slate-400">psig</span></p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{Math.round(result.flashSatTemp)} °F sat · RV at {RV_LIFT_PSIG} psig</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">MT Suction</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{Math.round(result.mtSuctionPsig)} <span className="text-xs font-normal text-slate-400">psig</span></p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{result.mtSST.toFixed(1)} °F SST · SH {result.mtSH.toFixed(0)} °F</p>
          </div>

          <div className={`bg-white dark:bg-slate-800 rounded-xl p-3 border ${
            result.ltSuctionPsig <= 150 ? 'border-red-300 dark:border-red-500/40' : 'border-slate-200 dark:border-slate-700'}`}>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">LT Suction</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{Math.round(result.ltSuctionPsig)} <span className="text-xs font-normal text-slate-400">psig</span></p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{result.ltSST.toFixed(1)} °F SST · SH {result.ltSH.toFixed(0)} °F</p>
          </div>
        </div>

        {/* Rack schematic */}
        {(() => {
          const conceal = inScenario
          const vis = (running: boolean) => (running ? 'run' as const : 'trip' as const)
          const mtAvg = result.mtCaseTemps.reduce((a, b) => a + b, 0) / result.mtCaseTemps.length
          const ltAvg = result.ltCaseTemps.reduce((a, b) => a + b, 0) / result.ltCaseTemps.length
          const mtDev = Math.max(...result.mtCaseTemps.map((t, i) => t - MT_CASES[i].setpoint))
          const ltDev = Math.max(...result.ltCaseTemps.map((t, i) => t - LT_CASES[i].setpoint))
          const valveState = (closed: boolean, open: boolean) =>
            conceal ? 'auto' as const : closed ? 'closed' as const : open ? 'open' as const : 'auto' as const
          return (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <button onClick={() => setSchematicOpen(v => !v)} className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
                <Gauge size={13} className="text-slate-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Rack Schematic</span>
                {conceal && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">controller view — inspection cues hidden</span>}
                <span className={`ml-auto text-slate-400 transition-transform ${schematicOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {schematicOpen && (
                <div className="px-2 pb-2">
                  <Co2BoosterVisual
                    fansSpinning={conceal ? [true, true] : [!activeFaults.gcFan1Failed, !activeFaults.gcFan2Failed]}
                    fansFailed={conceal ? [false, false] : [activeFaults.gcFan1Failed, activeFaults.gcFan2Failed]}
                    gcFouled={!conceal && activeFaults.gcFouled}
                    transcritical={result.transcritical}
                    headPsig={result.headPsig}
                    flashPsig={result.flashPsig}
                    flashLevel={Math.min(0.92, Math.max(0.08, (result.flashPsig - 420) / 320))}
                    rvVenting={result.flashPsig >= RV_LIFT_PSIG}
                    rvWarn={result.flashPsig >= RV_WARN_PSIG}
                    hpv={valveState(activeFaults.hpvStuckClosed, activeFaults.hpvStuckOpen)}
                    fgbv={valveState(activeFaults.fgbvStuckClosed, activeFaults.fgbvStuckOpen)}
                    mtComps={base.mtCompRunning.map((r, i) => ({ label: `MT${i + 1}`, status: vis(r), amps: result.mtAmps[i] }))}
                    ltComps={base.ltCompRunning.map((r, i) => ({ label: `LT${i + 1}`, status: vis(r), amps: result.ltAmps[i] }))}
                    mtSuctionPsig={result.mtSuctionPsig}
                    ltSuctionPsig={result.ltSuctionPsig}
                    mtCaseTemp={mtAvg} mtCaseColor={mtDev >= 6 ? '#ef4444' : mtDev >= 3 ? '#f59e0b' : '#10b981'}
                    ltCaseTemp={ltAvg} ltCaseColor={ltDev >= 10 ? '#ef4444' : ltDev >= 5 ? '#f59e0b' : '#10b981'}
                    ltDefrost={!conceal && activeFaults.ltDefrostStuck}
                    doorsOpen={!conceal && activeFaults.mtDoorsOpen}
                  />
                </div>
              )}
            </div>
          )
        })()}

        {/* Reading trends */}
        <TrendsCard specs={trendSpecs} history={trendHistory} />

        {/* OAT slider */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
          <div className="flex items-center gap-4">
            <Wind size={15} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">Ambient / OAT</span>
              <input type="range" min={-10} max={110} step={5} value={activeOat}
                onChange={e => setOat(Number(e.target.value))}
                disabled={inScenario}
                className="flex-1 accent-blue-600 disabled:opacity-50" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 w-14 text-right tabular-nums">{activeOat} °F</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 ml-7">
            {result.transcritical
              ? 'Transcritical — gas cooler outlet above the 87.8 °F critical point; pressure follows the optimization curve, not a PT chart.'
              : 'Subcritical — condensing normally; head follows the R-744 PT relationship.'}
            {inScenario && ' (locked by scenario)'}
          </p>
        </div>

        {/* Rack settings — adjustable controller setpoints */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <button onClick={() => setSettingsOpen(v => !v)} className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
            <SlidersHorizontal size={14} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Rack Settings</span>
            <span className="text-[10px] text-slate-400 ml-1 truncate hidden sm:inline">MT {mtSet}°F · LT {ltSet}°F · Flash {flashSet}°F</span>
            <span className={`ml-auto text-slate-400 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {settingsOpen && (
            <div className="px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-700">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">MT SST setpoint</span>
                  <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">{mtSet}°F · {Math.round(satPsig(mtSet))} psig</span>
                </div>
                <input type="range" min={15} max={30} step={1} value={mtSet} onChange={e => setMtSet(Number(e.target.value))} className="w-full accent-emerald-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">LT SST setpoint</span>
                  <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">{ltSet}°F · {Math.round(satPsig(ltSet))} psig</span>
                </div>
                <input type="range" min={-30} max={-15} step={1} value={ltSet} onChange={e => setLtSet(Number(e.target.value))} className="w-full accent-blue-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Flash tank setpoint</span>
                  <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">{flashSet}°F · {Math.round(satPsig(flashSet))} psig</span>
                </div>
                <input type="range" min={30} max={45} step={1} value={flashSet} onChange={e => setFlashSet(Number(e.target.value))} className="w-full accent-amber-500" />
              </div>
              <div className="sm:col-span-3">
                <button onClick={() => { setMtSet(MT_SST); setLtSet(LT_SST); setFlashSet(FLASH_TANK_SET) }}
                  className="text-[10px] text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-2">Reset to defaults</button>
              </div>
            </div>
          )}
        </div>

        {/* Field readings analyzer */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <button onClick={() => setFieldOpen(v => !v)} className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
            <ClipboardList size={14} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Field Readings Analyzer</span>
            <span className="text-[10px] text-slate-400 ml-1 hidden sm:inline">enter on-site readings → diagnosis</span>
            <span className={`ml-auto text-slate-400 transition-transform ${fieldOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {fieldOpen && (
            <div className="px-4 pb-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <FieldReadingsPanel
                fields={CO2_FIELD_DEFS}
                values={fieldReadings}
                onChange={updateField}
                onClear={() => setFieldReadings(CO2_FIELD_EMPTY)}
                derived={fieldAnalysis.derived}
                findings={fieldAnalysis.findings}
                footnote={`Analysis uses MT ${mtSet}°F / LT ${ltSet}°F / flash ${flashSet}°F setpoints — adjust in Rack Settings. R-744 transcritical.`}
                intro="Enter what you read at the rack — gas cooler, flash tank and MT/LT suction. The analyzer computes approach, head-vs-curve, superheats and relief-valve margin, then flags likely issues."
              />
            </div>
          )}
        </div>

        {/* Compressors */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">MT Compressors — 3 × Bitzer</p>
            <div className="grid grid-cols-3 gap-2">
              {result.mtCompRunning.map((running, i) => (
                <div key={i} className={`rounded-lg border p-2 text-center ${running ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10' : 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10'}`}>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">MT-{i + 1}</p>
                  <p className={`text-xs font-bold ${running ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{running ? `${result.mtAmps[i]} A` : 'OFF'}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">LT Compressors — 2 × Bitzer (discharge → MT suction)</p>
            <div className="grid grid-cols-2 gap-2">
              {result.ltCompRunning.map((running, i) => (
                <div key={i} className={`rounded-lg border p-2 text-center ${running ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10' : 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10'}`}>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">LT-{i + 1}</p>
                  <p className={`text-xs font-bold ${running ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{running ? `${result.ltAmps[i]} A` : 'OFF'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Case temps */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer size={13} className="text-slate-500 dark:text-slate-400" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Case Temperatures</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {MT_CASES.map((c, i) => {
              const t = result.mtCaseTemps[i]
              const dev = t - c.setpoint
              return (
                <div key={c.name} className={`rounded-lg border p-2 ${dev >= 6 ? 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10' : dev >= 3 ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{c.name}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{t.toFixed(0)} °F</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500">set {c.setpoint} °F</p>
                </div>
              )
            })}
            {LT_CASES.map((c, i) => {
              const t = result.ltCaseTemps[i]
              const dev = t - c.setpoint
              return (
                <div key={c.name} className={`rounded-lg border p-2 ${dev >= 10 ? 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10' : dev >= 5 ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1"><Snowflake size={8} className="text-blue-400 flex-shrink-0" />{c.name}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{t.toFixed(0)} °F</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500">set {c.setpoint} °F</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Alarms */}
        {result.alarms.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <AlertTriangle size={13} className="text-amber-500 dark:text-amber-400" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Active Alarms</span>
              <span className="ml-auto text-[10px] text-slate-500">{result.alarms.length} active</span>
            </div>
            <div className="p-2 space-y-1">
              {result.alarms.map((a, i) => (
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
                <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Instructor reveal — active faults · OAT {activeOat}°F</p>
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

        <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center pb-4 leading-relaxed">
          R-744 transcritical booster — 3 × MT + 2 × LT Bitzer · MT {mtSet} °F SST / LT {ltSet} °F SST · flash tank {flashSet} °F sat ({Math.round(satPsig(flashSet))} psig) ·
          critical point {CO2_CRITICAL_F} °F / ~1056 psig · gas cooler curve ≈ 2.7 × T(°C) + 6.1 bar
        </div>

      </div>
    </div>
  )
}
