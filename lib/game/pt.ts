/** Saturation data for the refrigerants in the game.
 *
 *  Computed from an equation of state (CoolProp 8.0.0) rather than transcribed
 *  from a chart, using the method CLAUDE.md documents: `PropsSI('P','T',T_K,'Q',0,fluid)`
 *  for bubble point and `'Q',1` for dew, converted Pa -> psig. The blends are built
 *  from their ASHRAE 34 mass fractions (R-448A: R32/R125/R134a/R1234yf/R1234ze(E)
 *  26/26/21/20/7; R-449A: R32/R125/R134a/R1234yf 24.3/24.7/25.7/25.3). Every R-404A
 *  row lands exactly on the verified points in CLAUDE.md; R-449A lands within 0.6 psi.
 *
 *  Rows are [degF, bubble psig, dew psig]. Which column you want is the whole point:
 *  superheat is measured off DEW, subcooling off BUBBLE. On a single-component
 *  refrigerant like CO2 the two columns are identical, which is exactly why glide
 *  catches people out on the blends. */
export type RefrigerantId = 'R-404A' | 'R-448A' | 'R-449A' | 'R-744'

export interface RefrigerantDef {
  id: RefrigerantId
  name: string
  /** What a tech would call it on site. */
  alias: string
  /** Rows of [degF, bubble psig, dew psig], ascending by temperature. */
  table: [number, number, number][]
  /** Glide at typical medium-temp conditions, degF — 0 for a single component. */
  glide: number
  note: string
}

export const REFRIGERANTS: Record<RefrigerantId, RefrigerantDef> = {
  'R-404A': {
    id: 'R-404A',
    name: 'R-404A',
    alias: 'the legacy HFC on the Tyler rack and most older gas-station boxes',
    glide: 1.0,
    note: 'Boils at about -49.8 degF at 0 psig. Bubble and dew run within a couple of psi, so field practice treats it as glide-free.',
    table: [
      [-60, -3.1, -3.6], [-55, -1.4, -1.9], [-50, 0.5, -0.1], [-45, 2.6, 2.0], [-40, 4.9, 4.3], [-35, 7.5, 6.8],
      [-30, 10.3, 9.6], [-25, 13.4, 12.7], [-20, 16.8, 16.0], [-15, 20.5, 19.7], [-10, 24.6, 23.6], [-5, 28.9, 27.9],
      [0, 33.7, 32.6], [5, 38.8, 37.7], [10, 44.3, 43.1], [15, 50.2, 49.0], [20, 56.6, 55.3], [25, 63.4, 62.1],
      [30, 70.7, 69.3], [35, 78.6, 77.1], [40, 86.9, 85.4], [45, 95.8, 94.2], [50, 105.3, 103.6], [55, 115.3, 113.6],
      [60, 126.0, 124.2], [65, 137.3, 135.5], [70, 149.3, 147.4], [75, 162.0, 160.1], [80, 175.4, 173.4], [85, 189.5, 187.5],
      [90, 204.5, 202.4], [95, 220.2, 218.1], [100, 236.8, 234.7], [105, 254.2, 252.1], [110, 272.6, 270.4], [115, 291.8, 289.7],
      [120, 312.1, 309.9], [125, 333.4, 331.2], [130, 355.7, 353.6], [135, 379.1, 377.1], [140, 403.7, 401.7], [145, 429.6, 427.7],
      [150, 456.8, 455.0], [155, 485.4, 483.9],
    ],
  },
  'R-448A': {
    id: 'R-448A',
    name: 'R-448A',
    alias: 'Solstice N40 — the lower-GWP blend on the newer racks',
    glide: 10.9,
    note: 'Real glide. Take superheat off the dew column and subcooling off the bubble column or you will be several degrees out.',
    table: [
      [-60, -3.2, -6.6], [-55, -1.5, -5.3], [-50, 0.5, -3.8], [-45, 2.6, -2.1], [-40, 5.0, -0.2], [-35, 7.6, 1.8],
      [-30, 10.5, 4.2], [-25, 13.6, 6.7], [-20, 17.1, 9.5], [-15, 20.9, 12.6], [-10, 25.0, 16.0], [-5, 29.5, 19.8],
      [0, 34.3, 23.8], [5, 39.6, 28.3], [10, 45.3, 33.1], [15, 51.4, 38.3], [20, 57.9, 43.9], [25, 65.0, 50.0],
      [30, 72.5, 56.6], [35, 80.6, 63.7], [40, 89.3, 71.2], [45, 98.5, 79.4], [50, 108.3, 88.1], [55, 118.7, 97.4],
      [60, 129.7, 107.3], [65, 141.4, 117.8], [70, 153.8, 129.1], [75, 167.0, 141.1], [80, 180.8, 153.8], [85, 195.4, 167.2],
      [90, 210.9, 181.5], [95, 227.1, 196.6], [100, 244.1, 212.6], [105, 262.1, 229.5], [110, 280.9, 247.4], [115, 300.7, 266.2],
      [120, 321.4, 286.1], [125, 343.0, 307.0], [130, 365.7, 329.1], [135, 389.4, 352.4], [140, 414.2, 377.0], [145, 440.1, 402.9],
      [155, 495.3, 459.1],
    ],
  },
  'R-449A': {
    id: 'R-449A',
    name: 'R-449A',
    alias: 'Opteon XP40 — the other common R-404A retrofit',
    glide: 10.1,
    note: 'Behaves within a couple of psi of R-448A at the same temperature. Same glide discipline applies.',
    table: [
      [-60, -3.4, -6.5], [-55, -1.7, -5.2], [-50, 0.2, -3.7], [-45, 2.3, -2.0], [-40, 4.7, -0.1], [-35, 7.3, 2.0],
      [-30, 10.1, 4.3], [-25, 13.2, 6.8], [-20, 16.6, 9.7], [-15, 20.4, 12.8], [-10, 24.4, 16.2], [-5, 28.9, 19.9],
      [0, 33.6, 24.0], [5, 38.8, 28.4], [10, 44.4, 33.2], [15, 50.5, 38.4], [20, 56.9, 44.0], [25, 63.9, 50.1],
      [30, 71.4, 56.7], [35, 79.3, 63.7], [40, 87.9, 71.2], [45, 96.9, 79.3], [50, 106.6, 88.0], [55, 116.9, 97.2],
      [60, 127.8, 107.1], [65, 139.4, 117.6], [70, 151.6, 128.8], [75, 164.6, 140.6], [80, 178.2, 153.2], [85, 192.7, 166.6],
      [90, 207.9, 180.8], [95, 223.9, 195.8], [100, 240.7, 211.6], [105, 258.4, 228.4], [110, 277.0, 246.0], [115, 296.5, 264.7],
      [120, 317.0, 284.4], [125, 338.4, 305.1], [130, 360.8, 327.0], [135, 384.2, 350.0], [140, 408.7, 374.3], [145, 434.2, 399.8],
      [155, 488.7, 455.3],
    ],
  },
  'R-744': {
    id: 'R-744',
    name: 'R-744 (CO2)',
    alias: 'a single component, so no glide and no bubble/dew split at all',
    glide: 0.0,
    note: 'Critical point is 87.8 degF at about 1054 psig. Above that it does not condense at all and the question stops making sense.',
    table: [
      [-60, 79.9, 79.9], [-55, 91.1, 91.1], [-50, 103.4, 103.4], [-45, 116.6, 116.6], [-40, 131.0, 131.0], [-35, 146.5, 146.5],
      [-30, 163.1, 163.1], [-25, 181.0, 181.0], [-20, 200.2, 200.2], [-15, 220.8, 220.8], [-10, 242.7, 242.7], [-5, 266.1, 266.1],
      [0, 291.0, 291.0], [5, 317.6, 317.6], [10, 345.7, 345.7], [15, 375.6, 375.6], [20, 407.2, 407.2], [25, 440.7, 440.7],
      [30, 476.1, 476.1], [35, 513.4, 513.4], [40, 552.9, 552.9], [45, 594.5, 594.5], [50, 638.3, 638.3], [55, 684.4, 684.4],
      [60, 733.1, 733.1], [65, 784.2, 784.2], [70, 838.1, 838.1], [75, 894.9, 894.9], [80, 954.9, 954.9], [85, 1018.4, 1018.4],
    ],
  },
}

/** Saturation temperature (degF) for a gauge pressure, interpolated between rows.
 *  `side` picks the column: 'dew' for a suction/superheat question, 'bubble' for
 *  liquid/subcooling. Outside the table it clamps to the end rows. */
export function satTemp(id: RefrigerantId, psig: number, side: 'bubble' | 'dew'): number {
  const rows = REFRIGERANTS[id].table
  const col = side === 'bubble' ? 1 : 2
  if (psig <= rows[0][col]) return rows[0][0]
  for (let i = 1; i < rows.length; i++) {
    const lo = rows[i - 1], hi = rows[i]
    if (psig <= hi[col]) {
      const span = hi[col] - lo[col]
      return lo[0] + (span === 0 ? 0 : ((psig - lo[col]) / span) * (hi[0] - lo[0]))
    }
  }
  return rows[rows.length - 1][0]
}

/** Superheat: how far the suction line is above the DEW point at that pressure. */
export function superheat(id: RefrigerantId, psig: number, lineTempF: number): number {
  return lineTempF - satTemp(id, psig, 'dew')
}

/** Subcooling: how far the liquid line is below the BUBBLE point at that pressure. */
export function subcooling(id: RefrigerantId, psig: number, lineTempF: number): number {
  return satTemp(id, psig, 'bubble') - lineTempF
}
