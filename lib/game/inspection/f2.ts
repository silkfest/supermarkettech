import { COMMON_FAULTS } from '../faults-common'
import type {
  ComponentId,
  EvidenceItem,
  InspectionState,
  Measurement
} from './types'
import type { Step } from './engine'

/** Technical source stays in the existing fault catalogue. These are training
 * reference readings, not a circuit design from which to infer supply voltage. */
export const F2_FAULT = COMMON_FAULTS.find((f) => f.id === 'evap_fan_motor')!
export const F2_TICKET = 'WO #38614 — Meat multideck'
export const F2_REPORT =
  'Meat department says the far end of the case has been running warm since yesterday. Product at the near end is fine. Nobody has been in the case and the last defrost looked normal on the controller.'

/** Three fan positions along the case. The one over the warm end is dead. */
export const DEAD_FAN = 2
const SECTION = ['supply', 'centre', 'return'] as const

export const F2_COMPONENTS: { id: ComponentId; label: string }[] = [
  { id: 'product', label: 'Product / air curtain' },
  { id: 'fans', label: 'Evaporator fans' },
  { id: 'coil', label: 'Evaporator' },
  { id: 'electrical', label: 'Fan circuit' },
  { id: 'controller', label: 'Controller' },
  { id: 'drain', label: 'Drain / pan' },
  { id: 'txv', label: 'TXV' }
]

export const F2_MEASUREMENTS: Measurement[] = [
  {
    id: 'product',
    label: 'Insert probe into product at the warm end',
    tool: 'thermometer'
  },
  ...[0, 1, 2].map((i) => ({
    id: `air${i + 1}`,
    label: `Discharge air at the ${SECTION[i]} end`,
    tool: 'thermometer' as const
  })),
  {
    id: 'circuit',
    label: 'Clamp the fan circuit conductor',
    tool: 'clamp',
    mode: 'amps',
    terminals: ['fan circuit conductor', 'clamp jaw'] as const
  },
  {
    id: 'plug',
    label: 'Voltage at the unplugged fan\u2019s plug',
    tool: 'multimeter',
    mode: 'volts',
    terminals: ['supply half of the fan plug', 'neutral'] as const
  },
  {
    id: 'm3',
    label: 'Ohm the motor across its own plug',
    tool: 'multimeter',
    mode: 'ohms',
    terminals: ['motor half of the fan plug', 'the other pin'] as const
  },
  {
    id: 'mg3',
    label: 'Ohm the motor to the case frame',
    tool: 'multimeter',
    mode: 'ohms',
    terminals: ['motor half of the fan plug', 'case frame'] as const
  }
]

export const F2_DIAGNOSIS = {
  systems: ['Electrical', 'Refrigeration'],
  components: {
    Electrical: ['Evaporator fans', 'Case lighting', 'Anti-sweat heaters'],
    Refrigeration: ['TXV', 'Evaporator coil', 'Liquid solenoid']
  } as Record<string, string[]>,
  failures: {
    'Evaporator fans': [
      'Motor open \u2014 power at the plug, nothing turning',
      'No power reaching the plug',
      'Blade loose on the shaft'
    ]
  } as Record<string, string[]>,
  answer: {
    system: 'Electrical',
    component: 'Evaporator fans',
    failure: 'Motor open \u2014 power at the plug, nothing turning'
  }
}

export function initialInspectionF2(): InspectionState {
  return {
    definition: 'f2-evap-fan',
    evidence: [],
    isolated: false,
    provedDead: false,
    leadsDisconnected: false,
    coverOpen: false,
    repaired: false,
    defrostStarted: null,
    terminatedAt: null,
    cycle: 0,
    // Light frost where air still moves, heavy under the section nothing is
    // pulling heat through.
    frost: [10, 12, 55],
    fans: [true, true, false],
    airTempF: [30, 30, 42],
    productTemp: F2_FAULT.readings.find((r) => r.key === 'far')!.value,
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

const fansOf = (s: InspectionState) => s.fans ?? [true, true, false]
const airOf = (s: InspectionState) => s.airTempF ?? [30, 30, 42]
/** A fan cannot turn with its circuit locked out. */
const running = (s: InspectionState, i: number) => fansOf(s)[i] && !s.isolated

/** No air across a section means no heat pulled through it: that stretch of coil
 *  ices up and its discharge air climbs. Put the motor back and both recover. */
export function tickF2(
  s: InspectionState,
  _now: number,
  dt: number
): InspectionState {
  const fans = fansOf(s)
  const frost = s.frost.map((v, i) =>
    running(s, i)
      ? Math.max(6, v - dt * (s.repaired ? 2.6 : 0.05))
      : Math.min(100, v + dt * 0.35)
  )
  const air = airOf(s).map((v, i) =>
    running(s, i) ? Math.max(29, v - dt * 2.2) : Math.min(46, v + dt * 0.12)
  )
  // Product follows the worst end of the case, and only pulls down once every
  // section is moving air again.
  const cooling = fans.every(Boolean) && !s.isolated && Math.max(...air) <= 31
  const productTemp = cooling
    ? Math.max(29, s.productTemp - dt * 0.5)
    : Math.min(48, s.productTemp + dt * 0.05)
  return {
    ...s,
    frost,
    airTempF: air,
    productTemp,
    elapsedMinutes: s.elapsedMinutes + dt,
    shrink:
      s.shrink +
      (cooling && productTemp <= 34 ? 0 : F2_FAULT.shrinkPerMin * dt * 0.25)
  }
}

type Evidence = (
  id: string,
  label: string,
  value: string,
  kind?: EvidenceItem['kind']
) => void
type Fail = (message: string, safety?: boolean) => void

/** What looking at each part of this case tells you. Returns minutes spent. */
export function observeF2(
  s: InspectionState,
  component: ComponentId,
  tool: string,
  evidence: Evidence,
  fail: Fail
): number {
  const needs = component === 'controller' ? 'controller' : 'flashlight'
  if (tool !== needs) {
    fail(
      `Select the ${needs === 'controller' ? 'controller interface' : 'flashlight'} first.`
    )
    return 0
  }
  const fans = fansOf(s)
  switch (component) {
    case 'product':
      evidence(
        'curtain',
        'Air curtain',
        'The curtain feels strong over the first two thirds and almost nothing over the far end. Product is stacked below the load line throughout.'
      )
      return 1
    case 'fans': {
      // Unplugged, that fan is stopped because you stopped it — which says
      // nothing about whether it was turning on its own.
      if (s.leadsDisconnected) {
        evidence(
          'fans-unplugged',
          'Fan bank',
          'The far-end fan is unplugged, so of course it is not turning. The other two are running on their own plugs.'
        )
        return 2
      }
      const stopped = fans
        .map((r, i) => (r ? null : SECTION[i]))
        .filter(Boolean)
      if (!stopped.length)
        evidence(
          'fans-ok',
          'Fan bank',
          'All three fans turning evenly, no noise and no wobble.'
        )
      else {
        evidence(
          'stopped',
          'Fan bank',
          `Two of the three are turning. The ${stopped[0]}-end fan is stopped, and its blade spins freely by hand — no drag, no bearing noise, so it is not seized. Each fan is on its own plug behind the discharge grille, so this one can come out of circuit on its own.`
        )
      }
      return 2
    }
    case 'coil':
      evidence(
        'frost',
        'Coil frost',
        s.frost[DEAD_FAN] > 25
          ? 'Heavy even frost under the far end and normal light frost everywhere else. The pattern follows the dead fan, not the defrost.'
          : 'Frost is light and even the whole length of the coil.'
      )
      if (s.repaired && s.frost.every((f) => f <= 12))
        evidence(
          'cleared',
          'Post-repair coil',
          'The heavy section has cleared and the coil is frosting evenly again.'
        )
      return 2
    case 'controller':
      evidence(
        'controller',
        'Controller / history',
        'Defrosts running on schedule and terminating on temperature. Case setpoint 30 °F. Nameplate on the door jamb: three fan motors, 0.4 A each, 1.2 A total.'
      )
      return 2
    case 'electrical':
      evidence(
        'circuit',
        'Fan circuit',
        'Fan disconnect in the raceway, one feeder to the fan circuit and three motor lead pairs on the terminal block, each labelled by position.'
      )
      return 2
    case 'drain':
      evidence('drain', 'Drain / pan', 'Clear and empty. Nothing backing up.')
      return 2
    case 'txv':
      s.unnecessary = [...s.unnecessary, 'TXV inspection']
      evidence(
        'txv',
        'TXV',
        'Bulb clamped and insulated, no visible defect. A visual check alone says nothing about how it is feeding.'
      )
      return 4
    default:
      evidence(
        'look',
        'Nothing here',
        'Nothing on this call turns on what is in front of you here.'
      )
      return 2
  }
}

/** What an instrument actually reads. Returns minutes, or -1 when it refused. */
export function measureF2(
  s: InspectionState,
  m: Measurement,
  evidence: Evidence,
  fail: Fail,
  random: () => number
): number {
  const air = airOf(s)
  if (m.id !== 'product' && !m.id.startsWith('air') && !s.coverOpen) {
    fail(
      'Get the bottom shelf cleared and the discharge grille off first \u2014 the fan plugs are behind it.'
    )
    return -1
  }
  // A plug-connected fan is its own isolation: unplug that one and the motor
  // side is dead without locking out the whole bank. Ohming it while it is
  // still plugged in is a live resistance test on a running circuit.
  if (m.mode === 'ohms' && !s.leadsDisconnected) {
    fail(
      'Unplug the fan before you ohm it \u2014 that plug is still live.',
      true
    )
    return -1
  }
  if (m.id === 'plug' && !s.leadsDisconnected) {
    fail('Unplug the fan first; the reading you want is on the supply half.')
    return -1
  }
  if (m.id === 'product') {
    evidence(
      'product',
      'Product probe',
      `${(s.productTemp + (random() - 0.5) * 0.4).toFixed(1)} °F`,
      'measurement'
    )
    return 1
  }
  if (m.id.startsWith('air')) {
    const i = Number(m.id.slice(3)) - 1
    evidence(
      m.id,
      `Discharge air, ${SECTION[i]} end`,
      `${(air[i] + (random() - 0.5) * 0.3).toFixed(1)} °F`,
      'measurement'
    )
    return 1
  }
  if (m.id === 'circuit') {
    const live = !s.isolated
    const value = live ? (fansOf(s).filter(Boolean).length * 0.4) : 0
    evidence(
      live ? 'circuit' : 'circuit-off',
      'Fan circuit clamp',
      live
        ? `${(value + (random() - 0.5) * 0.04).toFixed(1)} A against 1.2 A nameplate`
        : '0.0 A — the fan circuit is isolated',
      'measurement'
    )
    return 1
  }
  if (m.id === 'plug') {
    evidence(
      'plug',
      'Voltage at the fan plug',
      s.repaired
        ? '118 V on the supply half, and the replacement runs as soon as it is plugged in.'
        : '118 V on the supply half of the plug. The case is offering this fan everything it needs, and it still will not turn \u2014 so the fault is on the motor side of that plug.',
      'measurement'
    )
    return 2
  }
  if (m.id === 'mg3') {
    evidence(
      'mg3',
      'Motor to frame',
      'OL \u2014 no continuity to frame (DMM screening, not an insulation test).',
      'measurement'
    )
    return 2
  }
  // m3: the motor read across its own plug, which is what unplugging gives you.
  evidence(
    'm3',
    'Motor winding',
    s.repaired ? '181 \u03a9' : 'OL \u2014 the winding is open',
    'measurement'
  )
  return 2
}

export function diagnoseChecklistF2(
  s: InspectionState,
  recorded: (s: InspectionState, id: string, phase?: 'before' | 'after') => boolean
): Step[] {
  return [
    {
      label: 'Find the fan that is not turning',
      done: recorded(s, 'stopped', 'before')
    },
    {
      label: 'Unplug that fan and read its plug for power',
      done: recorded(s, 'plug', 'before')
    }
  ]
}

export function verifyChecklistF2(
  s: InspectionState,
  recorded: (s: InspectionState, id: string, phase?: 'before' | 'after') => boolean
): Step[] {
  return [
    { label: 'Replacement motor fitted and plugged in', done: s.repaired },
    {
      label: 'Fan circuit back to nameplate current',
      done: recorded(s, 'circuit', 'after')
    },
    {
      label: 'Discharge air even the length of the case',
      done:
        recorded(s, 'air3', 'after') &&
        airOf(s).every((v) => v <= 31)
    },
    {
      label: 'Heavy frost cleared',
      done: recorded(s, 'cleared', 'after') && s.frost.every((f) => f <= 12)
    },
    {
      label: 'Product back at or below 34 °F',
      done:
        s.productTemp <= 34 &&
        s.evidence.some(
          (e) =>
            e.id === 'product' &&
            e.phase === 'after' &&
            e.recorded &&
            parseFloat(e.value) <= 34
        )
    },
    {
      label: 'Fan plugged back in, grille refitted, product restocked',
      done: !s.isolated && !s.leadsDisconnected && !s.coverOpen
    }
  ]
}

/** Parts a technician can actually fit on this call, with what they cost to
 *  throw at it. Only one of them is the fault. */
export const F2_PARTS: Record<string, { label: string; cost: number }> = {
  M3: { label: 'Fan motor #3', cost: 95 },
  'all-motors': { label: 'All three fan motors', cost: 285 },
  blade: { label: 'Fan blade', cost: 20 },
  txv: { label: 'TXV', cost: 180 }
}

export function diagnosisIsCorrectF2(action: {
  system: string
  component: string
  failure: string
}) {
  const a = F2_DIAGNOSIS.answer
  return (
    action.system === a.system &&
    action.component === a.component &&
    action.failure === a.failure
  )
}

/** Fitting the motor is what puts air back over that end of the case. */
export function replaceF2(s: InspectionState, part: string): boolean {
  if (part !== 'M3') return false
  s.repaired = true
  s.fans = [true, true, true]
  s.repairs = [...s.repairs, 'Replaced fan motor #3 ($95)']
  return true
}

export function guidanceF2(
  s: InspectionState,
  recorded: (s: InspectionState, id: string, phase?: 'before' | 'after') => boolean,
  canDiagnose: (s: InspectionState) => boolean,
  verify: (s: InspectionState) => Step[]
): { text: string; area?: ComponentId; hints: string[] } {
  if (s.verified)
    return {
      text: 'Write up the work order on the Report page and close the call.',
      hints: [
        'The repair is proved; what is left is the paperwork.',
        'Open the Report page.',
        'Use the chips to build the note from what you found, then Complete report.'
      ]
    }

  if (s.repaired) {
    const left = verify(s).find((x) => !x.done)
    if (!left)
      return {
        text: 'Everything checks out — confirm verified operation on the Report page.',
        hints: [
          'Every verification step is ticked.',
          'Open the Report page.',
          'Press “Confirm verified operation”.'
        ]
      }
    switch (left.label) {
      case 'Fan plugged back in, grille refitted, product restocked':
        return {
          text: 'Put the circuit back: reconnect the leads, restore the disconnect and secure the cover.',
          area: 'electrical',
          hints: [
            'The fans cannot run — and nothing can be verified — while the circuit is locked out.',
            'Go to the Fan circuit.',
            'Use “Reconnect the leads and restore power” — the cover stays off until your readings are done.'
          ]
        }
      case 'Fan circuit back to nameplate current':
        return {
          text: 'With the fans running again, clamp the fan circuit — it should pull the full 1.2 A now.',
          area: 'electrical',
          hints: [
            'The before-and-after current is what proves the third motor is back.',
            'Reconnect and restore power; the cover is already off.',
            'Fan circuit → “Clamp the fan circuit conductor”, read on A~.'
          ]
        }
      case 'Discharge air even the length of the case':
        return {
          text: 'Give the case a few minutes, then read the discharge air at the return end again.',
          area: 'product',
          hints: [
            'The complaint was warm air at one end — that is the number that answers it.',
            'Use “Wait 10 min”, then go to the air curtain.',
            'Read the discharge air at the return end.'
          ]
        }
      case 'Heavy frost cleared':
        return {
          text: 'Let the coil catch up, then inspect the evaporator and confirm the heavy section has gone.',
          area: 'coil',
          hints: [
            'With air moving again that slab of ice sheds on its own.',
            'Use “Wait 10 min”, then go to the Evaporator.',
            'Press “Inspect the evaporator coil”.'
          ]
        }
      default:
        return {
          text: 'Give the case time to pull down, then probe the product at the warm end again.',
          area: 'product',
          hints: [
            'The number the meat manager will ask about is the product, not the coil.',
            'Use “Wait 10 min” a few times, then go to the air curtain.',
            'Press “Insert probe into product at the warm end” and read it.'
          ]
        }
    }
  }

  if (s.diagnosis)
    return {
      text: 'The fan is already unplugged — swap the motor and plug the new one in.',
      area: 'fans',
      hints: [
        'Unplugging that fan is what made it safe to work on; the rest of the bank never had to stop.',
        'Go to the Evaporator fans.',
        'Use “Swap the motor and plug it in”.'
      ]
    }

  if (canDiagnose(s))
    return {
      text: 'You have the evidence — open the Diagnose page and call it.',
      hints: [
        'A fan sitting still with full voltage on its plug is the whole case \u2014 the fault has to be on the motor side of it.',
        'Open the Diagnose page.',
        'Pick the system, the component and the failure, then submit.'
      ]
    }

  if (!recorded(s, 'stopped', 'before'))
    return {
      text: 'Look along the fan bank while the case is running and find the one that is not turning.',
      area: 'fans',
      hints: [
        'Uneven air along one case usually means a fan, and you can see that in a few seconds without tools.',
        'Go to the Evaporator fans.',
        'Press “Look at each fan in the bank”.'
      ]
    }

  if (!s.coverOpen)
    return {
      text: 'Get the bottom shelf cleared and lift the discharge grille — the fan plugs are behind it.',
      area: 'fans',
      hints: [
        'This is the cheap way in. A clerk can pull the product; you do not have to strip the case down.',
        'Go to the Evaporator fans.',
        'Use “Clear the bottom shelf and lift the grille”.'
      ]
    }

  if (!s.leadsDisconnected)
    return {
      text: 'Unplug the fan that is not turning.',
      area: 'fans',
      hints: [
        'Each fan is on its own plug, so one can come out of circuit without stopping the other two.',
        'Go to the Evaporator fans.',
        'Use “Unplug the stopped fan”.'
      ]
    }

  return {
    text: 'Read the supply half of that plug for voltage.',
    area: 'fans',
    hints: [
      'Power there with nothing turning puts the fault on the motor side of the plug, and that is the whole diagnosis.',
      'Go to the Evaporator fans.',
      'Use “Voltage at the unplugged fan’s plug” on V.'
    ]
  }
}
