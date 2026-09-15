const PORTRAIT_BY_COLOR: Record<string, string> = {
  '#2563eb': 'navy',
  '#0d9488': 'teal',
  '#ea580c': 'orange',
  '#7c3aed': 'violet',
  '#475569': 'grey',
}

/** Portraits live in public/game; regenerate with the same filenames to swap them. */
export function portraitFor(color: string): string | null {
  const name = PORTRAIT_BY_COLOR[color.toLowerCase()]
  return name ? `/game/technician-${name}.png` : null
}
