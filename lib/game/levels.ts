import { CLASSROOM_MAP } from './maps/classroom'
import { GAS_STATION_MAP } from './maps/gas-station'
import { SUPERMARKET_MAP } from './maps/supermarket'
import { PROTOCOL_STORE_MAP } from './maps/protocol-store'
import { TYLER_STORE_MAP } from './maps/tyler-store'
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
    subtitle: 'Hussmann parallel rack',
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
    id: 'protocol-store',
    order: 4,
    name: 'Eastgate Foods',
    subtitle: 'Protocol HE distributed',
    description: 'No machine room. Two Protocol modules in an alcove behind the floor, each with its own charge, and a remote condenser on the pad. The low-temp module runs vapour-injection scrolls with DTC injection — compressors that depend on a solid column of liquid to survive their own discharge temperature.',
    kind: 'shift',
    map: PROTOCOL_STORE_MAP,
    faultPool: [
      'pro_demand_cooling', 'pro_false_discharge_trip', 'pro_digital_scroll',
      'pro_small_charge_leak', 'pro_case_drier', 'pro_hgd_stuck',
      'dt_failed_open', 'door_ajar', 'txv_starved', 'condensate_clog', 'dry_trap',
      'fan_shorted', 'economizer_stuck', 'filter_clogged', 'condensate_pump',
    ],
    shiftLenMin: 8 * 60,
    spawnAt: { apprentice: [0, 75, 150, 225, 300, 375], journeyman: [0, 40, 85, 135, 185, 235, 285, 335, 385] },
    maxOpen: { apprentice: 2, journeyman: 3 },
    passGrades: ['A', 'B', 'C'],
    briefing: {
      lead: 'Same refrigerant you already know. Completely different shape: no machine room, no one big rack, and low-temp compressors that will cook themselves without a working injection line.',
      points: [
        { head: 'Vapour injection is not a bonus feature', body: 'The low-temp module runs EVI scrolls. A DTC valve — a bulb in the top cap thermal well, a capillary and a filter — injects into the intermediate port on each compressor, and that is what keeps discharge temperature survivable at low-temp compression ratios. The maximum for the discharge line is 260 °F. Lose injection and all six climb past it together, so if every discharge line is hot, look at the injection feed before you look at any one compressor. And a DTC valve needs a solid column of liquid: clean or change its filter before you ever condemn the valve.' },
        { head: 'Believe the alarm, then check the sensor', body: 'High discharge temperature is the alarm that matters most here, and it is also the one most likely to be lying. Clamp a thermocouple on the same pipe before you act. A real 284 °F and a reported 271 °F on a pipe that is actually at 188 °F are two completely different calls, and only one of them is fixed with refrigerant tools.' },
        { head: 'Each module carries its own small charge', body: 'A Protocol module holds 80 to 275 lb, where a parallel rack in the same store would hold well over a thousand. A leak that a big rack would ride out for months puts a module into flash gas inside a day — and it stays on that module. One system flashing while its neighbour is perfect is the architecture telling you where to look.' },
        { head: 'The lead scroll is a digital', body: 'It trims the module by unloading while its solenoid is ENERGISED, on a twenty second cycle, and low temp limits it to between 30 and 100 % capacity. Get that backwards and you will chase the wrong fault: an open coil leaves it fully loaded, while something holding the output on leaves it unloaded. Held unloaded, you lose both its capacity and all the modulation range, and the symptom is a module that runs flat out all day and never quite catches up — with no alarm, because nothing failed.' },
        { head: 'Check the drier at the case, not just at the rack', body: 'These circuits have their own liquid driers out at the case. A plugged one starves that circuit while the module reads perfectly normal, and the module drier will show you nothing. Two thermocouples and a minute tell you which drier is the problem.' },
      ],
    },
  },
  {
    id: 'tyler-store',
    order: 5,
    name: 'Lakeshore Market',
    subtitle: 'Tyler parallel rack — EnviroGuard',
    description: 'A legacy Tyler rack on R-404A with Nature’s Cooling and EnviroGuard III: head pressure floats down with the weather to save energy, and a set of regulators keeps the system working while it does. Half the calls here only happen when it is cold outside, and most of them are fixed with a wrench and a chart rather than a part.',
    kind: 'shift',
    map: TYLER_STORE_MAP,
    faultPool: [
      'tyl_opr_misset', 'tyl_nc2_bypass', 'tyl_gas_defrost_low_head',
      'tyl_sentronic', 'tyl_heat_reclaim', 'tyl_enviroguard_fans',
      'dt_failed_open', 'door_ajar', 'txv_starved', 'condensate_clog', 'dry_trap',
      'fan_shorted', 'contactor_burned', 'contactor_welded', 'filter_clogged', 'condensate_pump',
    ],
    shiftLenMin: 8 * 60,
    spawnAt: { apprentice: [0, 75, 150, 225, 300, 375], journeyman: [0, 40, 85, 135, 185, 235, 285, 335, 385] },
    maxOpen: { apprentice: 2, journeyman: 3 },
    passGrades: ['A', 'B', 'C'],
    briefing: {
      lead: 'Nothing exotic here — semi-hermetics, R-404A, a receiver and a remote condenser. What makes this store its own animal is that the head pressure is deliberately allowed to fall, and a handful of regulators are all that keep the system working when it does.',
      points: [
        { head: 'Floating head is the feature, not the fault', body: 'Nature’s Cooling lets condensing pressure follow the weather down instead of holding it at a fixed setpoint. That is where the energy saving lives. Low head on a cold night is the system working. Low head with warm cases means something that was supposed to hold a floor did not.' },
        { head: 'The OPR is that floor', body: 'A gas bypass from the discharge header to the receiver, holding receiver pressure above the point where the case valves can still feed. The chart in the manual gives the setting for the refrigerant and the application — on R-404A here, 125 psig. Set it low and the store runs out of liquid pressure at three in the morning and fixes itself at sunrise, which makes it very easy to blame the wrong thing.' },
        { head: 'The receiver level is supposed to fall when it gets cold', body: 'Refrigerant backs up in the condenser as condensing temperature drops. A receiver that is full in July and a third full in January is behaving. Judging the charge by the glass on a cold night is how these systems end up overcharged every summer.' },
        { head: 'Gas defrost needs pressure you may not have at 3 AM', body: 'Hot gas defrost is driven by a pressure difference. Float the head down far enough and there is not enough of it left, so defrosts run their full time and terminate on the failsafe instead of on temperature. The DDPR exists to preserve that difference — the manual puts its minimum at 20 psi.' },
        { head: 'Most of these are adjustments, not parts', body: 'An OPR setting, a DDPR differential, a controller deadband, a thermostat bulb back in its clamp. On this rack the parts cannon is almost always the wrong answer, and the manual on the shelf is almost always the right one.' },
      ],
    },
  },
  {
    id: 'glycol-store',
    order: 6,
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
    order: 7,
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
        { head: 'Never shut the MT rack down without a plan for the CO2', body: 'Stop the MT rack and the CO2 has nothing to condense into. It warms to room temperature and the receiver climbs toward the relief within a couple of hours. Anything over about two hours, the procedure is to pump the liquid CO2 down into the receiver — watching the level, and stopping the compressors at the last sight glass so you never pump liquid into the suction. There is also a backup condensing unit on the receiver for this: check what panel feeds it before you lock anything out.' },
        { head: 'CO2 pressures are still four times what you expect', body: 'LT suction sits in the 130 to 203 psig band, the receiver around 480 to 520, and standstill goes wherever the room temperature takes it — the relief is waiting at 652 psig. Subcritical does not mean low pressure.' },
      ],
    },
  },
  {
    id: 'co2-store',
    order: 8,
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
        { head: 'The numbers are four times what you expect', body: 'MT suction runs 348 to 406 psig. LT suction 130 to 203. The flash tank and MT discharge both sit around 480 to 520 psig, and on a hot afternoon the gas cooler runs 1,100 to 1,500. A gauge set that reads 500 psig full scale is useless here, and so is your instinct for what "high" means.' },
        { head: 'Above 88 °F there is no condensing temperature', body: 'Past the critical point CO2 does not condense — it just gets denser. The controller stops chasing a condensing temperature and starts following a pressure curve against gas cooler outlet temperature. Superheat on the high side is a meaningless question; gas cooler approach is the one that matters.' },
        { head: 'A flash tank is not a liquid receiver', body: 'The high pressure valve drops gas cooler pressure into the tank, liquid feeds the cases from the bottom, and the flash gas bypass valve lets the vapour off the top into the MT suction. Those two valves are the whole high side. When cases starve everywhere at once, look at them before you look at charge.' },
        { head: 'Standing still is when it bites', body: 'The flash tank is normally held near 32 °F. A rack that is switched off warms up, and by the time the tank reaches about 50 °F the regulating relief starts venting at 652 psig. That is what the small backup condensing unit on the tank is for, and it needs to be on emergency power. If it is not, an overnight outage ends with your charge on the roof. Worth knowing: a relief that vents and then re-seats — around 586 psig, ten percent blow-down — is not replaced. Only one that cannot re-seat is.' },
        { head: 'The gas detector is safety equipment', body: 'CO2 is heavier than air, it has no smell at these concentrations, and it pools at floor level where you kneel to work. If the strobe is flashing, the room is ventilated before anyone goes in — not after. Nobody enters a space above 3 % — 30,000 ppm — without SCBA or supplied air, rescuers included.' },
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
    // Rack styles are a branch, not a chain — once you can hold a store
    // together on a parallel rack, dispatch can send you to any of them.
    case 'protocol-store':
    case 'tyler-store':
    case 'glycol-store':
    case 'cascade-store':
    case 'co2-store': {
      const g = p.levels['supermarket']?.bestGrade
      const ok = !!g && LEVEL_BY_ID['supermarket'].passGrades.includes(g)
      return ok ? { ok: true, reason: '' } : { ok: false, reason: 'Earn a C or better at the supermarket' }
    }
  }
}
