import type { InspectionState } from './inspection/types'
import type { RefrigerantId } from './pt'

export type SystemKey = 'refrigeration' | 'electrical' | 'plumbing' | 'hvac'

export type EquipmentKind =
  | 'reach-in-freezer' | 'bunker' | 'dairy-case' | 'deli-case' | 'meat-case' | 'produce-case'
  | 'walk-in-freezer' | 'walk-in-cooler' | 'rack' | 'rtu' | 'floor-drain' | 'entrance'
  | 'reach-in-cooler' | 'chest-freezer' | 'ice-machine' | 'condensing-unit' | 'split-ac'
  | 'gas-cooler' | 'flash-tank' | 'co2-rack' | 'intercooler' | 'gas-detector'
  | 'glycol-skid' | 'plate-hx' | 'expansion-tank' | 'cascade-hx'
  | 'protocol-module' | 'protocol-lt' | 'condenser' | 'receiver'
  | 'station' | 'storefront'

export interface Point { x: number; y: number }

export interface Obstacle {
  x: number; y: number; w: number; h: number
  kind: 'wall' | 'shelf' | 'checkout' | 'produce' | 'desk' | 'counter' | 'bench' | 'pump'
    | 'road' | 'parking' | 'building' | 'tree'
  label?: string
  /** Scenery you can walk or drive over — roads, lots, lawns. Default is solid. */
  walkable?: boolean
}

export interface GameMap {
  w: number
  h: number
  floor: 'tile' | 'concrete' | 'shop' | 'town'
  obstacles: Obstacle[]
  zones: { label: string; x: number; y: number }[]
  equipment: EquipmentNode[]
  spawn: Point
}

export interface EquipmentNode {
  id: string
  label: string
  /** Short name drawn on the map (stations). Falls back to `id`. */
  short?: string
  kind: EquipmentKind
  /** Footprint on the map (also a movement obstacle unless `walkable`). */
  rect: { x: number; y: number; w: number; h: number }
  /** Where the hotspot pin is drawn. */
  pin: Point
  /** Walkable point the tech stands at to work on it. */
  stand: Point
  walkable?: boolean
  /** Sign / awning colour, for hand-authored scenery like the town storefronts. */
  accent?: string
}

export interface Reading {
  key: string
  label: string
  value: number
  unit: string
  decimals?: number
  jitter?: number
  wander?: number
  status: 'ok' | 'warn' | 'crit'
  /** What a healthy reading would be, shown as reference. */
  expect?: string
  /** Value once the correct repair has settled in, shown at the verify step. Defaults to `value`. */
  after?: number
}

/** A check you have to actually perform, rather than just pay time for.
 *
 *  `meter` is the bench: you take the readings this particular call calls for and
 *  say what they tell you. `ohms` means the circuit is dead and locked out — an
 *  ohmmeter on a live circuit reads nothing you can trust — and `volts` means
 *  live work. The readings belong to the fault, not to a sandbox, so what you
 *  measure is always what is actually wrong with this piece of equipment.
 *
 *  `ptchart` puts a gauge reading and a line temperature in front of you and
 *  makes you work out the superheat or subcooling off the chart. */
export type Instrument =
  | {
      kind: 'meter'
      mode: 'ohms' | 'volts'
      prompt: string
      /** Test points, in the order a tech would take them. */
      points: { id: string; label: string; expect: string; reading: string }[]
      /** What the readings tell you — a verdict on this circuit, not the whole call. */
      verdicts: Option[]
    }
  | {
      kind: 'ptchart'
      refrigerant: RefrigerantId
      psig: number
      lineTempF: number
      ask: 'superheat' | 'subcooling'
      prompt: string
    }

export interface Check {
  id: string
  label: string
  tool: string
  /** Game minutes the check consumes. */
  minutes: number
  finding: string
  /** A check that actually discriminates between the causes. */
  key?: boolean
  /** Work you do yourself before the finding is yours. */
  instrument?: Instrument
}

export interface Option {
  id: string
  label: string
  correct?: boolean
  why: string
  /** Parts off the truck, in dollars. A wrong fix bills the company for these. */
  cost?: number
}

export interface FaultDef {
  id: string
  system: SystemKey
  kinds: EquipmentKind[]
  title: string
  report: string
  cue: string
  readings: Reading[]
  checks: Check[]
  causes: Option[]
  fixes: Option[]
  /** How far up the apprenticeship you have to be before dispatch sends you this.
   *  1 — basic: doors, drains, filters, dirty coils.
   *  2 — meters and gauges: contactors, capacitors, valves, controls.
   *  3 — system level: the call is about how this whole rack is put together. */
  difficulty: 1 | 2 | 3
  /** Dollars of product at risk per game-minute while open (refrigeration only, else 0). */
  shrinkPerMin: number
  /** Game minutes until the store logs a customer complaint. */
  complaintAfterMin: number
  /** Electrical work — lockout/tagout is required before the fix. */
  loto?: boolean
  knowledge?: { slug: string; label: string }[]
}

export interface Character {
  name: string
  color: string
  role: 'apprentice' | 'journeyman'
}

export type CallStage = 'ticket' | 'diagnose' | 'fix' | 'verify' | 'log' | 'done'

export interface ActiveCall {
  inspection?: InspectionState
  id: string
  faultId: string
  equipmentId: string
  spawnedAtMin: number
  complained: boolean
  stage: CallStage
  checksDone: string[]
  lotoDone: boolean
  causeAttempts: number
  fixAttempts: number
  minutesSpent: number
  /** Dollars of parts thrown at the wrong diagnosis. */
  partsWasted: number
}

export interface CallResult {
  inspection?: InspectionState
  callId: string
  faultId: string
  equipmentId: string
  system: SystemKey
  points: number
  diagnosisPts: number
  fixPts: number
  efficiencyPts: number
  safetyPenalty: number
  causeAttempts: number
  fixAttempts: number
  checksUsed: number
  keyChecksTotal: number
  partsWasted: number
  note: string
  minutesSpent: number
}
