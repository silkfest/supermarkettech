'use client'
import { useState } from 'react'
import CopelandComponentView from './CopelandComponentView'
import { saveSimAttempt } from '@/lib/simulation/attempts'
import { COPELAND_FAULTS, CP_POINTS, CP_LABELS, copelandState, copelandReading, type CPPoint, type CPSettings, type CPIsolation, type CopelandFault } from '@/lib/simulation/copeland-circuit'
const box='rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800'
const button='min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-600'
const input='min-h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-600 dark:bg-slate-900'
export default function CopelandCircuitTrainer(){
 const [settings,setSettings]=useState<CPSettings>({fault:'none',power:true,voltage:120,call:true,unload:false,condition:'cool'})
 const [view,setView]=useState<'components'|'wiring'|'compressor'>('components')
 const [red,setRed]=useState<CPPoint>('DC-S'),[black,setBlack]=useState<CPPoint>('RET'),[probe,setProbe]=useState<'red'|'black'>('red')
 const [mode,setMode]=useState<'V'|'Ω'>('V'),[isolation,setIsolation]=useState<CPIsolation>('none')
 const [mystery,setMystery]=useState(false),[solved,setSolved]=useState(false),[guess,setGuess]=useState<CopelandFault>('fuse'),[feedback,setFeedback]=useState(''),[errors,setErrors]=useState(0)
 const state=copelandState(settings),reveal=!mystery||solved
 const update=(patch:Partial<CPSettings>)=>setSettings(s=>({...s,...patch}))
 function start(fault:CopelandFault,hidden=false){setSettings(s=>({...s,fault,power:true,call:true,unload:true,condition:'hot'}));setMode('V');setIsolation('none');setMystery(hidden);setSolved(false);setFeedback('');setErrors(0)}
 function diagnose(){if(guess!==settings.fault){setErrors(n=>n+1);setFeedback('That does not explain all observations. Compare supply, contact voltage drops, coil continuity and mechanical response.');return}setSolved(true);setFeedback('Fault identified. Review the explanation below.');saveSimAttempt({rack:'safety-circuit',scenarioId:`copeland-dc-${settings.voltage}-${settings.fault}`,scenarioName:`Copeland Demand Cooling: ${COPELAND_FAULTS.find(f=>f.id===settings.fault)!.name}`,mode:'wiring',score:Math.max(0,100-errors*15),correct:1,total:1,falsePositives:errors})}
 return <div className="space-y-4 text-slate-800 dark:text-slate-100">
  <header className="rounded-2xl bg-gradient-to-br from-slate-950 to-blue-950 p-5 text-white"><p className="text-xs uppercase tracking-widest text-sky-200">Copeland Discus · electrical training</p><h1 className="mt-2 text-2xl font-bold">Demand Cooling + unloader</h1><p className="mt-2 text-sm text-slate-300">Explore the hardware, trace the terminals and troubleshoot a compressor with CoreSense Protection.</p><div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-md bg-white/10 px-3 py-2">4D reference · your rack photos</span><span className="rounded-md bg-white/10 px-3 py-2">Separate Demand Cooling</span><span className="rounded-md bg-white/10 px-3 py-2">Conventional blocked-suction unloader</span></div></header>
  <section className={`${box} flex flex-wrap items-end gap-3`} aria-label="Exercise setup">
   <label className="grid gap-1 text-xs">Control voltage<select className={input} value={settings.voltage} onChange={e=>{update({voltage:Number(e.target.value) as 120|240});setIsolation('none')}}><option value={120}>120 V · L1–N</option><option value={240}>240 V · L1–L2</option></select></label>
   <button className={button} aria-pressed={!mystery} onClick={()=>start('none')}>Practice</button><button className={button} aria-pressed={mystery} onClick={()=>start(COPELAND_FAULTS[1+Math.floor(Math.random()*(COPELAND_FAULTS.length-1))].id,true)}>Find the Fault</button>
   {!mystery&&<label className="grid min-w-0 flex-1 gap-1 text-xs">Practice condition<select className={input} value={settings.fault} onChange={e=>start(e.target.value as CopelandFault)}>{COPELAND_FAULTS.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
  </section>
  <div className={`${box} flex flex-wrap gap-3 items-end`}>
   <button className={button} aria-pressed={settings.power} onClick={()=>{if(!settings.power){setIsolation('none');setMode('V')}update({power:!settings.power})}}>Control power: {settings.power?'ON':'OFF'}</button>
   <button className={button} aria-pressed={settings.call} onClick={()=>update({call:!settings.call})}>Compressor call: {settings.call?'ON':'OFF'}</button>
   <button className={button} aria-pressed={settings.unload} onClick={()=>update({unload:!settings.unload})}>Request unloading: {settings.unload?'ON':'OFF'}</button>
   {!mystery&&<label className="grid gap-1 text-xs">Head-temperature snapshot<select className={input} value={settings.condition} onChange={e=>update({condition:e.target.value as CPSettings['condition']})}><option value="cool">77°F · no injection demand</option><option value="hot">295°F · injection demanded</option><option value="overheat">310°F · after alarm delay</option></select></label>}
   <p className="w-full text-xs text-slate-600 dark:text-slate-400">Snapshots show settled conditions, not a timed startup or cooldown. Changing temperature / condition starts a new snapshot; power toggling alone does not clear a simulated latched trip. Hidden faults start with cooling and unloading requested.</p>
  </div>
  <div className="safe-top sticky top-0 z-20 rounded-xl bg-slate-950 p-3 text-white shadow-lg">
   <p className="font-mono text-lg text-emerald-300" aria-live="polite">{copelandReading(settings,mode,isolation,red,black)}</p>
   <div className="mt-2 flex flex-wrap gap-2 items-center"><span className="text-xs text-slate-300">{CP_LABELS[red]} → {CP_LABELS[black]}</span>{(['red','black'] as const).map(p=><button key={p} className={`${button} ${probe===p?'bg-slate-700 border-white':''}`} aria-pressed={probe===p} onClick={()=>setProbe(p)}>Place {p} probe</button>)}<button className={button} onClick={()=>setMode(m=>m==='V'?'Ω':'V')}>Meter: {mode}</button></div>
  </div>
  <div className={`${box} grid gap-3 sm:grid-cols-3`}>
   <label className="grid gap-1 text-xs">Red probe<select className={input} value={red} onChange={e=>setRed(e.target.value as CPPoint)}>{CP_POINTS.map(p=><option key={p} value={p}>{CP_LABELS[p]}</option>)}</select></label>
   <label className="grid gap-1 text-xs">Black probe<select className={input} value={black} onChange={e=>setBlack(e.target.value as CPPoint)}>{CP_POINTS.map(p=><option key={p} value={p}>{CP_LABELS[p]}</option>)}</select></label>
   <label className="grid gap-1 text-xs">Isolated resistance test<select className={input} value={isolation} disabled={settings.power} onChange={e=>{setIsolation(e.target.value as CPIsolation);setMode(e.target.value==='none'?'V':'Ω')}}><option value="none">All components connected</option><option value="sensor">NTC sensor unplugged</option><option value="ptc">Motor PTC unplugged</option><option value="injection">Injection coil disconnected</option><option value="unloader">Unloader coil disconnected</option><option value="contactor">Contactor coil disconnected</option></select></label>
  </div>
  <details key={`${settings.fault}-${mystery}`} className={box}><summary className="min-h-11 cursor-pointer font-semibold">Inspect operation</summary><div className="mt-2 space-y-2 text-sm">
   <p>Contactor: <strong>{isolation!=='none'?'Isolated test setup':state.running?'pulled in':'released'}</strong>.</p>
   <p>CoreSense: {!settings.power||['cs-power','fuse'].includes(settings.fault)?'no powered indication':settings.fault==='oil'?'oil protection lockout':settings.fault==='ptc'?'motor temperature trip':'no active protection fault'}.</p>
   <p>Demand Cooling alarm latch: {state.dcTrip?'tripped':'not tripped'}.</p>
   {isolation==='none'&&<><p>Injection observation: {state.injecting?'liquid flow present':state.injectionOutput&&settings.fault==='inject-blocked'?'coil responds; no liquid flow':state.injectionOutput?'no coil response / no liquid flow':'no injection'}.</p><p>Capacity observation: {state.running?state.unloaded?'bank unloaded':'bank remains loaded':'compressor stopped'}.</p></>}
   <p className="text-xs text-slate-600 dark:text-slate-400">Observations are clues, not assumed pressure or amp readings. This trainer does not calculate rack pressures or compressor capacity percentages.</p>
  </div></details>
  <div className="flex flex-wrap gap-2" role="group" aria-label="Drawing view">{([['components','Actual components'],['wiring','Connected wiring'],['compressor','On the compressor']] as const).map(([id,label])=><button key={id} className={`${button} ${view===id?'bg-blue-600 text-white border-blue-600':''}`} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</div>
  <CopelandComponentView view={view} red={red} black={black} voltage={settings.voltage} selectPoint={p=>probe==='red'?setRed(p):setBlack(p)}/>
  {mystery&&!solved&&<div className={`${box} flex flex-wrap gap-3`}><label className="grid min-w-0 flex-1 gap-1 text-xs">Your diagnosis<select className={input} value={guess} onChange={e=>setGuess(e.target.value as CopelandFault)}>{COPELAND_FAULTS.slice(1).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><button className={button} onClick={diagnose}>Confirm diagnosis</button></div>}
  {feedback&&<p className={box} role="status">{feedback}</p>}
  {reveal&&<section className={box}><h2 className="font-bold">{COPELAND_FAULTS.find(f=>f.id===settings.fault)!.name}</h2><p className="mt-2 text-sm">{COPELAND_FAULTS.find(f=>f.id===settings.fault)!.detail}</p>{settings.condition==='overheat'&&<p className="mt-2 text-sm">This snapshot also includes a latched Demand Cooling overtemperature alarm. Return to a cooler snapshot only after considering the cause and the specified manual reset.</p>}</section>}
  <details className={box}><summary className="cursor-pointer min-h-11 font-semibold">Operating sequence, sources and limits</summary><div className="space-y-3 text-sm">
   <p>CoreSense Protection combines oil and motor protection. This arrangement uses a separate Demand Cooling module for discharge-temperature protection; its temperature is not communicated to CoreSense. The conventional unloader has its own rack command.</p>
   <p>Demand Cooling switches injection on as head temperature rises through 292°F and off as it falls through 282°F. Table 1 gives an alarm point of 310°F and a one-minute continuous abnormal sensor-signal delay. The trainer uses three settled snapshots and does not simulate hysteresis or elapsed time.</p>
   <p>The illustrated motor PTC input represents the 4D/6D CoreSense application: trip above 13 kΩ, recovery below 3.2 kΩ plus the specified five-minute off time. The 1 kΩ / 15 kΩ exercise values are simulated; other motor variants have different thresholds. No PTC voltage test or invented connector pin numbers are provided.</p>
   <p>At 77°F the NTC is approximately 90 kΩ; at 292°F approximately 2.1 kΩ; at 310°F approximately 1.7 kΩ. The 295°F exercise value is illustrative interpolation. Coil tests report continuity instead of inventing model-specific resistance.</p>
   <p>The documented control examples are 120 / 240 V. Demand Cooling modules and solenoid coils must match their actual voltage rating. Your photos do not establish their fitted ratings. The 575 V motor circuit, motor links, connector pin geometry and exact rack interlock wiring are not inferred from these photos. The run-proved feed is a functional OEM interface, not an extra terminal on CoreSense. This is an educational circuit, not a serial-specific installation drawing.</p>
   <ul className="list-disc pl-5 space-y-2"><li><a className="underline" target="_blank" rel="noreferrer" href="https://webapps.copeland.com/online-product-information/Publication/LaunchPDF?Index=AEB&PDF=1287">AE4-1287 R10 · Demand Cooling, Figure 12 and Table 1</a></li><li><a className="underline" target="_blank" rel="noreferrer" href="https://webapps.copeland.com/online-product-information/Publication/LaunchPDF?Index=AEB&PDF=1367">AE8-1367 R8 · CoreSense Protection, Figures 4 and 6</a></li><li><a className="underline" target="_blank" rel="noreferrer" href="https://webapps.copeland.com/online-product-information/Publication/LaunchPDF?Index=AEB&PDF=1216">AE21-1216 R17 · conventional blocked-suction unloading</a></li></ul>
  </div></details>
 </div>
}
