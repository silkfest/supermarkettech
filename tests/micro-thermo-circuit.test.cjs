const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript')
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,f)
const {mtState,mtReading,MT_FAULTS}=require('../lib/simulation/micro-thermo-circuit.ts')
const base={fault:'none',power:true,call:true,voltage:120,selector:'AUTO'}
test('SL, LPS, proof and independent supplies remain distinguishable',()=>{
 for(const fault of ['hp','oil','wire']) {const s=mtState({...base,fault});assert.equal(s.sl,false);assert.equal(s.command,false)}
 assert.equal(mtState({...base,fault:'lp'}).sl,true)
 assert.equal(mtState({...base,fault:'proof'}).output,true)
 assert.equal(mtState({...base,fault:'proof'}).proof,false)
 assert.equal(mtState({...base,fault:'field'}).logic,true)
 assert.equal(mtState({...base,fault:'logic'}).field,true)
 for(const s of [{call:false},{selector:'OFF'},{power:false}])assert.equal(mtState({...base,...s}).output,false)
})
test('Supply and load measurements work in either probe direction at both voltages',()=>{
 for(const voltage of [120,208])for(const fault of MT_FAULTS.map(f=>f.id)){
 const s={...base,voltage,fault},state=mtState(s)
 for(const [a,b,expected] of [['FIELD-L','FIELD-R',state.field?voltage:0],['LOGIC-L1','LOGIC-L2',state.logic?24:0],['COMP1','COMP2',state.output?voltage:0]]){
 assert.ok(mtReading(s,'V','none',a,b).startsWith(`${expected} VAC`));assert.equal(mtReading(s,'V','none',a,b),mtReading(s,'V','none',b,a))
 }
 }
 assert.match(mtReading(base,'V','none','SL1','SL2'),/Not modeled/)
})
test('Isolated testing locates contact vs wire opens without testing powered ohms',()=>{
 assert.match(mtReading(base,'Ω','loop','SL1','SL2'),/STOP/)
 for(const fault of ['hp','oil','wire']){
 const s={...base,power:false,fault}
 assert.match(mtReading(s,'Ω','loop','SL1','SL2'),/OL/)
 assert.equal(mtReading(s,'Ω','hp','HP-IN','HP-OUT').startsWith('OL'),fault==='hp')
 assert.equal(mtReading(s,'Ω','oil','OIL-IN','OIL-OUT').startsWith('OL'),fault==='oil')
 assert.equal(mtReading(s,'Ω','wire','OIL-OUT','SL2').startsWith('OL'),fault==='wire')
 }
 assert.match(mtReading({...base,power:false},'Ω','none','SL1','SL2'),/Isolate/)
 assert.match(mtReading({...base,power:false},'Ω','hp','SL1','SL2'),/both isolated/)
})
