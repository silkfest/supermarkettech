import type { LevelId } from './progress'

/** Illustrations live in public/game; regenerate with the same filenames to swap them. */
export const LEVEL_ART: Record<LevelId, string> = {
  classroom: '/game/level-trade-school.png',
  'gas-station': '/game/level-gas-station.png',
  supermarket: '/game/level-supermarket.png',
}

const PORTRAIT_BY_COLOR: Record<string, string> = {
  '#2563eb': 'navy',
  '#0d9488': 'teal',
  '#ea580c': 'orange',
  '#7c3aed': 'violet',
  '#475569': 'grey',
}

export function portraitFor(color: string): string | null {
  const name = PORTRAIT_BY_COLOR[color.toLowerCase()]
  return name ? `/game/technician-${name}.png` : null
}
