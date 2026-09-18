import { HOURS_PER_STATION } from './ranks'
import type { Character } from './types'

export type LevelId =
  | 'classroom' | 'gas-station' | 'supermarket'
  | 'protocol-store' | 'tyler-store' | 'glycol-store' | 'cascade-store' | 'co2-store'

export interface LevelStat { shifts: number; bestScore: number; bestGrade: string | null }

export interface GameProgress {
  version: 1
  lessons: Record<string, { passed: boolean; bestScore: number }>
  levels: Partial<Record<LevelId, LevelStat>>
  xp: number
  /** Hours on the book toward the next apprenticeship level — shifts worked plus in-school time. */
  hours: number
}

export interface SavedGame { character: Character | null; progress: GameProgress; storageOwner?: string }

export const EMPTY_PROGRESS: GameProgress = { version: 1, lessons: {}, levels: {}, xp: 0, hours: 0 }

/** Saves written before hours existed get credited for the work they already did. */
function withHours(p: GameProgress): GameProgress {
  if (typeof p.hours === 'number') return p
  const shifts = Object.values(p.levels).reduce((a, l) => a + (l?.shifts ?? 0), 0)
  const stations = Object.values(p.lessons).filter(l => l?.passed).length
  return { ...p, hours: shifts * 8 + stations * HOURS_PER_STATION }
}

const LOCAL_KEY = 'coldcall_save'

function readLocal(): SavedGame | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return null
    const save = JSON.parse(raw) as SavedGame
    return { ...save, progress: withHours(save.progress) }
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
      const data = await res.json() as { character: Character | Record<string, never> | null; progress: GameProgress | null; userId?: string } | null
      if (data && data.progress && data.progress.version === 1) {
        const character = data.character && 'name' in data.character ? data.character as Character : null
        const save = { character, progress: withHours(data.progress), storageOwner: data.userId }
        writeLocal(save)
        return save
      }
      // A first account save still needs a stable owner for browser checkpoints.
      if (data?.userId) {
        const save = local && (!local.storageOwner || local.storageOwner === data.userId)
          ? { ...local, storageOwner: data.userId }
          : { character: null, progress: EMPTY_PROGRESS, storageOwner: data.userId }
        writeLocal(save)
        if (save.character) saveGame(save)
        return save
      }
      if (local) saveGame(local)
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

export function recordShift(p: GameProgress, level: LevelId, score: number, grade: string, hours: number): GameProgress {
  const prev = p.levels[level] ?? { shifts: 0, bestScore: 0, bestGrade: null }
  const better = score > prev.bestScore
  const grades = ['F', 'D', 'C', 'B', 'A']
  const bestGrade = grades.indexOf(grade) > grades.indexOf(prev.bestGrade ?? '') ? grade : prev.bestGrade
  return {
    ...p,
    xp: p.xp + score,
    hours: p.hours + hours,
    levels: {
      ...p.levels,
      [level]: { shifts: prev.shifts + 1, bestScore: better ? score : prev.bestScore, bestGrade },
    },
  }
}

export function recordLesson(p: GameProgress, lessonId: string, score: number, passed: boolean): GameProgress {
  const prev = p.lessons[lessonId]
  const firstPass = passed && !prev?.passed
  return {
    ...p,
    xp: p.xp + (firstPass ? 25 : 0),
    hours: p.hours + (firstPass ? HOURS_PER_STATION : 0),
    lessons: { ...p.lessons, [lessonId]: { passed: passed || !!prev?.passed, bestScore: Math.max(score, prev?.bestScore ?? 0) } },
  }
}

/** One technician's training progress, as the team-wide admin view sees it. */
export interface TeamTrainingRow {
  userId: string
  stationsPassed: number
  graduated: boolean
  xp: number
  hours: number
  levels: Partial<Record<LevelId, LevelStat>>
  updatedAt: string | null
}
