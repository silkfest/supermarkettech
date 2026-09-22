/** The Hussmann RL reach-in wiring diagram, as data.
 *
 *  The RL is the frozen-food door case most of these stores actually have, and
 *  its data sheet carries the one diagram a tech ends up reading over and over:
 *  two supply circuits, four thermostats, two relays, and a defrost sequence
 *  that explains most of the "fans won't run" calls that aren't a dead motor.
 *
 *  Figures and part numbers come from Hussmann's published RL technical data
 *  sheets (0425644 / 0510175 "RL with INNOVATOR Doors", the LifeLine Premier
 *  RL sheet 0520875, and the RLNI-W sheet). Where a number is a per-fan or
 *  per-door figure it is derived by dividing the published per-case row by the
 *  door count, and says so, rather than being presented as printed.
 *
 *  Plain .ts rather than living inside the component so the node test runner —
 *  which transpiles .ts only — can load and check it. */

export interface RlComponent {
  id: string
  label: string
  /** Which of the two case circuits it sits on. */
  circuit: 'c120' | 'c208'
  /** Where it physically is, for the tech who has to go find it. */
  where: string
  /** What it does on the diagram. */
  does: string
  /** How it fails, and what that looks like on a call. */
  fails: string
  /** Published part number, where the parts list gives one. */
  part?: string
  /** Marker colour codes on the wires landing on it. */
  wires?: string[]
}

export const RL_CIRCUITS = {
  c120: {
    id: 'c120',
    label: '120 V case circuit',
    colour: '#2563eb',
    carries:
      'Fans, door lamps, door and frame anti-sweat heaters, the drain pan / bottom / plenum heaters, and the coils of both control relays.'
  },
  c208: {
    id: 'c208',
    label: '208 V defrost circuit',
    colour: '#dc2626',
    carries:
      'The front and rear electric defrost heaters, fed from the defrost contactor, plus the 208 V evaporator fan relay coil that rides along with them.'
  }
} as const

/** The diagram is drawn PER SIDE. An island case needs two of everything and
 *  two circuits per side — the single most common misread of this sheet. */
export const RL_DIAGRAM_NOTES: string[] = [
  'The wiring diagram is drawn per side. Two circuits are required per case, and an island case needs a set per side.',
  'Warning printed on the sheet: the terminal block is NOT for case-to-case wire connection. Daisy-chaining cases through it is a callback waiting to happen.',
  'Heavy lines drawn inside the terminal blocks are permanent internal jumpers, not field wiring. They are already there and you do not add them.',
  'Options fitted at the factory may carry additional or replacement wiring diagrams. The sheet in the case wins over the one you remember.'
]

/** Marker colours on the sheet. The note matters: these are the markers, not
 *  necessarily the insulation colour, so trace the marker and not the jacket. */
export const RL_WIRE_COLOURS: { code: string; name: string; hex: string }[] = [
  { code: 'BK', name: 'Black', hex: '#1e293b' },
  { code: 'W', name: 'White', hex: '#e2e8f0' },
  { code: 'R', name: 'Red', hex: '#dc2626' },
  { code: 'OR', name: 'Orange', hex: '#ea580c' },
  { code: 'Y', name: 'Yellow', hex: '#ca8a04' },
  { code: 'BR', name: 'Brown', hex: '#78350f' },
  { code: 'LB', name: 'Light blue', hex: '#38bdf8' },
  { code: 'DB', name: 'Dark blue', hex: '#1d4ed8' },
  { code: 'P', name: 'Purple', hex: '#7c3aed' },
  { code: '2P', name: 'Purple, two bands', hex: '#a78bfa' }
]

export const RL_WIRE_COLOUR_NOTE =
  'The sheet calls these marker colours and adds that the wire itself may vary. Read the marker at the terminal, not the colour of the jacket halfway down the raceway.'

export const RL_COMPONENTS: RlComponent[] = [
  {
    id: 'tb',
    label: 'Terminal block',
    circuit: 'c120',
    where: 'Raceway above the coil, behind the removable electrical cover.',
    does: 'Where both field circuits land and where every case load is picked up. Internal jumpers are drawn as heavy lines.',
    fails:
      'Rarely fails on its own, but a loose landing here browns a terminal and drops one load — usually the one furthest down the jumper.',
    wires: ['BK', 'W', 'R']
  },
  {
    id: 'fans',
    label: 'Evaporator fan assemblies',
    circuit: 'c120',
    where: 'Behind the discharge air grille, above the top shelf. Each fan is on its own plug.',
    does: 'Pull case air across the coil. They run only when the fan relay contacts and the anti-sweat relay contacts are both closed.',
    fails:
      'Motor open — power at the plug, nothing turning. Because each fan is plugged, you can unplug one and read its plug without disturbing the rest of the bank.',
    part: '0047000 standard 12 W assembly / 0477655 energy-efficient 12 W assembly; blade FB.4780446; plug clamp 0540330',
    wires: ['BK', 'W']
  },
  {
    id: 'fanrelay',
    label: 'Fan control relay',
    circuit: 'c208',
    where: 'Control panel end of the raceway.',
    does: 'Its coil is 208 V and is fed from the defrost contactor, so it picks up whenever defrost is energised and drops the fans out for the duration.',
    fails:
      'Contacts welded and the fans run right through defrost, blowing the melt down the case. Coil open and the fans never drop out.',
    wires: ['R', 'OR']
  },
  {
    id: 'asrelay',
    label: 'Anti-sweat control relay',
    circuit: 'c120',
    where: 'Control panel end of the raceway, beside the fan relay.',
    does: 'A 120 V coil switched by the relay control thermostat. Energised, it opens the fan, door-heater and frame-heater circuits and energises the drain pan, bottom and plenum heaters. De-energised, that swaps back.',
    fails:
      'Stuck energised and the fans never come back after a defrost — the classic "no voltage at the fan motors and the coil is already cold".',
    wires: ['P', '2P']
  },
  {
    id: 'rct',
    label: 'Relay control thermostat',
    circuit: 'c120',
    where: 'Bulb clipped to the evaporator, body in the raceway. Also called the fan and anti-sweat heater thermostat.',
    does: 'The temperature switch driving both relay coils. It energises the 120 V anti-sweat relay coil at about 35 °F on the way up, and opens at about 20 °F on the way back down.',
    fails:
      'Stuck closed and the fans stay off after defrost. Stuck open and the anti-sweat heaters never get their defrost-time boost, so the frames sweat.',
    wires: ['DB', 'LB']
  },
  {
    id: 'dlt',
    label: 'Defrost limit thermostat',
    circuit: 'c208',
    where: 'On the coil, in the defrost heater circuit.',
    does: 'Opens if the defrost heaters drive the internal air above 90 °F. It is a limit, not the way defrost is meant to end.',
    fails:
      'Open and cold: no defrost at all, and the coil ices over across a few days. Welded closed: nothing stops a runaway defrost but the termination stat.',
    wires: ['R', 'BR']
  },
  {
    id: 'dtt',
    label: 'Defrost termination thermostat',
    circuit: 'c208',
    where: 'On the coil, usually the last section to clear.',
    does: 'Ends the defrost period. When it opens, the defrost contactor drops out the defrost heaters and the 208 V fan relay coil together.',
    fails:
      'Failed open and defrost ends within seconds of starting — the coil never melts. Stuck closed and every defrost runs to the fail-safe.',
    wires: ['R', 'Y']
  },
  {
    id: 'heaters',
    label: 'Electric defrost heaters, front and rear',
    circuit: 'c208',
    where: 'In the coil, front and rear elements.',
    does: 'Melt the coil during defrost. Fed from the defrost contactor on the 208 V circuit.',
    fails:
      'One element open and the clamp reads about half of nameplate — the coil half-clears and ices a little more each day.',
    wires: ['R', 'BK']
  },
  {
    id: 'pan',
    label: 'Drain pan, bottom and plenum heaters',
    circuit: 'c120',
    where: 'Under the pan and along the case bottom.',
    does: 'Energised by the anti-sweat relay while the relay control thermostat is made — that is, during and just after defrost, when there is water to carry away.',
    fails: 'Open and the drain freezes, which shows up as water on the floor once the ice bridges.',
    wires: ['OR', 'W']
  },
  {
    id: 'doorash',
    label: 'Door anti-sweat heaters',
    circuit: 'c120',
    where: 'In the door glass and perimeter.',
    does: 'Keep the glass clear. On the RL these sit on the fan circuit, switched by the anti-sweat relay contacts.',
    fails: 'Open and the door fogs or frosts; the customer calls it a bad door before anyone clamps it.',
    wires: ['P', 'W']
  },
  {
    id: 'frameash',
    label: 'Frame anti-sweat heaters',
    circuit: 'c120',
    where: 'In the mullions and the case frame around each door.',
    does: 'Keep the frames above dew point. Same relay contacts as the door heaters.',
    fails: 'Open and you get sweat or ice on the mullion while the glass stays clear — which tells you which heater it is.',
    wires: ['2P', 'W']
  },
  {
    id: 'lights',
    label: 'Door lamps and LED power supply',
    circuit: 'c120',
    where: 'Mullions and door frames; the supply sits in the raceway.',
    does: 'Case lighting. Later RL cases use an LED power supply feeding the door lamps rather than a ballast and fluorescent lamps.',
    fails:
      'One dead supply takes out a run of doors at once, which is how you tell it from a single failed lamp.',
    part: 'LED power supply EP.4481668',
    wires: ['BK', 'W']
  },
  {
    id: 'contactor',
    label: 'Defrost contactor',
    circuit: 'c208',
    where: 'Not in the case — in the rack or defrost panel.',
    does: 'Starts and ends defrost. Closing it energises the defrost heaters and the 208 V fan relay coil at the same time.',
    fails:
      'Welded and the heaters run during refrigeration. Heater current with no defrost commanded is the giveaway.',
    wires: ['R']
  }
]

/** The sequence the diagram encodes. Every threshold here is printed on the
 *  sheet; they are what make the difference between a dead fan motor and a
 *  case that is simply still in its fan delay. */
export interface RlSequenceStep {
  n: number
  title: string
  body: string
  /** Components energised or made at this point in the cycle. Strictly
   *  "has power through it" — a thermostat that has just OPENED does not
   *  belong here, or the diagram would draw it closed at the very step the
   *  text says it let go. */
  live: string[]
  /** The one component doing the switching at this step. It is marked
   *  separately from `live` precisely because the actor is usually the thing
   *  that just opened. */
  actor?: string
  /** What the fans are doing, because that is what you are usually there for. */
  fans: 'running' | 'off'
}

export const RL_SEQUENCE: RlSequenceStep[] = [
  {
    n: 1,
    title: 'Refrigerating',
    body:
      'Coil below 20 °F, so the relay control thermostat is open and both relay coils are de-energised. Their contacts sit closed on the fan, door heater and frame heater circuits, and open on the drain pan heater. Fans run, glass stays clear, nothing is being melted.',
    live: ['fans', 'doorash', 'frameash', 'lights', 'tb'],
    fans: 'running'
  },
  {
    n: 2,
    title: 'Defrost starts',
    body:
      'The defrost contactor closes. Power from it energises the front and rear defrost heaters and the 208 V evaporator fan relay coil together — so the heaters coming on is also what takes the fans out.',
    live: ['contactor', 'heaters', 'fanrelay', 'dlt', 'dtt', 'lights'],
    actor: 'contactor',
    fans: 'off'
  },
  {
    n: 3,
    title: 'Coil warms past 35 °F',
    body:
      'The relay control thermostat energises the 120 V anti-sweat relay coil at about 35 °F. Its contacts open the fan, door heater and frame heater circuits and energise the drain pan, bottom and plenum heaters — heat where the melt water has to go.',
    live: ['contactor', 'heaters', 'fanrelay', 'asrelay', 'rct', 'pan', 'lights'],
    actor: 'rct',
    fans: 'off'
  },
  {
    n: 4,
    title: 'Limit, if it comes to that',
    body:
      'If the heaters drive internal air above 90 °F the defrost limit thermostat opens and takes the heaters out. This is protection, not the normal way a defrost ends — if it is doing the terminating, find out why.',
    live: ['contactor', 'fanrelay', 'asrelay', 'pan', 'lights'],
    actor: 'dlt',
    fans: 'off'
  },
  {
    n: 5,
    title: 'Termination',
    body:
      'The defrost termination thermostat opens and the defrost contactor drops out both the defrost heaters and the 208 V fan relay coil. The heat stops. The fans still do not run, because the anti-sweat relay is holding them out.',
    live: ['asrelay', 'pan', 'lights'],
    actor: 'dtt',
    fans: 'off'
  },
  {
    n: 6,
    title: 'Fan delay, then back to refrigeration',
    body:
      'The coil pulls back down. At about 20 °F the relay control thermostat opens, de-energising the anti-sweat relay coil. Its contacts open the drain pan heater circuit and close the fan, door heater and frame heater circuits. The fans restart. Between step 5 and here, no voltage at a fan motor is correct — not a fault.',
    live: ['fans', 'doorash', 'frameash', 'lights', 'tb'],
    actor: 'rct',
    fans: 'running'
  }
]

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
    note: 'On the fan circuit, switched by the anti-sweat relay.'
  },
  {
    load: 'Drain pan heater',
    unit: 'A',
    volts: 120,
    amps: [0.63, 1.25, 2.0, 2.57],
    watts: [75, 150, 240, 300]
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

export const RL_DOOR_COUNTS = [2, 3, 4, 5] as const

/** Per-fan draw on the energy-efficient assembly, derived from the table
 *  above: 90 W over five doors at 120 V. Used by the fan call so the number a
 *  tech clamps in the game is the number the data sheet would give them. */
export const RL_FAN_AMPS_EE = 0.3

export const RL_SOURCES: { label: string; doc: string }[] = [
  { label: 'RL with INNOVATOR Doors — technical data sheet', doc: 'Hussmann P/N 0425644' },
  { label: 'RL with INNOVATOR / INNOVATOR III Doors — technical data sheet', doc: 'Hussmann P/N 0510175' },
  { label: 'LifeLine Premier RL — technical data sheet, wiring diagrams', doc: 'Hussmann P/N 0520875' },
  { label: 'RLNI-W with INNOVATOR Doors — electrical data', doc: 'Hussmann P/N 3086860' },
  { label: 'Impact reach-in installation, operation and service manual', doc: 'Hussmann P/N 0387183' }
]
