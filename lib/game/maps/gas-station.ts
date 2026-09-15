import type { GameMap } from '../types'

// A corner convenience store: sales floor on the left, cooler / back room on the
// right, condensing unit and AC outside the back wall.
export const GAS_STATION_MAP: GameMap = {
  w: 720,
  h: 460,
  floor: 'tile',
  obstacles: [
    { x: 0, y: 0, w: 260, h: 20, kind: 'wall' },
    { x: 340, y: 0, w: 380, h: 20, kind: 'wall' },
    { x: 0, y: 0, w: 20, h: 460, kind: 'wall' },
    { x: 0, y: 440, w: 720, h: 20, kind: 'wall' },
    { x: 700, y: 0, w: 20, h: 460, kind: 'wall' },
    { x: 560, y: 20, w: 20, h: 130, kind: 'wall' },
    { x: 560, y: 210, w: 20, h: 130, kind: 'wall' },
    { x: 560, y: 340, w: 60, h: 20, kind: 'wall' },
    { x: 660, y: 340, w: 40, h: 20, kind: 'wall' },
    { x: 40, y: 50, w: 120, h: 50, kind: 'counter', label: 'COUNTER' },
    { x: 100, y: 150, w: 50, h: 200, kind: 'shelf', label: 'SNACKS' },
    { x: 200, y: 150, w: 50, h: 200, kind: 'shelf', label: 'GROCERY' },
    { x: 380, y: 50, w: 120, h: 40, kind: 'counter', label: 'FOUNTAIN' },
  ],
  zones: [
    { label: 'SALES FLOOR', x: 175, y: 132 },
    { label: 'BEER CAVE', x: 640, y: 34 },
    { label: 'BACK ROOM', x: 640, y: 224 },
    { label: 'OUTSIDE', x: 640, y: 378 },
  ],
  equipment: [
    { id: 'RC1', label: 'Drinks cooler RC1', kind: 'reach-in-cooler', rect: { x: 300, y: 150, w: 40, h: 110 }, pin: { x: 320, y: 205 }, stand: { x: 270, y: 210 } },
    { id: 'RC2', label: 'Drinks cooler RC2', kind: 'reach-in-cooler', rect: { x: 300, y: 280, w: 40, h: 110 }, pin: { x: 320, y: 335 }, stand: { x: 270, y: 330 } },
    { id: 'FZ1', label: 'Ice cream freezer FZ1', kind: 'reach-in-freezer', rect: { x: 20, y: 150, w: 30, h: 120 }, pin: { x: 42, y: 210 }, stand: { x: 70, y: 210 } },
    { id: 'CF1', label: 'Bagged-ice chest CF1', kind: 'chest-freezer', rect: { x: 20, y: 300, w: 30, h: 90 }, pin: { x: 42, y: 345 }, stand: { x: 70, y: 350 } },
    { id: 'IM1', label: 'Ice machine IM1', kind: 'ice-machine', rect: { x: 430, y: 160, w: 60, h: 60 }, pin: { x: 460, y: 190 }, stand: { x: 460, y: 250 } },
    { id: 'FD1', label: 'Floor drain (fountain)', kind: 'floor-drain', rect: { x: 412, y: 102, w: 16, h: 16 }, pin: { x: 420, y: 110 }, stand: { x: 450, y: 110 }, walkable: true },
    { id: 'WC1', label: 'Beer cave (walk-in)', kind: 'walk-in-cooler', rect: { x: 590, y: 40, w: 100, h: 120 }, pin: { x: 640, y: 100 }, stand: { x: 640, y: 180 } },
    { id: 'CU1', label: 'Condensing unit CU1', kind: 'condensing-unit', rect: { x: 590, y: 380, w: 50, h: 50 }, pin: { x: 615, y: 405 }, stand: { x: 610, y: 370 } },
    { id: 'AC1', label: 'Split AC — outdoor unit', kind: 'split-ac', rect: { x: 650, y: 380, w: 40, h: 50 }, pin: { x: 670, y: 405 }, stand: { x: 670, y: 370 } },
    { id: 'EN', label: 'Front entrance', kind: 'entrance', rect: { x: 260, y: 0, w: 80, h: 20 }, pin: { x: 300, y: 12 }, stand: { x: 300, y: 50 }, walkable: true },
  ],
  spawn: { x: 300, y: 60 },
}
