import type { EquipmentNode, Point } from './types'

export const MAP_W = 960
export const MAP_H = 560
export const CELL = 20
const COLS = MAP_W / CELL
const ROWS = MAP_H / CELL

interface Rect { x: number; y: number; w: number; h: number }

/** Non-equipment obstacles: walls, shelving, checkout. */
export const OBSTACLES: (Rect & { label?: string; kind: 'wall' | 'shelf' | 'checkout' | 'produce' })[] = [
  { x: 0, y: 0, w: 340, h: 20, kind: 'wall' },
  { x: 420, y: 0, w: 540, h: 20, kind: 'wall' },
  { x: 0, y: 540, w: 960, h: 20, kind: 'wall' },
  { x: 0, y: 0, w: 20, h: 560, kind: 'wall' },
  { x: 940, y: 0, w: 20, h: 560, kind: 'wall' },
  { x: 760, y: 20, w: 20, h: 220, kind: 'wall' },
  { x: 760, y: 300, w: 20, h: 240, kind: 'wall' },
  { x: 480, y: 40, w: 220, h: 60, kind: 'checkout', label: 'CHECKOUT' },
  { x: 130, y: 140, w: 60, h: 290, kind: 'shelf', label: 'AISLE 1' },
  { x: 250, y: 140, w: 60, h: 290, kind: 'shelf', label: 'AISLE 2' },
  { x: 590, y: 140, w: 60, h: 290, kind: 'shelf', label: 'AISLE 5' },
  { x: 60, y: 60, w: 100, h: 40, kind: 'produce', label: 'PRODUCE' },
]

export const ZONES: { label: string; x: number; y: number }[] = [
  { label: 'FROZEN', x: 450, y: 128 },
  { label: 'DAIRY', x: 720, y: 128 },
  { label: 'DELI & MEAT', x: 380, y: 468 },
  { label: 'BACK ROOM', x: 860, y: 34 },
  { label: 'ROOF ACCESS', x: 860, y: 436 },
]

export const EQUIPMENT: EquipmentNode[] = [
  { id: 'P1', label: 'Produce case P1', kind: 'produce-case', rect: { x: 20, y: 140, w: 30, h: 290 }, pin: { x: 42, y: 285 }, stand: { x: 70, y: 290 } },
  { id: 'F1', label: 'Frozen doors F1', kind: 'reach-in-freezer', rect: { x: 370, y: 140, w: 40, h: 140 }, pin: { x: 398, y: 210 }, stand: { x: 430, y: 210 } },
  { id: 'F2', label: 'Frozen doors F2', kind: 'reach-in-freezer', rect: { x: 370, y: 300, w: 40, h: 130 }, pin: { x: 398, y: 365 }, stand: { x: 430, y: 370 } },
  { id: 'B1', label: 'Bunker B1', kind: 'bunker', rect: { x: 470, y: 170, w: 60, h: 90 }, pin: { x: 500, y: 215 }, stand: { x: 550, y: 210 } },
  { id: 'B2', label: 'Bunker B2', kind: 'bunker', rect: { x: 470, y: 310, w: 60, h: 90 }, pin: { x: 500, y: 355 }, stand: { x: 550, y: 350 } },
  { id: 'D1', label: 'Dairy multideck D1', kind: 'dairy-case', rect: { x: 700, y: 140, w: 40, h: 140 }, pin: { x: 712, y: 210 }, stand: { x: 670, y: 210 } },
  { id: 'D2', label: 'Dairy multideck D2', kind: 'dairy-case', rect: { x: 700, y: 300, w: 40, h: 130 }, pin: { x: 712, y: 365 }, stand: { x: 670, y: 370 } },
  { id: 'DL1', label: 'Deli case DL1', kind: 'deli-case', rect: { x: 130, y: 480, w: 200, h: 50 }, pin: { x: 230, y: 492 }, stand: { x: 230, y: 450 } },
  { id: 'M1', label: 'Meat case M1', kind: 'meat-case', rect: { x: 430, y: 480, w: 210, h: 50 }, pin: { x: 535, y: 492 }, stand: { x: 530, y: 450 } },
  { id: 'FD1', label: 'Floor drain (deli)', kind: 'floor-drain', rect: { x: 372, y: 502, w: 16, h: 16 }, pin: { x: 380, y: 510 }, stand: { x: 390, y: 470 }, walkable: true },
  { id: 'RK', label: 'Rack A (MT/LT)', kind: 'rack', rect: { x: 800, y: 40, w: 120, h: 70 }, pin: { x: 860, y: 75 }, stand: { x: 850, y: 130 } },
  { id: 'WF', label: 'Walk-in freezer', kind: 'walk-in-freezer', rect: { x: 800, y: 150, w: 120, h: 90 }, pin: { x: 860, y: 195 }, stand: { x: 850, y: 270 } },
  { id: 'WC', label: 'Walk-in cooler', kind: 'walk-in-cooler', rect: { x: 800, y: 290, w: 120, h: 90 }, pin: { x: 860, y: 335 }, stand: { x: 850, y: 270 } },
  { id: 'RTU1', label: 'RTU-1 (sales floor)', kind: 'rtu', rect: { x: 800, y: 440, w: 55, h: 80 }, pin: { x: 827, y: 480 }, stand: { x: 830, y: 405 } },
  { id: 'RTU2', label: 'RTU-2 (front / deli)', kind: 'rtu', rect: { x: 865, y: 440, w: 55, h: 80 }, pin: { x: 892, y: 480 }, stand: { x: 890, y: 405 } },
  { id: 'EN', label: 'Front entrance', kind: 'entrance', rect: { x: 340, y: 0, w: 80, h: 20 }, pin: { x: 380, y: 12 }, stand: { x: 380, y: 50 }, walkable: true },
]

export const SPAWN_POINT: Point = { x: 380, y: 50 }

// ── Walkable grid + BFS pathfinding ──────────────────────────────────────────
const blocked: boolean[] = new Array(COLS * ROWS).fill(false)
function markRect(r: Rect) {
  const c0 = Math.floor(r.x / CELL), c1 = Math.ceil((r.x + r.w) / CELL) - 1
  const r0 = Math.floor(r.y / CELL), r1 = Math.ceil((r.y + r.h) / CELL) - 1
  for (let c = c0; c <= c1; c++) for (let rr = r0; rr <= r1; rr++) {
    if (c >= 0 && c < COLS && rr >= 0 && rr < ROWS) blocked[rr * COLS + c] = true
  }
}
for (const o of OBSTACLES) markRect(o)
for (const e of EQUIPMENT) if (!e.walkable) markRect(e.rect)

export function toCell(p: Point): [number, number] {
  return [
    Math.min(COLS - 1, Math.max(0, Math.floor(p.x / CELL))),
    Math.min(ROWS - 1, Math.max(0, Math.floor(p.y / CELL))),
  ]
}
export function cellCenter(c: number, r: number): Point {
  return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 }
}
export function isWalkable(p: Point): boolean {
  const [c, r] = toCell(p)
  return !blocked[r * COLS + c]
}

/** Nearest walkable cell to a point (ring search), used when a tap lands on shelving. */
function nearestWalkable(c: number, r: number): [number, number] | null {
  if (!blocked[r * COLS + c]) return [c, r]
  for (let d = 1; d < 6; d++) {
    for (let dc = -d; dc <= d; dc++) for (let dr = -d; dr <= d; dr++) {
      if (Math.max(Math.abs(dc), Math.abs(dr)) !== d) continue
      const cc = c + dc, rr = r + dr
      if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) continue
      if (!blocked[rr * COLS + cc]) return [cc, rr]
    }
  }
  return null
}

/** BFS shortest path (4-neighbour). Returns cell-centre waypoints excluding the start. */
export function findPath(from: Point, to: Point): Point[] {
  const [sc, sr] = toCell(from)
  const target = nearestWalkable(...toCell(to))
  if (!target) return []
  const [tc, tr] = target
  if (sc === tc && sr === tr) return []
  const prev = new Int32Array(COLS * ROWS).fill(-1)
  const seen = new Uint8Array(COLS * ROWS)
  const start = sr * COLS + sc
  const goal = tr * COLS + tc
  const queue: number[] = [start]
  seen[start] = 1
  let head = 0
  while (head < queue.length) {
    const cur = queue[head++]
    if (cur === goal) break
    const c = cur % COLS, r = (cur - c) / COLS
    const nbrs = [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]
    for (const [nc, nr] of nbrs) {
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue
      const ni = nr * COLS + nc
      if (seen[ni] || blocked[ni]) continue
      seen[ni] = 1
      prev[ni] = cur
      queue.push(ni)
    }
  }
  if (!seen[goal]) return []
  const path: Point[] = []
  for (let i = goal; i !== start; i = prev[i]) {
    const c = i % COLS, r = (i - c) / COLS
    path.push(cellCenter(c, r))
  }
  path.reverse()
  // Collapse collinear runs so the walk animates as straight segments
  const out: Point[] = []
  for (let i = 0; i < path.length; i++) {
    const a = out[out.length - 1], b = path[i], n = path[i + 1]
    if (a && n && ((a.x === b.x && b.x === n.x) || (a.y === b.y && b.y === n.y))) continue
    out.push(b)
  }
  return out
}
