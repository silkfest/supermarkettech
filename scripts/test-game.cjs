const fs = require('node:fs')
const assert = require('node:assert/strict')
const ts = require('typescript')
// Run the pure TypeScript game logic without adding a test framework.
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename)
}
const { shiftReducer, INITIAL_STATE, scoreCall } = require('../lib/game/engine.ts')
const { FAULT_BY_ID } = require('../lib/game/faults.ts')
const { recordShift, EMPTY_PROGRESS } = require('../lib/game/progress.ts')
const { readShift, writeShift, clearShift } = require('../lib/game/session.ts')
const character = { name: 'Test Tech', color: '#2563eb', role: 'apprentice' }
const start = shiftReducer(INITIAL_STATE, { type: 'START', character, levelId: 'gas-station', practice: true })
assert.equal(start.calls.length, 1, 'practice must start with a call without a real-time tick')
const paused = shiftReducer(start, { type: 'PAUSE', paused: true })
assert.equal(shiftReducer(paused, { type: 'TICK', dtMin: 20 }).elapsedMin, 0)
assert.equal(shiftReducer(paused, { type: 'SPEND_MINUTES', callId: start.calls[0].id, minutes: 20 }).elapsedMin, 0)
assert.equal(shiftReducer(start, { type: 'END_SHIFT' }).abandoned, true)
const completed = shiftReducer(start, { type: 'TICK', dtMin: 999 })
assert.equal(completed.elapsedMin, 360)
assert.equal(completed.status, 'over')
assert.ok(!completed.abandoned)
const fault = FAULT_BY_ID.txv_starved
const call = { ...start.calls[0], faultId: fault.id, causeAttempts: 1, fixAttempts: 1, checksDone: [] }
assert.equal(scoreCall(call, fault, 'test').diagnosisPts, 0, 'guessing must not earn evidence points')
assert.equal(scoreCall(call, fault, 'test').efficiencyPts, 0)
call.checksDone = fault.checks.filter(c => c.key).map(c => c.id)
assert.equal(scoreCall(call, fault, 'test').points, 100)
let progress = recordShift(EMPTY_PROGRESS, 'gas-station', 100, 'A')
progress = recordShift(progress, 'gas-station', 200, 'C')
assert.equal(progress.levels['gas-station'].bestGrade, 'A')
assert.equal(progress.levels['gas-station'].bestScore, 200)
const values = new Map()
global.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }
start.calls[0].note = 'Keep this service note'
assert.equal(writeShift(start), true)
const restored = readShift(character)
assert.equal(restored.calls[0].note, 'Keep this service note')
assert.equal(restored.paused, true)
assert.equal(readShift({ ...character, name: 'Someone else' }), null)
clearShift()
assert.equal(readShift(character), null)
console.log('Game regression checks passed: timing, pause, practice start, evidence, best grade, checkpoint round-trip.')
