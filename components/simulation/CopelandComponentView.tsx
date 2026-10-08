'use client'
import { useId, useState } from 'react'
import { CP_LABELS, type CPPoint } from '@/lib/simulation/copeland-circuit'

type Props={red:CPPoint;black:CPPoint;selectPoint:(p:CPPoint)=>void;voltage:120|240;view:'components'|'wiring'|'compressor'}
const descriptions:Partial<Record<CPPoint,string>>={
 'CS-P':'CoreSense module supply, marked 120/240 V in the reference. Separate from relay common L.',
 'CS-2':'CoreSense supply return terminal 2.', 'CS-L':'CoreSense relay common L ← Demand Cooling M.', 'CS-M':'CoreSense healthy-run contact M → contactor A1. Opens on a protection trip or loss of module power.', 'CS-A':'CoreSense alarm contact A. Connected to L on fault or power loss; unused here.',
 'DC-L':'Demand Cooling alarm-relay common L ← call and pressure safeties.', 'DC-M':'Demand Cooling run contact M → CoreSense L. Opens on a latched Demand Cooling alarm.', 'DC-A':'Demand Cooling alarm contact A. Unused here; does not power the injection valve.', 'DC-L1':'Demand Cooling supply L1 ← run-proved control feed. Match the module to the supply voltage.', 'DC-L2':'Demand Cooling supply L2 → circuit return (N in the 120 V exercise).', 'DC-S':'Demand Cooling switched output S → injection solenoid only. Do not connect the unloader here.',
 'IV-1':'Injection solenoid feed ← DC S. Functional lead label, not a manufacturer pin number.', 'IV-2':'Injection solenoid return → DC L2. Functional lead label.', 'U-1':'Conventional unloader coil feed ← rack unload command through run interlock. Energized means unloaded.', 'U-2':'Unloader coil return. Functional lead label.', UC:'Rack unloading contact output. Independent of Demand Cooling S.', RUN:'Run-proved control feed. Functional representation of the OEM interlock; no invented CoreSense output terminal.', 'TS-1':'Unplugged Demand Cooling NTC sensor lead. Sensor resistance falls as temperature rises.', 'TS-2':'Second NTC lead. Sensor connector geometry and pin numbers are not established by the photos.', A1:'Compressor contactor coil A1 ← CoreSense M.',RET:'Circuit return: N at 120 V, L2 at 240 V. Also contactor A2.',L1:'Incoming control supply. Separate from the 575 V compressor motor circuit.',FU:'Control fuse output supplies CoreSense and the control branches.','HP-out':'High-pressure cutout output → low-pressure cutout input.', 'LP-out':'Low-pressure cutout output → Demand Cooling relay common L.', 'PTC-1':'Isolated motor-temperature PTC loop lead 1 → CoreSense motor-sensor input. Functional label, not a connector pin number.', 'PTC-2':'Motor PTC lead 2. Resistance rises with motor temperature; this is a different sensor from the Demand Cooling NTC.'}
export default function CopelandComponentView({red,black,selectPoint,voltage,view}:Props){
 const uid=useId().replace(/:/g,'');const [selected,setSelected]=useState<CPPoint>('DC-S');const [zoom,setZoom]=useState(false)
 const paint=(n:string)=>`url(#${uid}-${n})`
 const pick=(p:CPPoint)=>{setSelected(p);selectPoint(p)}
 const terminal=(p:CPPoint,x:number,y:number,label=CP_LABELS[p])=><g key={`${p}-${x}-${y}`} role="button" tabIndex={0} aria-label={`Probe ${CP_LABELS[p]}`} onClick={()=>pick(p)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(p)}}} className="cursor-pointer">
  <title>{descriptions[p]}</title><rect x={x-21} y={y-21} width="42" height="42" rx="7" fill={paint('metal')} stroke={selected===p?'#0284c7':'#94a3b8'} strokeWidth={selected===p?3:1}/><circle cx={x} cy={y} r="12" fill="#c6a664" stroke="#93743b"/><circle cx={x} cy={y} r="8" fill={paint('metal')} stroke="#64748b"/><path d={`M${x-4} ${y+4} l8 -8`} stroke="#475569" strokeWidth="2"/>
  <rect x={x-36} y={y-42} width="72" height="17" rx="3" fill="#f8fafc"/><text x={x} y={y-30} textAnchor="middle" fontSize="11" fontWeight="700" fill="#334155">{label}</text>
  {(red===p||black===p)&&<g><circle cx={x+15} cy={y+15} r="9" fill={red===p?'#dc2626':'#0f172a'} stroke="white"/><text x={x+15} y={y+18} textAnchor="middle" fontSize="8" fill="white">{red===p&&black===p?'RB':red===p?'R':'B'}</text></g>}
 </g>
 const wire=(d:string,color='#64748b',dashed=false)=><path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dashed?'6 4':undefined}/>
 const body=(x:number,y:number,w:number,h:number,title:string)=><g><rect x={x+3} y={y+5} width={w} height={h} rx="14" fill="#0f172a" opacity="0.12"/><rect x={x} y={y} width={w} height={h} rx="14" fill={paint('body')} stroke="#0f172a" strokeWidth="2"/><text x={x+w/2} y={y+29} textAnchor="middle" fontSize="15" fill="white" fontWeight="700">{title}</text>{[x+12,x+w-12].map(a=><circle key={a} cx={a} cy={y+h-13} r="4" fill="#b8c4ce"/>)}</g>
 const card=(title:string,note:string,drawing:React.ReactNode)=><section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{note}</p><div className="mt-3 overflow-x-auto rounded-xl bg-slate-100"><svg viewBox="0 0 360 300" style={{width:zoom?540:'100%',minWidth:zoom?540:undefined}} fontFamily="Arial, sans-serif" role="group" aria-label={title}>{drawing}</svg></div></section>
 return <div className="space-y-3">
  <svg width="0" height="0" className="absolute" aria-hidden="true"><defs><linearGradient id={`${uid}-body`} x2="0" y2="1"><stop stopColor="#4a5660"/><stop offset="1" stopColor="#17222b"/></linearGradient><linearGradient id={`${uid}-metal`} x2="1" y2="1"><stop stopColor="white"/><stop offset="1" stopColor="#aabac7"/></linearGradient></defs></svg>
  <details className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"><summary className="min-h-11 cursor-pointer font-semibold">Protection inputs and installation-dependent accessories</summary><div className="space-y-2 leading-relaxed">
   <p>Oil sensor → CoreSense oil input; embedded motor PTCs → CoreSense motor input; current toroid → CoreSense run-proof input. These are separate from the Demand Cooling head NTC. The oil sensor and toroid are inspection-only because their connector pinouts are not established by the photos.</p>
   <p>CoreSense provides the oil-pressure and motor protection shown here. A separate Sentronic / mechanical oil-safety control or INT369R motor protector should not be added as though it were also required in this arrangement.</p>
   <p>An oil-level regulator or float may replenish crankcase oil, but does not replace net oil-pressure protection. Its make, supply and alarm wiring need the fitted accessory label. A crankcase heater and head fan are also application-dependent; do not assume their voltage or control wiring from the compressor nameplate.</p>
   <p>The current toroid senses motor current; it is not a contactor auxiliary switch. Part-winding connections require the documented lead routing. The diagram’s OEM run interlock remains a functional interface, not an invented output on the toroid.</p>
  </div></details>
  <div className="flex items-start justify-between gap-2"><p className="text-xs text-slate-600 dark:text-slate-400">Tap a terminal to place your probe. Drawings show documented terminal functions; spacing and field routing are illustrative.</p><button className="min-h-11 shrink-0 rounded-lg border px-3 text-xs" aria-pressed={zoom} onClick={()=>setZoom(v=>!v)}>{zoom?'Fit drawing':'Enlarge'}</button></div>
  <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100" aria-live="polite"><strong>{CP_LABELS[selected]}</strong><p className="mt-1 text-sm">{descriptions[selected]}</p></div>
  {view==='components'&&<div className="grid gap-4 xl:grid-cols-2">
   {card('High / low pressure controls','Two independent series switches. Settings and reset types depend on the fitted control and rack design.',<>
    {body(20,25,145,140,'HP cutout')}{body(195,25,145,140,'LP cutout')}
    <path d="M92 166 V197 M267 166 V197" stroke="#b47c51" strokeWidth="5"/>
    <text x="92" y="94" textAnchor="middle" fontSize="11" fill="white">Discharge pressure</text><text x="267" y="94" textAnchor="middle" fontSize="11" fill="white">Suction pressure</text>
    {terminal('FU',45,250,'Call feed')}{terminal('HP-out',135,250,'HP out')}{terminal('LP-out',225,250,'LP out')}{terminal('DC-L',315,250,'DC L')}
    <text x="180" y="211" textAnchor="middle" fontSize="10">FU → call → HP → LP → DC L</text>
    <text x="180" y="291" textAnchor="middle" fontSize="10">Functional field points · exact switch terminals vary</text>
   </>)}
   {card('CoreSense differential oil-pressure sensor','At the oil pump: measures net oil pressure, not oil level. Its harness connects to CoreSense.',<>
    <circle cx="105" cy="139" r="68" fill="#303b43" stroke="#64748b" strokeWidth="5"/>
    <rect x="137" y="116" width="65" height="43" rx="8" fill="#bda065" stroke="#806738" strokeWidth="3"/>
    <rect x="196" y="110" width="48" height="55" rx="8" fill={paint('body')}/>{wire('M244 136 H308 V220 H220','#475569',true)}
    <text x="105" y="140" textAnchor="middle" fontSize="13" fill="white">Oil pump</text><text x="180" y="49" textAnchor="middle" fontSize="14" fontWeight="700">Oil-pressure sensor + harness</text>
    <rect x="63" y="214" width="158" height="42" rx="6" fill="#dbeafe" stroke="#93c5fd"/><text x="142" y="240" textAnchor="middle" fontSize="12">CoreSense oil input</text>
    <text x="180" y="287" textAnchor="middle" fontSize="10">Connector inspection only · no invented pinout or ohm test</text>
   </>)}
   {card('Motor PTC sensor circuit','Embedded winding sensors connect to CoreSense. Unplug and isolate for a resistance test.',<>
    <rect x="62" y="30" width="236" height="111" rx="14" fill={paint('body')}/>
    <text x="180" y="57" textAnchor="middle" fontSize="13" fill="white">Motor winding PTC chain</text>
    {wire('M83 90 H114 l10 -12 l12 24 l12 -24 l12 24 l12 -24 l12 24 l12 -12 H277','#f97316')}
    {wire('M83 90 H44 V219','#ea580c')}{wire('M277 90 H316 V219','#ea580c')}
    {terminal('PTC-1',44,244,'PTC lead 1')}{terminal('PTC-2',316,244,'PTC lead 2')}
    <text x="180" y="182" textAnchor="middle" fontSize="11">To CoreSense motor-sensor input</text><text x="180" y="281" textAnchor="middle" fontSize="11">Higher temperature → higher resistance</text>
   </>)}
   {card('Current-sensing toroid','Compressor run proof for CoreSense. One motor lead passes through the ring for a single-winding connection.',<>
    <circle cx="145" cy="130" r="68" fill={paint('body')} stroke="#111827" strokeWidth="5"/><circle cx="145" cy="130" r="31" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="4"/>
    <path d="M35 48 H145 V231 H248" fill="none" stroke="#475569" strokeWidth="9"/>{wire('M207 132 H304 V239','#0ea5e9',true)}
    <text x="145" y="276" textAnchor="middle" fontSize="11">Motor lead through centre</text><text x="303" y="268" textAnchor="middle" fontSize="10">To CoreSense</text>
    <text x="180" y="25" textAnchor="middle" fontSize="11">Inspection only · 575 V is outside this meter exercise</text>
   </>)}
   {card('CoreSense Protection','Motor PTC and oil protection. The supply and L/M/A relay contacts have different jobs.',<>
    {body(25,30,310,235,'CoreSense™ Protection')}<text x="180" y="82" textAnchor="middle" fill="#d4dfe7" fontSize="11">for Copeland Discus compressors</text>
    {terminal('CS-P',90,140,'120/240 V')}{terminal('CS-2',270,140,'2')}{terminal('CS-M',90,235,'M')}{terminal('CS-L',180,235,'L')}{terminal('CS-A',270,235,'A')}
    <text x="180" y="289" textAnchor="middle" fontSize="11">L–M run permit · L–A alarm</text>
   </>)}
   {card('Demand Cooling module','Separate controller with manual-reset alarm relay and injection output S.',<>
    {body(25,30,310,235,'DEMAND COOLING')}<text x="180" y="82" textAnchor="middle" fill="#d4dfe7" fontSize="11">Voltage-matched module · {voltage} V exercise</text>
    {terminal('DC-L',90,140,'L')}{terminal('DC-M',180,140,'M')}{terminal('DC-A',270,140,'A')}{terminal('DC-L1',90,235,'L1')}{terminal('DC-L2',180,235,'L2')}{terminal('DC-S',270,235,'S')}
    <text x="180" y="289" textAnchor="middle" fontSize="11">L/M/A = relay · L1/L2 = supply · S = injection</text>
   </>)}
   {card('Liquid-injection solenoid','Opens the liquid path to the compressor suction cavity when Demand Cooling requires it.',<>
    <path d="M20 142 H340" stroke="#bd8051" strokeWidth="20"/><rect x="142" y="115" width="78" height="65" rx="7" fill="#c6a664" stroke="#80612c" strokeWidth="3"/>{body(130,35,100,80,'IV')}{wire('M153 100 H80 V216','#0ea5e9')}{wire('M207 100 H280 V216')}
    {terminal('IV-1',80,240,'Feed')}{terminal('IV-2',280,240,'Return')}<text x="20" y="180" fontSize="11">Liquid in</text><text x="244" y="180" fontSize="11">To suction cavity</text>
   </>)}
   {card('Conventional unloader solenoid','Blocked-suction bank: powered = unloaded; unpowered = loaded. This is not Digital PWM.',<>
    <path d="M70 150 L105 104 H255 L290 150 V186 H70 Z" fill="#37434d" stroke="#111827" strokeWidth="3"/>{body(135,30,90,80,'U')}{wire('M151 80 H55 V216','#a78bfa')}{wire('M208 80 H305 V216')}
    {terminal('U-1',55,240,'Feed')}{terminal('U-2',305,240,'Return')}<text x="180" y="170" textAnchor="middle" fontSize="12" fill="white">Unloading cylinder head</text><text x="180" y="283" textAnchor="middle" fontSize="11">Independent rack capacity command</text>
   </>)}
   {card('Discharge-head NTC sensor','Sensor connector shown as functional test leads; no invented connector pin numbers.',<>
    <path d="M78 82 H220" stroke="#b0bdc7" strokeWidth="22" strokeLinecap="round"/><path d="M220 77 H275 V155 H80 V216 M220 87 H295 V175 H285 V216" fill="none" stroke="#374151" strokeWidth="5"/>
    {terminal('TS-1',80,240,'Lead 1')}{terminal('TS-2',285,240,'Lead 2')}<text x="180" y="40" textAnchor="middle" fontSize="14" fontWeight="700">Demand Cooling NTC</text><text x="180" y="120" textAnchor="middle" fontSize="11">Higher temperature → lower resistance</text>
   </>)}
   {card('Contactor and run interlock','Coil A1/A2 plus a functional run-proved accessory feed. Motor power is outside the meter exercise.',<>
    {body(70,30,220,150,'Compressor contactor')}{terminal('A1',120,145,'A1')}{terminal('RET',240,145,'A2')}{terminal('RUN',95,260,'Run feed')}{terminal('UC',270,260,'Unload out')}
    <text x="180" y="211" textAnchor="middle" fontSize="11">Run proof → accessory feed → unload command</text>
   </>)}
  </div>}
  {view==='wiring'&&<div className="overflow-x-auto rounded-xl border bg-slate-100"><svg viewBox="0 0 760 1190" style={{width:zoom?1140:'100%',minWidth:zoom?1140:undefined}} fontFamily="Arial, sans-serif" role="group" aria-label="Copeland control and accessory wiring">
   <text x="30" y="32" fontSize="19" fontWeight="700">CONTROL + ACCESSORY CONNECTIONS</text><text x="30" y="57" fontSize="12">{voltage} V · repeated terminal names are the same electrical node</text>
   <text x="30" y="89" fontSize="11" fill="#475569">Contacts show the permitted state; use the meter to diagnose the active exercise.</text>
   {wire('M50 150 H115 M160 150 H280 M345 150 H495 M560 150 H680')}
   <rect x="115" y="139" width="45" height="22" fill="white" stroke="#475569"/><text x="137" y="154" textAnchor="middle" fontSize="10">FU</text>
   <path d="M280 150 H345 M495 150 H560" stroke="#475569" strokeWidth="5"/>
   {terminal('L1',50,150)}{terminal('FU',215,150,'FU')}{terminal('DC-L',420,150,'DC L')}{terminal('DC-M',680,150,'DC M')}
   <text x="312" y="191" textAnchor="middle" fontSize="11">Call + HP / LP</text><text x="525" y="191" textAnchor="middle" fontSize="11">DC L–M alarm contact</text>
   {wire('M50 270 H225 M290 270 H475 M585 270 H680')}
   <path d="M225 270 H290" stroke="#475569" strokeWidth="5"/><circle cx="530" cy="270" r="27" fill="white" stroke="#475569" strokeWidth="2"/>{wire('M475 270 H503 M557 270 H585')}<text x="530" y="274" textAnchor="middle" fontSize="11">CC coil</text>
   {terminal('DC-M',50,270,'DC M')}{terminal('CS-L',150,270,'CS L')}{terminal('CS-M',355,270,'CS M')}{terminal('A1',445,270,'A1')}{terminal('RET',680,270,'A2 / return')}
   <text x="257" y="316" textAnchor="middle" fontSize="11">CS L–M run permit</text>
   {wire('M50 395 H270 M470 395 H680')}{body(270,368,200,57,'CoreSense supply')}
   {terminal('FU',50,395,'FU')}{terminal('CS-P',200,395,'120/240 V')}{terminal('CS-2',540,395,'CS 2')}{terminal('RET',680,395,'Return')}
   <text x="30" y="463" fontSize="11" fill="#475569">Accessory interlock: only powered when compressor operation is proved.</text>
   {wire('M50 510 H235 M465 510 H680')}{body(235,483,230,57,'OEM run interlock')}{terminal('FU',50,510,'FU')}{terminal('RUN',680,510,'Run feed')}
   <text x="350" y="568" textAnchor="middle" fontSize="11">Functional field interface · not an additional CoreSense terminal</text>
   {wire('M50 635 H275 M465 635 H680')}{body(275,608,190,57,'DC module supply')}
   {terminal('RUN',50,635,'Run feed')}{terminal('DC-L1',200,635,'DC L1')}{terminal('DC-L2',540,635,'DC L2')}{terminal('RET',680,635,'Return')}
   <text x="350" y="694" textAnchor="middle" fontSize="11">DC internally switches L1 → S when injection is required</text>
   {wire('M50 755 H285 M425 755 H680','#0284c7')}{body(285,728,140,57,'Injection coil')}
   {terminal('DC-S',50,755,'DC S')}{terminal('IV-1',195,755,'IV feed')}{terminal('IV-2',535,755,'IV return')}{terminal('RET',680,755,'Return')}
   <text x="350" y="814" textAnchor="middle" fontSize="11">S feeds ONLY the injection coil · liquid injection is separate from unloading</text>
   {wire('M50 890 H135 M205 890 H465 M565 890 H700','#7c3aed')}
   <path d="M135 890 l65 -18" fill="none" stroke="#7c3aed" strokeWidth="3"/>{body(465,863,100,57,'U coil')}
   {terminal('RUN',50,890,'Run feed')}{terminal('UC',285,890,'Unload out')}{terminal('U-1',390,890,'U feed')}{terminal('U-2',625,890,'U return')}{terminal('RET',710,980,'Return')}{wire('M700 890 H710 V959','#7c3aed')}
   <text x="170" y="945" textAnchor="middle" fontSize="11">Rack unload command</text><text x="390" y="1002" textAnchor="middle" fontSize="11">U energized = bank unloaded · field conductor colours are unspecified</text>
   <text x="30" y="1050" fontSize="12" fontWeight="700">Separate low-energy sensor circuit</text>
   {wire('M180 1100 H320 M480 1100 H610','#ea580c',true)}{body(320,1073,160,57,'DC NTC input')}
   {terminal('TS-1',180,1100,'Sensor lead 1')}{terminal('TS-2',610,1100,'Sensor lead 2')}
   <text x="380" y="1170" textAnchor="middle" fontSize="11">Functional harness ends · unplug sensor for resistance · no line voltage</text>
  </svg></div>}
  {view==='compressor'&&<div className="overflow-x-auto rounded-xl bg-slate-100"><svg viewBox="0 0 720 660" style={{width:zoom?1080:'100%',minWidth:zoom?1080:undefined}} fontFamily="Arial, sans-serif" role="group" aria-label="Copeland Discus compressor component locations">
   <text x="30" y="35" fontSize="19" fontWeight="700">COPELAND DISCUS · EQUIPMENT MAP</text><text x="30" y="60" fontSize="12">Photo-based arrangement · illustrative locations and field routing</text>
   <ellipse cx="360" cy="530" rx="245" ry="35" fill="#cbd5e1"/>
   <path d="M210 230 Q360 170 510 230 L535 435 Q360 500 185 435 Z" fill={paint('body')} stroke="#111827" strokeWidth="5"/>
   <path d="M170 205 L225 130 H320 L335 205 Z M385 205 L400 130 H495 L550 205 Z" fill="#38434c" stroke="#111827" strokeWidth="4"/>
   {[205,245,285,415,455,495].map(x=><circle key={x} cx={x} cy="190" r="7" fill={paint('metal')}/>)}
   <circle cx="360" cy="410" r="70" fill="#17222b" stroke="#64748b" strokeWidth="5"/>
   {body(265,230,190,70,'Terminal box')}{body(225,510,235,85,'DEMAND COOLING')}{body(35,315,210,115,'CoreSense Protection')}
   {body(485,95,90,65,'Unloader')}{wire('M575 128 H650 V540','#7c3aed',true)}{terminal('U-1',650,580,'U feed')}
   <path d="M625 330 V440 H485" fill="none" stroke="#b47c51" strokeWidth="15"/>{body(585,275,90,60,'Injection')}{terminal('IV-1',635,390,'IV feed')}
   {wire('M450 565 H565 V390 H614','#0284c7',true)}{wire('M140 430 V565 H225','#64748b',true)}{wire('M330 510 V305','#64748b',true)}
   {terminal('TS-1',140,180,'Head NTC')}{wire('M160 180 H200 V500 H285 V510','#ea580c',true)}
   <text x="360" y="630" textAnchor="middle" fontSize="12">Motor lugs / links: use the fitted terminal-cover diagram</text>
  </svg></div>}
 </div>
}
