import { z } from 'zod'
import { FAULT_BY_ID } from './faults'
import { LEVEL_BY_ID } from './levels'
import type { ShiftState } from './engine'
import type { Character } from './types'

const KEY = 'coldcall_active_shift_v1'
const schema = z.object({
  status: z.literal('running'), levelId: z.enum(['gas-station', 'supermarket']),
  character: z.object({ name: z.string(), color: z.string(), role: z.enum(['apprentice', 'journeyman']) }),
  elapsedMin: z.number().nonnegative(), spawnIdx: z.number().int().nonnegative(),
  shrink: z.number().nonnegative(), complaints: z.number().int().nonnegative(), seq: z.number().int(),
  usedFaultIds: z.array(z.string()), toasts: z.array(z.unknown()),
  calls: z.array(z.object({
    id: z.string(), faultId: z.string(), equipmentId: z.string(), spawnedAtMin: z.number(),
    complained: z.boolean(), stage: z.enum(['ticket', 'diagnose', 'fix', 'verify', 'log']),
    checksDone: z.array(z.string()), lotoDone: z.boolean(), causeAttempts: z.number(), fixAttempts: z.number(),
    minutesSpent: z.number(), note: z.string().optional(), verified: z.boolean().optional(), verificationStep: z.number().optional(),
  })),
  results: z.array(z.object({
    callId: z.string(), faultId: z.string(), equipmentId: z.string(), system: z.enum(['refrigeration', 'electrical', 'plumbing', 'hvac']),
    points: z.number(), diagnosisPts: z.number(), fixPts: z.number(), efficiencyPts: z.number(), safetyPenalty: z.number(),
    causeAttempts: z.number(), fixAttempts: z.number(), checksUsed: z.number(), keyChecksTotal: z.number(), note: z.string(), minutesSpent: z.number(),
  })), paused: z.boolean().optional(), practice: z.boolean().optional(),
})

export function readShift(character: Character): ShiftState | null {
  try {
    const parsed = schema.safeParse(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
    if (!parsed.success) return null
    const s = parsed.data
    if (s.character.name !== character.name || s.character.color !== character.color || s.character.role !== character.role) return null
    const level = LEVEL_BY_ID[s.levelId]
    if (s.elapsedMin >= level.shiftLenMin || [...s.calls, ...s.results].some(c => !FAULT_BY_ID[c.faultId] || !level.map.equipment.some(e => e.id === c.equipmentId))) return null
    return { ...s, toasts: [], paused: true }
  } catch { return null }
}

export function writeShift(state: ShiftState): boolean {
  try { localStorage.setItem(KEY, JSON.stringify({ ...state, toasts: [] })); return true } catch { return false }
}
export function clearShift() { try { localStorage.removeItem(KEY) } catch { /* storage unavailable */ } }
