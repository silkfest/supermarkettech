import type { GameMap, Point } from './types'

export const CELL = 20

/** Walkable grid + BFS pathfinding for one map. Built once per level. */
export class NavGrid {
  readonly cols: number
  readonly rows: number
  private blocked: Uint8Array

  constructor(map: GameMap) {
    this.cols = Math.ceil(map.w / CELL)
    this.rows = Math.ceil(map.h / CELL)
    this.blocked = new Uint8Array(this.cols * this.rows)
    for (const o of map.obstacles) this.markRect(o)
    for (const e of map.equipment) if (!e.walkable) this.markRect(e.rect)
  }

  private markRect(r: { x: number; y: number; w: number; h: number }) {
    const c0 = Math.floor(r.x / CELL), c1 = Math.ceil((r.x + r.w) / CELL) - 1
    const r0 = Math.floor(r.y / CELL), r1 = Math.ceil((r.y + r.h) / CELL) - 1
    for (let c = c0; c <= c1; c++) for (let rr = r0; rr <= r1; rr++) {
      if (c >= 0 && c < this.cols && rr >= 0 && rr < this.rows) this.blocked[rr * this.cols + c] = 1
    }
  }

  toCell(p: Point): [number, number] {
    return [
      Math.min(this.cols - 1, Math.max(0, Math.floor(p.x / CELL))),
      Math.min(this.rows - 1, Math.max(0, Math.floor(p.y / CELL))),
    ]
  }

  isWalkable(p: Point): boolean {
    const [c, r] = this.toCell(p)
    return !this.blocked[r * this.cols + c]
  }

  private nearestWalkable(c: number, r: number): [number, number] | null {
    if (!this.blocked[r * this.cols + c]) return [c, r]
    for (let d = 1; d < 6; d++) {
      for (let dc = -d; dc <= d; dc++) for (let dr = -d; dr <= d; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== d) continue
        const cc = c + dc, rr = r + dr
        if (cc < 0 || rr < 0 || cc >= this.cols || rr >= this.rows) continue
        if (!this.blocked[rr * this.cols + cc]) return [cc, rr]
      }
    }
    return null
  }

  /** BFS shortest path (4-neighbour). Cell-centre waypoints excluding the start, collinear runs collapsed. */
  findPath(from: Point, to: Point): Point[] {
    const { cols, rows, blocked } = this
    const [sc, sr] = this.toCell(from)
    const target = this.nearestWalkable(...this.toCell(to))
    if (!target) return []
    const [tc, tr] = target
    if (sc === tc && sr === tr) return []
    const prev = new Int32Array(cols * rows).fill(-1)
    const seen = new Uint8Array(cols * rows)
    const start = sr * cols + sc
    const goal = tr * cols + tc
    const queue: number[] = [start]
    seen[start] = 1
    let head = 0
    while (head < queue.length) {
      const cur = queue[head++]
      if (cur === goal) break
      const c = cur % cols, r = (cur - c) / cols
      for (const [nc, nr] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue
        const ni = nr * cols + nc
        if (seen[ni] || blocked[ni]) continue
        seen[ni] = 1
        prev[ni] = cur
        queue.push(ni)
      }
    }
    if (!seen[goal]) return []
    const path: Point[] = []
    for (let i = goal; i !== start; i = prev[i]) {
      const c = i % cols, r = (i - c) / cols
      path.push({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 })
    }
    path.reverse()
    const out: Point[] = []
    for (let i = 0; i < path.length; i++) {
      const a = out[out.length - 1], b = path[i], n = path[i + 1]
      if (a && n && ((a.x === b.x && b.x === n.x) || (a.y === b.y && b.y === n.y))) continue
      out.push(b)
    }
    return out
  }
}
