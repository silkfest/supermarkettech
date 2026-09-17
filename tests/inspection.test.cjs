const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
// Small test-only loader; production remains standard Next/TypeScript.
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, filename)
}
const { shiftReducer, INITIAL_STATE, scoreCall } = require('../lib/game/engine.ts')
const { initialInspection, F1_FAULT, MEASUREMENTS } = require('../lib/game/inspection/f1.ts')
const { canDiagnose, canVerify, interact, tickInspection } = require('../lib/game/inspection/engine.ts')
const { LEVELS } = require('../lib/game/levels.ts')
const { NavGrid } = require('../lib/game/grid.ts')
function start(levelId = 'supermarket') {
  return shiftReducer(shiftReducer(INITIAL_STATE, { type: 'START', levelId, character: { name: 'Test tech', color: '#2563eb', role: 'apprentice' }, maxDifficulty: 2 }), { type: 'TICK', dtMin: 0.1 })
}
function fixture() {
  let state = start()
  const id = state.calls[0].id
  return {
    get state() { return state },
    get call() { return state.calls.find(c => c.id === id) },
    act(action) { state = shiftReducer(state, { type: 'INSPECT', callId: id, action }); return this },
    sample(id) { const m = MEASUREMENTS.find(m => m.id === id); return this.act({ type: 'measure', measurement: id, tool: m.tool, mode: m.mode || '', terminals: m.terminals || [] }) },
    observe(component) { return this.act({ type: 'observe', component, tool: component === 'controller' ? 'controller' : 'flashlight' }) },
    hands(type) { return this.act({ type, tool: 'hands' }) },
    wait(minutes) { return this.act({ type: 'wait', minutes }) }
  }
}
test('Full Supermarket deterministically dispatches F1 without revealing cause', () => {
  const s = start()
  assert.equal(s.calls[0].equipmentId, 'F1')
  assert.equal(s.calls[0].faultId, 'defrost_heater_open')
  assert.deepEqual(s.calls[0].inspection.evidence, [])
  assert.match(s.toasts[0].text, /WO #38471/)
  assert.doesNotMatch(s.toasts[0].text, /heater|open|Half/)
})
test('complete observe → measure → repair → verify → score service path', () => {
  const f = fixture()
  f.observe('coil').observe('controller').sample('product')
  assert.ok(f.call.inspection.evidence.every(e => e.recorded), 'findings are booked as they are made')
  f.hands('open-cover').act({ type: 'force-defrost', tool: 'controller' }).sample('current').wait(8).observe('coil')
  assert.ok(f.call.inspection.frost[0] < 12)
  assert.ok(f.call.inspection.frost[2] > 80)
  assert.match(f.call.inspection.evidence.find(e => e.id === 'current').value, /5\.[789]/)
  f.hands('isolate').sample('dead').hands('disconnect')
  assert.equal(canDiagnose(f.call.inspection), false, 'element readings still gate the diagnosis')
  for (const id of ['e1', 'e2', 'e3', 'g1', 'g2', 'g3']) f.sample(id)
  assert.equal(canDiagnose(f.call.inspection), true)
  assert.match(f.call.inspection.evidence.find(e => e.id === 'e3').value, /OL/)
  f.act({ type: 'diagnose', system: 'Defrost', component: 'Electric heaters', failure: 'Heater #3 open' })
  f.act({ type: 'replace', part: 'H3', tool: 'hands' })
  assert.equal(canVerify(f.call.inspection), false)
  f.hands('restore').act({ type: 'force-defrost', tool: 'controller' }).hands('open-cover').sample('current').wait(12)
  f.observe('coil').observe('controller')
  assert.ok(f.call.inspection.frost.every(n => n <= 8))
  assert.notEqual(f.call.inspection.terminatedAt, null)
  f.wait(15).wait(15).sample('product').hands('close-cover')
  assert.equal(canVerify(f.call.inspection), true)
  f.act({ type: 'verify' })
  const result = scoreCall(f.call, F1_FAULT, 'H3 open; replaced only H3. Full current, termination and pull-down verified.')
  assert.equal(result.points, 100)
  assert.equal(result.inspection.safetyMistakes.length, 0)
  assert.equal(result.inspection.verified, true)
  const closed = shiftReducer(f.state, { type: 'COMPLETE_CALL', result })
  assert.ok(!closed.calls.some(c => c.id === result.callId))
  assert.equal(closed.results[0].inspection.diagnosis, 'Defrost → Electric heaters → Heater #3 open')
})
test('live ohms, isolation without proving dead, and replacement are rejected', () => {
  const f = fixture().hands('open-cover').sample('e3')
  assert.equal(f.call.inspection.evidence.length, 0)
  assert.equal(f.call.inspection.safetyMistakes.length, 1)
  f.hands('isolate').sample('e3')
  assert.equal(f.call.inspection.evidence.length, 0)
  f.act({ type: 'replace', part: 'H3', tool: 'hands' })
  assert.equal(f.call.inspection.repaired, false)
  f.sample('dead').sample('e3')
  assert.equal(f.call.inspection.evidence.some(e => e.id === 'e3'), false, 'parallel paths must be removed')
})
test('wrong tool/function/lead positions never grant measurements', () => {
  const f = fixture().hands('open-cover')
  for (const a of [
    { tool: 'flashlight', mode: 'amps', terminals: ['L1 feeder','clamp jaw'] },
    { tool: 'clamp', mode: 'ohms', terminals: ['L1 feeder','clamp jaw'] },
    { tool: 'clamp', mode: 'amps', terminals: ['L1 feeder'] }
  ]) f.act({ type: 'measure', measurement: 'current', ...a })
  assert.deepEqual(f.call.inspection.evidence, [])
  f.sample('current')
  assert.equal(f.call.inspection.evidence[0].id, 'current-off')
  assert.equal(canDiagnose(f.call.inspection), false)
})
test('defrost requires a restored circuit; fault failsafe does not masquerade as successful termination', () => {
  const f = fixture().hands('isolate').act({ type: 'force-defrost', tool: 'controller' })
  assert.equal(f.call.inspection.defrostStarted, null)
  f.hands('restore').act({ type: 'force-defrost', tool: 'controller' }).wait(15)
  assert.equal(f.call.inspection.defrostStarted, null)
  assert.equal(f.call.inspection.terminatedAt, null)
  assert.ok(f.call.inspection.frost[2] >= 95)
})
test('bad checks, wrong diagnosis, parts and safety have consequences', () => {
  const f = fixture().observe('txv')
  assert.equal(f.call.inspection.unnecessary.length, 1)
  assert.ok(f.call.minutesSpent >= 4)
  assert.ok(f.state.shrink > 0)
  const s = { ...initialInspection(), isolated: true, provedDead: true, leadsDisconnected: true, diagnosis: 'Defrost → Electric heaters → Heater #3 open' }
  const result = interact({ ...f.call, inspection: s }, { type: 'replace', part: 'H1', tool: 'hands' }, 1)
  assert.equal(result.call.partsWasted, 140)
  assert.equal(result.call.inspection.repaired, false)
})
test('closing/reopening inspection preserves evidence on the active call; JSON round-trip works', () => {
  const f = fixture().observe('drain')
  const restored = JSON.parse(JSON.stringify(f.state))
  assert.equal(restored.calls[0].inspection.evidence[0].recorded, true)
})
test('other store dispatch and navigation remain compatible', () => {
  for (const l of LEVELS.filter(l => l.kind === 'shift' && l.id !== 'supermarket')) {
    const s = start(l.id)
    assert.ok(s.calls.length > 0, l.id)
    assert.equal(s.calls[0].inspection, undefined, l.id)
  }
  const map = LEVELS.find(l => l.id === 'supermarket').map
  const f1 = map.equipment.find(e => e.id === 'F1')
  assert.ok(new NavGrid(map).findPath(map.spawn, f1.stand).length > 0)
})
test('unattended fault raises temperature, frost and product exposure', () => {
  const s = initialInspection()
  const after = tickInspection(s, 200, 200)
  assert.ok(after.productTemp > s.productTemp)
  assert.ok(after.frost[2] >= s.frost[2])
  assert.ok(after.shrink > 0)
})
test('practice only dispatches F1 and rejects premature/duplicate completion', () => {
  let s = shiftReducer(INITIAL_STATE, { type: 'START', levelId: 'supermarket', character: { name: 'Test', color: '#2563eb', role: 'apprentice' }, maxDifficulty: 1, practice: true })
  s = shiftReducer(s, { type: 'TICK', dtMin: 1 })
  s = shiftReducer(s, { type: 'TICK', dtMin: 100 })
  assert.equal(s.calls.length, 1)
  const result = scoreCall(s.calls[0], F1_FAULT, 'Trying to close without any repair or verification.')
  assert.equal(shiftReducer(s, { type: 'COMPLETE_CALL', result }), s)
  assert.equal(shiftReducer(s, { type: 'COMPLETE_CALL', result: { ...result, callId: 'missing' } }), s)
})
test('repeated samples preserve measured temperature history in the notebook', () => {
  const f = fixture().sample('product').wait(10).sample('product')
  const readings = f.call.inspection.evidence.filter(e => e.id === 'product')
  assert.equal(readings.length, 2)
  assert.ok(readings.every(e => e.recorded))
  assert.ok(readings[1].atMin > readings[0].atMin)
})

test('call-count levels end on the work list, not the clock', () => {
  const level = LEVELS.find(l => l.id === 'gas-station')
  assert.equal(level.callTarget, 5)
  assert.equal(LEVELS.find(l => l.id === 'supermarket').callTarget, 10)

  // Far past the old 6 h shift, with calls still open: the clock no longer ends it.
  let s = start('gas-station')
  for (let i = 0; i < 40; i++) s = shiftReducer(s, { type: 'TICK', dtMin: 15 })
  assert.ok(s.elapsedMin > level.shiftLenMin, 'clock runs past the old shift length')
  assert.equal(s.status, 'running')

  // Dispatch keeps the board fed up to maxOpen and stops at the target.
  assert.ok(s.calls.length > 0)
  assert.ok(s.calls.length <= level.maxOpen[s.character.role])
})

test('closing the target number of calls ends a call-count shift', () => {
  let s = start('gas-station')
  const target = LEVELS.find(l => l.id === 'gas-station').callTarget
  let closed = 0
  for (let i = 0; i < 400 && s.status === 'running'; i++) {
    const call = s.calls[0]
    if (call) {
      s = shiftReducer(s, { type: 'COMPLETE_CALL', result: { callId: call.id, faultId: call.faultId, equipmentId: call.equipmentId, points: 10, grade: 'B', note: 'x'.repeat(25), minutes: 5, correctCause: true, correctFix: true, shrink: 0, partsWasted: 0, checksDone: [] } })
      closed++
    } else s = shiftReducer(s, { type: 'TICK', dtMin: 5 })
  }
  assert.equal(closed, target, 'never dispatches more than the work list')
  assert.equal(s.results.length, target)
  assert.equal(s.status, 'over')
})

test('levels without a call target still end on the clock', () => {
  const level = LEVELS.find(l => l.id === 'tyler-store')
  assert.equal(level.callTarget, undefined)
  let s = start('tyler-store')
  for (let i = 0; i < 200 && s.status === 'running'; i++) s = shiftReducer(s, { type: 'TICK', dtMin: 15 })
  assert.equal(s.status, 'over')
  assert.equal(s.elapsedMin, level.shiftLenMin)
})

test('checklists are the gates the technician is shown', () => {
  const { diagnoseChecklist, verifyChecklist } = require('../lib/game/inspection/engine.ts')
  const f = fixture()
  assert.equal(diagnoseChecklist(f.call.inspection).every(c => c.done), canDiagnose(f.call.inspection))
  assert.equal(verifyChecklist(f.call.inspection).every(c => c.done), canVerify(f.call.inspection))
  assert.ok(diagnoseChecklist(f.call.inspection).some(c => !c.done))
})

test('every kind on an oblique level has a sprite, not a fallback', () => {
  const src = fs.readFileSync('components/game/inspection/PixelEquipment.tsx', 'utf8')
  // Kinds the sprite module names explicitly, either as an own-size branch or a
  // `kind === '…'` test inside the shared bodies.
  const named = new Set([
    ...[...src.matchAll(/'([a-z0-9-]+)':\s*<(?:WalkIn|ReachInCooler|ChestFreezer|IceMachine|CondensingUnit|SplitAc|Storefront)/g)].map(m => m[1]),
    ...[...src.matchAll(/\bstorefront:\s*<Storefront/g)].map(() => 'storefront'),
    ...[...src.matchAll(/kind === '([a-z0-9-]+)'/g)].map(m => m[1]),
    ...[...src.matchAll(/o\.kind === '([a-z0-9-]+)'/g)].map(m => m[1])
  ])
  // The shared display-case body is the right drawing for these, so they need no
  // branch of their own; the shelving body covers `shelf` the same way.
  const shared = new Set(['dairy-case', 'shelf'])
  // Mirrors PIXEL_LEVELS in app/game/page.tsx, plus the town, which always draws pixel.
  const obliqueMaps = ['town', 'gas-station', 'supermarket']
  const missing = []
  for (const id of obliqueMaps) {
    const map = id === 'town'
      ? require('../lib/game/maps/town.ts').TOWN_MAP
      : LEVELS.find(l => l.id === id).map
    for (const n of [...map.equipment, ...map.obstacles])
      if (!named.has(n.kind) && !shared.has(n.kind)) missing.push(`${id}: ${n.kind}`)
  }
  assert.deepEqual([...new Set(missing)], [], 'these would fall back to a display case or a shelf')
})
