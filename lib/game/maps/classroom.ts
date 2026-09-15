import type { GameMap } from '../types'

// Trade-school shop: desks up front under the whiteboard, hands-on rigs down
// the left wall, the electrical lab down the right wall, benches along the back.
export const CLASSROOM_MAP: GameMap = {
  w: 800,
  h: 540,
  floor: 'shop',
  obstacles: [
    { x: 0, y: 0, w: 800, h: 20, kind: 'wall' },
    { x: 0, y: 520, w: 340, h: 20, kind: 'wall' },
    { x: 420, y: 520, w: 380, h: 20, kind: 'wall' },
    { x: 0, y: 0, w: 20, h: 540, kind: 'wall' },
    { x: 780, y: 0, w: 20, h: 540, kind: 'wall' },
    { x: 150, y: 110, w: 60, h: 30, kind: 'desk' },
    { x: 250, y: 110, w: 60, h: 30, kind: 'desk' },
    { x: 350, y: 110, w: 60, h: 30, kind: 'desk' },
    { x: 150, y: 180, w: 60, h: 30, kind: 'desk' },
    { x: 250, y: 180, w: 60, h: 30, kind: 'desk' },
    { x: 350, y: 180, w: 60, h: 30, kind: 'desk' },
  ],
  zones: [
    { label: 'CLASSROOM', x: 280, y: 96 },
    { label: 'TRAINING RIGS', x: 130, y: 240 },
    { label: 'SERVICE BAY', x: 365, y: 400 },
    { label: 'ELECTRICAL LAB', x: 620, y: 300 },
    { label: 'SAFETY WALL', x: 640, y: 130 },
    { label: 'TOOL CRIB', x: 565, y: 96 },
  ],
  equipment: [
    { id: 'WB', label: 'Whiteboard', short: 'WHITEBOARD', kind: 'station', rect: { x: 140, y: 20, w: 300, h: 24 }, pin: { x: 290, y: 32 }, stand: { x: 290, y: 70 } },
    { id: 'CRIB', label: 'Tool crib', short: 'TOOL CRIB', kind: 'station', rect: { x: 540, y: 110, w: 50, h: 110 }, pin: { x: 565, y: 165 }, stand: { x: 500, y: 165 } },
    { id: 'RIG', label: 'Training rig — walk-in coil & TXV', short: 'PT RIG', kind: 'station', rect: { x: 20, y: 110, w: 40, h: 110 }, pin: { x: 40, y: 165 }, stand: { x: 90, y: 165 } },
    { id: 'COMP', label: 'Compressor bench', short: 'COMPRESSORS', kind: 'station', rect: { x: 20, y: 250, w: 40, h: 110 }, pin: { x: 40, y: 305 }, stand: { x: 90, y: 305 } },
    { id: 'COND', label: 'Condenser & head-pressure mock-up', short: 'CONDENSER', kind: 'station', rect: { x: 20, y: 390, w: 40, h: 110 }, pin: { x: 40, y: 445 }, stand: { x: 90, y: 445 } },
    { id: 'EVAP', label: 'Evaporator & metering bench', short: 'EVAP / TXV', kind: 'station', rect: { x: 150, y: 460, w: 140, h: 40 }, pin: { x: 220, y: 480 }, stand: { x: 220, y: 430 } },
    { id: 'SERV', label: 'Recovery, vacuum & charging cart', short: 'SERVICE CART', kind: 'station', rect: { x: 440, y: 460, w: 140, h: 40 }, pin: { x: 510, y: 480 }, stand: { x: 510, y: 430 } },
    { id: 'BENCH', label: 'Electrical bench', short: 'METER BENCH', kind: 'station', rect: { x: 620, y: 460, w: 140, h: 40 }, pin: { x: 690, y: 480 }, stand: { x: 690, y: 430 } },
    { id: 'SAFE120', label: 'Safety-circuit panel — 120 V', short: 'PANEL 120 V', kind: 'station', rect: { x: 740, y: 250, w: 40, h: 80 }, pin: { x: 760, y: 290 }, stand: { x: 710, y: 290 } },
    { id: 'SAFE208', label: 'Safety-circuit panel — 208 V 1Ø', short: 'PANEL 208 V', kind: 'station', rect: { x: 740, y: 350, w: 40, h: 80 }, pin: { x: 760, y: 390 }, stand: { x: 710, y: 390 } },
    { id: 'CTRL', label: 'Case controller & defrost panel', short: 'CONTROLS', kind: 'station', rect: { x: 740, y: 40, w: 40, h: 80 }, pin: { x: 760, y: 80 }, stand: { x: 710, y: 80 } },
    { id: 'PPE', label: 'Safety wall — PPE & lockout', short: 'PPE / LOTO', kind: 'station', rect: { x: 740, y: 140, w: 40, h: 80 }, pin: { x: 760, y: 180 }, stand: { x: 710, y: 180 } },
  ],
  spawn: { x: 380, y: 500 },
}
