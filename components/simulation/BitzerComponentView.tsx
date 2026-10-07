'use client'

import { useId, useState } from 'react'
import { BITZER_COLOURS, OIL_MONITOR_CABLE, bitzerPointLabel, type BitzerPoint, type BitzerVoltage } from '@/lib/simulation/bitzer-circuit'

type Props = {
  oil: 'Delta-PII' | 'OLC-K1'
  voltage: BitzerVoltage
  red: BitzerPoint
  black: BitzerPoint
  selectPoint: (point: BitzerPoint) => void
}

// Connections for this training circuit. Physical SE-B3 row order is from
// SG-0012-09 p.63; oil-monitor cable colours are from p.65. Oil/regulator
// breakouts are FIELD termination points, never invented screws on a sensor.
export default function BitzerComponentView({ oil, voltage, red, black, selectPoint }: Props) {
  const uid = useId().replace(/:/g, '')
  const paint = (name: string) => `url(#${uid}-${name})`
  const [mounting, setMounting] = useState(false)
  const [zoom, setZoom] = useState(false)
  const [selected, setSelected] = useState<BitzerPoint>('SE-14')
  const ret = voltage === 208 ? 'L2' : 'N'
  const routes: Partial<Record<BitzerPoint, string>> = {
    'SE-L': `FU-out → SE-B3 L · ${voltage} V supply`,
    'SE-N': `${ret} → SE-B3 N · keep the printed N terminal label at 208 V`,
    'SE-B1': 'B1 ↔ B2 · lockout jumper fitted; this is not a line-voltage connection',
    'SE-B2': 'B2 ↔ B1 · lockout jumper fitted; this is not a line-voltage connection',
    'SE-11': 'LP cutout output → SE-B3 11 · relay common',
    'SE-12': 'SE-B3 12 · optional trip indication, unused in this circuit',
    'SE-14': 'SE-B3 14 → grey lead → oil monitor 11 · safety-chain interconnect',
    'SE-1': 'SE-B3 orange sensor lead 1 → compressor M1',
    'SE-2': 'SE-B3 orange sensor lead 2 → compressor M2',
    M1: 'M1 → motor PTC chain → M2; orange lead 1 connects M1 to the SE-B3',
    M2: 'M2 → motor PTC chain → M1; orange lead 2 connects M2 to the SE-B3',
    'Oil-L': `FU-out → brown lead L · ${voltage} V module supply`,
    'Oil-N': `${ret} → blue lead N · module supply return`,
    'Oil-11': 'SE-B3 14 → grey lead 11 · oil relay common',
    'Oil-14': 'Orange lead 14 → INT280 run-permit input · series safety chain',
    'Oil-12': 'Pink lead 12 · optional alarm lead, insulated and unused here',
    'Oil-D1': 'FU-out → contactor normally open auxiliary → violet D1 · run proof',
    'Reg-L': 'Separate 230 V feed → INT280 supply; not supplied by the control fuse',
    'Reg-N': 'Separate 230 V supply return → INT280; do not assume bonded to the control return',
    'Reg-out': 'INT280 run-permit output → panel wire → contactor A1',
    A1: 'INT280 run-permit output → A1 · contactor coil',
    N: `Contactor A2 → ${ret} · control-circuit return`,
  }
  const select = (p: BitzerPoint) => { setSelected(p); selectPoint(p) }
  const screw = (p: BitzerPoint, x: number, y: number, label: string, colour = '#64748b') => <g
    key={p} role="button" tabIndex={0} aria-label={`Probe ${bitzerPointLabel(p, voltage)}`}
    onClick={() => select(p)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(p) } }} className="cursor-pointer">
    <title>{routes[p]}</title>
    <rect x={x - 22} y={y - 22} width="44" height="44" rx="6" fill={selected === p ? '#dbeafe' : paint('terminal')} stroke={selected === p ? '#2563eb' : '#94a3b8'} />
    <circle cx={x} cy={y} r="13" fill="#ceb274" stroke="#a18544" /><circle cx={x} cy={y} r="9" fill={paint('terminal')} stroke={colour} strokeWidth="3" />
    <path d={`M${x - 5} ${y + 5} l10 -10`} stroke="#475569" strokeWidth="2" />
    <rect x={x - 24} y={y - 42} width="48" height="18" rx="3" fill="#f1f5f9" />
    <text x={x} y={y - 28} textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">{label}</text>
    {(red === p || black === p) && <g><circle cx={x + 14} cy={y + 14} r="10" fill={red === p ? '#dc2626' : '#0f172a'} stroke="white" /><text x={x + 14} y={y + 18} textAnchor="middle" fontSize="10" fill="white">{red === p && black === p ? 'RB' : red === p ? 'R' : 'B'}</text></g>}
  </g>
  const wire = (d: string, colour = '#64748b', dashed = false) => <path d={d} fill="none" stroke={colour} strokeWidth="4" strokeLinecap="round" strokeDasharray={dashed ? '6 4' : undefined} />
  const mountingDetails = <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
      <button className="min-h-11 text-left font-semibold" aria-expanded={mounting} onClick={() => setMounting(v => !v)}>Electronic-head seating: {mounting ? 'hide details' : 'show details'}</button>
      {mounting && <div className="space-y-2 leading-relaxed">
        <p>The outlined collar is the mounting interface, not an electrical terminal. BITZER documents mounting detection on Delta-PII and OLC-K1: an improperly mounted electronic head causes lockout after 5 seconds and a flashing red LED.</p>
        <p>A flashing LED can also mean low supply voltage. Measure L–N (brown–blue), then isolate power and check head seating and retention against the device instructions. A sticking detection mechanism is a reported field possibility; this illustration does not establish its internal switch geometry. Do not bypass mounting detection.</p>
        <p>After correcting the cause, the referenced reset requires interrupting supply for at least 5 seconds. In Practice, choose “Oil monitor head not seated” and use “Inspect oil monitor LED” to compare the indication with your meter readings.</p>
        <a className="underline" href="https://bitzerus-training.storage.googleapis.com/media/documents/SG-0012-09_-_Ecoline_Service_Guide_06012021.pdf#page=64" target="_blank" rel="noreferrer">BITZER service guide · printed pages 64–65</a>
      </div>}
    </section>
  const shell = (title: string, note: string, drawing: React.ReactNode) => <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <h3 className="font-bold text-sm tracking-tight">{title}</h3>
    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{note}</p>
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 text-slate-800" tabIndex={zoom ? 0 : undefined} aria-label={`${title} drawing`}>
      <svg viewBox="0 0 360 350" style={{ width: zoom ? 540 : '100%', minWidth: zoom ? 540 : undefined }} role="group" aria-label={title} fontFamily="Inter, DejaVu Sans, Arial, sans-serif">{drawing}</svg>
    </div>
    {title.includes('lubrication monitor') && <div className="mt-3">{mountingDetails}</div>}
  </section>
  return <div className="space-y-4">
    <svg width="0" height="0" aria-hidden="true" className="absolute"><defs>
      <linearGradient id={`${uid}-terminal`} x2="0" y2="1"><stop stopColor="#ffffff" /><stop offset="1" stopColor="#b5c2ce" /></linearGradient>
      <linearGradient id={`${uid}-body`} x2="0" y2="1"><stop stopColor="#4b5965" /><stop offset="1" stopColor="#202b34" /></linearGradient>
    </defs></svg>
    <div className="rounded-2xl bg-gradient-to-br from-emerald-950 to-slate-900 p-5 text-white">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Component connection explorer</p>
      <h3 className="mt-2 text-xl font-bold tracking-tight">Get familiar with the hardware</h3>
      <p className="mt-2 text-xs text-slate-300">Inspect the terminals, follow each lead and place your meter probes.</p>
    </div>
    <div className="flex gap-3 items-start justify-between"><p className="text-xs text-slate-600 dark:text-slate-400">Component illustrations with probeable connections. Wire colours identify leads, not voltage. Tap a screw to trace its destination.</p>
      <button className="shrink-0 rounded-lg border px-3 min-h-11 text-xs font-semibold" aria-pressed={zoom} onClick={() => setZoom(z => !z)}>{zoom ? 'Fit drawings' : 'Enlarge 150%'}</button></div>
    <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100" aria-live="polite"><strong>{bitzerPointLabel(selected, voltage)}</strong><p className="text-sm mt-1">{routes[selected]}</p></div>
    <div className="grid gap-3 xl:grid-cols-2">
      {shell('SE-B3 motor protector', 'Front connection edge: L · N · B1 · B2 · 12 · 14 · 11. Orange PTC leads are separate from the screw row.', <>
        <rect x="17" y="70" width="326" height="158" rx="8" fill={paint('body')} stroke="#111827" strokeWidth="3" />
        <rect x="37" y="87" width="286" height="61" rx="3" fill="#e2e8f0" />
        <text x="52" y="111" fontSize="19" fontWeight="800">BITZER</text><text x="52" y="134" fontSize="13">SE-B3 · motor protection</text>
        <text x="300" y="113" textAnchor="end" fontSize="12">L–N</text><text x="300" y="135" textAnchor="end" fontSize="12">{voltage} V</text>
        {(['L', 'N', 'B1', 'B2', '12', '14', '11'] as const).map((label, i) => screw(`SE-${label}` as BitzerPoint, 42 + i * 46, 185, label))}
        {wire('M134 208 V226 H180 V208', '#f59e0b')}
        <text x="157" y="242" fontSize="11" textAnchor="middle">B1–B2 link</text>
        {wire('M42 208 V258 H20 V321', '#64748b', true)}{wire('M88 208 V278 H53 V321', '#64748b', true)}
        {wire('M272 208 V294 H335 V321', '#64748b')}{wire('M318 208 V265 H347 V290', '#64748b', true)}
        <text x="20" y="339" fontSize="10">FU-out / {ret}</text><text x="335" y="339" fontSize="10" textAnchor="end">Grey → Oil-11</text>
        {wire('M27 100 H12 V28 H88', '#ea580c')}{wire('M27 128 H5 V20 H155', '#ea580c')}
        {screw('SE-1', 108, 44, 'PTC 1', '#ea580c')}{screw('SE-2', 175, 44, 'PTC 2', '#ea580c')}
        <text x="230" y="33" fontSize="11">→ M1 / M2</text>
      </>)}
      {shell(`${oil} lubrication monitor`, 'Sealed sensor with a six-core cable. The numbered breakout below is an external field terminal strip; these are not screws on the sensor.', <>
        <path d="M15 72 H75 V155 H15 Z" fill="#478a65" stroke="#256044" strokeWidth="3" />
        <path d="M58 93 L76 83 H96 V143 H76 L58 133 Z" fill="#b69c62" stroke="#796436" strokeWidth="3" />
        <rect x="92" y="83" width="47" height="60" rx="10" fill="#252a30" />
        {[102, 112, 122].map(x => <path key={x} d={`M${x} 87 V139`} stroke="#64748b" strokeWidth="3" />)}
        <rect x="136" y="69" width="153" height="93" rx="14" fill={paint('body')} stroke="#111827" strokeWidth="3" />
        <rect x="153" y="86" width="116" height="46" rx="2" fill="#d6d3d1" />
        <text x="211" y="105" fontSize="15" textAnchor="middle" fontWeight="700">{oil}</text><text x="211" y="122" fontSize="10" textAnchor="middle">Electronic unit</text>
        <circle cx="266" cy="148" r="5" fill="#94a3b8" /><text x="229" y="151" fontSize="9" fill="#e2e8f0">LED*</text>
        <path d="M288 115 H326 V198 H35" fill="none" stroke="#1e293b" strokeWidth="9" strokeLinecap="round" />
        <g role="button" tabIndex={0} aria-label="Explain electronic-head mounting detection" aria-expanded={mounting} onClick={() => setMounting(v => !v)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMounting(v => !v) } }} className="cursor-pointer">
          <rect x="87" y="77" width="57" height="72" rx="12" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 3" pointerEvents="all" />
          <path d="M115 77 V42 H157" fill="none" stroke="#0284c7" strokeWidth="2" />
          <rect x="150" y="12" width="188" height="43" rx="8" fill="#e0f2fe" stroke="#7dd3fc" />
          <text x="244" y="30" textAnchor="middle" fontSize="11" fill="#075985" fontWeight="700">Head seating / detection</text>
          <text x="244" y="45" textAnchor="middle" fontSize="10" fill="#075985">Tap to inspect this area</text>
        </g>
        <text x="176" y="187" textAnchor="middle" fontSize="11">Six-core cable sheath</text>
        {OIL_MONITOR_CABLE.map((c, i) => <g key={c.point}>
          {wire(`M${35+i*58} 198 V256`, BITZER_COLOURS[c.core].hex)}
          {screw(c.point,35+i*58,278,c.terminal,BITZER_COLOURS[c.core].hex)}
          <text x={35+i*58} y="317" textAnchor="middle" fontSize="11" fill={BITZER_COLOURS[c.core].hex} fontWeight="700">{c.core}</text>
        </g>)}
        <text x="15" y="340" fontSize="10">*LED is illustrative; this view does not reveal hidden faults.</text>
      </>)}
      {shell('Compressor PTC connections', 'Sensor connections only. The power-terminal arrangement and motor links depend on the compressor/motor code and are intentionally omitted.', <>
        <rect x="25" y="30" width="310" height="274" rx="25" fill="#4f8467" stroke="#315f48" strokeWidth="7" />
        <rect x="44" y="51" width="272" height="226" rx="13" fill="#263b32" />
        <rect x="76" y="96" width="208" height="98" rx="7" fill="#ac8362" stroke="#674a34" strokeWidth="3" />
        {wire('M109 128 V57 H61', '#ea580c')}{wire('M251 128 V73 H299', '#ea580c')}
        {screw('M1',109,153,'M1','#ea580c')}{screw('M2',251,153,'M2','#ea580c')}
        {wire('M109 178 V230 H144', '#ea580c')}{wire('M251 178 V230 H216', '#ea580c')}
        <rect x="144" y="217" width="72" height="26" fill="#f1f5f9" stroke="#64748b" />
        <text x="180" y="235" textAnchor="middle" fontSize="12">Motor PTC</text>
        <text x="59" y="43" fontSize="11" fill="white">From SE lead 1</text><text x="215" y="64" fontSize="11" fill="white">From SE lead 2</text>
        <text x="180" y="330" textAnchor="middle" fontSize="12">Sensor resistance is measured across M1–M2.</text>
      </>)}
      {shell('INT280-60 Diagnose oil regulator', 'Housing based on your 52 S 581 P071 photo. Supply and run-permit test points below are functional labels; connector pin numbers/colours remain unverified.', <>
        <path d="M77 30 H217 Q299 30 303 116 V193 H77 V153 H43 V71 H77 Z" fill={paint('body')} stroke="#111827" strokeWidth="4" />
        <circle cx="69" cy="113" r="20" fill="#80908a" stroke="#b8c2bf" strokeWidth="6" />
        <rect x="116" y="58" width="118" height="105" rx="5" fill="#e5e7eb" />
        <text x="175" y="82" textAnchor="middle" fontSize="14" fontWeight="700">KRIWAN</text><text x="175" y="106" textAnchor="middle" fontSize="13">INT280-60</text><text x="175" y="125" textAnchor="middle" fontSize="12">Diagnose</text><text x="175" y="146" textAnchor="middle" fontSize="11">230 V · P071</text>
        {[[87,44],[273,76],[286,177],[95,177]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="5" fill="#cbd5e1" />)}
        <path d="M160 194 V224 M217 194 V224" stroke="#64748b" strokeWidth="5" strokeDasharray="6 4" />
        <text x="180" y="243" textAnchor="middle" fontSize="11">External functional test points</text>
        {screw('Reg-L',46,292,'Supply L')}{screw('Reg-N',128,292,'Return')}{screw('Oil-14',219,292,'Run IN')}{screw('Reg-out',311,292,'Run OUT')}
        <text x="180" y="336" textAnchor="middle" fontSize="10">Oil-14 → run-permit contact → Reg-out → A1</text>
      </>)}
      {shell('Compressor contactor', 'Generic contactor: coil A1/A2 and a normally open auxiliary provide the run-proof signal. Main motor power is outside this control exercise.', <>
        <rect x="65" y="35" width="230" height="210" rx="9" fill="#475569" stroke="#1e293b" strokeWidth="4" />
        <rect x="89" y="104" width="182" height="63" rx="4" fill="#cbd5e1" /><text x="180" y="131" textAnchor="middle" fontSize="15" fontWeight="700">COMPRESSOR</text><text x="180" y="152" textAnchor="middle" fontSize="12">{voltage} V coil</text>
        {screw('A1',109,204,'A1')}{screw('N',251,204,'A2')}
        {wire('M109 229 V273 H24', '#64748b',true)}{wire('M251 229 V273 H329', '#64748b',true)}
        <text x="20" y="296" fontSize="11">From Reg-out</text><text x="280" y="296" fontSize="11">To {ret}</text>
        <path d="M15 58 H126 M131 58 L195 42 M200 58 H336" stroke="#64748b" strokeWidth="3" fill="none" /><text x="178" y="87" textAnchor="middle" fontSize="10" fill="white">NO auxiliary · follows contactor</text>
        <text x="10" y="25" fontSize="10">FU-out</text><text x="272" y="25" fontSize="10">VT → Oil-D1</text>
        <text x="180" y="330" textAnchor="middle" fontSize="11">Auxiliary shown released; meter follows exercise state.</text>
      </>)}
    </div>

  </div>
}
