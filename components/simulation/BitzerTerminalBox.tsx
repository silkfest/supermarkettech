'use client'
import { useId, useState } from 'react'
import type { BitzerPoint, BitzerVoltage } from '@/lib/simulation/bitzer-circuit'

type Props = { voltage: BitzerVoltage; red: BitzerPoint; black: BitzerPoint; selectPoint: (p: BitzerPoint) => void }
type Group = 'all' | 'motor' | 'ptc' | 'control' | 'oil'

// Bend the drawing's orthogonal wire routes without moving their endpoints.
function roundedWire(d: string) {
  const points: [number, number][] = []
  let x = 0, y = 0
  for (const m of d.matchAll(/([MHV])([\d.]+)(?:\s+([\d.]+))?/g)) {
    if (m[1] === 'M') { x = Number(m[2]); y = Number(m[3]) }
    else if (m[1] === 'H') x = Number(m[2])
    else y = Number(m[2])
    points.push([x, y])
  }
  if (points.length < 3) return d
  let result = `M${points[0].join(' ')}`
  for (let i = 1; i < points.length - 1; i++) {
    const [a, b, c] = [points[i-1], points[i], points[i+1]]
    const before = Math.hypot(b[0]-a[0], b[1]-a[1]), after = Math.hypot(c[0]-b[0], c[1]-b[1])
    const r = Math.min(9, before/2, after/2)
    if (!before || !after) continue
    result += ` L${b[0]-(b[0]-a[0])*r/before} ${b[1]-(b[1]-a[1])*r/before} Q${b.join(' ')} ${b[0]+(c[0]-b[0])*r/after} ${b[1]+(c[1]-b[1])*r/after}`
  }
  return `${result} L${points[points.length-1].join(' ')}`
}

export default function BitzerTerminalBox({ voltage, red, black, selectPoint }: Props) {
  const uid = useId().replace(/:/g, '')
  const paint = (name: string) => `url(#${uid}-${name})`
  const [selected, setSelected] = useState('')
  const [group, setGroup] = useState<Group>('all')
  const [zoom, setZoom] = useState(false)
  const [detail, setDetail] = useState('Select a connection to trace it. Control and PTC points also place the active meter probe.')
  const ret = voltage === 208 ? 'L2' : 'N'
  const opacity = (g: Group) => group === 'all' || group === g ? 1 : 0.12
  const route = (g: Group, d: string, color: string, label: string, dashed = false) => <g opacity={opacity(g)} style={{transition:'opacity 180ms ease'}}>
    <title>{label}</title>
    <path d={roundedWire(d)} fill="none" stroke="#0f172a" strokeOpacity="0.12" strokeWidth={g === 'motor' ? 9 : 6} strokeLinecap="round" />
    <path d={roundedWire(d)} fill="none" stroke={color} strokeWidth={g === 'motor' ? 5 : 3} strokeDasharray={dashed ? '6 5' : undefined} strokeLinecap="round" strokeLinejoin="round" />
  </g>
  const terminal = (id: string, x: number, y: number, label: string, description: string, point?: BitzerPoint, labelBelow = false) => <g key={id} role="button" tabIndex={0} aria-label={`Inspect ${id}`} className="cursor-pointer" onClick={() => { setSelected(id); setDetail(description); if (point) selectPoint(point) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(id); setDetail(description); if (point) selectPoint(point) } }}>
    <title>{description}</title>
    <rect x={x-19} y={y-19} width="38" height="38" rx="7" fill={paint('terminal')} stroke="#94a3b8" strokeWidth="1" />
    {selected === id && <rect x={x-22} y={y-22} width="44" height="44" rx="9" fill="none" stroke="#0284c7" strokeWidth="2.5" />}
    <circle cx={x} cy={y} r="12" fill={paint('brass')} stroke="#937034" />
    <circle cx={x} cy={y} r="8.5" fill={paint('screw')} stroke="#64748b" />
    <path d={`M${x-4} ${y+4} l8 -8`} stroke="#475569" strokeWidth="2" strokeLinecap="round" />
    {point && (red === point || black === point) && <g><circle cx={x+13} cy={y+13} r="8" fill={red === point ? '#dc2626' : '#0f172a'} stroke="white" strokeWidth="1.5" /><text x={x+13} y={y+16} fontSize="8" textAnchor="middle" fill="white" fontWeight="700">{red === point && black === point ? 'RB' : red === point ? 'R' : 'B'}</text></g>}
    <rect x={x-24} y={labelBelow ? y+22 : y-38} width="48" height="16" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.6" /><text x={x} y={labelBelow ? y+34 : y-26} fontSize="11" textAnchor="middle" fill="#334155" fontWeight="700">{label}</text>
    <rect x={x-22} y={y-22} width="44" height="44" fill="none" pointerEvents="all" />
  </g>
  return <div className="space-y-3">
    <div className="rounded-2xl bg-gradient-to-br from-emerald-950 to-slate-900 p-5 text-white shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Compressor connection explorer</p>
      <h3 className="mt-2 text-xl font-bold tracking-tight">Inside the terminal box</h3>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-md bg-white/10 px-2.5 py-1.5 font-semibold">4NES-14-5PU</span><span className="rounded-md bg-white/10 px-2.5 py-1.5">575 V · 3Ø · 60 Hz</span><span className="rounded-md bg-white/10 px-2.5 py-1.5">Direct start</span></div>
      <p className="mt-3 text-xs text-slate-300">Trace a wire group, then tap a connection to inspect it.</p>
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Wire tracing layers">{([['all','All wires'],['motor','575 V motor'],['ptc','PTC sensors'],['control','Control wiring'],['oil','Oil monitoring']] as const).map(([id,label]) => <button key={id} aria-pressed={group===id} onClick={()=>setGroup(id)} className={`min-h-11 rounded-lg border px-3 text-xs ${group===id?'border-emerald-600 bg-emerald-600 text-white shadow-sm':'border-slate-200 bg-white text-slate-600 hover:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'}`}>{label}</button>)}
      <button className="min-h-11 rounded-lg border px-3 text-xs" aria-pressed={zoom} onClick={()=>setZoom(v=>!v)}>{zoom?'Fit box':'Enlarge box'}</button></div>
    <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100" aria-live="polite"><span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-300">{selected || 'Connection details'}</span>{detail}</p>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 shadow-inner dark:border-slate-600" tabIndex={zoom?0:undefined}>
      <svg viewBox="0 0 680 900" style={{width:zoom?1020:'100%',minWidth:zoom?1020:undefined}} role="group" aria-label="4NES-14-5PU direct-start terminal box and external connections" fontFamily="Inter, DejaVu Sans, Arial, sans-serif">
        <defs>
          <linearGradient id={`${uid}-housing`} x2="1" y2="1"><stop stopColor="#61977b" /><stop offset="0.5" stopColor="#3d7559" /><stop offset="1" stopColor="#28513e" /></linearGradient>
          <linearGradient id={`${uid}-backplate`} x2="0" y2="1"><stop stopColor="#f0f3f0" /><stop offset="1" stopColor="#c9d4cd" /></linearGradient>
          <linearGradient id={`${uid}-terminal`} x2="0" y2="1"><stop stopColor="#f8fafc" /><stop offset="1" stopColor="#bac7d2" /></linearGradient>
          <linearGradient id={`${uid}-screw`} x2="1" y2="1"><stop stopColor="#ffffff" /><stop offset="0.5" stopColor="#d7dfe5" /><stop offset="1" stopColor="#94a3b8" /></linearGradient>
          <linearGradient id={`${uid}-brass`} x2="1" y2="0"><stop stopColor="#a58440" /><stop offset="0.45" stopColor="#f6da8e" /><stop offset="1" stopColor="#b68e45" /></linearGradient>
          <linearGradient id={`${uid}-module`} x2="0" y2="1"><stop stopColor="#44505c" /><stop offset="1" stopColor="#202b34" /></linearGradient>
          <pattern id={`${uid}-grid`} width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.7" fill="#cbd5e1" /></pattern>
        </defs>
        <rect width="680" height="900" fill="#f1f5f9" /><rect width="680" height="900" fill={paint('grid')} />
        <text x="24" y="26" fontSize="11" letterSpacing="1.5" fill="#64748b" fontWeight="700">01 / PANEL CONNECTIONS</text>
        <rect x="24" y="48" width="245" height="90" rx="8" fill={paint('module')} stroke="#1e293b" />
        <text x="146" y="70" textAnchor="middle" fill="white" fontSize="13">Main contactor · load side</text>
        {[70,146,222].map((x,i)=>terminal(`T${i+1}`,x,113,`T${i+1}`,`Contactor T${i+1} feeds motor terminal ${i+1}, linked to ${i+7}. 575 V line-to-line motor power; not a control-meter point.`))}
        <rect x="300" y="48" width="356" height="90" rx="8" fill="#e5ecf3" stroke="#bbcbd8" />
        <text x="478" y="68" textAnchor="middle" fontSize="12">Separate {voltage} V control circuit</text>
        {terminal('fused control',332,113,'FU-out','Fused control supply powers SE-B3 L and oil-monitor brown L.','FU-out')}
        {terminal('control return',408,113,ret,`Control return ${ret} connects SE-B3 N, oil-monitor blue N and coil A2.`,'N')}
        {terminal('LP output',484,113,'LP out','Call → HP → LP → SE-B3 11. This is separate from module supply.','SE-11')}
        {terminal('coil feed',560,113,'A1','INT280 run-permit output feeds contactor A1. A2 returns to the control supply.','A1')}
        <text x="632" y="112" fontSize="12" textAnchor="middle">PE</text>
        <rect x="26" y="222" width="632" height="390" rx="23" fill="#0f172a" fillOpacity="0.12" />
        <rect x="24" y="215" width="632" height="390" rx="23" fill={paint('housing')} stroke="#315a43" strokeWidth="9" />
        <rect x="43" y="237" width="594" height="348" rx="12" fill={paint('backplate')} stroke="#a3b6a9" strokeWidth="2" />
        {[[39,232],[640,232],[39,588],[640,588]].map(([x,y])=><g key={`${x}-${y}`}><circle cx={x} cy={y} r="7" fill={paint('screw')} stroke="#234b38" /><path d={`M${x-3} ${y+3} l6 -6`} stroke="#475569" strokeWidth="1.5" /></g>)}
        <rect x="72" y="302" width="276" height="130" rx="9" fill="#ad8766" stroke="#76583e" strokeWidth="3" />
        {[110,210,310].map((x,i)=><g key={x} opacity={opacity('motor')}><rect x={x-13} y="332" width="26" height="58" rx="12" fill={paint('brass')} stroke="#856a2c" strokeWidth="2" />
          {route('motor',`M${[70,146,222][i]} 125 V${169+i*15} H${x} V332`,'#334155',`T${i+1} to ${i+1}/${i+7}`)}
          {terminal(`motor ${i+1}`,x,332,`${i+1}`,`Motor ${i+1}: contactor T${i+1}; direct-start brass link to ${i+7}.`)}
          {terminal(`motor ${i+7}`,x,390,`${i+7}`,`Motor ${i+7}: direct-start link to ${i+1}. Do not use these links for part-winding starting.`,undefined,true)}</g>)}
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
        <rect x="83" y="486" width="327" height="78" rx="7" fill={paint('module')} />
        <text x="222" y="548" textAnchor="middle" fontSize="10" letterSpacing="0.6" fill="white" fontWeight="700">SE-B3 · MOTOR PROTECTION</text>
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
        <text x="38" y="630" fontSize="11" letterSpacing="1.2" fill="#64748b" fontWeight="700">02 / OIL DEVICES</text>
        <rect x="43" y="680" width="348" height="79" rx="8" fill={paint('terminal')} stroke="#94a3b8" /><text x="308" y="677" textAnchor="middle" fontSize="11">OLC-K1</text>
        {([['L',73,'BN'],['N',133,'BU'],['11',193,'GY'],['14',253,'OG'],['12',303,'PK'],['D1',353,'VT']] as const).map(([l,x,c])=><g key={l}>{terminal(`Oil-${l}`,x,732,l,`OLC-K1 ${l} / ${c} cable lead. ${l==='12'?'Optional alarm, insulated and unused.':l==='D1'?'Run proof from main-contactor NO auxiliary.':'Trace the corresponding coloured route.'}`,`Oil-${l}` as BitzerPoint)}<text x={x} y="775" textAnchor="middle" fontSize="10">{c}</text></g>)}
        {terminal('INT280 supply L',462,670,'Reg-L','Independent 230 V INT280 supply line; not connected to the 575 V motor terminals.','Reg-L')}
        {terminal('INT280 supply return',568,670,'Reg-N','Independent 230 V INT280 supply return. Use Reg-L to Reg-N for its supply measurement.','Reg-N')}
        {route('oil','M462 682 V703','#64748b','Separate regulator supply',true)}
        {route('oil','M568 682 V703','#64748b','Separate regulator return',true)}
        <rect x="438" y="703" width="150" height="119" rx="10" fill={paint('module')} /><text x="513" y="726" textAnchor="middle" fill="white" fontSize="13">INT280 regulator</text><text x="513" y="746" textAnchor="middle" fill="white" fontSize="10">Separate 230 V supply</text>
        {terminal('INT280 in',452,796,'IN','Functional run-permit IN from oil-monitor orange 14; exact INT280 connector pins unverified.','Oil-14')}
        {terminal('INT280 out',568,796,'OUT','Functional run-permit OUT → A1; exact INT280 connector pins unverified.','Reg-out')}
        {route('control','M568 806 H636 V193 H560 V125','#475569','INT280 run permit to contactor A1',true)}
        <text x="45" y="877" fontSize="10" fill="#64748b">Solid colours: manufacturer oil/PTC leads. Dashed grey: unspecified field-wire colours.</text>
      </svg>
    </div>
    <details className="rounded-xl border border-slate-200 p-4 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:text-slate-400"><summary className="cursor-pointer font-semibold text-slate-800 dark:text-slate-200">Reference layout &amp; equipment details</summary>
    <p className="mt-3">S/N 2598172095. Direct-start links: 1–7, 2–8, 3–9. This is an illustrative reference, not a serial-specific factory drawing. Motor power is 575 V; controls use the selected {voltage} V supply. Motor terminals support tracing only; control/PTC points use the meter.</p>
    <p className="mt-2">The 4NES slinger application is shown with OLC-K1. Oil-monitor numbers identify cable functions, not screws on the sealed sensor. INT280 connections remain functional labels. Optional crankcase heater wiring is omitted because its fitted voltage and controls are not established. For part-winding starting, the links and contactor arrangement differ.</p>
    <a className="text-xs underline" href="https://bitzerus-training.storage.googleapis.com/media/documents/SG-0012-09_-_Ecoline_Service_Guide_06012021.pdf" target="_blank" rel="noreferrer">Reference: BITZER ECOLINE Service Guide, pp. 57, 59 and 63–66</a>
    </details>
  </div>
}
