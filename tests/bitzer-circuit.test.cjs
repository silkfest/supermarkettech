const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename)
const { BITZER_FAULTS, bitzerState, bitzerReading } = require('../lib/simulation/bitzer-circuit.ts')
const volts = (f, a, b) => bitzerReading(f, true, 'V', 'none', a, b)
test('All injected faults release contactor; healthy coil still measures line voltage', () => {
  for (const fault of BITZER_FAULTS) assert.equal(bitzerState(fault.id).running, fault.id === 'none', fault.id)
  assert.equal(volts('none', 'A1', 'N'), '120 V')
  assert.equal(volts('coil', 'A1', 'N'), '120 V')
})
test('SE-B3 supply loss differs from hot PTC while both transfer the relay', () => {
  for (const f of ['mp-power', 'ptc-hot', 'ptc-open']) {
    assert.equal(volts(f, 'SE-11', 'SE-14'), '120 V')
    assert.equal(volts(f, 'SE-11', 'SE-12'), '0 V')
  }
  assert.equal(volts('mp-power', 'SE-L', 'SE-N'), '0 V')
  assert.equal(volts('ptc-hot', 'SE-L', 'SE-N'), '120 V')
  assert.match(volts('none', 'SE-12', 'N'), /Floating/)
})
test('Oil contacts and separately fed INT280 supply are independently diagnosable', () => {
  // Across the oil monitor's own 11-14 contact, which is where it opens.
  assert.equal(volts('oil-trip', 'Oil-11', 'Oil-14'), '120 V')
  // And its 11-12 makes when released, mirroring the SE-B3.
  assert.equal(volts('oil-trip', 'Oil-11', 'Oil-12'), '0 V')
  assert.match(volts('none', 'Oil-12', 'N'), /Floating/)
  assert.equal(volts('oil-trip', 'Oil-L', 'Oil-N'), '120 V')
  assert.equal(volts('oil-power', 'Oil-L', 'Oil-N'), '0 V')
  assert.equal(volts('reg-trip', 'Oil-14', 'Reg-out'), '120 V')
  assert.equal(volts('reg-trip', 'Reg-L', 'Reg-N'), '230 V')
  assert.equal(volts('reg-power', 'Reg-L', 'Reg-N'), '0 V')
  assert.equal(volts('fuse', 'Reg-L', 'Reg-N'), '230 V')
  assert.match(volts('none', 'Reg-L', 'N'), /separate supply/)
})
test('Resistance requires de-energization and isolation, distinguishes open and hot PTC', () => {
  assert.match(bitzerReading('none', true, 'Ω', 'ptc', 'M1', 'M2'), /OFF/)
  assert.match(bitzerReading('none', false, 'Ω', 'none', 'M1', 'M2'), /Isolate/)
  assert.equal(bitzerReading('none', false, 'Ω', 'ptc', 'M1', 'M2'), '450 Ω')
  assert.equal(bitzerReading('ptc-hot', false, 'Ω', 'ptc', 'M1', 'M2'), '6000 Ω')
  assert.equal(bitzerReading('ptc-open', false, 'Ω', 'ptc', 'M1', 'M2'), '450 Ω')
  assert.equal(bitzerReading('ptc-open', false, 'Ω', 'ptc', 'SE-1', 'SE-2'), 'OL')
  assert.equal(bitzerReading('coil', false, 'Ω', 'coil', 'N', 'A1'), 'OL')
  assert.equal(bitzerReading('none', false, 'Ω', 'coil', 'N', 'A1'), '180 Ω')
})
test('208 V variant uses line-to-line readings across all faults and preserves the separate regulator feed', () => {
  const read = (fault, a, b, power = true) => bitzerReading(fault, power, 'V', 'none', a, b, 208)
  for (const fault of BITZER_FAULTS) {
    const state = bitzerState(fault.id, true, 208)
    assert.equal(state.running, fault.id === 'none')
    assert.equal(read(fault.id, 'L1', 'N'), '208 V')
    assert.equal(read(fault.id, 'Reg-L', 'Reg-N'), fault.id === 'reg-power' ? '0 V' : '230 V')
    if (state.breakIndex >= 0) {
      const { CHAIN } = require('../lib/simulation/bitzer-circuit.ts')
      assert.equal(read(fault.id, CHAIN[state.breakIndex], CHAIN[state.breakIndex + 1]), '208 V', fault.id)
    }
    assert.equal(read(fault.id, 'L1', 'N', false), '0 V')
  }
  assert.equal(read('none', 'A1', 'N'), '208 V')
  assert.equal(read('coil', 'A1', 'N'), '208 V')
  assert.equal(read('hp', 'A1', 'N'), '0 V')
  assert.equal(read('none', 'SE-L', 'SE-N'), '208 V')
  assert.equal(read('oil-trip', 'Oil-L', 'Oil-N'), '208 V')
  assert.equal(read('oil-power', 'Oil-L', 'Oil-N'), '0 V')
  assert.match(read('none', 'Reg-L', 'N'), /separate supply/)
})

test('the SE-14 to Oil-11 interconnect fails on its own, with both modules healthy', () => {
  // The fault the six-terminal model made expressible: a crimp off the oil
  // monitor's terminal 11. Both relays have pulled in, so every module test
  // passes, and only the wire itself reads open.
  const s = bitzerState('interconnect')
  assert.equal(s.running, false)
  assert.equal(s.mpHealthy, true, 'the SE-B3 is fine')
  assert.equal(s.oilHealthy, true, 'the oil monitor is fine too')
  assert.equal(volts('interconnect', 'SE-11', 'SE-14'), '0 V', 'SE-B3 contact is made')
  assert.equal(volts('interconnect', 'SE-14', 'Oil-11'), '120 V', 'the open is the wire')
  assert.equal(volts('interconnect', 'Oil-L', 'Oil-N'), '120 V', 'oil monitor still powered')
})

test('the two devices numbered 11/12/14 stay distinguishable', () => {
  // oil-trip must not look like an SE-B3 trip, and vice versa.
  assert.equal(volts('oil-trip', 'SE-11', 'SE-14'), '0 V')
  assert.equal(volts('mp-power', 'Oil-11', 'Oil-14'), '0 V')
  assert.equal(volts('mp-power', 'SE-11', 'SE-14'), '120 V')
  assert.equal(volts('oil-trip', 'Oil-11', 'Oil-14'), '120 V')
})

test('the PTC reads the same from the SE-B3 end as from the terminal board', () => {
  // SE-1/SE-2 and M1/M2 are the two ends of one loop.
  for (const [a, b] of [['M1', 'M2'], ['SE-1', 'SE-2'], ['M1', 'SE-2']]) {
    assert.equal(bitzerReading('none', false, 'Ω', 'ptc', a, b), '450 Ω', `${a}-${b}`)
    assert.equal(bitzerReading('ptc-open', false, 'Ω', 'ptc', a, b), a === 'SE-1' ? 'OL' : '450 Ω', `${a}-${b}`)
  }
  assert.match(bitzerReading('none', true, 'V', 'none', 'SE-1', 'N'), /isolated/i)
})

test('B1-B2 is a link, so it is a continuity check and never a voltage claim', () => {
  assert.match(bitzerReading('none', true, 'V', 'none', 'SE-B1', 'SE-B2'), /continuity/i)
  assert.match(bitzerReading('none', false, 'Ω', 'none', 'SE-B1', 'SE-B2'), /0 Ω/)
})

test('D1 follows the NO contactor auxiliary and floats when released', () => {
  assert.equal(volts('none', 'Oil-D1', 'Oil-N'), '120 V')
  for (const f of BITZER_FAULTS.filter(f => f.id !== 'none')) assert.match(volts(f.id, 'Oil-D1', 'Oil-N'), /Floating/, f.id)
  assert.equal(bitzerReading('none', true, 'V', 'none', 'Oil-D1', 'Oil-N', 208), '208 V')
})

test('PTC readings distinguish sensor resistance from same-wire continuity and a broken lead', () => {
  const read = (f, a, b) => bitzerReading(f, false, 'Ω', 'ptc', a, b)
  for (const f of ['none', 'ptc-hot']) {
    for (const [a,b] of [['M1','SE-1'], ['M2','SE-2'], ['M1','M1']]) assert.equal(read(f, a, b), '0 Ω', `${f}: ${a}-${b}`)
  }
  assert.equal(read('ptc-open', 'SE-1', 'M1'), 'OL')
  assert.equal(read('ptc-open', 'M1', 'M2'), '450 Ω')
  assert.equal(read('ptc-open', 'SE-1', 'M2'), 'OL')
  assert.equal(read('ptc-open', 'M2', 'SE-2'), '0 Ω')
})

test('INT280 separate supply stays on when only control power is opened', () => {
  const read = (a, b, regPower) => bitzerReading('none', false, 'V', 'none', a, b, 120, regPower)
  assert.equal(read('L1', 'N', true), '0 V')
  assert.equal(read('Reg-L', 'Reg-N', true), '230 V')
  assert.equal(read('Reg-L', 'Reg-N', false), '0 V')
  assert.match(bitzerReading('none', false, 'Ω', 'none', 'Reg-L', 'Reg-N', 120, true), /INT280 supply OFF/)
  const s = bitzerState('none', true, 120, false)
  assert.equal(s.running, false)
  assert.equal(s.breakIndex, 7)
})

test('loss of common fuse releases both monitoring relays', () => {
  assert.equal(bitzerState('fuse').mpHealthy, false)
  assert.equal(bitzerState('fuse').oilHealthy, false)
  assert.equal(bitzerState('none', false).mpHealthy, false)
  assert.equal(bitzerState('none', false).oilHealthy, false)
})

test('LP fault opens LP while leaving monitoring supplies intact', () => {
  assert.equal(volts('lp', 'HP-out', 'SE-11'), '120 V')
  assert.equal(volts('lp', 'SE-L', 'SE-N'), '120 V')
  assert.equal(volts('lp', 'Oil-L', 'Oil-N'), '120 V')
})

test('208 V preserves physical terminal N labelling while identifying L2', () => {
  const { bitzerPointLabel } = require('../lib/simulation/bitzer-circuit.ts')
  assert.equal(bitzerPointLabel('SE-N', 208), 'SE-N (to L2)')
  assert.equal(bitzerPointLabel('Oil-N', 208), 'Oil-N (to L2)')
})

test('a second open caused by the independent regulator supply leaves isolated wiring floating', () => {
  const read = (a,b) => bitzerReading('mp-power', true, 'V', 'none', a, b, 120, false)
  assert.match(read('SE-14','N'), /Floating/)
  assert.match(read('Oil-14','N'), /Floating/)
  assert.equal(read('SE-14','Oil-14'), '0 V', 'connected floating points are the same potential')
  assert.equal(read('Reg-out','N'), '0 V', 'intact coil pulls its upstream wire to return')
  assert.equal(read('SE-11','N'), '120 V')
})

test('Mounting detection trips the oil relay with supply intact at either control voltage', () => {
  const { bitzerOilLed } = require('../lib/simulation/bitzer-circuit.ts')
  for (const voltage of [120, 208]) {
    const read = (a, b) => bitzerReading('oil-mount', true, 'V', 'none', a, b, voltage)
    assert.equal(read('Oil-L', 'Oil-N'), `${voltage} V`)
    assert.equal(read('Oil-11', 'Oil-14'), `${voltage} V`)
    assert.equal(read('Oil-11', 'Oil-12'), '0 V')
    assert.equal(bitzerState('oil-mount', true, voltage).running, false)
  }
  assert.equal(bitzerOilLed('oil-mount'), 'flashing red')
  assert.equal(bitzerOilLed('oil-mount', false), 'off')
  assert.equal(bitzerOilLed('oil-power'), 'off')
  assert.equal(bitzerOilLed('fuse'), 'off')
  assert.equal(bitzerOilLed('oil-trip'), 'steady red')
  assert.equal(bitzerOilLed('none'), 'off')
})
