/** Educational 120 / 208 V DOL circuit. Oil relay terminals use functional names:
 * the supplied INT280 is a 230 V variant, fed from a separate 230 V supply.
 * Faults are settled diagnostic snapshots, not simulated device trip timers.
 */
export const BITZER_FAULTS = [
  { id: 'none', name: 'Normal operation', detail: 'The motor protector and both oil safety contacts permit the contactor to energize.' },
  { id: 'fuse', name: 'Control fuse open', detail: 'L1 has full control voltage to the return, but FU-out and the SE-B3 supply have lost their feed. Find the cause before replacing a fuse.' },
  { id: 'hp', name: 'High-pressure cutout open', detail: 'The HP switch interrupts the call while the motor protector remains powered. Investigate the pressure event.' },
  { id: 'mp-power', name: 'SE-B3 supply wire open', detail: 'The safety chain still feeds terminal 11, but the module supply measures 0 V. Loss of module power releases the relay: 11–14 opens and 11–12 closes.' },
  { id: 'ptc-hot', name: 'Motor PTC above trip resistance', detail: 'The isolated PTC loop measures 6,000 Ω in this exercise. SE-B3 transfers from 11–14 to 11–12. Investigate overheating; cooling and the specified reset are required.' },
  { id: 'ptc-open', name: 'Motor PTC lead open', detail: 'An open PTC circuit trips the protector too. Isolate and measure M1–M2: OL distinguishes this exercise from the high but finite hot-PTC resistance.' },
  { id: 'oil-trip', name: 'Lubrication safety tripped', detail: 'The Delta-PII or OLC-K1 safety relay is open after its fault delay. Delta-PII checks differential oil pressure; OLC-K1 checks oil presence at the bearing. Check lubrication before resetting.' },
  { id: 'oil-power', name: 'Lubrication monitor supply open', detail: 'The oil monitor supply is absent and its healthy-run contact is open. Verify supply separately from the relay contact.' },
  { id: 'reg-trip', name: 'INT280 oil refill failed / alarm', detail: 'The regulator could not restore oil level and its alarm contact stopped the compressor. Check oil reservoir supply, available differential pressure and the feed path.' },
  { id: 'reg-power', name: 'INT280 supply open', detail: 'The separately supplied 230 V INT280 has no power. Its healthy-run contact interrupts the control circuit.' },
  { id: 'wire', name: 'Wire from oil controls to coil open', detail: 'Voltage reaches INT280 OUT but not A1. Check the interconnecting wire and terminations.' },
  { id: 'coil', name: 'Contactor coil open', detail: 'A1–A2 reads full control voltage but the contactor is released. With power off and the coil isolated, A1–A2 reads OL.' },
] as const
export type BitzerFault = typeof BITZER_FAULTS[number]['id']
export const CHAIN = ['L1', 'FU-out', 'Call-out', 'HP-out', '11', '14', 'Oil-out', 'Reg-out', 'A1', 'N'] as const
export const DEVICES = ['FU · 2 A', 'Call / enable', 'HP cutout', 'LP cutout', 'SE-B3 · 11–14', 'Oil safety · IN–OUT', 'INT280 · IN–OUT', 'Panel wire', 'M contactor · A1–A2']
export const POINTS = [...CHAIN, '12', 'SE-L', 'SE-N', 'Oil-L', 'Oil-N', 'Reg-L', 'Reg-N', 'M1', 'M2'] as const
export type BitzerPoint = typeof POINTS[number]
export type BitzerVoltage = 120 | 208
// Potentials are relative to the circuit return, not earth. N is the internal
// return-node ID; the 208 V interface labels it L2 (a live conductor).
export function bitzerPointLabel(point: BitzerPoint, voltage: BitzerVoltage): string {
  if (voltage === 120) return point === 'N' ? 'N / A2' : point
  return point === 'N' ? 'L2 / A2' : point === 'SE-N' ? 'SE-L2' : point === 'Oil-N' ? 'Oil-L2' : point
}
export function bitzerState(fault: BitzerFault, power = true, voltage: BitzerVoltage = 120) {
  const mpHealthy = !['mp-power', 'ptc-hot', 'ptc-open', 'fuse'].includes(fault)
  const breakIndex = fault === 'fuse' ? 0 : fault === 'hp' ? 2 : !mpHealthy ? 4 : ['oil-trip', 'oil-power'].includes(fault) ? 5 : ['reg-trip', 'reg-power'].includes(fault) ? 6 : fault === 'wire' ? 7 : fault === 'coil' ? 8 : -1
  const potentials: Partial<Record<BitzerPoint, number | null>> = {}
  CHAIN.forEach((p, i) => { potentials[p] = !power ? 0 : i === 9 ? 0 : breakIndex === -1 || i <= breakIndex ? voltage : 0 })
  potentials['12'] = !power ? 0 : mpHealthy ? null : potentials['11']
  potentials['SE-L'] = power && !['fuse', 'mp-power'].includes(fault) ? voltage : 0
  potentials['Oil-L'] = power && !['fuse', 'oil-power'].includes(fault) ? voltage : 0
  potentials['Reg-L'] = power && fault !== 'reg-power' ? 230 : 0
  for (const p of ['SE-N', 'Oil-N', 'Reg-N'] as const) potentials[p] = 0
  return { potentials, breakIndex, running: power && breakIndex === -1, mpHealthy }
}
export function bitzerReading(fault: BitzerFault, power: boolean, mode: 'V' | 'Ω', isolated: 'none' | 'ptc' | 'coil', a: BitzerPoint, b: BitzerPoint, voltage: BitzerVoltage = 120): string {
  const pair = (x: string, y: string) => (a === x && b === y) || (a === y && b === x)
  if (mode === 'Ω') {
    if (power) return 'Switch power OFF'
    if (pair('M1', 'M2') && isolated === 'ptc') return fault === 'ptc-open' ? 'OL' : fault === 'ptc-hot' ? '6000 Ω' : '450 Ω'
    if (pair('A1', 'N') && isolated === 'coil') return fault === 'coil' ? 'OL' : '180 Ω'
    return 'Isolate PTC or coil; select its two ends'
  }
  if ([a, b].some(p => p === 'M1' || p === 'M2')) return 'PTC loop: use isolated Ω test'
  if ([a, b].some(p => p === 'Reg-L' || p === 'Reg-N') && !pair('Reg-L', 'Reg-N') && a !== b) return 'Use Reg-L to Reg-N for separate supply'
  if (a === b) return '0 V'
  const { potentials } = bitzerState(fault, power, voltage)
  const av = potentials[a], bv = potentials[b]
  if (av == null || bv == null) return 'Floating contact — indeterminate'
  return `${Math.abs(av - bv)} V`
}

/* ------------------------------------------------------------------ *
 *  Conductor colours — as found in the terminal box, not as inferred
 * ------------------------------------------------------------------ */

/** The colour set actually present on the machine.
 *
 *  An earlier version of this file assumed NFPA 79 (black line, red control,
 *  white neutral, yellow foreign supply) on the reasoning that a 120 / 208 V
 *  control supply means a North-American-built panel. A photograph of the real
 *  terminal box says otherwise: it carries pink, grey, violet and orange, which
 *  no NFPA 79 panel uses. That is a European multicore control cable, so the
 *  colours identify a CONDUCTOR, not a function — pink does not mean anything
 *  on its own, it is simply core 6 of the cable.
 *
 *  That difference matters for the trainer. Under NFPA 79 you can teach a rule
 *  ("white is grounded"). Here you cannot: the only way to know where orange
 *  goes is to have read it off this machine. So each conductor below is a
 *  recorded fact with a `confirmed` flag, never a rule — and anything
 *  unconfirmed is drawn as unconfirmed rather than guessed.
 */
export interface BitzerColour {
  code: string
  name: string
  hex: string
  /** Same colour, adjusted so it still reads on a dark card. */
  darkHex: string
}

export const BITZER_COLOURS = {
  WH: { code: 'WH', name: 'White', hex: '#94a3b8', darkHex: '#f1f5f9' },
  BN: { code: 'BN', name: 'Brown', hex: '#92400e', darkHex: '#d6a06a' },
  GN: { code: 'GN', name: 'Green', hex: '#15803d', darkHex: '#4ade80' },
  YE: { code: 'YE', name: 'Yellow', hex: '#ca8a04', darkHex: '#fde047' },
  GY: { code: 'GY', name: 'Grey', hex: '#64748b', darkHex: '#cbd5e1' },
  PK: { code: 'PK', name: 'Pink', hex: '#db2777', darkHex: '#f9a8d4' },
  BU: { code: 'BU', name: 'Blue', hex: '#1d4ed8', darkHex: '#93c5fd' },
  RD: { code: 'RD', name: 'Red', hex: '#dc2626', darkHex: '#f87171' },
  BK: { code: 'BK', name: 'Black', hex: '#1e293b', darkHex: '#cbd5e1' },
  VT: { code: 'VT', name: 'Violet', hex: '#7c3aed', darkHex: '#c4b5fd' },
  OG: { code: 'OG', name: 'Orange', hex: '#ea580c', darkHex: '#fdba74' },
  GNYE: { code: 'GNYE', name: 'Green/yellow', hex: '#16a34a', darkHex: '#4ade80' },
  /** Stands in for a conductor whose colour nobody has read off the machine. */
  UNKNOWN: { code: '?', name: 'Not yet confirmed', hex: '#94a3b8', darkHex: '#64748b' },
} as const satisfies Record<string, BitzerColour>

export type BitzerColourKey = keyof typeof BITZER_COLOURS

/** One conductor in the box: what colour it is, and whether we actually know.
 *
 *  `confirmed: false` means the colour has NOT been read off the machine or its
 *  label. The drawing shows those as unconfirmed instead of asserting a colour,
 *  because a tech who trusts a guessed colour reaches for the wrong wire on a
 *  live circuit. */
export interface BitzerConductor {
  colour: BitzerColourKey
  confirmed: boolean
  /** Where the colour came from, so a wrong one can be traced and corrected. */
  source: string
}

const unknown = (): BitzerConductor => ({ colour: 'UNKNOWN', confirmed: false, source: 'not yet read from the machine' })

/** Per-terminal conductor colours.
 *
 *  Only the entries marked confirmed are claims. Everything else is a
 *  placeholder waiting on the connection label inside the terminal box, which
 *  is the authoritative source for this machine. */
export const BITZER_CONDUCTORS: Partial<Record<BitzerPoint, BitzerConductor>> = {
  L1: unknown(),
  'FU-out': unknown(),
  'Call-out': unknown(),
  'HP-out': unknown(),
  '11': unknown(),
  '14': unknown(),
  '12': unknown(),
  'Oil-out': unknown(),
  'Reg-out': unknown(),
  A1: unknown(),
  N: unknown(),
  'SE-L': unknown(),
  'SE-N': unknown(),
  'Oil-L': unknown(),
  'Oil-N': unknown(),
  'Reg-L': unknown(),
  'Reg-N': unknown(),
  M1: unknown(),
  M2: unknown(),
}

/** The conductor at a point, falling back to "unconfirmed" rather than a guess. */
export function conductorAt(point: BitzerPoint): BitzerConductor {
  return BITZER_CONDUCTORS[point] ?? unknown()
}

/** Resolved colour for drawing. */
export function colourAt(point: BitzerPoint): BitzerColour {
  return BITZER_COLOURS[conductorAt(point).colour]
}

/** How much of the box has been recorded, so the UI can say so honestly. */
export function conductorCoverage(): { confirmed: number; total: number } {
  const all = Object.values(BITZER_CONDUCTORS)
  return { confirmed: all.filter(c => c.confirmed).length, total: all.length }
}
