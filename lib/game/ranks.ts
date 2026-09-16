import { LEVELS, LEVEL_BY_ID } from './levels'
import { LESSONS } from './lessons'
import type { GameProgress, LevelId } from './progress'
import type { Character } from './types'

/** The rack-style stores — the ones you can only get to after the supermarket. */
export const RACK_LEVELS: LevelId[] = LEVELS.filter(l => l.order >= 4).map(l => l.id)

/** In-school hours credited the first time a trade-school station is passed. */
export const HOURS_PER_STATION = 5

export interface RankDef {
  tier: 1 | 2 | 3 | 4
  name: string
  /** Chip text — 'A1', 'A2', 'A3', 'JM'. */
  short: string
  /** Hours on the book before this rank is even considered. */
  hours: number
  /** Hardest call dispatch will put on your board. */
  maxDifficulty: 1 | 2 | 3
  /** Which board you work — how many calls a shift and how many open at once. */
  pacing: Character['role']
  blurb: string
  /** Everything besides hours, as dispatch would say it. */
  alsoNeeds: (p: GameProgress) => string[]
}

function passedRackStores(p: GameProgress, grades: string[]): LevelId[] {
  return RACK_LEVELS.filter(id => {
    const g = p.levels[id]?.bestGrade
    return !!g && grades.includes(g)
  })
}

export const RANKS: RankDef[] = [
  {
    tier: 1,
    name: 'Apprentice — Level 1',
    short: 'A1',
    hours: 0,
    maxDifficulty: 1,
    pacing: 'apprentice',
    blurb: 'Basic calls: doors, drains, filters, dirty coils, defrost timers. Someone else takes the tricky ones.',
    alsoNeeds: () => [],
  },
  {
    tier: 2,
    name: 'Apprentice — Level 2',
    short: 'A2',
    hours: 96,
    maxDifficulty: 2,
    pacing: 'apprentice',
    blurb: 'Meters and gauges now. Contactors, capacitors, fuses, TXVs, economizers — anything you can put an instrument on.',
    alsoNeeds: p => {
      const n = LESSONS.filter(l => p.lessons[l.id]?.passed).length
      return n >= LESSONS.length ? [] : [`Trade-school ticket (${n}/${LESSONS.length} stations)`]
    },
  },
  {
    tier: 3,
    name: 'Apprentice — Level 3',
    short: 'A3',
    hours: 240,
    maxDifficulty: 3,
    pacing: 'apprentice',
    blurb: 'Everything on the board, including the system-level calls where the answer is how the rack is put together.',
    alsoNeeds: p => {
      const g = p.levels['supermarket']?.bestGrade
      const ok = !!g && LEVEL_BY_ID['supermarket'].passGrades.includes(g)
      return ok ? [] : ['A C or better at the Full Supermarket']
    },
  },
  {
    tier: 4,
    name: 'Journeyman 313A',
    short: 'JM',
    hours: 420,
    maxDifficulty: 3,
    pacing: 'journeyman',
    blurb: 'Your own truck and your own board — three calls open at once, nine a shift, and nobody behind you.',
    alsoNeeds: p => {
      const done = passedRackStores(p, ['A', 'B'])
      return done.length >= 2 ? [] : [`A B or better at two rack-style stores (${done.length}/2)`]
    },
  },
]

export const RANK_BY_TIER = Object.fromEntries(RANKS.map(r => [r.tier, r])) as Record<number, RankDef>

/** Hours a level's shift puts on the book. */
export function shiftHours(id: LevelId): number {
  return LEVEL_BY_ID[id].shiftLenMin / 60
}

/** You hold a rank once you have the hours AND the sign-offs, and every rank below it. */
export function rankOf(p: GameProgress): RankDef {
  let held = RANKS[0]
  for (const r of RANKS) {
    if (p.hours >= r.hours && r.alsoNeeds(p).length === 0) held = r
    else break
  }
  return held
}

export function nextRank(p: GameProgress): RankDef | null {
  return RANKS.find(r => r.tier === rankOf(p).tier + 1) ?? null
}

/** What is still standing between you and the next level, for the dispatch board. */
export function rankGap(p: GameProgress): { next: RankDef; hoursLeft: number; needs: string[] } | null {
  const next = nextRank(p)
  if (!next) return null
  return { next, hoursLeft: Math.max(0, next.hours - p.hours), needs: next.alsoNeeds(p) }
}

/** What each call tier is, in the words dispatch would use on the board. */
export const DIFFICULTY_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Basic — doors, drains, filters, dirty coils',
  2: 'Instrument — contactors, capacitors, valves, controls',
  3: 'System — how the whole rack is put together',
}
