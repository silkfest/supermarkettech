import type { GameMap } from '../types'

// A new-build store on a CO2 transcritical booster. The sales floor looks like
// any other supermarket — the difference is all behind the machine room door:
// one booster pack running MT and LT, a flash tank instead of a liquid
// receiver, an intercooler between the two stages, and a gas cooler on the pad
// outside that runs above the critical point whenever it is warm out.
export const CO2_STORE_MAP: GameMap = {
  w: 1000,
  h: 600,
  floor: 'tile',
  obstacles: [
    { x: 0, y: 0, w: 300, h: 20, kind: 'wall' },
    { x: 380, y: 0, w: 620, h: 20, kind: 'wall' },
    { x: 0, y: 580, w: 1000, h: 20, kind: 'wall' },
    { x: 0, y: 0, w: 20, h: 600, kind: 'wall' },
    { x: 980, y: 0, w: 20, h: 600, kind: 'wall' },
    // Machine room wall — the door is the gap at y 170-250.
    { x: 660, y: 20, w: 20, h: 150, kind: 'wall' },
    { x: 660, y: 250, w: 20, h: 330, kind: 'wall' },
    // Machine room / outside pad — the gap at x 880-940 is the service door.
    { x: 680, y: 360, w: 200, h: 20, kind: 'wall' },
    { x: 940, y: 360, w: 40, h: 20, kind: 'wall' },
    { x: 470, y: 40, w: 160, h: 60, kind: 'checkout', label: 'CHECKOUT' },
    { x: 140, y: 150, w: 55, h: 300, kind: 'shelf', label: 'AISLE 1' },
    { x: 280, y: 150, w: 55, h: 300, kind: 'shelf', label: 'AISLE 2' },
    { x: 60, y: 60, w: 100, h: 40, kind: 'produce', label: 'PRODUCE' },
  ],
  zones: [
    { label: 'SALES FLOOR', x: 215, y: 130 },
    { label: 'FROZEN', x: 470, y: 130 },
    { label: 'DELI & MEAT', x: 350, y: 482 },
    { label: 'MACHINE ROOM', x: 830, y: 38 },
    { label: 'ROOF PAD', x: 830, y: 400 },
  ],
  equipment: [
    { id: 'P1', label: 'Produce case P1', kind: 'produce-case', rect: { x: 20, y: 150, w: 30, h: 300 }, pin: { x: 42, y: 300 }, stand: { x: 75, y: 300 } },
    { id: 'F1', label: 'Frozen doors F1', kind: 'reach-in-freezer', rect: { x: 400, y: 150, w: 40, h: 130 }, pin: { x: 428, y: 215 }, stand: { x: 460, y: 215 } },
    { id: 'F2', label: 'Frozen doors F2', kind: 'reach-in-freezer', rect: { x: 400, y: 300, w: 40, h: 130 }, pin: { x: 428, y: 365 }, stand: { x: 460, y: 365 } },
    { id: 'B1', label: 'Ice cream bunker B1', kind: 'bunker', rect: { x: 490, y: 170, w: 60, h: 90 }, pin: { x: 520, y: 215 }, stand: { x: 520, y: 300 } },
    { id: 'D1', label: 'Dairy multideck D1', kind: 'dairy-case', rect: { x: 610, y: 60, w: 30, h: 110 }, pin: { x: 622, y: 115 }, stand: { x: 575, y: 115 } },
    { id: 'D2', label: 'Dairy multideck D2', kind: 'dairy-case', rect: { x: 610, y: 250, w: 30, h: 110 }, pin: { x: 622, y: 305 }, stand: { x: 575, y: 305 } },
    { id: 'DL1', label: 'Deli case DL1', kind: 'deli-case', rect: { x: 140, y: 500, w: 200, h: 50 }, pin: { x: 240, y: 512 }, stand: { x: 240, y: 470 } },
    { id: 'M1', label: 'Meat case M1', kind: 'meat-case', rect: { x: 420, y: 500, w: 200, h: 50 }, pin: { x: 520, y: 512 }, stand: { x: 520, y: 470 } },
    { id: 'FD1', label: 'Floor drain (deli)', kind: 'floor-drain', rect: { x: 370, y: 520, w: 16, h: 16 }, pin: { x: 378, y: 528 }, stand: { x: 380, y: 470 }, walkable: true },
    { id: 'RK', label: 'CO2 booster pack (MT + LT)', kind: 'co2-rack', rect: { x: 710, y: 55, w: 200, h: 95 }, pin: { x: 810, y: 102 }, stand: { x: 810, y: 185 } },
    { id: 'FT', label: 'Flash tank / receiver', kind: 'flash-tank', rect: { x: 710, y: 200, w: 70, h: 70 }, pin: { x: 745, y: 235 }, stand: { x: 745, y: 310 } },
    { id: 'IC', label: 'Intercooler vessel', kind: 'intercooler', rect: { x: 820, y: 210, w: 90, h: 50 }, pin: { x: 865, y: 235 }, stand: { x: 865, y: 310 } },
    { id: 'GD', label: 'CO2 gas detector + ventilation', kind: 'gas-detector', rect: { x: 952, y: 150, w: 22, h: 34 }, pin: { x: 963, y: 167 }, stand: { x: 915, y: 170 } },
    { id: 'GC', label: 'Gas cooler (transcritical)', kind: 'gas-cooler', rect: { x: 700, y: 430, w: 250, h: 70 }, pin: { x: 825, y: 465 }, stand: { x: 825, y: 540 } },
    { id: 'EN', label: 'Front entrance', kind: 'entrance', rect: { x: 300, y: 0, w: 80, h: 20 }, pin: { x: 340, y: 12 }, stand: { x: 340, y: 60 }, walkable: true },
  ],
  spawn: { x: 340, y: 60 },
}
