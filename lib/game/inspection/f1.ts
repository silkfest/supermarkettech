import { COMMON_FAULTS } from '../faults-common'
import type { ComponentId, InspectionState, Measurement } from './types'

/** Technical source stays in the existing fault catalogue. These are training
 * reference readings, not a circuit design from which to infer supply voltage. */
export const F1_FAULT = COMMON_FAULTS.find(
  (f) => f.id === 'defrost_heater_open'
)!
export const F1_TICKET = 'WO #38471 — Frozen Food'
export const F1_REPORT =
  'Store reports F1 temperature has been creeping up overnight. Alarm monitoring called twice. Manager says the case was fine yesterday. Heavy frost reported near one end of the lineup.'
export const COMPONENTS: { id: ComponentId; label: string }[] = [
  { id: 'product', label: 'Glass doors / product' },
  { id: 'controller', label: 'Controller' },
  { id: 'coil', label: 'Evaporator' },
  { id: 'fans', label: 'Evaporator fans' },
  { id: 'heaters', label: 'Defrost heaters' },
  { id: 'txv', label: 'TXV' },
  { id: 'solenoid', label: 'Liquid solenoid' },
  { id: 'drain', label: 'Drain / pan' },
  { id: 'electrical', label: 'Defrost circuit' }
]
export const MEASUREMENTS: Measurement[] = [
  {
    id: 'product',
    label: 'Insert probe between frozen product packs',
    tool: 'thermometer'
  },
  {
    id: 'current',
    label: 'Clamp one heater feeder conductor',
    tool: 'clamp',
    mode: 'amps',
    terminals: ['L1 feeder', 'clamp jaw']
  },
  {
    id: 'dead',
    label: 'Prove heater circuit dead (tested meter)',
    tool: 'multimeter',
    mode: 'volts',
    terminals: ['load conductors', 'all conductors / ground']
  },
  ...[1, 2, 3].map((n) => ({
    id: `e${n}`,
    label: `Heater ${n} isolated element`,
    tool: 'multimeter' as const,
    mode: 'ohms' as const,
    terminals: [`H${n} terminal A`, `H${n} terminal B`] as const
  })),
  ...[1, 2, 3].map((n) => ({
    id: `g${n}`,
    label: `Heater ${n} to frame`,
    tool: 'multimeter' as const,
    mode: 'ohms' as const,
    terminals: [`H${n} terminal A`, 'case frame'] as const
  }))
]
export function initialInspection(): InspectionState {
  return {
    definition: 'f1-defrost',
    evidence: [],
    isolated: false,
    provedDead: false,
    leadsDisconnected: false,
    coverOpen: false,
    repaired: false,
    defrostStarted: null,
    terminatedAt: null,
    cycle: 0,
    frost: [45, 55, 95],
    productTemp: F1_FAULT.readings.find((r) => r.key === 'prod')!.value,
    diagnosis: null,
    verified: false,
    safetyMistakes: [],
    unnecessary: [],
    repairs: [],
    feedback: '',
    note: '',
    shrink: 0,
    elapsedMinutes: 0
  }
}
export const EFFICIENT_PATH =
  'Observe uneven frost → force defrost → watch one section stay iced → clamp feeder → compare 5.8 A with 8.7 A → isolate and prove dead → disconnect and ohm elements → replace only Heater #3 → restore → verify full current, a clear coil, normal termination and pull-down.'
