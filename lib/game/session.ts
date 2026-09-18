import { LEVEL_BY_ID } from './levels'
import { FAULT_BY_ID } from './faults'
import type { ShiftState } from './engine'
import type { SavedGame } from './progress'

const PREFIX = 'coldcall_active_shift:'
const key = (save: SavedGame) => PREFIX + (save.storageOwner ?? 'local')

/** Same-browser checkpoint, separate from account-synced career progress. */
export function saveActiveShift(save: SavedGame, state: ShiftState, briefing: boolean): boolean {
  try {
    if (state.status === 'running') {
      localStorage.setItem(key(save), JSON.stringify({ version: 1, character: save.character, state, briefing }))
    } else if (state.status === 'over') {
      localStorage.removeItem(key(save))
    }
    return true
  } catch { return false }
}

export function loadActiveShift(save: SavedGame): { state: ShiftState; briefing: boolean } | null {
  try {
    const raw = localStorage.getItem(key(save))
    if (!raw) return null
    const value = JSON.parse(raw)
    const s = value.state as ShiftState
    const level = s && LEVEL_BY_ID[s.levelId]
    if (value.version !== 1 || JSON.stringify(value.character) !== JSON.stringify(save.character) ||
        !level || level.kind === 'classroom' || s.status !== 'running' ||
        !Number.isFinite(s.elapsedMin) || s.elapsedMin < 0 ||
        !Number.isFinite(s.lastDispatchMin) || !Number.isInteger(s.spawnIdx) ||
        !Number.isInteger(s.seq) || ![1, 2, 3].includes(s.maxDifficulty) ||
        typeof s.practice !== 'boolean' || !s.character ||
        !['apprentice', 'journeyman'].includes(s.character.role) ||
        !Number.isFinite(s.shrink) || !Number.isFinite(s.complaints) ||
        !Array.isArray(s.calls) || !Array.isArray(s.results) ||
        !Array.isArray(s.usedFaultIds) || !Array.isArray(s.toasts) ||
        ![...s.calls, ...s.results].every(c => FAULT_BY_ID[c.faultId] && level.map.equipment.some(e => e.id === c.equipmentId)) ||
        !s.calls.every(c => Array.isArray(c.checksDone) && (!c.inspection ||
          (Array.isArray(c.inspection.evidence) && Array.isArray(c.inspection.frost) &&
           Array.isArray(c.inspection.safetyMistakes) && Array.isArray(c.inspection.unnecessary))))) return null
    return { state: s, briefing: value.briefing === true }
  } catch { return null }
}
