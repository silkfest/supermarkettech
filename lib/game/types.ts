export type SystemKey = 'refrigeration' | 'electrical' | 'plumbing' | 'hvac'

export type EquipmentKind =
  | 'reach-in-freezer' | 'bunker' | 'dairy-case' | 'deli-case' | 'meat-case' | 'produce-case'
  | 'walk-in-freezer' | 'walk-in-cooler' | 'rack' | 'rtu' | 'floor-drain' | 'entrance'
  | 'reach-in-cooler' | 'chest-freezer' | 'ice-machine' | 'condensing-unit' | 'split-ac'
  | 'station'

export interface Point { x: number; y: number }

export interface Obstacle {
  x: number; y: number; w: number; h: number
  kind: 'wall' | 'shelf' | 'checkout' | 'produce' | 'desk' | 'counter' | 'bench' | 'pump'
  label?: string
}

export interface GameMap {
  w: number
  h: number
  floor: 'tile' | 'concrete' | 'shop'
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
}

export interface Option {
  id: string
  label: string
  correct?: boolean
  why: string
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
  note?: string
  verified?: boolean
  verificationStep?: number
}

export interface CallResult {
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
  note: string
  minutesSpent: number
}
