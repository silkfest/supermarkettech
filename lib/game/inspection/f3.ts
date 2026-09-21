import { COMMON_FAULTS } from '../faults-common'
import type {
  ComponentId,
  EvidenceItem,
  InspectionState,
  Measurement
} from './types'
import type { Step } from './engine'

/** Technical source stays in the existing fault catalogue. These are training
 * reference readings, not a validated model of this rack's piping. */
export const F3_FAULT = COMMON_FAULTS.find((f) => f.id === 'liquid_drier_plugged')!
export const F3_TICKET = 'WO #38702 — Rack A, medium temp'
export const F3_REPORT =
  'Cases on the medium-temp side have been drifting warm for a fortnight. The tech before you added refrigerant twice and neither top-up held. Store is asking whether the whole rack is on its way out.'

/** R-448A. Every pressure/temperature pair below was computed from an equation
 *  of state (CoolProp, R-448A by mass fraction) and cross-checked against the
 *  verified table in CLAUDE.md, rather than recalled — the pairing is the whole
 *  lesson of this call, so a wrong one would teach the wrong reflex.
 *
 *  One pair reads 1 °F off that table and is not an error: CLAUDE.md gives
 *  224.4 psig at 95 °F, noting the table tracks R-449A most closely and that
 *  the two refrigerants sit within ~2 psi of each other. Computed for R-448A
 *  specifically, 224 psig is 94 °F. Don't "correct" it against the table
 *  without recomputing. */
export const REFRIGERANT = 'R-448A'
/** psig → saturation °F. Bubble point on the high side, dew on the low side,
 *  which is what you read a liquid line and a suction line against. */
const SAT_HIGH: [number, number][] = [
  [145, 66],
  [160, 72],
  [222, 93],
  [224, 94]
]
const SAT_LOW: [number, number][] = [
  [34, 11],
  [38, 15],
  [44.6, 21],
  [46, 22]
]
const satOf = (table: [number, number][], psig: number) => {
  const hit = table.find(([p]) => Math.abs(p - psig) < 0.75)
  return hit ? hit[1] : null
}
/** The chart lookup the gauge set exists to make. Unknown pressures are refused
 *  rather than interpolated, so no reading can quote a pairing nobody checked. */
export function saturationF(side: 'low' | 'high', psig: number): number | null {
  return satOf(side === 'high' ? SAT_HIGH : SAT_LOW, psig)
}

export const F3_COMPONENTS: { id: ComponentId; label: string }[] = [
  { id: 'receiver', label: 'Receiver / sight glass' },
  { id: 'drier', label: 'Liquid line drier' },
  { id: 'coil', label: 'A case on the header' },
  { id: 'compressors', label: 'Compressor group' },
  { id: 'condenser', label: 'Condenser' },
  { id: 'controller', label: 'Rack controller' }
]

export const F3_MEASUREMENTS: Measurement[] = [
  {
    id: 'pliq',
    label: 'Liquid pressure at the receiver outlet',
    tool: 'gauges',
    mode: 'high',
    terminals: ['receiver outlet port', 'high-side hose'] as const
  },
  {
    id: 'pdout',
    label: 'Liquid pressure downstream of the drier',
    tool: 'gauges',
    mode: 'high',
    terminals: ['drier outlet port', 'high-side hose'] as const
  },
  {
    id: 'psuct',
    label: 'Suction pressure at the rack',
    tool: 'gauges',
    mode: 'low',
    terminals: ['suction header port', 'low-side hose'] as const
  },
  {
    id: 'zero',
    label: 'Confirm the isolated section is at 0 psig',
    tool: 'gauges',
    mode: 'low',
    terminals: ['drier shell port', 'low-side hose'] as const
  },
  {
    id: 'tliq',
    label: 'Liquid line temperature at the drier inlet',
    tool: 'thermocouples'
  },
  {
    id: 'tdout',
    label: 'Liquid line temperature at the drier outlet',
    tool: 'thermocouples'
  },
  {
    id: 'tsuct',
    label: 'Suction line temperature at the case',
    tool: 'thermocouples'
  },
  { id: 'product', label: 'Probe product in a warm case', tool: 'thermometer' }
]

export const F3_DIAGNOSIS = {
  systems: ['Refrigeration', 'Electrical'],
  components: {
    Refrigeration: ['Liquid line drier', 'Charge level', 'TXVs', 'Condenser'],
    Electrical: ['Compressor contactors', 'Rack controller']
  } as Record<string, string[]>,
  failures: {
    'Liquid line drier': [
      'Restricted — flashing across it',
      'Moisture logged but still flowing',
      'Correct size, no fault'
    ],
    'Charge level': ['Undercharged', 'Overcharged']
  } as Record<string, string[]>,
  answer: {
    system: 'Refrigeration',
    component: 'Liquid line drier',
    failure: 'Restricted — flashing across it'
  }
}

export const F3_PARTS: Record<string, { label: string; cost: number }> = {
  cores: { label: 'Drier cores', cost: 190 },
  charge: { label: 'Refrigerant, third top-up', cost: 340 },
  bypass: { label: 'Valve around the drier', cost: 40 },
  txv: { label: 'Replacement TXVs', cost: 660 }
}

export function initialInspectionF3(): InspectionState {
  return {
    definition: 'f3-liquid-drier',
    evidence: [],
    isolated: false,
    provedDead: false,
    leadsDisconnected: false,
    coverOpen: false,
    repaired: false,
    defrostStarted: null,
    terminatedAt: null,
    cycle: 0,
    frost: [0, 0, 0],
    productTemp: 41,
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

/** Every pressure and line temperature this rack will show, before and after
 *  the cores are changed. Kept in one place so a reading and the finding that
 *  explains it can never drift apart. */
function readings(s: InspectionState) {
  const fixed = s.repaired
  return {
    pliq: 224,
    pdout: fixed ? 222 : 145,
    psuct: fixed ? 44.6 : 38,
    tliq: 83,
    tdout: fixed ? 82 : 66,
    tsuct: fixed ? 30 : 43,
    receiverPct: fixed ? 62 : 68
  }
}
/** Subcooling leaving the receiver, and superheat at a case on the header. */
export const subcoolingF = (s: InspectionState) =>
  (saturationF('high', readings(s).pliq) ?? 0) - readings(s).tliq
export const superheatF = (s: InspectionState) =>
  readings(s).tsuct - (saturationF('low', readings(s).psuct) ?? 0)
export const drierDropF = (s: InspectionState) =>
  readings(s).tliq - readings(s).tdout

/** Nothing about this rack changes on its own: a restriction does not clear
 *  itself, and the cases keep losing ground until it is opened up. The section
 *  being isolated for the repair stops the store cooling at all. */
export function tickF3(
  s: InspectionState,
  _now: number,
  dt: number
): InspectionState {
  const cooling = s.repaired && !s.isolated
  const productTemp = cooling
    ? Math.max(34, s.productTemp - dt * 0.22)
    : Math.min(52, s.productTemp + dt * (s.isolated ? 0.14 : 0.03))
  return {
    ...s,
    productTemp,
    elapsedMinutes: s.elapsedMinutes + dt,
    shrink:
      s.shrink +
      (cooling && productTemp <= 38 ? 0 : F3_FAULT.shrinkPerMin * dt * 0.25)
  }
}

type Evidence = (
  id: string,
  label: string,
  value: string,
  kind?: EvidenceItem['kind']
) => void
type Fail = (message: string, safety?: boolean) => void

export function observeF3(
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
  const r = readings(s)
  switch (component) {
    case 'receiver':
      evidence(
        'receiver',
        'Receiver / sight glass',
        s.repaired
          ? `Glass is clear and solid, receiver sitting at ${r.receiverPct} %. A proper liquid column all the way to the valves.`
          : `Receiver is well up at ${r.receiverPct} % — this rack is not short of refrigerant — but the sight glass downstream of the drier is bubbling steadily.`
      )
      return 3
    case 'drier':
      evidence(
        'drier',
        'Liquid line drier',
        s.repaired
          ? 'Shell is an even temperature end to end, no sweat line across it.'
          : 'Inlet half of the shell is warm to the hand; the outlet half is sweating hard with frost starting at the outlet fitting. Moisture indicator is sitting between green and yellow.'
      )
      return 4
    case 'controller':
      evidence(
        'controller',
        'Rack controller / history',
        'Medium-temp suction setpoint 22 °F. Service log shows a compressor burnout on this rack in the spring, cores changed once at the time and nothing since, then two refrigerant top-ups in the last fortnight.'
      )
      return 4
    case 'coil':
      evidence(
        'case',
        'Case on the header',
        s.repaired
          ? 'Coil is frosting evenly across its full depth again.'
          : 'Frost on the first few passes only and bare, dry fins after that. The valve is hunting and you can hear it. Other cases on the header look the same.'
      )
      return 4
    case 'compressors':
      evidence(
        'compressors',
        'Compressor group',
        'Running long and unloading rarely; oil levels fine in every sight glass, no knocking. They are chasing a suction pressure they cannot pull down.'
      )
      return 4
    case 'condenser':
      s.unnecessary = [...s.unnecessary, 'Condenser inspection']
      evidence(
        'condenser',
        'Condenser',
        'Coil is clean, every fan turning, discharge pressure normal for the ambient. Nothing here explains a starved store.'
      )
      return 6
    default:
      evidence(
        'look',
        'Nothing here',
        'Nothing on this call turns on what is in front of you here.'
      )
      return 2
  }
}

/** Returns minutes spent, or -1 when the instrument refused to give a reading. */
export function measureF3(
  s: InspectionState,
  m: Measurement,
  evidence: Evidence,
  fail: Fail,
  random: () => number
): number {
  const r = readings(s)
  const jitter = (v: number, d = 0.4) => v + (random() - 0.5) * d

  if (m.id === 'zero') {
    if (!s.isolated) {
      fail(
        'The section is still open to the rack. Front-seat the receiver outlet and pump it down before you put a gauge on the shell.',
        true
      )
      return -1
    }
    s.provedDead = true
    evidence(
      'zero',
      'Isolated section',
      '0 psig on the shell after recovery, holding steady. Safe to break into.',
      'measurement'
    )
    return 2
  }

  if (s.isolated && m.id !== 'product') {
    fail(
      'This section is pumped down and isolated — there is nothing to read until it is back in service.'
    )
    return -1
  }

  if (m.tool === 'gauges') {
    const side = m.mode === 'high' ? 'high' : 'low'
    const psig = r[m.id as 'pliq' | 'pdout' | 'psuct']
    const sat = saturationF(side, psig)
    if (sat === null) {
      fail('That pressure is off the chart you are carrying.')
      return -1
    }
    evidence(
      m.id,
      m.label,
      `${jitter(psig, 1).toFixed(0)} psig — ${sat} °F saturated (${REFRIGERANT})`,
      'measurement'
    )
    return 2
  }

  if (m.tool === 'thermocouples') {
    const t = r[m.id as 'tliq' | 'tdout' | 'tsuct']
    evidence(m.id, m.label, `${jitter(t).toFixed(1)} °F`, 'measurement')
    return 2
  }

  evidence(
    'product',
    'Product probe',
    `${jitter(s.productTemp).toFixed(1)} °F`,
    'measurement'
  )
  return 2
}

const both = (
  s: InspectionState,
  rec: (s: InspectionState, id: string, phase?: 'before' | 'after') => boolean,
  ids: string[],
  phase: 'before' | 'after'
) => ids.every((id) => rec(s, id, phase))

export function diagnoseChecklistF3(
  s: InspectionState,
  rec: (s: InspectionState, id: string, phase?: 'before' | 'after') => boolean
): Step[] {
  return [
    {
      label: 'Subcooling at the receiver — liquid pressure and liquid line temperature',
      done: both(s, rec, ['pliq', 'tliq'], 'before')
    },
    {
      label: 'Temperature either side of the drier',
      done: both(s, rec, ['tliq', 'tdout'], 'before')
    },
    {
      label: 'Superheat at a case — suction pressure and suction line temperature',
      done: both(s, rec, ['psuct', 'tsuct'], 'before')
    }
  ]
}

export function verifyChecklistF3(
  s: InspectionState,
  rec: (s: InspectionState, id: string, phase?: 'before' | 'after') => boolean
): Step[] {
  return [
    { label: 'Fresh cores fitted', done: s.repaired },
    {
      label: 'Section back in service',
      done: s.repaired && !s.isolated && !s.provedDead
    },
    {
      label: 'No temperature drop across the drier',
      done: both(s, rec, ['tliq', 'tdout'], 'after') && drierDropF(s) <= 2
    },
    {
      label: 'Sight glass clear',
      done: rec(s, 'receiver', 'after')
    },
    {
      label: 'Case superheat back in range',
      done: both(s, rec, ['psuct', 'tsuct'], 'after') && superheatF(s) <= 12
    },
    {
      label: 'Product back at or below 38 °F',
      done:
        s.productTemp <= 38 &&
        s.evidence.some(
          (e) =>
            e.id === 'product' &&
            e.phase === 'after' &&
            e.recorded &&
            parseFloat(e.value) <= 38
        )
    }
  ]
}

export function diagnosisIsCorrectF3(action: {
  system: string
  component: string
  failure: string
}) {
  const a = F3_DIAGNOSIS.answer
  return (
    action.system === a.system &&
    action.component === a.component &&
    action.failure === a.failure
  )
}

export function replaceF3(s: InspectionState, part: string): boolean {
  if (part !== 'cores') return false
  s.repaired = true
  s.repairs = [
    ...s.repairs,
    'Changed the liquid line drier cores and evacuated the shell ($190)'
  ]
  return true
}

export function guidanceF3(
  s: InspectionState,
  rec: (s: InspectionState, id: string, phase?: 'before' | 'after') => boolean,
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
      case 'Section back in service':
        return {
          text: 'Open the valves and put the liquid line back into service.',
          area: 'drier',
          hints: [
            'Nothing reads and nothing cools while the section is still pumped down.',
            'Go to the Liquid line drier.',
            'Use “Open the valves and restore the section”.'
          ]
        }
      case 'No temperature drop across the drier':
        return {
          text: 'Take the line temperature either side of the drier again — it should be flat now.',
          area: 'drier',
          hints: [
            'The drop across it is what you came here for; the same reading proves it gone.',
            'Go to the Liquid line drier.',
            'Read the inlet and the outlet line temperatures.'
          ]
        }
      case 'Sight glass clear':
        return {
          text: 'Look at the sight glass again and confirm it has cleared.',
          area: 'receiver',
          hints: [
            'A solid glass is what the store will see.',
            'Go to the Receiver / sight glass.',
            'Press “Inspect the receiver and sight glass”.'
          ]
        }
      case 'Case superheat back in range':
        return {
          text: 'Re-read suction pressure and the suction line at the case — superheat should be back in range.',
          area: 'coil',
          hints: [
            'Superheat is the pair, not one number: pressure for the saturation temperature, thermocouple for the line.',
            'Read the suction pressure at the rack, then the suction line at the case.',
            'The gauge gives you the saturation temperature; the difference is superheat.'
          ]
        }
      default:
        return {
          text: 'Give the cases time to pull down, then probe the product again.',
          area: 'coil',
          hints: [
            'The number the store will ask about is the product, not the rack.',
            'Use “Wait 10 min” a few times.',
            'Then probe product in a warm case and read it.'
          ]
        }
    }
  }

  if (s.diagnosis) {
    if (!s.isolated)
      return {
        text: 'Front-seat the receiver outlet and pump the section down before you open the shell.',
        area: 'drier',
        hints: [
          'Nobody breaks into a liquid line at 224 psig.',
          'Go to the Liquid line drier.',
          'Use “Front-seat and pump the section down”.'
        ]
      }
    if (!s.provedDead)
      return {
        text: 'Put a gauge on the shell and confirm it is actually at 0 psig.',
        area: 'drier',
        hints: [
          'Pumped down is what you intended; 0 psig is what you know.',
          'Go to the Liquid line drier.',
          'Read “Confirm the isolated section is at 0 psig” on the low side.'
        ]
      }
    return {
      text: 'Change the drier cores and evacuate the shell.',
      area: 'drier',
      hints: [
        'The section is isolated and proved empty.',
        'Go to the Liquid line drier.',
        'Use “Change the drier cores”.'
      ]
    }
  }

  if (canDiagnose(s))
    return {
      text: 'You have the evidence — open the Diagnose page and call it.',
      hints: [
        'Good subcooling into the drier, seventeen degrees lost across it and starved valves downstream.',
        'Open the Diagnose page.',
        'Pick the system, the component and the failure, then submit.'
      ]
    }

  if (!rec(s, 'pliq', 'before') || !rec(s, 'tliq', 'before'))
    return {
      text: 'Start with subcooling at the receiver: liquid pressure, then the liquid line temperature.',
      area: 'receiver',
      hints: [
        'Subcooling says whether this rack is actually short of refrigerant — two people have already assumed it is.',
        'Receiver → read the liquid pressure on the high side.',
        'Then read the liquid line temperature at the drier inlet. Saturation minus line temperature is subcooling.'
      ]
    }

  if (!rec(s, 'tdout', 'before'))
    return {
      text: 'Now take the line temperature on the outlet side of the drier.',
      area: 'drier',
      hints: [
        'A drier should show almost no drop across it. Any real drop is pressure being lost in the core.',
        'Go to the Liquid line drier.',
        'Read the outlet line temperature and compare it with the inlet.'
      ]
    }

  return {
    text: 'Take a superheat at a case: suction pressure at the rack, then the suction line at the case.',
    area: 'coil',
    hints: [
      'High superheat everywhere is what a restriction upstream looks like from the cases.',
      'Read the suction pressure at the rack on the low side.',
      'Then the suction line temperature at the case. Line temperature minus saturation is superheat.'
    ]
  }
}
