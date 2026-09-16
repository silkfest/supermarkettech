import type { GameMap } from '../types'

// Hillcrest — the town the campaign lives in. Every store on the career path is
// a real address you drive to, laid out roughly in the order dispatch sends you:
// the trade school and the gas station on the near side of Main, the supermarket
// and the rack-style stores out along Centre and down by the water. The shop is
// where you start every day and where the dispatch board hangs.
//
// Roads and lots are `walkable` obstacles — scenery the van drives over. Only
// the buildings and the trees actually block.
export const TOWN_MAP: GameMap = {
  w: 1240,
  h: 880,
  floor: 'town',
  obstacles: [
    // ── Roads ──
    { x: 0, y: 330, w: 1240, h: 70, kind: 'road', label: 'MAIN STREET', walkable: true },
    { x: 0, y: 660, w: 1240, h: 60, kind: 'road', label: 'INDUSTRIAL WAY', walkable: true },
    { x: 250, y: 0, w: 60, h: 880, kind: 'road', label: 'MILL ST', walkable: true },
    { x: 700, y: 0, w: 60, h: 880, kind: 'road', label: 'CENTRE ST', walkable: true },
    { x: 1060, y: 0, w: 60, h: 880, kind: 'road', label: 'DOCK RD', walkable: true },

    // ── Parking ──
    { x: 340, y: 280, w: 320, h: 50, kind: 'parking', walkable: true },
    { x: 790, y: 280, w: 240, h: 50, kind: 'parking', walkable: true },
    { x: 340, y: 610, w: 320, h: 50, kind: 'parking', walkable: true },
    { x: 790, y: 610, w: 240, h: 50, kind: 'parking', walkable: true },
    { x: 40, y: 600, w: 190, h: 60, kind: 'parking', walkable: true },

    // ── Filler buildings, so the town is not only places you work ──
    { x: 1140, y: 60, w: 90, h: 110, kind: 'building', label: 'HARDWARE' },
    { x: 1140, y: 210, w: 90, h: 100, kind: 'building', label: 'DINER' },
    { x: 1140, y: 430, w: 90, h: 130, kind: 'building', label: 'UNION HALL' },
    { x: 1140, y: 745, w: 90, h: 95, kind: 'building', label: 'WELDING' },

    // ── Trees ──
    ...[[40, 300], [120, 300], [200, 300], [680, 60], [680, 140], [680, 220],
        [1100, 620], [40, 430], [40, 500], [670, 430], [670, 500],
        [1090, 60], [1090, 200], [780, 745], [1100, 745]]
      .map(([x, y]) => ({ x, y, w: 26, h: 26, kind: 'tree' as const })),
  ],
  zones: [
    { label: 'OLD TOWN', x: 135, y: 30 },
    { label: 'CENTRE BLOCK', x: 500, y: 30 },
    { label: 'EAST END', x: 910, y: 30 },
    { label: 'THE WATERFRONT', x: 500, y: 870 },
  ],
  equipment: [
    // Row 1 — north of Main Street
    {
      id: 'classroom', label: 'Trade School', short: 'TRADE SCHOOL', kind: 'storefront', accent: '#10b981',
      rect: { x: 40, y: 60, w: 190, h: 210 }, pin: { x: 135, y: 292 }, stand: { x: 135, y: 350 },
    },
    {
      id: 'supermarket', label: 'Full Supermarket', short: 'SUPERMARKET', kind: 'storefront', accent: '#2563eb',
      rect: { x: 340, y: 60, w: 320, h: 210 }, pin: { x: 500, y: 292 }, stand: { x: 500, y: 355 },
    },
    {
      id: 'protocol-store', label: 'Eastgate Foods', short: 'EASTGATE', kind: 'storefront', accent: '#f97316',
      rect: { x: 790, y: 60, w: 240, h: 210 }, pin: { x: 910, y: 292 }, stand: { x: 910, y: 355 },
    },

    // Row 2 — between Main Street and Industrial Way
    {
      id: 'gas-station', label: 'Corner Gas Station', short: 'CORNER GAS', kind: 'storefront', accent: '#eab308',
      rect: { x: 40, y: 430, w: 190, h: 160 }, pin: { x: 135, y: 612 }, stand: { x: 135, y: 630 },
    },
    {
      id: 'tyler-store', label: 'Lakeshore Market', short: 'LAKESHORE', kind: 'storefront', accent: '#0ea5e9',
      rect: { x: 340, y: 430, w: 320, h: 170 }, pin: { x: 500, y: 622 }, stand: { x: 500, y: 635 },
    },
    {
      id: 'glycol-store', label: 'Northside Market', short: 'NORTHSIDE', kind: 'storefront', accent: '#8b5cf6',
      rect: { x: 790, y: 430, w: 240, h: 170 }, pin: { x: 910, y: 622 }, stand: { x: 910, y: 635 },
    },

    // Row 3 — the waterfront, south of Industrial Way
    {
      id: 'shop', label: 'ColdIQ Refrigeration — the shop', short: 'THE SHOP', kind: 'storefront', accent: '#64748b',
      rect: { x: 40, y: 745, w: 190, h: 95 }, pin: { x: 135, y: 736 }, stand: { x: 135, y: 700 },
    },
    {
      id: 'cascade-store', label: 'Harbour Foods', short: 'HARBOUR', kind: 'storefront', accent: '#14b8a6',
      rect: { x: 340, y: 745, w: 320, h: 95 }, pin: { x: 500, y: 736 }, stand: { x: 500, y: 700 },
    },
    {
      id: 'co2-store', label: 'Summit Grocers', short: 'SUMMIT', kind: 'storefront', accent: '#ef4444',
      rect: { x: 790, y: 745, w: 240, h: 95 }, pin: { x: 910, y: 736 }, stand: { x: 910, y: 700 },
    },
  ],
  spawn: { x: 200, y: 690 },
}
