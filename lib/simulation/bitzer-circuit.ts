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
 *  Conductor colours
 * ------------------------------------------------------------------ */

/** A conductor colour as it would be run and tagged in the panel.
 *
 *  `standard: true` means NFPA 79 assigns this colour to this purpose, so it
 *  is worth learning. `false` means we picked it to keep the drawing readable
 *  and the tech should take the colour from the device sheet instead — the
 *  distinction matters, because a colour memorised as a rule and then found
 *  to be arbitrary is worse than no colour at all.
 *
 *  The 120 V / 208 V supply is what tells us this is a North-American-built
 *  panel: a Bitzer OEM sheet from Germany would show 230 V L–N to IEC 60204-1
 *  colours, where the grounded conductor is light blue and the always-live
 *  foreign supply is orange rather than yellow. */
export interface BitzerWire {
  code: string
  name: string
  hex: string
  /** Same conductor, lightened so it still reads on a dark card. */
  darkHex: string
  use: string
  standard: boolean
}

export const BITZER_WIRES = {
  line: {
    code: 'BK', name: 'Black', hex: '#1e293b', darkHex: '#cbd5e1',
    use: 'Line conductor at supply voltage, ahead of the control fuse', standard: true,
  },
  control: {
    code: 'RD', name: 'Red', hex: '#dc2626', darkHex: '#f87171',
    use: 'AC control circuit fed from this panel, killed by its disconnect', standard: true,
  },
  grounded: {
    code: 'WH', name: 'White', hex: '#94a3b8', darkHex: '#e2e8f0',
    use: 'Grounded (neutral) conductor of the control circuit', standard: true,
  },
  foreign: {
    code: 'YE', name: 'Yellow', hex: '#ca8a04', darkHex: '#facc15',
    use: 'Live with this disconnect OPEN — fed from a separate supply', standard: true,
  },
  earth: {
    code: 'GNYE', name: 'Green/yellow', hex: '#16a34a', darkHex: '#4ade80',
    use: 'Equipment grounding conductor', standard: true,
  },
  sensor: {
    code: 'VT', name: 'Violet (shown for clarity)', hex: '#7c3aed', darkHex: '#c4b5fd',
    use: 'PTC sensor pair — run separately from control wiring; no colour is assigned by standard',
    standard: false,
  },
} as const satisfies Record<string, BitzerWire>

export type BitzerWireKey = keyof typeof BITZER_WIRES

/** The return leg is NOT the same conductor in both variants.
 *
 *  At 120 V it is a grounded neutral and runs white. At 208 V it is L2, a
 *  second live line conductor, and runs black — a white wire there would be a
 *  real code violation and a real shock hazard, because white tells the next
 *  tech it is grounded. This is the single most important colour on the sheet. */
export function returnWire(voltage: BitzerVoltage): BitzerWire {
  return voltage === 208 ? BITZER_WIRES.line : BITZER_WIRES.grounded
}

/** Colour for a point in the series safety string.
 *
 *  Everything downstream of the fuse is control wiring; L1 ahead of it is
 *  still line. The INT280's own supply is foreign and handled separately. */
export function chainWire(point: BitzerPoint, voltage: BitzerVoltage): BitzerWire {
  if (point === 'N') return returnWire(voltage)
  if (point === 'L1') return BITZER_WIRES.line
  if (point === 'Reg-L' || point === 'Reg-N') return BITZER_WIRES.foreign
  if (point === 'M1' || point === 'M2') return BITZER_WIRES.sensor
  if (point === 'SE-N' || point === 'Oil-N') return returnWire(voltage)
  return BITZER_WIRES.control
}
