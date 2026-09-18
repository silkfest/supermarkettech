import type { Point } from './types'

// Parallel oblique view: north/south floor depth is foreshortened, vertical
// faces stay upright. Navigation always stays in the original floor coordinates.
export const FLOOR_DEPTH = 0.68
export const WALL_HEIGHT = 42
export function projectFloor(p: Point): Point { return { x: p.x, y: p.y * FLOOR_DEPTH } }
export function unprojectFloor(p: Point): Point { return { x: p.x, y: p.y / FLOOR_DEPTH } }
export function depthOrder<T extends { depth: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.depth - b.depth)
}
