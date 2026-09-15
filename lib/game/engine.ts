import { FAULTS, FAULT_BY_ID } from './faults'
import { LEVEL_BY_ID, type LevelDef } from './levels'
import type { LevelId } from './progress'
import type { ActiveCall, CallResult, Character, FaultDef, SystemKey } from './types'

export const SHIFT_START_HOUR = 6
/** One game minute per this many real ms — an 8 h shift plays in ~12 real minutes. */
export const REAL_MS_PER_GAME_MIN = 1500

export interface Toast { id: number; text: string; tone: 'info' | 'warn' | 'crit' | 'good' }

export interface ShiftState {
  status: 'idle' | 'running' | 'over'
  levelId: LevelId
  character: Character
  elapsedMin: number
  spawnIdx: number
  calls: ActiveCall[]
  results: CallResult[]
  shrink: number
  complaints: number
  usedFaultIds: string[]
  toasts: Toast[]
  seq: number
}

export type ShiftAction =
  | { type: 'START'; character: Character; levelId: LevelId }
  | { type: 'TICK'; dtMin: number }
  | { type: 'UPDATE_CALL'; callId: string; patch: Partial<ActiveCall> }
  | { type: 'SPEND_MINUTES'; callId: string; minutes: number }
  | { type: 'COMPLETE_CALL'; result: CallResult }
  | { type: 'DISMISS_TOAST'; id: number }
  | { type: 'END_SHIFT' }
  | { type: 'RESET' }

export const INITIAL_STATE: ShiftState = {
  status: 'idle',
  levelId: 'supermarket',
  character: { name: '', color: '#2563eb', role: 'apprentice' },
  elapsedMin: 0, spawnIdx: 0, calls: [], results: [],
  shrink: 0, complaints: 0, usedFaultIds: [], toasts: [], seq: 1,
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function chooseFault(state: ShiftState, level: LevelDef): { fault: FaultDef; equipmentId: string } | null {
  const occupied = new Set(state.calls.map(c => c.equipmentId))
  const usedSystems = new Set<SystemKey>([...state.calls, ...state.results].map(c => FAULT_BY_ID[c.faultId].system))
  const candidates = FAULTS
    .filter(f => level.faultPool.includes(f.id) && !state.usedFaultIds.includes(f.id))
    .map(f => ({ f, nodes: level.map.equipment.filter(e => f.kinds.includes(e.kind) && !occupied.has(e.id)) }))
    .filter(c => c.nodes.length > 0)
  if (candidates.length === 0) return null
  // Prefer a system the player has not seen yet this shift so every shift mixes all four.
  const fresh = candidates.filter(c => !usedSystems.has(c.f.system))
  const chosen = pick(fresh.length ? fresh : candidates)
  return { fault: chosen.f, equipmentId: pick(chosen.nodes).id }
}

function withToast(state: ShiftState, text: string, tone: Toast['tone']): ShiftState {
  return { ...state, seq: state.seq + 1, toasts: [...state.toasts.slice(-3), { id: state.seq, text, tone }] }
}

export function shiftReducer(state: ShiftState, action: ShiftAction): ShiftState {
  switch (action.type) {
    case 'START':
      return { ...INITIAL_STATE, status: 'running', character: action.character, levelId: action.levelId }

    case 'RESET':
      return { ...INITIAL_STATE, character: state.character, levelId: state.levelId }

    case 'TICK': {
      if (state.status !== 'running') return state
      const level = LEVEL_BY_ID[state.levelId]
      let s: ShiftState = { ...state, elapsedMin: state.elapsedMin + action.dtMin }

      let shrink = s.shrink
      let complaints = s.complaints
      const calls = s.calls.map(c => {
        const f = FAULT_BY_ID[c.faultId]
        shrink += f.shrinkPerMin * action.dtMin
        if (!c.complained && s.elapsedMin - c.spawnedAtMin >= f.complaintAfterMin) {
          complaints += 1
          s = withToast(s, `Customer complaint logged — ${level.map.equipment.find(e => e.id === c.equipmentId)?.label}`, 'warn')
          return { ...c, complained: true }
        }
        return c
      })
      s = { ...s, calls, shrink, complaints }

      const nextAt = level.spawnAt[s.character.role][s.spawnIdx]
      if (nextAt !== undefined && s.elapsedMin >= nextAt && s.calls.length < level.maxOpen[s.character.role]) {
        const choice = chooseFault(s, level)
        s = { ...s, spawnIdx: s.spawnIdx + 1 }
        if (choice) {
          const call: ActiveCall = {
            id: `call-${s.seq}`, faultId: choice.fault.id, equipmentId: choice.equipmentId,
            spawnedAtMin: s.elapsedMin, complained: false, stage: 'ticket',
            checksDone: [], lotoDone: false, causeAttempts: 0, fixAttempts: 0, minutesSpent: 0,
          }
          const node = level.map.equipment.find(e => e.id === choice.equipmentId)
          s = withToast({ ...s, seq: s.seq + 1, calls: [...s.calls, call] }, `New call: ${node?.label} — ${choice.fault.title}`, 'crit')
        }
      }

      if (s.elapsedMin >= level.shiftLenMin) return { ...s, status: 'over', elapsedMin: level.shiftLenMin }
      return s
    }

    case 'UPDATE_CALL':
      return { ...state, calls: state.calls.map(c => c.id === action.callId ? { ...c, ...action.patch } : c) }

    case 'SPEND_MINUTES': {
      const s = shiftReducer(state, { type: 'TICK', dtMin: action.minutes })
      return { ...s, calls: s.calls.map(c => c.id === action.callId ? { ...c, minutesSpent: c.minutesSpent + action.minutes } : c) }
    }

    case 'COMPLETE_CALL': {
      const s: ShiftState = {
        ...state,
        calls: state.calls.filter(c => c.id !== action.result.callId),
        results: [...state.results, action.result],
        usedFaultIds: [...state.usedFaultIds, action.result.faultId],
      }
      return withToast(s, `Call closed — +${action.result.points} pts`, 'good')
    }

    case 'DISMISS_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) }

    case 'END_SHIFT':
      return { ...state, status: 'over' }
  }
}

// ── Scoring ──────────────────────────────────────────────────────────────────
export function scoreCall(call: ActiveCall, fault: FaultDef, note: string): CallResult {
  const diagnosisPts = call.causeAttempts <= 1 ? 50 : call.causeAttempts === 2 ? 25 : 0
  const fixPts = call.fixAttempts <= 1 ? 30 : call.fixAttempts === 2 ? 15 : 0
  const keyChecks = fault.checks.filter(c => c.key).map(c => c.id)
  const nonLotoChecks = call.checksDone.filter(id => id !== 'loto')
  const efficiencyPts = nonLotoChecks.length <= keyChecks.length + 1 ? 20 : nonLotoChecks.length <= keyChecks.length + 2 ? 10 : 0
  const safetyPenalty = fault.loto && !call.lotoDone ? 15 : 0
  const points = Math.max(0, diagnosisPts + fixPts + efficiencyPts - safetyPenalty)
  return {
    callId: call.id, faultId: fault.id, equipmentId: call.equipmentId, system: fault.system,
    points, diagnosisPts, fixPts, efficiencyPts, safetyPenalty,
    causeAttempts: call.causeAttempts, fixAttempts: call.fixAttempts,
    checksUsed: nonLotoChecks.length, keyChecksTotal: keyChecks.length,
    note, minutesSpent: call.minutesSpent,
  }
}

export function shiftGrade(results: CallResult[], callsSpawned: number, complaints: number, shrink: number) {
  const earned = results.reduce((a, r) => a + r.points, 0)
  const possible = Math.max(1, callsSpawned) * 100
  const penalties = complaints * 10 + Math.round(shrink / 100)
  const total = Math.max(0, earned - penalties)
  const pct = Math.round((total / possible) * 100)
  const grade = pct >= 85 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : pct >= 30 ? 'D' : 'F'
  return { earned, possible, penalties, total, pct, grade }
}

export function clockLabel(elapsedMin: number): string {
  const total = SHIFT_START_HOUR * 60 + Math.floor(elapsedMin)
  const h24 = Math.floor(total / 60) % 24
  const m = total % 60
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${m.toString().padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`
}
