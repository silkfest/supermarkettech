import type { GameMap } from '../types'

// Trade-school shop: desks up front, hands-on stations around the walls.
export const CLASSROOM_MAP: GameMap = {
  w: 640,
  h: 420,
  floor: 'shop',
  obstacles: [
    { x: 0, y: 0, w: 640, h: 20, kind: 'wall' },
    { x: 0, y: 400, w: 260, h: 20, kind: 'wall' },
    { x: 340, y: 400, w: 300, h: 20, kind: 'wall' },
    { x: 0, y: 0, w: 20, h: 420, kind: 'wall' },
    { x: 620, y: 0, w: 20, h: 420, kind: 'wall' },
    { x: 120, y: 120, w: 60, h: 30, kind: 'desk' },
    { x: 220, y: 120, w: 60, h: 30, kind: 'desk' },
    { x: 320, y: 120, w: 60, h: 30, kind: 'desk' },
    { x: 120, y: 190, w: 60, h: 30, kind: 'desk' },
    { x: 220, y: 190, w: 60, h: 30, kind: 'desk' },
    { x: 320, y: 190, w: 60, h: 30, kind: 'desk' },
    { x: 440, y: 120, w: 40, h: 100, kind: 'shelf', label: 'TOOL CRIB' },
  ],
  zones: [
    { label: 'CLASSROOM', x: 250, y: 100 },
    { label: 'SHOP FLOOR', x: 320, y: 300 },
  ],
  equipment: [
    { id: 'WB', label: 'Whiteboard', kind: 'station', rect: { x: 120, y: 20, w: 260, h: 24 }, pin: { x: 250, y: 32 }, stand: { x: 250, y: 70 } },
    { id: 'RIG', label: 'Training rig — walk-in coil & TXV', kind: 'station', rect: { x: 20, y: 240, w: 40, h: 120 }, pin: { x: 40, y: 300 }, stand: { x: 90, y: 300 } },
    { id: 'BENCH', label: 'Electrical bench', kind: 'station', rect: { x: 180, y: 330, w: 140, h: 40 }, pin: { x: 250, y: 350 }, stand: { x: 250, y: 300 } },
    { id: 'CTRL', label: 'Case controller & defrost panel', kind: 'station', rect: { x: 540, y: 40, w: 60, h: 120 }, pin: { x: 570, y: 100 }, stand: { x: 500, y: 100 } },
    { id: 'PPE', label: 'Safety wall — PPE & lockout', kind: 'station', rect: { x: 540, y: 240, w: 60, h: 120 }, pin: { x: 570, y: 300 }, stand: { x: 500, y: 300 } },
  ],
  spawn: { x: 300, y: 380 },
}
