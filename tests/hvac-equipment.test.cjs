const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, f)

const {
  usesRefrigerant, needsServiceArea, equipmentLabel, photoSlotsLeft, MAX_UNIT_PHOTOS,
} = require('../lib/maintenance/hvac-equipment.ts')

const ALL = ['AIR_HANDLER', 'MAIN_AC', 'RTU', 'EXHAUST_FAN', 'UNIT_HEATER']

test('a unit heater is never asked for a refrigerant', () => {
  // It is a gas appliance. Asking invites a tech to pick something to get past
  // the field, which puts a made-up refrigerant on a report that reads as fact.
  assert.equal(usesRefrigerant('UNIT_HEATER'), false)
})

test('an exhaust fan is not asked either - it is a fan', () => {
  assert.equal(usesRefrigerant('EXHAUST_FAN'), false)
})

test('units that do have a refrigerant circuit are still asked', () => {
  for (const t of ['AIR_HANDLER', 'MAIN_AC', 'RTU']) {
    assert.equal(usesRefrigerant(t), true, t)
  }
})

test('an unset type asks for nothing', () => {
  assert.equal(usesRefrigerant(''), false)
  assert.equal(needsServiceArea(''), false)
  assert.equal(equipmentLabel(''), '')
})

test('every known type gets an explicit refrigerant answer', () => {
  // A type added later must be classified deliberately, not inherit a default.
  for (const t of ALL) assert.equal(typeof usesRefrigerant(t), 'boolean', t)
})

test('service-area units are the ones named by where they serve', () => {
  for (const t of ['RTU', 'EXHAUST_FAN', 'UNIT_HEATER']) assert.equal(needsServiceArea(t), true, t)
  for (const t of ['AIR_HANDLER', 'MAIN_AC']) assert.equal(needsServiceArea(t), false, t)
})

test('labels fold the service area in when there is one', () => {
  assert.equal(equipmentLabel('UNIT_HEATER'), 'Unit Heater')
  assert.equal(equipmentLabel('UNIT_HEATER', 'Receiving'), 'UH Receiving')
  assert.equal(equipmentLabel('RTU', 'Bakery'), 'RTU Bakery')
  assert.equal(equipmentLabel('EXHAUST_FAN', 'Deli'), 'EF Deli')
  assert.equal(equipmentLabel('MAIN_AC', 'ignored'), 'Main AC')
})

test('a unit takes two photos and no more', () => {
  assert.equal(MAX_UNIT_PHOTOS, 2)
  assert.equal(photoSlotsLeft(0), 2)
  assert.equal(photoSlotsLeft(1), 1)
  assert.equal(photoSlotsLeft(2), 0)
})

test('an already-full unit reports zero slots, never a negative one', () => {
  // The result is used directly as a slice length; a negative would silently
  // drop photos the tech had already taken.
  assert.equal(photoSlotsLeft(3), 0)
  assert.equal(photoSlotsLeft(99), 0)
  assert.equal([1, 2, 3].slice(0, photoSlotsLeft(3)).length, 0)
})

/* ── The form itself. A rule that only exists inside the page can drift out of
 *    step with the module that is tested, so these read the page as text. ── */

const PAGE = 'app/maintenance/hvac-pm/page.tsx'
const src = () => fs.readFileSync(PAGE, 'utf8')

test('the form asks the module whether a unit has a refrigerant', () => {
  const s = src()
  assert.match(s, /usesRefrigerant\(eq\.type\) && \(/,
    'the Refrigerant Type field must be wrapped in a usesRefrigerant(eq.type) gate')
  // The gate has to sit around the select, not merely appear somewhere above it.
  const gate = s.indexOf('usesRefrigerant(eq.type) && (')
  const select = s.indexOf('Refrigerant Type')
  assert.ok(gate !== -1 && select > gate && select - gate < 400,
    'the gate must immediately precede the Refrigerant Type field')
})

test('the form does not keep its own copy of the per-type rules', () => {
  // These lived in the page as consts. Two copies is how the season values
  // drifted from the database without anything failing.
  const s = src()
  assert.doesNotMatch(s, /const needsServiceArea =/, 'page re-declares needsServiceArea')
  assert.doesNotMatch(s, /const equipmentLabel =/, 'page re-declares equipmentLabel')
  assert.doesNotMatch(s, /const usesRefrigerant =/, 'page re-declares usesRefrigerant')
  assert.doesNotMatch(s, /type EquipmentType =/, 'page re-declares EquipmentType')
  assert.match(s, /from '@\/lib\/maintenance\/hvac-equipment'/)
})

test('a unit photo grid is capped by the shared constant, not a literal', () => {
  const s = src()
  assert.match(s, /maxPhotos=\{MAX_UNIT_PHOTOS\}/)
  assert.doesNotMatch(s, /maxPhotos=\{2\}/, 'cap must come from MAX_UNIT_PHOTOS')
})

test('stored equipment is brought up to the current shape on the way in', () => {
  // Reports saved before units had photos have no photos array; reading
  // eq.photos.length on one of those would throw and blank the page.
  const s = src()
  const restores = [...s.matchAll(/setEquipment\((?!prev)([^)]*)\)/g)].map(m => m[1])
  assert.ok(restores.length >= 2, 'expected the draft and the saved-report restores')
  for (const arg of restores) {
    assert.match(arg, /normaliseEquipment\(/, `setEquipment(${arg}) bypasses normaliseEquipment`)
  }
})

test('normalising drops a refrigerant the form can no longer show', () => {
  // An older unit heater may carry one. Hidden and kept, it would sit on the
  // report as fact with no field left to correct it in.
  assert.match(src(), /refrigerantType: usesRefrigerant\(e\.type\) \? e\.refrigerantType : ''/)
})
