/** Educational 120 / 208 V DOL control circuit, modelled on the real terminals.
 *
 *  Both the SE-B3 and the oil monitor carry terminals numbered 11, 12 and 14,
 *  so every point is prefixed with its device. An unprefixed "14" would be
 *  ambiguous at exactly the moment a tech is deciding which one to probe.
 *
 *  Terminal sets as documented:
 *    SE-B3        1, 2 (motor PTC in) · L, N (supply) · B1, B2 (lockout link)
 *                 · 11 common, 12 released/trip, 14 healthy-run
 *    Delta-PII /  L brown, N blue (supply) · 11 grey common, 12 pink NC,
 *    OLC-K1       14 orange NO · D1 violet (start signal from the K1 auxiliary)
 *    INT280       separately supplied 230 V, contact in the chain
 *    Compressor   M1, M2 — the motor PTC pair on the terminal board
 *
 *  Faults are settled diagnostic snapshots, not simulated device trip timers.
 */
export const BITZER_FAULTS = [
  { id: 'none', name: 'Normal operation', detail: 'The motor protector and both oil safety contacts permit the contactor to energize.' },
  { id: 'fuse', name: 'Control fuse open', detail: 'L1 has full control voltage to the return, but FU-out and the SE-B3 supply have lost their feed. Find the cause before replacing a fuse.' },
  { id: 'hp', name: 'High-pressure cutout open', detail: 'The HP switch interrupts the call while the motor protector remains powered. Investigate the pressure event.' },
  { id: 'lp', name: 'Low-pressure cutout open', detail: 'LP interrupts the chain between HP-out and SE-11. Both monitoring modules remain supplied. Investigate the low-pressure condition before resetting.' },
  { id: 'mp-power', name: 'SE-B3 supply wire open', detail: 'The safety chain still feeds SE-11, but the module supply measures 0 V. Loss of module power releases the relay: 11–14 opens and 11–12 closes.' },
  { id: 'ptc-hot', name: 'Motor PTC above trip resistance', detail: 'The isolated PTC loop measures 6,000 Ω in this exercise, above the 4,500 Ω trip. SE-B3 transfers from 11–14 to 11–12. Investigate overheating; cooling and the specified reset are required.' },
  { id: 'ptc-open', name: 'Motor PTC lead open', detail: 'An open PTC circuit trips the protector too. The lead from SE-1 to M1 is open. The isolated sensor at M1–M2 still reads 450 Ω; the disconnected harness at SE-1–SE-2 reads OL. This distinguishes a broken lead from a hot sensor.' },
  { id: 'interconnect', name: 'SE-14 to Oil-11 wire open', detail: 'Both modules are healthy and both relays have pulled in, yet nothing reaches the oil monitor. The grey interconnecting wire between SE-B3 terminal 14 and the oil monitor terminal 11 is open — a crimp off a spade is the usual cause. SE-14 reads full voltage, Oil-11 reads zero.' },
  { id: 'oil-trip', name: 'Lubrication safety tripped', detail: 'The oil monitor relay has released after its fault delay: 11–14 is open and 11–12 has made. Delta-PII checks differential oil pressure; OLC-K1 checks oil presence at the bearing. Check lubrication before resetting.' },
  { id: 'oil-power', name: 'Lubrication monitor supply open', detail: 'The oil monitor supply is absent and its healthy-run contact is open. Verify supply (Oil-L to Oil-N) separately from the relay contact.' },
  { id: 'reg-trip', name: 'INT280 oil refill failed / alarm', detail: 'The regulator could not restore oil level and its alarm contact stopped the compressor. Check oil reservoir supply, available differential pressure and the feed path.' },
  { id: 'reg-power', name: 'INT280 supply open', detail: 'The separately supplied 230 V INT280 has no power. Its healthy-run contact interrupts the control circuit.' },
  { id: 'wire', name: 'Wire from oil controls to coil open', detail: 'Voltage reaches Reg-out but not A1. Check the interconnecting wire and terminations.' },
  { id: 'coil', name: 'Contactor coil open', detail: 'A1–A2 reads full control voltage but the contactor is released. With power off and the coil isolated, A1–A2 reads OL.' },
] as const
export type BitzerFault = typeof BITZER_FAULTS[number]['id']

/** The series run, device by device. The wire between SE-14 and Oil-11 is a
 *  link in its own right, not a device, which is why it can fail on its own. */
export const CHAIN = ['L1', 'FU-out', 'Call-out', 'HP-out', 'SE-11', 'SE-14', 'Oil-11', 'Oil-14', 'Reg-out', 'A1', 'N'] as const
export const DEVICES = ['FU · 2 A', 'Call / enable', 'HP cutout', 'LP cutout', 'SE-B3 · 11–14', 'Wire SE-14 → Oil-11', 'Oil safety · 11–14', 'INT280 · IN–OUT', 'Panel wire', 'M contactor · A1–A2']

export const POINTS = [
  ...CHAIN,
  'SE-12', 'SE-L', 'SE-N', 'SE-B1', 'SE-B2', 'SE-1', 'SE-2',
  'Oil-12', 'Oil-L', 'Oil-N', 'Oil-D1',
  'Reg-L', 'Reg-N',
  'M1', 'M2',
] as const
export type BitzerPoint = typeof POINTS[number]
export type BitzerVoltage = 120 | 208

/** The two ends of the motor PTC loop: the compressor terminal board and the
 *  SE-B3 input. Same circuit, so the same isolated resistance test. */
export const PTC_ENDS: readonly BitzerPoint[] = ['M1', 'M2', 'SE-1', 'SE-2']

// Potentials are relative to the circuit return, not earth. N is the internal
// return-node ID; the 208 V interface labels it L2 (a live conductor).
export function bitzerPointLabel(point: BitzerPoint, voltage: BitzerVoltage): string {
  if (voltage === 120) return point === 'N' ? 'N / A2' : point
  return point === 'N' ? 'L2 / A2' : point === 'SE-N' ? 'SE-N (to L2)' : point === 'Oil-N' ? 'Oil-N (to L2)' : point
}

export function bitzerState(fault: BitzerFault, power = true, voltage: BitzerVoltage = 120, regulatorPower = power) {
  const mpHealthy = power && !['mp-power', 'ptc-hot', 'ptc-open', 'fuse'].includes(fault)
  const oilHealthy = power && !['oil-trip', 'oil-power', 'fuse'].includes(fault)
  const openLinks = [
    fault === 'fuse', false, fault === 'hp', fault === 'lp', !mpHealthy,
    fault === 'interconnect', !oilHealthy,
    !regulatorPower || ['reg-trip', 'reg-power'].includes(fault),
    fault === 'wire', fault === 'coil',
  ]
  const breakIndex = openLinks.findIndex(Boolean)
  const potentials: Partial<Record<BitzerPoint, number | null>> = {}
  const nets: Partial<Record<BitzerPoint, number>> = {}
  // Split the string at every open contact/wire. An island trapped between
  // two opens floats; it must not be taught as a definite zero-volt point.
  let first = 0
  for (let last = 0; last < CHAIN.length - 1; last++) {
    if (last < CHAIN.length - 2 && !openLinks[last]) continue
    const fed = first === 0
    const pulledToReturn = (last === CHAIN.length - 2 && fault !== 'coil')
      || (first <= 1 && last >= 1 && fault === 'fuse') // module supply loads
    const value = !power ? 0 : fed ? voltage : pulledToReturn ? 0 : null
    for (let i = first; i <= last; i++) { potentials[CHAIN[i]] = value; nets[CHAIN[i]] = first }
    first = last + 1
  }
  potentials.N = 0
  // A released relay transfers to its 12 contact; while healthy, 12 floats.
  potentials['SE-12'] = !power ? 0 : mpHealthy ? null : potentials['SE-11']
  potentials['Oil-12'] = !power ? 0 : oilHealthy ? null : potentials['Oil-11']
  if (!mpHealthy) nets['SE-12'] = nets['SE-11']
  if (!oilHealthy) nets['Oil-12'] = nets['Oil-11']
  potentials['SE-L'] = power && !['fuse', 'mp-power'].includes(fault) ? voltage : 0
  potentials['Oil-L'] = power && !['fuse', 'oil-power'].includes(fault) ? voltage : 0
  potentials['Reg-L'] = regulatorPower && fault !== 'reg-power' ? 230 : 0
  for (const p of ['SE-N', 'Oil-N', 'Reg-N'] as const) potentials[p] = 0
  // D1 is fed through a normally open contactor auxiliary. With that contact
  // open the input is not a guaranteed zero-volt reference for a high-Z meter.
  potentials['Oil-D1'] = !power ? 0 : breakIndex === -1 ? voltage : null
  return { potentials, nets, openLinks, breakIndex, running: power && breakIndex === -1, mpHealthy, oilHealthy }
}

export function bitzerReading(fault: BitzerFault, power: boolean, mode: 'V' | 'Ω', isolated: 'none' | 'ptc' | 'coil', a: BitzerPoint, b: BitzerPoint, voltage: BitzerVoltage = 120, regulatorPower = power): string {
  const pair = (x: string, y: string) => (a === x && b === y) || (a === y && b === x)
  const bothPtcEnds = PTC_ENDS.includes(a) && PTC_ENDS.includes(b)
  const samePtcSide = pair('M1', 'SE-1') || pair('M2', 'SE-2')
  if (mode === 'Ω') {
    if (power) return 'Switch power OFF'
    if (regulatorPower && [a, b].some(p => p === 'Reg-L' || p === 'Reg-N')) return 'Switch INT280 supply OFF'
    if (bothPtcEnds && isolated === 'ptc') {
      if (a === b) return '0 Ω'
      if (fault === 'ptc-open' && [a, b].includes('SE-1')) return 'OL'
      if (samePtcSide) return '0 Ω'
      return fault === 'ptc-hot' ? '6000 Ω' : '450 Ω'
    }
    if (pair('A1', 'N') && isolated === 'coil') return fault === 'coil' ? 'OL' : '180 Ω'
    // The lockout link is a bridge, so it is a continuity check, not a voltage.
    if (pair('SE-B1', 'SE-B2')) return 'Lockout link fitted — 0 Ω'
    return 'Isolate PTC or coil; select its two ends'
  }
  if ([a, b].some(p => PTC_ENDS.includes(p))) return 'PTC loop: use isolated Ω test'
  if ([a, b].some(p => p === 'SE-B1' || p === 'SE-B2')) return 'B1–B2 is the lockout link; check continuity with power off'
  if ([a, b].some(p => p === 'Reg-L' || p === 'Reg-N') && !pair('Reg-L', 'Reg-N') && a !== b) return 'Use Reg-L to Reg-N for separate supply'
  if (a === b) return '0 V'
  const { potentials, nets } = bitzerState(fault, power, voltage, regulatorPower)
  const av = potentials[a], bv = potentials[b]
  if (nets[a] !== undefined && nets[a] === nets[b]) return '0 V'
  if (av == null || bv == null) return 'Floating contact — indeterminate'
  return `${Math.abs(av - bv)} V`
}

/* ------------------------------------------------------------------ *
 *  Conductor colours — as found in the terminal box, not as inferred
 * ------------------------------------------------------------------ */

/** Manufacturer cable colours identify the specified lead on this device.
 * They do not establish the function of similarly coloured field wiring.
 * Green/yellow remains reserved for protective earth. */
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

/** Manufacturer six-core oil-monitor cable. These are lead functions, not
 * screw positions on the sealed sensor. External terminal-strip positions
 * depend on the installation. BITZER ECOLINE Service Guide, pp. 63–66. */
export const OIL_MONITOR_CABLE = [
  { terminal: 'L' as const, point: 'Oil-L' as const, core: 'BN' as const, note: 'Supply line' },
  { terminal: 'N' as const, point: 'Oil-N' as const, core: 'BU' as const, note: 'Supply return — N at 120 V, L2 at 208 V' },
  { terminal: '11' as const, point: 'Oil-11' as const, core: 'GY' as const, note: 'Relay common — fed from SE-B3 terminal 14' },
  { terminal: '14' as const, point: 'Oil-14' as const, core: 'OG' as const, note: 'Relay NO — chain out toward the contactor' },
  { terminal: '12' as const, point: 'Oil-12' as const, core: 'PK' as const, note: 'Relay NC — made when the monitor has tripped' },
  { terminal: 'D1' as const, point: 'Oil-D1' as const, core: 'VT' as const, note: 'Start signal, from L via the K1 auxiliary contact' },
]

const FIG9 = 'BITZER ECOLINE Service Guide documentation (SG-0012-09), pp. 63–66'
const CABLE_SRC = `${FIG9}; manufacturer cable assignments, not verification of installed field wiring`

/** Per-terminal conductor colours.
 *
 *  Only entries with `confirmed: true` are claims, and each cites where it was
 *  read. Everything else waits on a legible photograph of the terminal-box
 *  label, which is the authoritative source for the rest of this machine. */
export const BITZER_CONDUCTORS: Partial<Record<BitzerPoint, BitzerConductor>> = {
  L1: unknown(),
  'FU-out': unknown(),
  'Call-out': unknown(),
  'HP-out': unknown(),
  'SE-11': unknown(),
  // Fig. 9 labels the run out of SE-B3 terminal 14 GY. It is the same
  // conductor as the oil monitor's terminal 11 lead, which is also GY — one
  // wire, one colour, landing on a terminal at each end.
  'SE-14': { colour: 'GY', confirmed: true, source: CABLE_SRC },
  'SE-12': unknown(),
  'SE-L': unknown(),
  'SE-N': unknown(),
  'SE-B1': unknown(),
  'SE-B2': unknown(),
  // The SE-B3 end of the motor PTC pair; Fig. 9 labels both leads OG.
  'SE-1': { colour: 'OG', confirmed: true, source: FIG9 },
  'SE-2': { colour: 'OG', confirmed: true, source: FIG9 },
  // The oil monitor's own six cores, all confirmed together.
  'Oil-11': { colour: 'GY', confirmed: true, source: CABLE_SRC },
  'Oil-14': { colour: 'OG', confirmed: true, source: CABLE_SRC },
  'Oil-12': { colour: 'PK', confirmed: true, source: CABLE_SRC },
  'Oil-L': { colour: 'BN', confirmed: true, source: CABLE_SRC },
  'Oil-N': { colour: 'BU', confirmed: true, source: CABLE_SRC },
  'Oil-D1': { colour: 'VT', confirmed: true, source: CABLE_SRC },
  'Reg-out': unknown(),
  A1: unknown(),
  N: unknown(),
  'Reg-L': unknown(),
  'Reg-N': unknown(),
  // Fig. 9 labels BOTH motor PTC leads OG. Note this is the same colour as the
  // oil monitor's terminal 14 above, in a different cable — which is the point
  // about multicore colours naming a core rather than a function.
  M1: { colour: 'OG', confirmed: true, source: FIG9 },
  M2: { colour: 'OG', confirmed: true, source: FIG9 },
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
