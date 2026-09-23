/** The Hussmann RL wiring sheet, transcribed from the case copy.
 *
 *  Source: "RL with INNOVATOR Doors Technical Data Sheet", Hussmann P/N
 *  0425644_P, pages 6 and 7 — "Fan and Heater Circuits - Electric Defrost
 *  (standard), Low Temperature" and "... - Gas Defrost (optional), Low
 *  Temperature". Terminal numbers, marker colours, parts-list item numbers and
 *  the sequence steps are as printed.
 *
 *  Read the two variants together, because they differ in exactly the place
 *  that matters. On ELECTRIC defrost the fan relay coil is 208 V and is fed
 *  from the defrost contactor, so the fans drop out when the heaters come on
 *  and are back the instant defrost terminates. On GAS defrost the fan relay
 *  coil is 120 V and is switched by the relay control thermostat along with
 *  the A.S. relay coil, so there the fans really are held out until the
 *  evaporator falls back to about 20 °F. Assuming the gas behaviour on an
 *  electric case is how you end up condemning a good motor.
 *
 *  Plain .ts rather than living inside the component so the node test runner —
 *  which transpiles .ts only — can load and check it. */

export type RlVariant = 'electric' | 'gas'

export const RL_SHEET = {
  part: 'P/N 0425644_P',
  title: 'RL with INNOVATOR Doors Technical Data Sheet',
  maker: 'Hussmann Corporation, Bridgeton, MO 63044-2483 U.S.A.'
} as const

export const RL_VARIANTS: Record<RlVariant, { label: string; heading: string }> = {
  electric: {
    label: 'Electric defrost (standard)',
    heading: 'Fan and Heater Circuits — Electric Defrost (standard), Low Temperature'
  },
  gas: {
    label: 'Gas defrost (optional)',
    heading: 'Fan and Heater Circuits — Gas Defrost (optional), Low Temperature'
  }
}

/** The legend box, as printed. Note the sheet's own inconsistency: the legend
 *  spells black BL, while every black wire in the drawing is marked BK. */
export const RL_WIRE_COLOURS: { code: string; name: string; hex: string }[] = [
  { code: 'R', name: 'Red', hex: '#dc2626' },
  { code: 'P', name: 'Purple', hex: '#7c3aed' },
  { code: '2P', name: 'Purple (2 bands)', hex: '#a78bfa' },
  { code: 'DB', name: 'Dark blue', hex: '#1d4ed8' },
  { code: 'BL', name: 'Black', hex: '#1e293b' },
  { code: 'LB', name: 'Light blue', hex: '#38bdf8' },
  { code: 'BR', name: 'Brown', hex: '#78350f' },
  { code: 'Y', name: 'Yellow', hex: '#ca8a04' },
  { code: 'OR', name: 'Orange', hex: '#ea580c' },
  { code: 'W', name: 'White', hex: '#e2e8f0' }
]

/** Markers actually used on the wires, including BK, which the legend calls
 *  BL. Kept separate so the legend can be shown exactly as printed. */
export const RL_MARKER_HEX: Record<string, string> = {
  R: '#dc2626',
  P: '#7c3aed',
  '2P': '#a78bfa',
  DB: '#1d4ed8',
  BL: '#1e293b',
  BK: '#1e293b',
  LB: '#38bdf8',
  BR: '#78350f',
  Y: '#ca8a04',
  OR: '#ea580c',
  W: '#e2e8f0',
  Pink: '#f472b6'
}

export const RL_LEGEND_NOTES: string[] = [
  'Circled numbers are parts-list item numbers.',
  'These are marker colours — the wire itself may vary. Read the marker at the terminal, not the colour of the jacket.',
  'The legend prints black as BL; every black wire in the drawing is marked BK. Same wire.'
]

export const RL_CAUTION =
  'CAUTION: when multiplexing merchandisers equipped with defrost heaters, if branch circuit overcurrent protection is larger than the individual merchandiser’s defrost circuit load, then additional supplemental overcurrent protection may be required per NEC Articles 210 and 240.'

export const RL_LIGHTING_NOTE =
  'Lighting is drawn only as far as the terminals — the sheet refers you to the Innovator door manual for the lamp diagrams, and to Innovator Reach-In Glass Door Installation and Service manual P/N 0425683 for door and frame replacement parts.'

/** Parts-list item numbers, the circled figures on the drawing. */
export const RL_PARTS: { item: number; label: string }[] = [
  { item: 1, label: 'Evaporator fans' },
  { item: 2, label: 'Defrost termination thermostat' },
  { item: 3, label: 'Refrigeration thermostat (optional)' },
  { item: 4, label: 'Defrost limit thermostat' },
  { item: 5, label: 'Relay control thermostat' },
  { item: 6, label: 'A.S. relay and coil' },
  { item: 7, label: 'Fan relay and coil' },
  { item: 8, label: 'Front and rear defrost heaters' },
  { item: 9, label: 'Rod heater (drain)' }
]

/** The raceway terminal strip along the bottom of the sheet. Marker and
 *  number are as printed; 9, 15, 18, 19 and 23 are not used. */
export interface RlTerminal {
  n: number
  marker: string
  group: 'defrost' | 'fansAs' | 'lights' | 'lightsN' | 'fansAsN'
}

export const RL_TERMINALS: RlTerminal[] = [
  { n: 1, marker: 'R', group: 'defrost' },
  { n: 2, marker: 'R', group: 'defrost' },
  { n: 3, marker: 'R', group: 'defrost' },
  { n: 4, marker: 'R', group: 'defrost' },
  { n: 5, marker: 'BK', group: 'defrost' },
  { n: 6, marker: 'BK', group: 'defrost' },
  { n: 7, marker: 'R', group: 'defrost' },
  { n: 8, marker: 'R', group: 'defrost' },
  { n: 10, marker: 'BK', group: 'fansAs' },
  { n: 11, marker: 'P', group: 'fansAs' },
  { n: 12, marker: '2P', group: 'fansAs' },
  { n: 13, marker: 'BK', group: 'fansAs' },
  { n: 14, marker: 'BK', group: 'fansAs' },
  { n: 16, marker: 'BK', group: 'fansAs' },
  { n: 17, marker: 'OR', group: 'lights' },
  { n: 20, marker: 'OR', group: 'lightsN' },
  { n: 21, marker: '2P', group: 'fansAsN' },
  { n: 22, marker: 'P', group: 'fansAsN' },
  { n: 24, marker: 'W', group: 'fansAsN' },
  { n: 25, marker: 'Y', group: 'fansAsN' },
  { n: 26, marker: 'BR', group: 'fansAsN' }
]

export const RL_TERMINAL_GROUPS: Record<RlTerminal['group'], string> = {
  defrost: 'Defrost heaters (208 V)',
  fansAs: 'Fans & A.S. (120 V)',
  lights: 'Lights (120 V)',
  lightsN: 'Lights (neutral)',
  fansAsN: 'Fans & A.S. (neutral)'
}

export const RL_JUMPER_NOTES: string[] = [
  'Heavy lines drawn inside the terminal blocks are permanent internal jumpers. They are already there and you do not add them.',
  'The jumpers drawn outside the blocks are removable external jumpers — those are the ones that come out when cases are multiplexed.',
  'Warning printed on the sheet: the terminal block is NOT for case-to-case wire connection.'
]

/** One rung of the drawing: a terminal or rail at each end, devices in series
 *  between them, and the marker on each wire segment. */
export interface RlRow {
  id: string
  variant: RlVariant[]
  section: '208' | '120' | 'lights' | 'field'
  /** Left end: a terminal number, or a rail caption. */
  left: { terminal?: number; rail?: string }
  right: { terminal?: number; rail?: string }
  /** Devices left to right. `item` is the circled parts-list number. */
  devices: {
    id: string
    item?: number
    label: string
    kind: 'coil' | 'heater' | 'fan' | 'contact' | 'stat' | 'switch' | 'ref'
    /** Contact or thermostat annotation exactly as the sheet marks it. */
    mark?: string
  }[]
  /** Marker colour on the wire either side of the devices. */
  markers: [string, string]
  /** The component whose energised state decides whether this whole rung is
   *  made — everything on a rung is in series, so one id speaks for it. */
  load?: string
}

export const RL_ROWS: RlRow[] = [
  // ── 208 V, electric defrost only ────────────────────────────────────────
  {
    id: 'fanrelaycoil-208',
    load: 'fanrelay',
    variant: ['electric'],
    section: '208',
    left: { terminal: 1 },
    right: { terminal: 4 },
    devices: [{ id: 'fanrelay', item: 7, label: 'Evaporator Fan Relay Coil', kind: 'coil' }],
    markers: ['R', 'R']
  },
  {
    id: 'rearheater',
    load: 'heaters',
    variant: ['electric'],
    section: '208',
    left: { terminal: 2 },
    right: { terminal: 8 },
    devices: [{ id: 'heaters', item: 8, label: 'Rear Defrost Heater', kind: 'heater' }],
    markers: ['R', 'R']
  },
  {
    id: 'frontheater',
    load: 'heaters',
    variant: ['electric'],
    section: '208',
    left: { terminal: 3 },
    right: { terminal: 7 },
    devices: [{ id: 'heaters', item: 8, label: 'Front Defrost Heater', kind: 'heater' }],
    markers: ['R', 'R']
  },
  {
    id: 'defrostlimit-208',
    load: 'heaters',
    variant: ['electric'],
    section: '208',
    left: { terminal: 6 },
    right: { terminal: 5 },
    devices: [{ id: 'dlt', item: 4, label: 'Defrost Limit', kind: 'stat', mark: 'N.C. / O.O.R.' }],
    markers: ['BK', 'BK']
  },

  // ── 120 V ───────────────────────────────────────────────────────────────
  {
    id: 'fans',
    load: 'fans',
    variant: ['electric', 'gas'],
    section: '120',
    left: { terminal: 14 },
    right: { terminal: 26 },
    devices: [
      { id: 'fanrelay', item: 7, label: 'Fan Relay F', kind: 'contact', mark: 'N.C.' },
      { id: 'fans', item: 1, label: 'Evaporator Fans', kind: 'fan' }
    ],
    markers: ['BK', 'BR']
  },
  {
    id: 'pan',
    load: 'pan',
    variant: ['electric'],
    section: '120',
    left: { terminal: 14 },
    right: { terminal: 25 },
    devices: [
      { id: 'fanrelay', item: 7, label: 'Fan Relay F', kind: 'contact', mark: 'N.O.' },
      { id: 'pan', item: 9, label: 'Rod Heater (Drain)', kind: 'heater' }
    ],
    markers: ['Y', 'Y']
  },
  {
    id: 'pan-gas',
    load: 'pan',
    variant: ['gas'],
    section: '120',
    left: { terminal: 14 },
    right: { terminal: 25 },
    devices: [
      { id: 'fanrelay', item: 7, label: 'Fan Relay F', kind: 'contact', mark: 'N.O.' },
      { id: 'dlt', item: 4, label: 'Defrost Limit', kind: 'stat', mark: 'O.O.R.' },
      { id: 'pan', item: 9, label: 'Rod Heater (Drain)', kind: 'heater' }
    ],
    markers: ['Y', 'Y']
  },
  {
    id: 'coils',
    load: 'asrelay',
    variant: ['electric'],
    section: '120',
    left: { terminal: 16 },
    right: { terminal: 24 },
    devices: [
      { id: 'rct', item: 5, label: 'Relay Control', kind: 'stat', mark: 'C.O.R.' },
      { id: 'asrelay', item: 6, label: 'A.S. Relay Coil', kind: 'coil' }
    ],
    markers: ['BK', 'W']
  },
  {
    id: 'coils-gas',
    load: 'asrelay',
    variant: ['gas'],
    section: '120',
    left: { terminal: 16 },
    right: { terminal: 24 },
    devices: [
      { id: 'rct', item: 5, label: 'Relay Control', kind: 'stat', mark: 'C.O.R.' },
      { id: 'asrelay', item: 6, label: 'A.S. Relay Coil', kind: 'coil' },
      { id: 'fanrelay', item: 7, label: 'Fan Relay Coil', kind: 'coil' }
    ],
    markers: ['BK', 'W']
  },
  {
    id: 'ascontact',
    load: 'doorash',
    variant: ['electric', 'gas'],
    section: '120',
    left: { terminal: 13 },
    right: { terminal: 10 },
    devices: [{ id: 'asrelay', item: 6, label: 'A.S. Relay A.S.', kind: 'contact', mark: 'COM / N.C.' }],
    markers: ['BK', 'BK']
  },
  {
    id: 'frameash',
    load: 'frameash',
    variant: ['electric', 'gas'],
    section: '120',
    left: { terminal: 11 },
    right: { terminal: 22 },
    devices: [{ id: 'frameash', label: 'Frame A.S. Heaters', kind: 'heater' }],
    markers: ['P', 'P']
  },
  {
    id: 'doorash',
    load: 'doorash',
    variant: ['electric', 'gas'],
    section: '120',
    left: { terminal: 12 },
    right: { terminal: 21 },
    devices: [{ id: 'doorash', label: 'Door A.S. Heaters', kind: 'heater' }],
    markers: ['2P', '2P']
  },

  // ── Lights, on their own supply ─────────────────────────────────────────
  {
    id: 'lights',
    load: 'lights',
    variant: ['electric', 'gas'],
    section: 'lights',
    left: { terminal: 17 },
    right: { terminal: 20 },
    devices: [
      { id: 'lights', label: 'Switch', kind: 'switch' },
      { id: 'lights', label: 'Refer to Innovator Door Manual for Lighting Diagrams', kind: 'ref' }
    ],
    markers: ['OR', 'OR']
  },

  // ── Field wired ─────────────────────────────────────────────────────────
  {
    id: 'dtt',
    load: 'dtt',
    variant: ['electric'],
    section: 'field',
    left: { rail: 'Field wired' },
    right: { rail: 'To defrost contactor' },
    devices: [
      { id: 'dtt', item: 2, label: 'Defrost Termination Thermostat', kind: 'stat', mark: 'C.O.R.' }
    ],
    markers: ['DB', 'DB']
  },
  {
    id: 'refrigstat',
    load: 'refrigstat',
    variant: ['electric', 'gas'],
    section: 'field',
    left: { rail: 'Case' },
    right: { rail: 'To condensing unit' },
    devices: [
      { id: 'refrigstat', item: 3, label: 'Refrigeration Thermostat (Optional)', kind: 'stat' }
    ],
    markers: ['Pink', 'DB']
  }
]

export interface RlComponent {
  id: string
  label: string
  item?: number
  where: string
  does: string
  fails: string
  part?: string
  /** Terminals it lands on, as numbered on the sheet. */
  terminals?: number[]
}

export const RL_COMPONENTS: RlComponent[] = [
  {
    id: 'fans',
    label: 'Evaporator fans',
    item: 1,
    where:
      'Low in the case — the coil and its fans sit under the bottom shelf, behind the discharge air grille. Clearing that bottom shelf is all the access you need, and each fan is on its own plug.',
    does:
      'Fed from terminal 14 through the fan relay’s N.C. contact, out on brown to terminal 26. Nothing else is in that path, so if the relay contact is made the fan has power.',
    fails:
      'Motor open — power at the plug, nothing turning. Because each fan is plugged, you can unplug one and read its plug without disturbing the rest of the bank.',
    part: '0047000 standard 12 W assembly / 0477655 energy-efficient 12 W assembly; blade FB.4780446; plug clamp 0540330',
    terminals: [14, 26]
  },
  {
    id: 'fanrelay',
    label: 'Fan relay and coil',
    item: 7,
    where: 'Raceway, at the control end of the case.',
    does:
      'The relay that actually decides whether the fans run. Its N.C. contact feeds the fans; its N.O. contact feeds the drain rod heater. On electric defrost the coil is 208 V across terminals 1 and 4, fed from the defrost contactor. On gas defrost the coil is 120 V on terminal 24 with the A.S. relay coil.',
    fails:
      'Contacts welded and the fans run right through defrost, blowing the melt down the case. Coil open and they never drop out.',
    terminals: [1, 4, 14, 24, 25, 26]
  },
  {
    id: 'asrelay',
    label: 'A.S. relay and coil',
    item: 6,
    where: 'Raceway, beside the fan relay.',
    does:
      '120 V coil on terminal 24, switched by the relay control thermostat. Its COM / N.C. contact carries terminal 13 through to terminal 10, which is the supply for the frame and door anti-sweat heaters. On electric defrost that is ALL it does — it does not touch the fans.',
    fails:
      'Stuck energised and the frames and doors sweat, because their heaters stay out. Contacts burnt and the same, with the coil still clicking.',
    terminals: [10, 13, 16, 24]
  },
  {
    id: 'rct',
    label: 'Relay control thermostat',
    item: 5,
    where: 'Bulb on the evaporator, body in the raceway.',
    does:
      'Closes on rise (C.O.R.) at about 35 °F and opens at about 20 °F on the way back down. It switches the A.S. relay coil — and on gas defrost the fan relay coil with it, which is why the two variants behave differently.',
    fails:
      'Stuck closed and the anti-sweat heaters stay out, so frames sweat. On a gas case, stuck closed also keeps the fans out.',
    terminals: [16, 24]
  },
  {
    id: 'dlt',
    label: 'Defrost limit thermostat',
    item: 4,
    where: 'On the coil.',
    does:
      'Opens on rise (O.O.R.) if internal air goes above 90 °F. On electric defrost it is N.C. in the 208 V circuit between terminals 6 and 5. On gas defrost it sits in the 120 V drain-heater leg instead.',
    fails:
      'Open and cold: no defrost at all, and the coil ices over across a few days. Welded closed and nothing limits a runaway defrost.',
    terminals: [5, 6]
  },
  {
    id: 'dtt',
    label: 'Defrost termination thermostat',
    item: 2,
    where: 'On the coil. Field wired, on dark blue.',
    does:
      'Closes on rise and ends the defrost period. It talks to the defrost contactor, not to a case load — when defrost ends, the contactor drops the defrost heaters and the 208 V fan relay coil together.',
    fails:
      'Failed open and defrost ends within seconds of starting — the coil never melts. Stuck closed and every defrost runs to the fail-safe.',
    terminals: []
  },
  {
    id: 'heaters',
    label: 'Front and rear defrost heaters',
    item: 8,
    where: 'In the coil, front and rear elements.',
    does: 'Melt the coil on 208 V. Rear element runs terminal 2 to 8, front element terminal 3 to 7, both on red.',
    fails:
      'One element open and the clamp reads about half of nameplate — the coil half-clears and ices a little more each day.',
    terminals: [2, 3, 7, 8]
  },
  {
    id: 'pan',
    label: 'Rod heater (drain)',
    item: 9,
    where: 'In the drain, under the pan.',
    does:
      'Sits on the fan relay’s N.O. contact, on yellow to terminal 25 — so it is energised exactly while the fans are out, and goes off when they come back.',
    fails: 'Open and the drain freezes, which shows up as water on the floor once the ice bridges.',
    terminals: [14, 25]
  },
  {
    id: 'doorash',
    label: 'Door anti-sweat heaters',
    where: 'In the door glass and perimeter.',
    does: 'Terminal 12 to terminal 21 on 2P, fed through the A.S. relay contact from terminal 10.',
    fails: 'Open and the door fogs or frosts; the customer calls it a bad door before anyone clamps it.',
    terminals: [12, 21]
  },
  {
    id: 'frameash',
    label: 'Frame anti-sweat heaters',
    where: 'In the mullions and the case frame around each door.',
    does: 'Terminal 11 to terminal 22 on purple, same relay contact as the door heaters.',
    fails:
      'Open and you get sweat or ice on the mullion while the glass stays clear — which tells you which heater it is.',
    terminals: [11, 22]
  },
  {
    id: 'lights',
    label: 'Case lighting',
    where: 'Mullions and door frames; the supply and switch in the raceway.',
    does:
      'Its own circuit on orange, terminal 17 through the switch to terminal 20. The sheet stops there and sends you to the Innovator door manual for the lamp diagrams.',
    fails: 'One dead supply takes out a run of doors at once, which is how you tell it from a single failed lamp.',
    part: 'LED power supply EP.4481668',
    terminals: [17, 20]
  },
  {
    id: 'refrigstat',
    label: 'Refrigeration thermostat (optional)',
    item: 3,
    where: 'Case, wired out to the condensing unit on pink and dark blue.',
    does: 'Optional case thermostat that calls the condensing unit. Not fitted on every case.',
    fails: 'Out of calibration and the case runs long or short; check it before you chase the rack.',
    terminals: []
  },
  {
    id: 'contactor',
    label: 'Defrost contactor',
    where: 'Not in the case — in the rack or defrost panel.',
    does:
      'Starts and ends defrost. Closing it energises the 208 V defrost heaters and the evaporator fan relay coil at the same time.',
    fails: 'Welded and the heaters run during refrigeration. Heater current with no defrost commanded is the giveaway.',
    terminals: []
  },
  {
    id: 'tb',
    label: 'Terminal blocks in raceway',
    where: 'Raceway above the coil, behind the removable electrical cover.',
    does:
      'Where both field circuits land. Grouped defrost heaters (208 V) on 1–8, fans and A.S. (120 V) on 10–16, lights on 17 and 20, and the neutrals on 21–26.',
    fails:
      'Rarely fails on its own, but a loose landing here browns a terminal and drops one load — usually the one furthest down the jumper.',
    terminals: []
  }
]

/** The sequences printed under each drawing. Faithful to the sheet, including
 *  the step that people get wrong. */
export interface RlSequenceStep {
  n: number
  title: string
  body: string
  /** Energised or made at this point. A device that has just OPENED is not
   *  here — it is the `actor` instead. */
  live: string[]
  actor?: string
  fans: 'running' | 'off'
}

export const RL_SEQUENCES: Record<RlVariant, RlSequenceStep[]> = {
  electric: [
    {
      n: 1,
      title: 'Refrigerating',
      body:
        'Defrost contactor open, so the 208 V fan relay coil is dead and the fan relay sits on its N.C. contact. Fans run. Coil below 20 °F, so the relay control thermostat is open, the A.S. relay coil is dead, and its N.C. contact is carrying the frame and door heaters.',
      live: ['fans', 'doorash', 'frameash', 'lights', 'tb'],
      fans: 'running'
    },
    {
      n: 2,
      title: 'Defrost starts',
      body:
        'Power from the defrost contactor energises the defrost heaters and the 208 V evaporator fan relay coil. The relay contacts open the fan circuit and energise the drain pan heater. Heaters on, fans out, drain warm — all from the one coil.',
      live: ['contactor', 'heaters', 'fanrelay', 'pan', 'doorash', 'frameash', 'lights'],
      actor: 'contactor',
      fans: 'off'
    },
    {
      n: 3,
      title: 'Limit, if it comes to that',
      body:
        'If the defrost heater raises internal air temperature above 90 °F, the defrost limit thermostat opens. That is protection, not the normal way a defrost ends — if it is doing the terminating, find out why.',
      live: ['contactor', 'fanrelay', 'pan', 'doorash', 'frameash', 'lights'],
      actor: 'dlt',
      fans: 'off'
    },
    {
      n: 4,
      title: 'Coil warms past 35 °F',
      body:
        'Temperature rise of the evaporator closes the relay control thermostat at about 35 °F, energising the 120 V A.S. relay coil. This relay’s contacts open the frame and door heater circuits. Note what it does NOT touch: the fans.',
      live: ['contactor', 'heaters', 'fanrelay', 'pan', 'asrelay', 'rct', 'lights'],
      actor: 'rct',
      fans: 'off'
    },
    {
      n: 5,
      title: 'Termination — and the fans come straight back',
      body:
        'When the defrost termination thermostat ends the defrost period, the defrost contactor opens the defrost heater and evaporator fan relay coil circuits. The drain pan heater goes off and the fans are on. There is no fan delay on an electric case — the fans return the moment the contactor drops.',
      live: ['fans', 'asrelay', 'rct', 'lights', 'tb'],
      actor: 'dtt',
      fans: 'running'
    },
    {
      n: 6,
      title: 'Coil falls back to 20 °F',
      body:
        'Temperature fall of the evaporator opens the relay control thermostat at about 20 °F, de-energising the 120 V A.S. relay coil. Its contacts close the frame and door heater circuits. The fans have been running since the previous step; this one only puts the anti-sweat heaters back.',
      live: ['fans', 'doorash', 'frameash', 'lights', 'tb'],
      actor: 'rct',
      fans: 'running'
    }
  ],
  gas: [
    {
      n: 1,
      title: 'Refrigerating',
      body:
        'Coil below 20 °F, relay control thermostat open, so both the A.S. relay coil and the fan relay coil are dead. Fans run on the fan relay N.C. contact, frame and door heaters run on the A.S. relay N.C. contact.',
      live: ['fans', 'doorash', 'frameash', 'lights', 'tb'],
      fans: 'running'
    },
    {
      n: 2,
      title: 'Defrost vapor enters, coil passes 35 °F',
      body:
        'Defrost vapor entering the evaporator causes a rise in temperature. At about 35 °F the control relay thermostat closes the fan relay coil and control relay coil circuit. The coils open the fan, door heater and frame heater circuits, while energising the drain pan heater.',
      live: ['rct', 'asrelay', 'fanrelay', 'pan', 'lights'],
      actor: 'rct',
      fans: 'off'
    },
    {
      n: 3,
      title: 'Limit, if it comes to that',
      body:
        'If the drain pan heater raises internal air temperature above 90 °F, the heater limit thermostat opens. On this variant the limit sits in the 120 V drain-heater leg rather than in a 208 V heater circuit.',
      live: ['rct', 'asrelay', 'fanrelay', 'lights'],
      actor: 'dlt',
      fans: 'off'
    },
    {
      n: 4,
      title: 'Timer ends defrost — but the fans stay out',
      body:
        'When the defrost timer ends a defrost period, the evaporator temperature starts to fall. Nothing changes electrically yet: the control relay thermostat is still made, so both coils are still energised and the fans are still held out.',
      live: ['rct', 'asrelay', 'fanrelay', 'pan', 'lights'],
      fans: 'off'
    },
    {
      n: 5,
      title: 'Coil falls to 20 °F — fans and heaters return together',
      body:
        'At about 20 °F the control relay thermostat opens, de-energising the control relay coil and fan relay coil. Control and fan relays open the drain pan heater circuit, and close the fan, door heater and frame heater circuits. THIS is the fan delay — and it only exists on the gas variant.',
      live: ['fans', 'doorash', 'frameash', 'lights', 'tb'],
      actor: 'rct',
      fans: 'running'
    }
  ]
}

/** Published per-case electrical data, 120 V 60 Hz except where noted. The
 *  per-fan column is this table divided by the door count, which is how you
 *  turn a nameplate into something you can check against a clamp. */
export interface RlLoadRow {
  load: string
  unit: string
  volts: 120 | 208
  /** Indexed by door count: 2, 3, 4, 5. */
  amps: [number, number, number, number]
  watts: [number, number, number, number]
  note?: string
}

export const RL_LOADS: RlLoadRow[] = [
  {
    load: 'Evaporator fan motors — standard',
    unit: 'A',
    volts: 120,
    amps: [1.3, 1.95, 2.6, 3.25],
    watts: [100, 150, 200, 250],
    note: 'Shaded-pole assemblies. Works out at 0.65 A a fan.'
  },
  {
    load: 'Evaporator fan motors — energy efficient',
    unit: 'A',
    volts: 120,
    amps: [0.6, 0.9, 1.2, 1.5],
    watts: [36, 54, 72, 90],
    note: 'The 12 W energy-efficient assembly. Works out at 0.30 A a fan — so one dead fan on a five-door case reads 1.20 A instead of 1.50 A.'
  },
  {
    load: 'Door anti-sweat heaters — INNOVATOR III',
    unit: 'A',
    volts: 120,
    amps: [0.9, 1.3, 1.7, 2.2],
    watts: [104, 156, 208, 260],
    note: 'Terminal 12 to 21, switched by the A.S. relay.'
  },
  {
    load: 'Drain pan heater',
    unit: 'A',
    volts: 120,
    amps: [0.63, 1.25, 2.0, 2.57],
    watts: [75, 150, 240, 300],
    note: 'Runs while the fans are out, on the fan relay N.O. contact.'
  },
  {
    load: 'Electric defrost heaters',
    unit: 'A',
    volts: 208,
    amps: [6.72, 10.08, 13.46, 16.82],
    watts: [1400, 2100, 2800, 3500],
    note: 'Front and rear elements together. Half of this on the clamp means one element is open.'
  }
]

/** How far the blade of a contact symbol is lifted off its pads, in SVG
 *  units. Zero means drawn closed.
 *
 *  A rung with power through it is a series path, so every contact on it is
 *  necessarily made. Drawing one open on a live rung reads as "this load is
 *  off" to anyone who reads a ladder — which is what the diagram had been
 *  doing on the fans rung while the text beside it said the fans were
 *  running. The symbol has to agree with the rung. */
export const contactBladeLift = (made: boolean): number => (made ? 0 : 5)

export const RL_DOOR_COUNTS = [2, 3, 4, 5] as const

/** Per-fan draw on the energy-efficient assembly, derived from the table
 *  above: 90 W over five doors at 120 V. Used by the fan call so the number a
 *  tech clamps in the game is the number the data sheet would give them. */
export const RL_FAN_AMPS_EE = 0.3
