import type { Character } from './types'

export type LevelId = 'classroom' | 'gas-station' | 'supermarket' | 'co2-store'

export interface LevelStat { shifts: number; bestScore: number; bestGrade: string | null }

export interface GameProgress {
  version: 1
  lessons: Record<string, { passed: boolean; bestScore: number }>
  levels: Partial<Record<LevelId, LevelStat>>
  xp: number
}

export interface SavedGame { character: Character | null; progress: GameProgress }

export const EMPTY_PROGRESS: GameProgress = { version: 1, lessons: {}, levels: {}, xp: 0 }

const LOCAL_KEY = 'coldcall_save'

function readLocal(): SavedGame | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as SavedGame) : null
  } catch { return null }
}
function writeLocal(save: SavedGame) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(save)) } catch { /* ignore */ }
}

/** Server copy wins when signed in; localStorage keeps play working offline or logged out. */
export async function loadGame(): Promise<SavedGame> {
  const local = readLocal()
  try {
    // A slow or dead API must never keep the hub on "Loading…" — fall back to the local save.
    const res = await fetch('/api/game/progress', { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const data = await res.json() as { character: Character | Record<string, never>; progress: GameProgress } | null
      if (data && data.progress && data.progress.version === 1) {
        const character = data.character && 'name' in data.character ? data.character as Character : null
        const save = { character, progress: data.progress }
        writeLocal(save)
        return save
      }
      // Signed in but nothing saved yet — seed the server from any local save
      if (local) void saveGame(local)
    }
  } catch { /* offline — fall through to local */ }
  return local ?? { character: null, progress: EMPTY_PROGRESS }
}

export function saveGame(save: SavedGame): void {
  writeLocal(save)
  try {
    void fetch('/api/game/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(save),
    }).catch(() => {})
  } catch { /* never block play on a save */ }
}

export function recordShift(p: GameProgress, level: LevelId, score: number, grade: string): GameProgress {
  const prev = p.levels[level] ?? { shifts: 0, bestScore: 0, bestGrade: null }
  const better = score > prev.bestScore
  return {
    ...p,
    xp: p.xp + score,
    levels: {
      ...p.levels,
      [level]: { shifts: prev.shifts + 1, bestScore: better ? score : prev.bestScore, bestGrade: better || !prev.bestGrade ? grade : prev.bestGrade },
    },
  }
}

export function recordLesson(p: GameProgress, lessonId: string, score: number, passed: boolean): GameProgress {
  const prev = p.lessons[lessonId]
  return {
    ...p,
    xp: p.xp + (passed && !prev?.passed ? 25 : 0),
    lessons: { ...p.lessons, [lessonId]: { passed: passed || !!prev?.passed, bestScore: Math.max(score, prev?.bestScore ?? 0) } },
  }
}

/** One technician's training progress, as the team-wide admin view sees it. */
export interface TeamTrainingRow {
  userId: string
  stationsPassed: number
  graduated: boolean
  xp: number
  levels: Partial<Record<LevelId, LevelStat>>
  updatedAt: string | null
}
