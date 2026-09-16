import { CLASSROOM_MAP } from './maps/classroom'
import { GAS_STATION_MAP } from './maps/gas-station'
import { SUPERMARKET_MAP } from './maps/supermarket'
import { LESSONS } from './lessons'
import type { GameMap, Character } from './types'
import type { GameProgress, LevelId } from './progress'

type Role = Character['role']

export interface LevelDef {
  id: LevelId
  order: number
  name: string
  subtitle: string
  description: string
  kind: 'classroom' | 'shift'
  map: GameMap
  /** Fault ids that can spawn on this level (shift levels only). */
  faultPool: string[]
  shiftLenMin: number
  spawnAt: Record<Role, number[]>
  maxOpen: Record<Role, number>
  /** Grades that count as "passing" this level for unlocking the next one. */
  passGrades: string[]
}

export const LEVELS: LevelDef[] = [
  {
    id: 'classroom',
    order: 1,
    name: 'Trade School',
    subtitle: 'Refrigeration basics',
    description: 'Twelve stations, no clock. The cycle, PT charts, superheat and subcooling, compressors, TXVs, defrost, airflow, drains — plus a meter bench and live 120 V and 208 V panels to troubleshoot before anyone hands you a real one.',
    kind: 'classroom',
    map: CLASSROOM_MAP,
    faultPool: [],
    shiftLenMin: 0,
    spawnAt: { apprentice: [], journeyman: [] },
    maxOpen: { apprentice: 0, journeyman: 0 },
    passGrades: [],
  },
  {
    id: 'gas-station',
    order: 2,
    name: 'Corner Gas Station',
    subtitle: 'Small commercial',
    description: 'Self-contained coolers, a beer cave, an ice machine, and one condensing unit out back. Short shift, small equipment, real calls.',
    kind: 'shift',
    map: GAS_STATION_MAP,
    faultPool: [
      'sc_condenser_clogged', 'beer_cave_door', 'ice_machine_scale', 'cond_fan_capacitor',
      'door_heater_open', 'ice_machine_drain', 'split_ac_filter', 'dry_trap', 'door_ajar', 'dt_failed_open',
    ],
    shiftLenMin: 6 * 60,
    spawnAt: { apprentice: [0, 60, 120, 180, 240], journeyman: [0, 40, 80, 125, 170, 215, 260] },
    maxOpen: { apprentice: 2, journeyman: 3 },
    passGrades: ['A', 'B', 'C'],
  },
  {
    id: 'supermarket',
    order: 3,
    name: 'Full Supermarket',
    subtitle: 'Parallel rack, walk-ins, RTUs',
    description: 'The whole store: display cases off a rack, walk-ins, two rooftop units, and a floor that never stops moving. Eight hours, four systems, triage everything.',
    kind: 'shift',
    map: SUPERMARKET_MAP,
    faultPool: [
      'dt_failed_open', 'txv_starved', 'dirty_condenser', 'floodback_bulb', 'door_ajar',
      'fan_shorted', 'control_fuse', 'contactor_burned', 'contactor_welded',
      'condensate_clog', 'frozen_drain', 'dry_trap', 'condensate_pump',
      'economizer_stuck', 'filter_clogged', 'negative_pressure',
    ],
    shiftLenMin: 8 * 60,
    spawnAt: { apprentice: [0, 75, 150, 225, 300, 375], journeyman: [0, 40, 80, 130, 180, 230, 280, 330, 380] },
    maxOpen: { apprentice: 2, journeyman: 3 },
    passGrades: ['A', 'B', 'C'],
  },
]

export const LEVEL_BY_ID: Record<LevelId, LevelDef> = Object.fromEntries(LEVELS.map(l => [l.id, l])) as Record<LevelId, LevelDef>

export function lessonsPassed(p: GameProgress): number {
  return LESSONS.filter(l => p.lessons[l.id]?.passed).length
}

export function levelUnlock(p: GameProgress, id: LevelId): { ok: boolean; reason: string } {
  switch (id) {
    case 'classroom':
      return { ok: true, reason: '' }
    case 'gas-station': {
      const n = lessonsPassed(p)
      return n >= LESSONS.length
        ? { ok: true, reason: '' }
        : { ok: false, reason: `Pass all ${LESSONS.length} trade-school stations (${n}/${LESSONS.length})` }
    }
    case 'supermarket': {
      const g = p.levels['gas-station']?.bestGrade
      const ok = !!g && LEVEL_BY_ID['gas-station'].passGrades.includes(g)
      return ok ? { ok: true, reason: '' } : { ok: false, reason: 'Earn a C or better at the gas station' }
    }
  }
}
