/** Copeland Discus training circuit: CoreSense Protection + separate Demand Cooling.
 * Settled snapshots; physical layouts and field run-proof interface are illustrative.
 * Sources: AE4-1287 R10 figs 12/table 1, AE8-1367 R8 fig 4/6, AE21-1216 R17.
 */
export const COPELAND_FAULTS = [
  { id: 'none', name: 'Normal operation', detail: 'Demand Cooling injects only when required and run-proved. Energizing the conventional blocked-suction unloader reduces capacity.' },
  { id: 'fuse', name: 'Control fuse open', detail: 'Check L1 to return, then FU to return. Loss of control power also releases CoreSense L–M.' },
  { id: 'hp', name: 'HP cutout open', detail: 'The pressure safety interrupts the pilot circuit. Investigate the pressure event before resetting.' },
  { id: 'cs-power', name: 'CoreSense supply open', detail: 'CoreSense supply is absent; L–M opens and L–A makes. Test supply separately from its relay common L.' },
  { id: 'oil', name: 'CoreSense oil lockout', detail: 'Oil protection has locked out after its monitoring interval. Check net oil pressure, oil supply and the sensor. A powered module is not necessarily permitting operation.' },
  { id: 'ptc', name: 'Motor PTC trip', detail: 'CoreSense releases its run contact on a motor-temperature trip. Check motor cooling and the isolated PTC circuit; do not confuse this with the Demand Cooling NTC sensor.' },
  { id: 'dc-sensor', name: 'Demand Cooling sensor open', detail: 'An open NTC input causes a Demand Cooling alarm after the specified delay. The latched L–M contact opens, stopping the compressor and removing the run-proved module feed. Isolate and unplug the sensor to distinguish it from a hot head.' },
  { id: 'dc-power', name: 'Demand Cooling supply lead open', detail: 'The compressor can run with a dead Demand Cooling supply: its manual-reset alarm relay is not the same fail-safe relay as CoreSense. Check DC-L1 to DC-L2. No injection is available; correct the problem before continued operation.' },
  { id: 'inject-coil', name: 'Injection solenoid coil open', detail: 'Demand Cooling output S has voltage, but the open coil cannot operate. Isolate the coil to confirm OL. An open coil must not be diagnosed solely from voltage.' },
  { id: 'inject-blocked', name: 'Injection valve / liquid path blocked', detail: 'The injection coil has voltage and continuity, but no liquid reaches the suction cavity. Check liquid availability, restrictions and the valve. This is a snapshot before a subsequent overtemperature lockout.' },
  { id: 'unload-wire', name: 'Unloader control wire open', detail: 'The rack requests unloading, but voltage does not reach the unloader coil. Compare the command output with the coil feed.' },
  { id: 'unload-coil', name: 'Unloader coil open', detail: 'Full voltage is present at the unloader, but its coil reads OL when isolated. The bank remains loaded.' },
  { id: 'unload-stuck', name: 'Unloader mechanism stuck loaded', detail: 'The coil is powered and has continuity, but the bank remains loaded. Check mechanical operation and available operating pressure differential; continuity does not prove valve movement.' },
  { id: 'contactor', name: 'Contactor coil open', detail: 'Full voltage across A1–A2 with no contactor pull-in. Confirm OL with the isolated coil; Demand Cooling and the unloader remain disabled without run proof.' },
] as const
export type CopelandFault = typeof COPELAND_FAULTS[number]['id']
export const CP_POINTS = ['L1','FU','HP-out','DC-L','DC-M','DC-A','CS-L','CS-M','CS-A','CS-P','CS-2','A1','RET','RUN','DC-L1','DC-L2','DC-S','IV-1','IV-2','UC','U-1','U-2','TS-1','TS-2'] as const
export type CPPoint = typeof CP_POINTS[number]
export type CPVoltage = 120 | 240
export type CPCondition = 'cool' | 'hot' | 'overheat'
export type CPIsolation = 'none' | 'sensor' | 'injection' | 'unloader' | 'contactor'
export type CPSettings = { fault: CopelandFault; power: boolean; voltage: CPVoltage; call: boolean; unload: boolean; condition: CPCondition }
export const CP_LABELS: Record<CPPoint,string> = {L1:'L1',FU:'FU out','HP-out':'HP out','DC-L':'DC L','DC-M':'DC M','DC-A':'DC A','CS-L':'CS L','CS-M':'CS M','CS-A':'CS A','CS-P':'CS supply','CS-2':'CS 2',A1:'CC A1',RET:'Return / A2',RUN:'Run feed','DC-L1':'DC L1','DC-L2':'DC L2','DC-S':'DC S','IV-1':'IV feed','IV-2':'IV return',UC:'Unload out','U-1':'U feed','U-2':'U return','TS-1':'Sensor 1','TS-2':'Sensor 2'}
export function copelandState(s: CPSettings) {
  const {fault:f,power,voltage:v,call,unload,condition}=s
  const csHealthy=power && !['fuse','cs-power','oil','ptc'].includes(f)
  const dcTrip=f==='dc-sensor'||condition==='overheat'
  const running=power&&call&&csHealthy&&!dcTrip&&!['hp','contactor'].includes(f)
  const dcPower=running&&f!=='dc-power'
  const injectionOutput=dcPower&&condition==='hot'
  const injecting=injectionOutput&&!['inject-coil','inject-blocked'].includes(f)
  const unloadVoltage=running&&unload&&f!=='unload-wire'
  const unloaded=unloadVoltage&&!['unload-coil','unload-stuck'].includes(f)
  // Collapse ideal conductors; finite loads pull isolated circuit segments to return.
  const parent: Record<string,string>=Object.fromEntries(CP_POINTS.map(p=>[p,p]))
  const root=(p:string):string=>parent[p]===p?p:(parent[p]=root(parent[p]))
  const join=(a:CPPoint,b:CPPoint,on=true)=>{if(on)parent[root(a)]=root(b)}
  join('L1','FU',f!=='fuse');join('FU','HP-out',call&&f!=='hp');join('HP-out','DC-L');join('DC-L','DC-M',!dcTrip);join('DC-L','DC-A',dcTrip);join('DC-M','CS-L');join('CS-L','CS-M',csHealthy);join('CS-L','CS-A',!csHealthy);join('CS-M','A1');join('FU','CS-P',f!=='cs-power')
  for(const p of ['CS-2','DC-L2','IV-2','U-2'] as const)join(p,'RET')
  join('FU','RUN',running);join('RUN','DC-L1',f!=='dc-power');join('DC-L1','DC-S',injectionOutput);join('DC-S','IV-1');join('RUN','UC',unload);join('UC','U-1',f!=='unload-wire')
  const loads: [CPPoint,CPPoint][]=[['CS-P','CS-2'],['DC-L1','DC-L2']]
  if(f!=='contactor')loads.push(['A1','RET'])
  if(f!=='inject-coil')loads.push(['IV-1','IV-2'])
  if(f!=='unload-coil')loads.push(['U-1','U-2'])
  const potentials:Partial<Record<CPPoint,number|null>>={}
  // No series-load dividers in this topology. Connected unpowered loads reference return.
  const returnRoots=new Set([root('RET')]);let changed=true
  while(changed){changed=false;for(const [a,b] of loads){if(root(a)!==root('L1')&&returnRoots.has(root(b))&&!returnRoots.has(root(a))){returnRoots.add(root(a));changed=true}}}
  for(const p of CP_POINTS)potentials[p]=root(p)===root('L1')?(power?v:0):returnRoots.has(root(p))?0:null
  return {running,csHealthy,dcTrip,dcPower,injectionOutput,injecting,unloaded,unloadVoltage,potentials,nets:Object.fromEntries(CP_POINTS.map(p=>[p,root(p)]))}
}
export function copelandReading(s:CPSettings,mode:'V'|'Ω',isolation:CPIsolation,a:CPPoint,b:CPPoint){
  if(mode==='Ω'){
    if(s.power)return 'Turn control power off'
    const pair=[a,b].sort().join('|')
    const tests: [string,CPIsolation,string][]=[
      ['TS-1|TS-2','sensor',s.fault==='dc-sensor'?'OL':s.condition==='cool'?'≈ 90 kΩ at 77°F':s.condition==='overheat'?'≈ 1.7 kΩ at 310°F':'≈ 2.0 kΩ at 295°F'],
      ['IV-1|IV-2','injection',s.fault==='inject-coil'?'OL':'Continuity · coil intact'],
      ['U-1|U-2','unloader',s.fault==='unload-coil'?'OL':'Continuity · coil intact'],
      ['A1|RET','contactor',s.fault==='contactor'?'OL':'Continuity · coil intact'],
    ]
    const test=tests.find(t=>t[0]===pair)
    if(!test)return 'Select both ends of an isolated component'
    return isolation===test[1]?test[2]:`Isolate ${test[1]} first`
  }
  if(isolation!=='none')return 'Reconnect component for voltage tests'
  if(a.startsWith('TS')||b.startsWith('TS'))return 'Sensor: use isolated resistance test'
  const state=copelandState(s)
  if(state.nets[a]===state.nets[b])return '0 V'
  const va=state.potentials[a],vb=state.potentials[b]
  return va==null||vb==null?'Floating · not a reliable reference':`${Math.abs(va-vb)} V`
}
