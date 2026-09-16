import type { GameMap } from '../types'

// A Protocol HE store: no machine room, just two distributed modules in an
// alcove behind the sales floor and a remote condenser on the pad. The low
// temp module runs EVI scrolls with demand cooling, which is the whole
// character of this level — those compressors live and die by liquid
// injection, and the charge per module is small enough that a modest leak
// shows up as flash gas within a day.
export const PROTOCOL_STORE_MAP: GameMap = {
  w: 1000,
  h: 600,
  floor: 'tile',
  obstacles: [
    { x: 0, y: 0, w: 300, h: 20, kind: 'wall' },
    { x: 380, y: 0, w: 620, h: 20, kind: 'wall' },
    { x: 0, y: 580, w: 1000, h: 20, kind: 'wall' },
    { x: 0, y: 0, w: 20, h: 600, kind: 'wall' },
    { x: 980, y: 0, w: 20, h: 600, kind: 'wall' },
    // Alcove wall — the opening is the gap at y 170-250.
    { x: 660, y: 20, w: 20, h: 150, kind: 'wall' },
    { x: 660, y: 250, w: 20, h: 330, kind: 'wall' },
    // Alcove / outside pad — service door at x 880-940.
    { x: 680, y: 360, w: 200, h: 20, kind: 'wall' },
    { x: 940, y: 360, w: 40, h: 20, kind: 'wall' },
    { x: 470, y: 40, w: 160, h: 60, kind: 'checkout', label: 'CHECKOUT' },
    { x: 140, y: 150, w: 55, h: 290, kind: 'shelf', label: 'AISLE 1' },
    { x: 275, y: 150, w: 55, h: 290, kind: 'shelf', label: 'AISLE 2' },
    { x: 60, y: 60, w: 100, h: 40, kind: 'produce', label: 'PRODUCE' },
  ],
  zones: [
    { label: 'SALES FLOOR', x: 210, y: 130 },
    { label: 'FROZEN', x: 470, y: 130 },
    { label: 'DELI & MEAT', x: 345, y: 482 },
    { label: 'PROTOCOL MODULES', x: 830, y: 34 },
    { label: 'OUTSIDE PAD', x: 830, y: 402 },
  ],
  equipment: [
    { id: 'P1', label: 'Produce case P1 (MT)', kind: 'produce-case', rect: { x: 20, y: 150, w: 30, h: 290 }, pin: { x: 42, y: 295 }, stand: { x: 75, y: 300 } },
    { id: 'F1', label: 'Frozen doors F1 (LT)', kind: 'reach-in-freezer', rect: { x: 400, y: 150, w: 40, h: 120 }, pin: { x: 428, y: 210 }, stand: { x: 458, y: 210 } },
    { id: 'F2', label: 'Frozen doors F2 (LT)', kind: 'reach-in-freezer', rect: { x: 400, y: 290, w: 40, h: 120 }, pin: { x: 428, y: 350 }, stand: { x: 458, y: 350 } },
    { id: 'B1', label: 'Ice cream bunker B1 (LT)', kind: 'bunker', rect: { x: 490, y: 170, w: 60, h: 90 }, pin: { x: 520, y: 215 }, stand: { x: 520, y: 300 } },
    { id: 'D1', label: 'Dairy multideck D1 (MT)', kind: 'dairy-case', rect: { x: 610, y: 60, w: 30, h: 110 }, pin: { x: 622, y: 115 }, stand: { x: 575, y: 115 } },
    { id: 'D2', label: 'Dairy multideck D2 (MT)', kind: 'dairy-case', rect: { x: 610, y: 250, w: 30, h: 110 }, pin: { x: 622, y: 305 }, stand: { x: 575, y: 305 } },
    { id: 'DL1', label: 'Deli case DL1 (MT)', kind: 'deli-case', rect: { x: 140, y: 500, w: 190, h: 50 }, pin: { x: 235, y: 512 }, stand: { x: 235, y: 470 } },
    { id: 'M1', label: 'Meat case M1 (MT)', kind: 'meat-case', rect: { x: 410, y: 500, w: 190, h: 50 }, pin: { x: 505, y: 512 }, stand: { x: 505, y: 470 } },
    { id: 'FD1', label: 'Floor drain (deli)', kind: 'floor-drain', rect: { x: 360, y: 520, w: 16, h: 16 }, pin: { x: 368, y: 528 }, stand: { x: 370, y: 470 }, walkable: true },
    { id: 'PM1', label: 'Protocol MT module', kind: 'protocol-module', rect: { x: 710, y: 55, w: 160, h: 75 }, pin: { x: 790, y: 92 }, stand: { x: 790, y: 165 } },
    { id: 'PM2', label: 'Protocol LT module (EVI)', kind: 'protocol-lt', rect: { x: 710, y: 195, w: 160, h: 75 }, pin: { x: 790, y: 232 }, stand: { x: 790, y: 305 } },
    { id: 'CD1', label: 'Remote condenser', kind: 'condenser', rect: { x: 700, y: 425, w: 200, h: 70 }, pin: { x: 800, y: 460 }, stand: { x: 800, y: 545 } },
    { id: 'RTU1', label: 'RTU-1 (sales floor)', kind: 'rtu', rect: { x: 915, y: 425, w: 55, h: 80 }, pin: { x: 942, y: 465 }, stand: { x: 890, y: 545 } },
    { id: 'EN', label: 'Front entrance', kind: 'entrance', rect: { x: 300, y: 0, w: 80, h: 20 }, pin: { x: 340, y: 12 }, stand: { x: 340, y: 60 }, walkable: true },
  ],
  spawn: { x: 340, y: 60 },
}
