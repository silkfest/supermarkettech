const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,f)
const {copelandState:state,copelandReading:reading,COPELAND_FAULTS}=require('../lib/simulation/copeland-circuit.ts')
const defaults={fault:'none',power:true,voltage:120,call:true,unload:true,condition:'hot'}
const volts=(s,a,b)=>reading({...defaults,...s},'V','none',a,b)
test('Cooling and capacity commands operate independently; both stop without operation',()=>{
 assert.equal(state(defaults).injecting,true);assert.equal(state(defaults).unloaded,true)
 assert.equal(state({...defaults,unload:false}).injecting,true)
 assert.equal(state({...defaults,unload:false}).unloaded,false)
 assert.equal(state({...defaults,condition:'cool'}).injecting,false)
 assert.equal(state({...defaults,condition:'cool'}).unloaded,true)
 for(const change of [{call:false},{power:false},{fault:'contactor'},{fault:'hp'},{fault:'oil'}]){
  const s=state({...defaults,...change});assert.equal(s.injecting,false);assert.equal(s.unloaded,false);assert.equal(s.dcPower,false)
 }
})
test('CoreSense supply failure differs from oil/PTC trips; DC supply loss does not imitate its alarm relay',()=>{
 for(const voltage of [120,240]){
  for(const fault of ['cs-power','oil','ptc'])assert.equal(volts({fault,voltage},'CS-L','CS-M'),`${voltage} V`)
  assert.equal(volts({fault:'cs-power',voltage},'CS-P','CS-2'),'0 V')
  assert.equal(volts({fault:'oil',voltage},'CS-P','CS-2'),`${voltage} V`)
  assert.equal(volts({fault:'dc-power',voltage},'DC-L1','DC-L2'),'0 V')
  assert.equal(state({...defaults,fault:'dc-power',voltage}).running,true)
  assert.equal(volts({fault:'dc-sensor',voltage},'DC-L','DC-M'),`${voltage} V`)
  assert.equal(volts({fault:'dc-sensor',voltage},'DC-L','DC-A'),'0 V')
  assert.equal(volts({fault:'dc-sensor',voltage},'DC-L1','DC-L2'),'0 V')
 }
})
test('Coils and mechanical faults are distinguishable without invented coil resistance',()=>{
 for(const voltage of [120,240]){
  for(const fault of ['inject-coil','inject-blocked']){
   assert.equal(volts({fault,voltage},'IV-1','IV-2'),`${voltage} V`)
   assert.equal(state({...defaults,fault,voltage}).injecting,false)
  }
  for(const fault of ['unload-coil','unload-stuck'])assert.equal(volts({fault,voltage},'U-1','U-2'),`${voltage} V`)
  assert.equal(volts({fault:'unload-wire',voltage},'U-1','U-2'),'0 V')
  assert.equal(volts({fault:'unload-wire',voltage},'UC','U-1'),`${voltage} V`)
 }
 assert.equal(reading({...defaults,power:false,fault:'inject-coil'},'Ω','injection','IV-1','IV-2'),'OL')
 assert.match(reading({...defaults,power:false,fault:'inject-blocked'},'Ω','injection','IV-1','IV-2'),/Continuity/)
 assert.match(reading(defaults,'Ω','injection','IV-1','IV-2'),/power off/)
 assert.match(reading({...defaults,power:false},'Ω','none','IV-1','IV-2'),/Isolate/)
})
test('Sensor opens, floating relay contacts and stopped-coil islands do not yield misleading voltage',()=>{
 assert.equal(reading({...defaults,power:false,fault:'dc-sensor'},'Ω','sensor','TS-1','TS-2'),'OL')
 assert.match(reading({...defaults,power:false,condition:'cool'},'Ω','sensor','TS-2','TS-1'),/90 kΩ/)
 assert.match(volts({},'CS-A','RET'),/Floating/)
 assert.match(volts({call:false,fault:'contactor'},'A1','RET'),/Floating/)
 assert.match(volts({},'TS-1','RET'),/isolated resistance/)
 for(const f of COPELAND_FAULTS){const s=state({...defaults,fault:f.id,power:false});assert.equal(s.running,false);for(const v of Object.values(s.potentials))assert.ok(v===0||v===null)}
})

test('LP opens independently of HP while CoreSense stays supplied',()=>{
 for(const voltage of [120,240]){
  assert.equal(volts({fault:'lp',voltage},'HP-out','RET'),`${voltage} V`)
  assert.equal(volts({fault:'lp',voltage},'LP-out','RET'),'0 V')
  assert.equal(volts({fault:'lp',voltage},'HP-out','LP-out'),`${voltage} V`)
  assert.equal(volts({fault:'lp',voltage},'CS-P','CS-2'),`${voltage} V`)
  assert.equal(state({...defaults,fault:'lp',voltage}).running,false)
 }
})
test('PTC resistance rises on a motor trip and remains distinct from the Demand Cooling NTC',()=>{
 const s={...defaults,power:false,fault:'ptc'}
 assert.match(reading(s,'Ω','ptc','PTC-1','PTC-2'),/15 kΩ/)
 assert.match(reading({...s,fault:'none'},'Ω','ptc','PTC-2','PTC-1'),/1 kΩ/)
 assert.match(reading(s,'Ω','sensor','PTC-1','PTC-2'),/Isolate ptc/)
 assert.match(reading({...s,power:true},'Ω','ptc','PTC-1','PTC-2'),/power off/)
 assert.match(volts({},'PTC-1','RET'),/isolated resistance/)
 assert.match(reading(s,'Ω','sensor','TS-1','TS-2'),/2.0 kΩ/)
})
