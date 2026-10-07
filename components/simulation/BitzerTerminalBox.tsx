'use client'
import { useState } from 'react'
import type { BitzerPoint, BitzerVoltage } from '@/lib/simulation/bitzer-circuit'

type Props = { voltage: BitzerVoltage; red: BitzerPoint; black: BitzerPoint; selectPoint: (p: BitzerPoint) => void }
type Group = 'all' | 'motor' | 'ptc' | 'control' | 'oil'

export default function BitzerTerminalBox({ voltage, red, black, selectPoint }: Props) {
  const [group, setGroup] = useState<Group>('all')
  const [zoom, setZoom] = useState(false)
  const [detail, setDetail] = useState('Select a connection to trace it. Control and PTC points also place the active meter probe.')
  const ret = voltage === 208 ? 'L2' : 'N'
  const opacity = (g: Group) => group === 'all' || group === g ? 1 : 0.12
  const route = (g: Group, d: string, color: string, label: string, dashed = false) => <path d={d} fill="none" stroke={color} strokeWidth={g === 'motor' ? 6 : 3} strokeDasharray={dashed ? '7 5' : undefined} opacity={opacity(g)}><title>{label}</title></path>
  const terminal = (id: string, x: number, y: number, label: string, description: string, point?: BitzerPoint) => <g key={id} role="button" tabIndex={0} aria-label={`Inspect ${id}`} className="cursor-pointer" onClick={() => { setDetail(description); if (point) selectPoint(point) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetail(description); if (point) selectPoint(point) } }}>
    <title>{description}</title><rect x={x-22} y={y-22} width="44" height="44" fill="#ffffff" fillOpacity="0" />
    <circle cx={x} cy={y} r="10" fill={point && red === point ? '#dc2626' : point && black === point ? '#0f172a' : '#e2e8f0'} stroke="#475569" strokeWidth="2" />
    <path d={`M${x-4} ${y+4} l8 -8`} stroke={point && (red === point || black === point) ? '#fff' : '#475569'} strokeWidth="2" />
    <rect x={x-21} y={y-37} width="42" height="16" rx="3" fill="#f1f5f9" /><text x={x} y={y-25} fontSize="12" textAnchor="middle" fill="#0f172a" fontWeight="700">{label}</text>
  </g>
  return <div className="space-y-3">
    <div><h3 className="font-bold">Inside the compressor terminal box</h3><p className="text-sm">4NES-14-5PU · 575 V / 3 phase / 60 Hz · S/N 2598172095</p>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Direct-start reference: links 1–7, 2–8, 3–9. Layout is illustrative, not a serial-specific factory drawing. The 575 V motor circuit is separate from the selected {voltage} V control supply. Motor terminals are for tracing only; the meter still measures control/PTC points.</p></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Wire tracing layers">{([['all','All wires'],['motor','575 V motor'],['ptc','PTC sensors'],['control','Control wiring'],['oil','Oil monitoring']] as const).map(([id,label]) => <button key={id} aria-pressed={group===id} onClick={()=>setGroup(id)} className={`min-h-11 rounded-lg border px-3 text-xs ${group===id?'bg-blue-600 text-white':'bg-white dark:bg-slate-800'}`}>{label}</button>)}
      <button className="min-h-11 rounded-lg border px-3 text-xs" aria-pressed={zoom} onClick={()=>setZoom(v=>!v)}>{zoom?'Fit box':'Enlarge box'}</button></div>
    <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100" aria-live="polite">{detail}</p>
    <div className="overflow-x-auto rounded-xl border border-slate-300 bg-slate-100" tabIndex={zoom?0:undefined}>
      <svg viewBox="0 0 680 900" style={{width:zoom?1020:'100%',minWidth:zoom?1020:undefined}} role="group" aria-label="4NES-14-5PU direct-start terminal box and external connections" fontFamily="sans-serif">
        <rect width="680" height="900" fill="#f1f5f9" />
        <text x="24" y="26" fontSize="14" fontWeight="700">EXTERNAL PANEL / FIELD WIRING</text>
        <rect x="24" y="48" width="245" height="90" rx="8" fill="#334155" />
        <text x="146" y="70" textAnchor="middle" fill="white" fontSize="13">Main contactor · load side</text>
        {[70,146,222].map((x,i)=>terminal(`T${i+1}`,x,113,`T${i+1}`,`Contactor T${i+1} feeds motor terminal ${i+1}, linked to ${i+7}. 575 V line-to-line motor power; not a control-meter point.`))}
        <rect x="300" y="48" width="356" height="90" rx="8" fill="#dbeafe" stroke="#93c5fd" />
        <text x="478" y="68" textAnchor="middle" fontSize="12">Separate {voltage} V control circuit</text>
        {terminal('fused control',332,113,'FU-out','Fused control supply powers SE-B3 L and oil-monitor brown L.','FU-out')}
        {terminal('control return',408,113,ret,`Control return ${ret} connects SE-B3 N, oil-monitor blue N and coil A2.`,'N')}
        {terminal('LP output',484,113,'LP out','Call → HP → LP → SE-B3 11. This is separate from module supply.','SE-11')}
        {terminal('coil feed',560,113,'A1','INT280 run-permit output feeds contactor A1. A2 returns to the control supply.','A1')}
        <text x="632" y="112" fontSize="12" textAnchor="middle">PE</text>
        <rect x="24" y="215" width="632" height="390" rx="23" fill="#4c8064" stroke="#315a43" strokeWidth="9" />
        <rect x="43" y="237" width="594" height="348" rx="12" fill="#d9e3dc" />
        <rect x="72" y="302" width="276" height="122" rx="9" fill="#ad8766" stroke="#76583e" strokeWidth="3" />
        {[110,210,310].map((x,i)=><g key={x} opacity={opacity('motor')}><rect x={x-13} y="332" width="26" height="58" rx="12" fill="#d6b35d" stroke="#856a2c" strokeWidth="2" />
          {route('motor',`M${[70,146,222][i]} 125 V${169+i*15} H${x} V332`,'#334155',`T${i+1} to ${i+1}/${i+7}`)}
          {terminal(`motor ${i+1}`,x,332,`${i+1}`,`Motor ${i+1}: contactor T${i+1}; direct-start brass link to ${i+7}.`)}
          {terminal(`motor ${i+7}`,x,390,`${i+7}`,`Motor ${i+7}: direct-start link to ${i+1}. Do not use these links for part-winding starting.`)}</g>)}
        {route('motor','M632 130 V283 H600 V318','#15803d','Protective earth to compressor housing')}
        {terminal('protective earth',600,328,'PE','Protective earth bonds the terminal box/compressor housing. It is not a neutral or PTC connection.')}
        {route('ptc','M382 339 H441 V474 H83 V523','#ea580c','M2 to SE-B3 orange lead 2')}
        {route('ptc','M382 394 H425 V459 H65 V500 H83','#ea580c','M1 to SE-B3 orange lead 1')}
        {terminal('M2',382,339,'M2','Motor sensor M2 → orange SE lead 2. Sensor circuit only; no line/control voltage.','M2')}
        {terminal('M1',382,394,'M1','Motor sensor M1 → orange SE lead 1. Measure the isolated motor PTC across M1–M2.','M1')}
        {route('control','M332 125 V193 H455 V443 H110 V502','#475569','Fused control to SE L',true)}
        {route('control','M408 125 V179 H471 V431 H156 V502','#475569','Control return to SE N',true)}
        {route('control','M484 125 V502 H386','#475569','LP output to SE 11',true)}
        <text x="55" y="491" fontSize="10">1</text><text x="71" y="538" fontSize="10">2</text>
        <rect x="83" y="486" width="327" height="78" rx="7" fill="#293139" />
        <text x="246" y="548" textAnchor="middle" fontSize="16" fill="white" fontWeight="700">SE-B3 MOTOR PROTECTOR</text>
        {route('control','M202 511 V530 H248 V511','#eab308','B1–B2 lockout jumper')}
        {(['L','N','B1','B2','12','14','11'] as const).map((l,i)=>terminal(`SE-${l}`,110+i*46,506,l,
          l==='L'?`SE L ← fused ${voltage} V control supply.`:l==='N'?`SE N ← control return ${ret}. Printed N remains N at 208 V.`:l==='11'?'SE 11 ← LP output; relay common.':l==='14'?'SE 14 → grey oil-monitor common 11.':l==='12'?'SE 12: optional fault indication; unused and not connected here.':'B1 ↔ B2 lockout jumper. No supply voltage.',`SE-${l}` as BitzerPoint))}
        {route('oil','M340 516 V577 H193 V712','#64748b','SE 14 to oil monitor grey 11')}
        {route('oil','M332 193 H515 V644 H73 V712','#92400e','Fused control to oil monitor brown L')}
        {route('oil','M408 179 H530 V659 H133 V712','#1d4ed8','Control return to oil monitor blue N')}
        {route('oil','M253 732 V796 H452','#ea580c','Oil monitor orange 14 to INT280 run permit')}
        {route('oil','M353 732 V849 H614 V162 H580','#7c3aed','Oil monitor violet D1 from NO main-contactor auxiliary')}
        <circle cx="332" cy="193" r="4" fill="#475569" /><circle cx="408" cy="179" r="4" fill="#475569" />
        <rect x="458" y="149" width="156" height="32" rx="5" fill="#e2e8f0" stroke="#64748b" /><text x="536" y="170" textAnchor="middle" fontSize="10">FU-out → NO aux → D1</text>
        <text x="38" y="630" fontSize="14" fontWeight="700">EXTERNAL OIL DEVICES / CABLE BREAKOUT</text>
        <rect x="43" y="680" width="348" height="79" rx="8" fill="#cbd5e1" stroke="#64748b" /><text x="217" y="677" textAnchor="middle" fontSize="11">OLC-K1 · bearing oil-presence monitor</text>
        {([['L',73,'BN'],['N',133,'BU'],['11',193,'GY'],['14',253,'OG'],['12',303,'PK'],['D1',353,'VT']] as const).map(([l,x,c])=><g key={l}>{terminal(`Oil-${l}`,x,732,l,`OLC-K1 ${l} / ${c} cable lead. ${l==='12'?'Optional alarm, insulated and unused.':l==='D1'?'Run proof from main-contactor NO auxiliary.':'Trace the corresponding coloured route.'}`,`Oil-${l}` as BitzerPoint)}<text x={x} y="775" textAnchor="middle" fontSize="10">{c}</text></g>)}
        {terminal('INT280 supply L',462,670,'Reg-L','Independent 230 V INT280 supply line; not connected to the 575 V motor terminals.','Reg-L')}
        {terminal('INT280 supply return',568,670,'Reg-N','Independent 230 V INT280 supply return. Use Reg-L to Reg-N for its supply measurement.','Reg-N')}
        {route('oil','M462 682 V703','#64748b','Separate regulator supply',true)}
        {route('oil','M568 682 V703','#64748b','Separate regulator return',true)}
        <rect x="438" y="703" width="150" height="119" rx="10" fill="#293139" /><text x="513" y="726" textAnchor="middle" fill="white" fontSize="13">INT280 regulator</text><text x="513" y="746" textAnchor="middle" fill="white" fontSize="10">Separate 230 V supply</text>
        {terminal('INT280 in',452,796,'IN','Functional run-permit IN from oil-monitor orange 14; exact INT280 connector pins unverified.','Oil-14')}
        {terminal('INT280 out',568,796,'OUT','Functional run-permit OUT → A1; exact INT280 connector pins unverified.','Reg-out')}
        {route('control','M568 806 H636 V193 H560 V125','#475569','INT280 run permit to contactor A1',true)}
        <text x="45" y="877" fontSize="11">Solid colours: manufacturer oil/PTC leads. Dashed grey: unspecified field-wire colours.</text>
      </svg>
    </div>
    <p className="text-xs text-slate-600 dark:text-slate-400">The 4NES slinger application is shown with OLC-K1. Oil-monitor numbers identify cable functions, not screws on the sealed sensor. INT280 connections remain functional labels. Optional crankcase heater wiring is omitted because its fitted voltage and controls are not established. For part-winding starting, the links and contactor arrangement differ.</p>
    <a className="text-xs underline" href="https://bitzerus-training.storage.googleapis.com/media/documents/SG-0012-09_-_Ecoline_Service_Guide_06012021.pdf" target="_blank" rel="noreferrer">Reference: BITZER ECOLINE Service Guide, pp. 57, 59 and 63–66</a>
  </div>
}
