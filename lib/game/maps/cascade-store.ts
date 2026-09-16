import type { GameMap } from '../types'

// A cascade store: medium temp on a conventional R-448A rack, low temp on a
// subcritical CO2 pack that rejects its heat into the MT side through a
// cascade heat exchanger instead of to outdoor air. The two systems are
// welded together by that one vessel, which is why an MT problem shows up
// first as an LT complaint.
export const CASCADE_STORE_MAP: GameMap = {
  w: 1000,
  h: 600,
  floor: 'tile',
  obstacles: [
    { x: 0, y: 0, w: 300, h: 20, kind: 'wall' },
    { x: 380, y: 0, w: 620, h: 20, kind: 'wall' },
    { x: 0, y: 580, w: 1000, h: 20, kind: 'wall' },
    { x: 0, y: 0, w: 20, h: 600, kind: 'wall' },
    { x: 980, y: 0, w: 20, h: 600, kind: 'wall' },
    // Machine room wall — door at y 280-350.
    { x: 660, y: 20, w: 20, h: 260, kind: 'wall' },
    { x: 660, y: 350, w: 20, h: 230, kind: 'wall' },
    // Machine room / roof pad — service door at x 880-940.
    { x: 680, y: 360, w: 200, h: 20, kind: 'wall' },
    { x: 940, y: 360, w: 40, h: 20, kind: 'wall' },
    { x: 470, y: 40, w: 160, h: 60, kind: 'checkout', label: 'CHECKOUT' },
    { x: 140, y: 160, w: 55, h: 290, kind: 'shelf', label: 'AISLE 1' },
    { x: 275, y: 160, w: 55, h: 290, kind: 'shelf', label: 'AISLE 2' },
    { x: 60, y: 60, w: 100, h: 40, kind: 'produce', label: 'PRODUCE' },
  ],
  zones: [
    { label: 'SALES FLOOR', x: 210, y: 140 },
    { label: 'FROZEN — CO2', x: 480, y: 140 },
    { label: 'DELI & MEAT', x: 345, y: 482 },
    { label: 'MACHINE ROOM', x: 830, y: 34 },
    { label: 'ROOF PAD', x: 830, y: 402 },
  ],
  equipment: [
    { id: 'P1', label: 'Produce case P1 (MT)', kind: 'produce-case', rect: { x: 20, y: 160, w: 30, h: 290 }, pin: { x: 42, y: 305 }, stand: { x: 75, y: 305 } },
    { id: 'D1', label: 'Dairy multideck D1 (MT)', kind: 'dairy-case', rect: { x: 610, y: 60, w: 30, h: 110 }, pin: { x: 622, y: 115 }, stand: { x: 575, y: 115 } },
    { id: 'D2', label: 'Dairy multideck D2 (MT)', kind: 'dairy-case', rect: { x: 610, y: 200, w: 30, h: 110 }, pin: { x: 622, y: 255 }, stand: { x: 575, y: 255 } },
    { id: 'F1', label: 'Frozen doors F1 (CO2 LT)', kind: 'reach-in-freezer', rect: { x: 400, y: 160, w: 40, h: 130 }, pin: { x: 428, y: 225 }, stand: { x: 462, y: 225 } },
    { id: 'F2', label: 'Frozen doors F2 (CO2 LT)', kind: 'reach-in-freezer', rect: { x: 400, y: 320, w: 40, h: 130 }, pin: { x: 428, y: 385 }, stand: { x: 462, y: 385 } },
    { id: 'B1', label: 'Ice cream bunker B1 (CO2 LT)', kind: 'bunker', rect: { x: 495, y: 180, w: 60, h: 90 }, pin: { x: 525, y: 225 }, stand: { x: 525, y: 310 } },
    { id: 'DL1', label: 'Deli case DL1 (MT)', kind: 'deli-case', rect: { x: 140, y: 500, w: 190, h: 50 }, pin: { x: 235, y: 512 }, stand: { x: 235, y: 470 } },
    { id: 'M1', label: 'Meat case M1 (MT)', kind: 'meat-case', rect: { x: 410, y: 500, w: 190, h: 50 }, pin: { x: 505, y: 512 }, stand: { x: 505, y: 470 } },
    { id: 'FD1', label: 'Floor drain (deli)', kind: 'floor-drain', rect: { x: 360, y: 520, w: 16, h: 16 }, pin: { x: 368, y: 528 }, stand: { x: 370, y: 470 }, walkable: true },
    { id: 'RK', label: 'MT rack (R-448A)', kind: 'rack', rect: { x: 700, y: 45, w: 200, h: 70 }, pin: { x: 800, y: 80 }, stand: { x: 800, y: 150 } },
    { id: 'CX', label: 'Cascade heat exchanger', kind: 'cascade-hx', rect: { x: 700, y: 185, w: 110, h: 55 }, pin: { x: 755, y: 212 }, stand: { x: 755, y: 300 } },
    { id: 'LP', label: 'CO2 LT pack (subcritical)', kind: 'co2-rack', rect: { x: 840, y: 175, w: 120, h: 75 }, pin: { x: 900, y: 212 }, stand: { x: 900, y: 300 } },
    { id: 'GD', label: 'CO2 gas detector + ventilation', kind: 'gas-detector', rect: { x: 952, y: 110, w: 22, h: 34 }, pin: { x: 963, y: 127 }, stand: { x: 920, y: 140 } },
    { id: 'RTU1', label: 'RTU-1 (sales floor)', kind: 'rtu', rect: { x: 720, y: 430, w: 55, h: 80 }, pin: { x: 747, y: 470 }, stand: { x: 750, y: 545 } },
    { id: 'RTU2', label: 'RTU-2 (front / deli)', kind: 'rtu', rect: { x: 805, y: 430, w: 55, h: 80 }, pin: { x: 832, y: 470 }, stand: { x: 835, y: 545 } },
    { id: 'EN', label: 'Front entrance', kind: 'entrance', rect: { x: 300, y: 0, w: 80, h: 20 }, pin: { x: 340, y: 12 }, stand: { x: 340, y: 60 }, walkable: true },
  ],
  spawn: { x: 340, y: 60 },
}
