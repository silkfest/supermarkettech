import { CLASSROOM_MAP } from './maps/classroom'
import { GAS_STATION_MAP } from './maps/gas-station'
import { SUPERMARKET_MAP } from './maps/supermarket'
import { GLYCOL_STORE_MAP } from './maps/glycol-store'
import { CASCADE_STORE_MAP } from './maps/cascade-store'
import { CO2_STORE_MAP } from './maps/co2-store'
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
  /** Illustration for the hub card, in public/game. Falls back to the map thumbnail. */
  card?: string
  /** Shown once before the first shift on this level — what you are walking into. */
  briefing?: { lead: string; points: { head: string; body: string }[] }
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
  {
    id: 'glycol-store',
    order: 4,
    name: 'Northside Market',
    subtitle: 'Glycol secondary loop',
    description: 'The medium-temp cases here are not fed refrigerant at all. A DX chiller cools glycol through a plate heat exchanger and two pumps push it around the floor. Low temp stays DX. Half your calls are hydronic problems wearing a refrigeration hat, and a refractometer earns its place on the truck.',
    kind: 'shift',
    map: GLYCOL_STORE_MAP,
    faultPool: [
      'gly_air_locked', 'gly_hx_approach', 'gly_concentration', 'gly_balancing_valve',
      'gly_pump_vfd', 'gly_expansion_tank',
      'dt_failed_open', 'condensate_clog', 'dry_trap', 'fan_shorted', 'contactor_burned',
      'contactor_welded', 'frozen_drain', 'floodback_bulb',
      'economizer_stuck', 'filter_clogged', 'condensate_pump',
    ],
    shiftLenMin: 8 * 60,
    spawnAt: { apprentice: [0, 75, 150, 225, 300, 375], journeyman: [0, 40, 85, 135, 185, 235, 285, 335, 385] },
    maxOpen: { apprentice: 2, journeyman: 3 },
    passGrades: ['A', 'B', 'C'],
    briefing: {
      lead: 'Two loops, and only one of them has refrigerant in it. Get clear which side of the plate pack you are standing on before you start diagnosing.',
      points: [
        { head: 'The cases are a hydronic system', body: 'Medium temp runs on 38–40 % propylene glycol at about 20 °F supply, with 8–10 °F across each case coil and 26–30 psid across the pumps. A warm case is a flow problem or a temperature problem, and those are two different calls. Take supply and return at the case before you touch anything else.' },
        { head: 'The plate pack is where the two sides meet', body: 'Design approach is 6–8 °F between the refrigerant saturated suction and the glycol leaving. If the approach is wide, the heat is not getting through the plates. Pressure drop across the glycol side tells you why: three times design means the channels are packed.' },
        { head: 'Concentration is not optional', body: 'At 38 % the loop freezes around −10 °F. Top it up with water a couple of times and you are at 18 % with a freeze point of 19 °F — above your own supply temperature. It slushes in the coldest plate channels, flow drops, and the chiller starts tripping on low suction every afternoon. Carry a refractometer and use it.' },
        { head: 'Air is a fault, not a nuisance', body: 'Every time a circuit is opened for a coil or a fan, air goes in. Air at the high points starves the far end of the loop and makes a pump sound like it is passing gravel. Purging is part of the job, not an afterthought.' },
        { head: 'Two pumps only help if both are in AUTO', body: 'Duty and standby exist so a motor failure is not a store failure. A selector switch left in OFF after a PM turns a redundant pump house into a single point of failure, and nobody finds out until the cases are at 48 °F.' },
      ],
    },
  },
  {
    id: 'cascade-store',
    order: 5,
    name: 'Harbour Foods',
    subtitle: 'CO2 cascade',
    description: 'Medium temp on a conventional R-448A rack, low temp on a subcritical CO2 pack that rejects its heat into the MT side instead of to outdoor air. Two systems welded together by one vessel — which is why the frozen food complains first when the MT rack has a problem.',
    kind: 'shift',
    map: CASCADE_STORE_MAP,
    faultPool: [
      'casc_hx_approach', 'casc_mt_starved', 'casc_no_pumpdown', 'casc_oil_return', 'casc_phase_monitor',
      'dt_failed_open', 'door_ajar', 'txv_starved', 'condensate_clog', 'dry_trap',
      'fan_shorted', 'contactor_welded', 'economizer_stuck', 'filter_clogged', 'condensate_pump',
    ],
    shiftLenMin: 8 * 60,
    spawnAt: { apprentice: [0, 75, 150, 225, 300, 375], journeyman: [0, 40, 85, 135, 185, 235, 285, 335, 385] },
    maxOpen: { apprentice: 2, journeyman: 3 },
    passGrades: ['A', 'B', 'C'],
    briefing: {
      lead: 'Your first CO2 store, and the gentle one: the low side is subcritical, so the numbers still behave. What is new is that two systems are tied together through one vessel.',
      points: [
        { head: 'The CO2 condenses into the MT rack, not into outdoor air', body: 'The cascade heat exchanger is the whole relationship. CO2 condenses at about 10 °F (360 psig) on one side; R-448A evaporates at about 0 °F on the other. Design approach is 8–10 °F. That one number tells you which side of the vessel your problem is on.' },
        { head: 'An LT complaint often starts on the MT rack', body: 'Take the MT rack a compressor short and its suction floats up. The CO2 now has to condense warmer, head climbs, and the frozen food is the first thing anyone notices. Read the approach before you touch the CO2 pack: normal approach with a warm MT side means the call is next door.' },
        { head: 'Oil goes where it is cold and stays there', body: 'On the CO2 side, oil that gets past the separator collects in the cascade vessel and in the case coils, and it does not come back on its own. A widening approach with compressors sitting low in the glass is oil, not fouling.' },
        { head: 'Never shut the MT rack down without a plan for the CO2', body: 'Stop the MT rack and the CO2 has nothing to condense into. It warms to room temperature and the receiver climbs toward the relief within a couple of hours. There is an auxiliary condensing unit on the receiver for this — check what panel feeds it before you lock anything out.' },
        { head: 'CO2 pressures are still four times what you expect', body: 'LT suction sits near 190 psig at −22 °F saturated, the receiver near 500, and standstill goes wherever the room temperature takes it. Subcritical does not mean low pressure.' },
      ],
    },
  },
  {
    id: 'co2-store',
    order: 6,
    name: 'Summit Grocers',
    subtitle: 'CO2 transcritical booster',
    description: 'Same sales floor, completely different machine room. One booster pack running MT and LT, a flash tank instead of a receiver, an intercooler between the stages, and a gas cooler that runs above the critical point every warm afternoon. Pressures you cannot guess at, and a gas detector on the wall for a reason.',
    kind: 'shift',
    map: CO2_STORE_MAP,
    faultPool: [
      'co2_hpv_stuck', 'co2_fgbv_closed', 'co2_gc_fan_bank', 'co2_intercooler_dry',
      'co2_standstill', 'co2_lt_eev_overfeed', 'co2_leak_alarm',
      'dt_failed_open', 'door_ajar', 'condensate_clog', 'dry_trap', 'fan_shorted', 'contactor_welded',
      'economizer_stuck', 'filter_clogged', 'condensate_pump',
    ],
    shiftLenMin: 8 * 60,
    spawnAt: { apprentice: [0, 75, 150, 225, 300, 375], journeyman: [0, 40, 85, 135, 185, 235, 285, 335, 385] },
    maxOpen: { apprentice: 2, journeyman: 3 },
    passGrades: ['A', 'B', 'C'],
    briefing: {
      lead: 'You have worked HFC racks. Nothing you learned about pressures transfers. Read this before you put a gauge on anything.',
      points: [
        { head: 'The numbers are four times what you expect', body: 'MT suction runs about 425 psig at 23 °F saturated. LT about 190 psig at −22 °F. The flash tank sits near 530 psig, and on a hot afternoon the gas cooler runs 1,100–1,500 psig. A gauge set that reads 500 psig full scale is useless here, and so is your instinct for what "high" means.' },
        { head: 'Above 88 °F there is no condensing temperature', body: 'Past the critical point CO2 does not condense — it just gets denser. The controller stops chasing a condensing temperature and starts following a pressure curve against gas cooler outlet temperature. Superheat on the high side is a meaningless question; gas cooler approach is the one that matters.' },
        { head: 'A flash tank is not a liquid receiver', body: 'The high pressure valve drops gas cooler pressure into the tank, liquid feeds the cases from the bottom, and the flash gas bypass valve lets the vapour off the top into the MT suction. Those two valves are the whole high side. When cases starve everywhere at once, look at them before you look at charge.' },
        { head: 'Standing still is when it bites', body: 'A rack that is switched off warms to room temperature and the charge pushes toward 800+ psig. That is what the little pumpdown condensing unit on the flash tank is for, and it needs to be on backup power. If it is not, an overnight outage ends with the relief valve venting your charge onto the roof.' },
        { head: 'The gas detector is safety equipment', body: 'CO2 is heavier than air, it has no smell at these concentrations, and it pools at floor level where you kneel to work. If the strobe is flashing, the room is ventilated before anyone goes in — not after.' },
      ],
    },
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
    case 'glycol-store': {
      const g = p.levels['supermarket']?.bestGrade
      const ok = !!g && LEVEL_BY_ID['supermarket'].passGrades.includes(g)
      return ok ? { ok: true, reason: '' } : { ok: false, reason: 'Earn a C or better at the supermarket' }
    }
    case 'cascade-store': {
      const g = p.levels['glycol-store']?.bestGrade
      const ok = !!g && LEVEL_BY_ID['glycol-store'].passGrades.includes(g)
      return ok ? { ok: true, reason: '' } : { ok: false, reason: 'Earn a C or better at Northside Market' }
    }
    case 'co2-store': {
      const g = p.levels['cascade-store']?.bestGrade
      const ok = !!g && LEVEL_BY_ID['cascade-store'].passGrades.includes(g)
      return ok ? { ok: true, reason: '' } : { ok: false, reason: 'Earn a C or better at Harbour Foods' }
    }
  }
}
