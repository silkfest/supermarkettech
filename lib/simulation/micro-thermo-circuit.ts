/** MT-CMP: external A-104 safety loop, not an undocumented internal board model. */
export const MT_FAULTS = [
  { id: 'none', name: 'Healthy circuit', detail: 'All external contacts closed; call, output and proof agree.' },
  { id: 'hp', name: 'High-pressure safety open', detail: 'The isolated HPC contact is open. Determine the pressure-related cause before resetting; do not bypass it.' },
  { id: 'oil', name: 'Oil safety contact open', detail: 'HPC has continuity but the oil safety contact is open. Inspect the oil control indication and diagnose its trip using its own manual.' },
  { id: 'wire', name: 'Open safety-loop return wire', detail: 'Both safety contacts have continuity individually, but the return conductor is open. Repair the wiring after isolation.' },
  { id: 'lp', name: 'Low-pressure contact open', detail: 'The LPS circuit is open while the SL circuit is intact. Check pressure, the LPC and its wiring; this is a separate input.' },
  { id: 'proof', name: 'Proof contact / wiring open', detail: 'The contactor pulls in but proof does not return. Check the proof relay, contact and wiring rather than condemning the safety string.' },
  { id: 'field', name: 'Field supply lost', detail: 'Logic power remains available, but L–N/L2 and the coil have no field voltage. Trace the field supply upstream.' },
  { id: 'logic', name: '24 VAC logic supply lost', detail: 'Field supply is present but the logic supply is absent. Check the center-tapped transformer circuit using the correct wiring drawing.' },
  { id: 'output', name: 'Compressor output path open', detail: 'The simulated command is present but the coil has no voltage with field supply available. Check output protection, switching and wiring; a Run indication alone does not prove delivery of voltage.' },
] as const
export type MTFault = typeof MT_FAULTS[number]['id']
export interface MTSettings { fault: MTFault; power: boolean; call: boolean; voltage: 120 | 208; selector: 'AUTO' | 'OFF' }
export const MT_POINTS = ['FIELD-L','FIELD-R','LOGIC-L1','LOGIC-L2','SL1','HP-IN','HP-OUT','OIL-IN','OIL-OUT','SL2','LPS1','LPS2','PROOF1','PROOF2','COMP1','COMP2'] as const
export type MTPoint = typeof MT_POINTS[number]
export const MT_TESTS = {
  none: { label: 'Connected circuit', ends: [] },
  loop: { label: 'External SL harness unplugged from board', ends: ['SL1','SL2'] },
  hp: { label: 'HPC contact isolated', ends: ['HP-IN','HP-OUT'] },
  oil: { label: 'Oil safety contact isolated', ends: ['OIL-IN','OIL-OUT'] },
  wire: { label: 'SL return conductor isolated', ends: ['OIL-OUT','SL2'] },
  lp: { label: 'External LPS harness isolated', ends: ['LPS1','LPS2'] },
  proof: { label: 'Proof contact isolated · manually actuated', ends: ['PROOF1','PROOF2'] },
} as const
export type MTIsolation = keyof typeof MT_TESTS
export function mtState(s: MTSettings) {
  const logic = s.power && s.fault !== 'logic', field = s.power && s.fault !== 'field'
  const sl = !['hp','oil','wire'].includes(s.fault), lp = s.fault !== 'lp'
  const command = logic && s.call && s.selector === 'AUTO' && sl && lp
  const output = command && field && s.fault !== 'output'
  const proof = output && s.fault !== 'proof'
  return { logic, field, sl, lp, command, output, proof,
    status: !logic ? 'Logic supply unavailable' : !sl ? 'SL open · SLA exercise' : !lp ? 'LPS open' : command && !proof ? 'Command without proof' : output ? 'Running · proof present' : 'Stopped · no command' }
}
const pair = (a: MTPoint,b: MTPoint,x: string,y: string) => (a===x&&b===y)||(a===y&&b===x)
export function mtReading(s: MTSettings, mode: 'V'|'Ω', isolation: MTIsolation, a: MTPoint,b: MTPoint): string {
  if(mode==='Ω') {
    if(s.power) return 'STOP · isolate all power before Ω'
    if(isolation==='none') return 'Isolate the external circuit first'
    const ends: readonly string[] = MT_TESTS[isolation].ends
    if(!ends.includes(a)||!ends.includes(b)) return 'Select both isolated test terminals'
    if(a===b) return '0 Ω · same terminal'
    const open = isolation==='loop' ? ['hp','oil','wire'].includes(s.fault) : s.fault===isolation
    return open ? 'OL · open circuit' : 'Continuity · closed circuit'
  }
  if(isolation!=='none') return 'Reconnect the test circuit for voltage checks'
  if(a===b) return '0 V · same terminal'
  const state = mtState(s)
  if(pair(a,b,'FIELD-L','FIELD-R')) return `${state.field?s.voltage:0} VAC`
  if(pair(a,b,'LOGIC-L1','LOGIC-L2')) return `${state.logic?24:0} VAC`
  if(pair(a,b,'COMP1','COMP2')) return `${state.output?s.voltage:0} VAC · across load`
  return 'Not modeled · confirm board revision / rack schematic'
}
