import type { GameMap } from '../types'

// A retrofit store on a glycol secondary loop. The medium-temp cases are not
// fed refrigerant at all — a DX chiller cools glycol through a plate heat
// exchanger and two pumps push it around the sales floor. Low temp stays DX
// off the same rack. Half the machine room is a pump house, and most of the
// calls here are hydronic problems wearing a refrigeration hat.
export const GLYCOL_STORE_MAP: GameMap = {
  w: 1000,
  h: 600,
  floor: 'tile',
  obstacles: [
    { x: 0, y: 0, w: 300, h: 20, kind: 'wall' },
    { x: 380, y: 0, w: 620, h: 20, kind: 'wall' },
    { x: 0, y: 580, w: 1000, h: 20, kind: 'wall' },
    { x: 0, y: 0, w: 20, h: 600, kind: 'wall' },
    { x: 980, y: 0, w: 20, h: 600, kind: 'wall' },
    // Machine room wall — door at y 250-330.
    { x: 660, y: 20, w: 20, h: 230, kind: 'wall' },
    { x: 660, y: 330, w: 20, h: 250, kind: 'wall' },
    { x: 470, y: 40, w: 160, h: 60, kind: 'checkout', label: 'CHECKOUT' },
    { x: 130, y: 170, w: 55, h: 270, kind: 'shelf', label: 'AISLE 1' },
    { x: 265, y: 170, w: 55, h: 270, kind: 'shelf', label: 'AISLE 2' },
    { x: 60, y: 60, w: 100, h: 40, kind: 'produce', label: 'PRODUCE' },
  ],
  zones: [
    { label: 'SALES FLOOR', x: 200, y: 150 },
    { label: 'FROZEN', x: 440, y: 150 },
    { label: 'DELI & MEAT', x: 340, y: 482 },
    { label: 'PUMP HOUSE', x: 830, y: 38 },
    { label: 'BACK ROOM', x: 880, y: 372 },
  ],
  equipment: [
    { id: 'P1', label: 'Produce case P1', kind: 'produce-case', rect: { x: 20, y: 170, w: 30, h: 270 }, pin: { x: 42, y: 305 }, stand: { x: 75, y: 305 } },
    { id: 'D1', label: 'Dairy multideck D1 (glycol)', kind: 'dairy-case', rect: { x: 370, y: 170, w: 30, h: 120 }, pin: { x: 382, y: 230 }, stand: { x: 425, y: 230 } },
    { id: 'D2', label: 'Dairy multideck D2 (glycol)', kind: 'dairy-case', rect: { x: 370, y: 320, w: 30, h: 120 }, pin: { x: 382, y: 380 }, stand: { x: 425, y: 380 } },
    { id: 'F1', label: 'Frozen doors F1 (DX)', kind: 'reach-in-freezer', rect: { x: 470, y: 170, w: 40, h: 120 }, pin: { x: 498, y: 230 }, stand: { x: 530, y: 230 } },
    { id: 'B1', label: 'Ice cream bunker B1 (DX)', kind: 'bunker', rect: { x: 470, y: 330, w: 60, h: 90 }, pin: { x: 500, y: 375 }, stand: { x: 500, y: 460 } },
    { id: 'DL1', label: 'Deli case DL1 (glycol)', kind: 'deli-case', rect: { x: 130, y: 500, w: 190, h: 50 }, pin: { x: 225, y: 512 }, stand: { x: 225, y: 470 } },
    { id: 'M1', label: 'Meat case M1 (glycol)', kind: 'meat-case', rect: { x: 400, y: 500, w: 190, h: 50 }, pin: { x: 495, y: 512 }, stand: { x: 495, y: 470 } },
    { id: 'FD1', label: 'Floor drain (deli)', kind: 'floor-drain', rect: { x: 350, y: 520, w: 16, h: 16 }, pin: { x: 358, y: 528 }, stand: { x: 360, y: 470 }, walkable: true },
    { id: 'RK', label: 'DX chiller rack', kind: 'rack', rect: { x: 720, y: 55, w: 190, h: 75 }, pin: { x: 815, y: 92 }, stand: { x: 815, y: 165 } },
    { id: 'HX', label: 'Plate heat exchanger (chiller barrel)', kind: 'plate-hx', rect: { x: 720, y: 200, w: 90, h: 55 }, pin: { x: 765, y: 227 }, stand: { x: 765, y: 290 } },
    { id: 'PS', label: 'Glycol pump skid', kind: 'glycol-skid', rect: { x: 720, y: 350, w: 120, h: 70 }, pin: { x: 780, y: 385 }, stand: { x: 780, y: 450 } },
    { id: 'ET', label: 'Glycol expansion tank', kind: 'expansion-tank', rect: { x: 880, y: 200, w: 60, h: 60 }, pin: { x: 910, y: 230 }, stand: { x: 910, y: 300 } },
    { id: 'WF', label: 'Walk-in freezer (DX)', kind: 'walk-in-freezer', rect: { x: 870, y: 400, w: 90, h: 110 }, pin: { x: 915, y: 455 }, stand: { x: 845, y: 455 } },
    { id: 'RTU1', label: 'RTU-1 (sales floor)', kind: 'rtu', rect: { x: 700, y: 470, w: 55, h: 80 }, pin: { x: 727, y: 510 }, stand: { x: 730, y: 445 } },
    { id: 'EN', label: 'Front entrance', kind: 'entrance', rect: { x: 300, y: 0, w: 80, h: 20 }, pin: { x: 340, y: 12 }, stand: { x: 340, y: 60 }, walkable: true },
  ],
  spawn: { x: 340, y: 60 },
}
