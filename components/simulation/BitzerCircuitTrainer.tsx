'use client'
import { useState } from 'react'
import BitzerTerminalBox from './BitzerTerminalBox'
import BitzerComponentView from './BitzerComponentView'
import BitzerCircuitDiagram from './BitzerCircuitDiagram'
import { BITZER_FAULTS, bitzerOilLed, bitzerPointLabel, type BitzerVoltage, CHAIN, DEVICES, POINTS, bitzerState, bitzerReading, type BitzerFault, type BitzerPoint } from '@/lib/simulation/bitzer-circuit'
import { saveSimAttempt } from '@/lib/simulation/attempts'

const box = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4'
const input = 'min-h-11 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm max-w-full'
const button = `${input} font-semibold hover:border-emerald-500`
export default function BitzerCircuitTrainer() {
  const [voltage, setVoltage] = useState<BitzerVoltage>(120)
  const returnLabel = voltage === 208 ? 'L2' : 'N'
  const pointLabel = (p: BitzerPoint) => bitzerPointLabel(p, voltage)
  const [view, setView] = useState<'trainer' | 'ladder' | 'wiring' | 'components' | 'terminal-box'>('trainer')
  const [oil, setOil] = useState<'Delta-PII' | 'OLC-K1'>('Delta-PII')
  const [fault, setFault] = useState<BitzerFault>('none')
  const [mystery, setMystery] = useState(false)
  const [solved, setSolved] = useState(false)
  const [power, setPower] = useState(true)
  const [regulatorPower, setRegulatorPower] = useState(true)
  const [mode, setMode] = useState<'V' | 'Ω'>('V')
  const [isolated, setIsolated] = useState<'none' | 'ptc' | 'coil'>('none')
  const [red, setRed] = useState<BitzerPoint>('L1')
  const [black, setBlack] = useState<BitzerPoint>('N')
  const [probe, setProbe] = useState<'red' | 'black'>('red')
  const [guess, setGuess] = useState<BitzerFault>('fuse')
  const [feedback, setFeedback] = useState('')
  const [errors, setErrors] = useState(0)
  const [measurements, setMeasurements] = useState<string[]>([])
  const state = bitzerState(fault, power, voltage, regulatorPower)
  const reveal = !mystery || solved
  const running = state.running && isolated === 'none'
  const reading = bitzerReading(fault, power, mode, isolated, red, black, voltage, regulatorPower)
  function start(next: BitzerFault, hidden: boolean) {
    setFault(next); setMystery(hidden); setSolved(false); setPower(true); setRegulatorPower(true); setMode('V'); setIsolated('none'); setFeedback(''); setErrors(0); setMeasurements([])
  }
  function diagnose() {
    if (guess !== fault) { setErrors(e => e + 1); setFeedback('That does not explain all the readings. Check supply, relay contacts and the sensor circuit.'); return }
    setSolved(true); setFeedback('Fault identified. Review the cause and verification below.')
    saveSimAttempt({ rack: 'safety-circuit', scenarioId: `bitzer-${voltage}-${oil}-${fault}`, scenarioName: `Bitzer ${voltage} V ${oil}: ${BITZER_FAULTS.find(f => f.id === fault)!.name}`, mode: 'wiring', score: Math.max(0, 100 - errors * 15), correct: 1, total: 1, falsePositives: errors })
  }
  const selectPoint = (p: BitzerPoint) => probe === 'red' ? setRed(p) : setBlack(p)
  return <div className="space-y-4 text-slate-800 dark:text-slate-100">
    <div><p className="text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Bitzer · electrical training</p>
      <h1 className="text-2xl font-bold mt-1">Follow the control voltage</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">SE-B3 motor protection, INT280 oil regulation and selectable lubrication safety. Use both meter probes to distinguish a lost supply from an open safety contact.</p></div>
    <div className={`${box} flex flex-wrap gap-3 items-end`}>
      <label className="grid gap-1 text-xs">Control voltage<select className={input} value={voltage} onChange={e => { setVoltage(Number(e.target.value) as BitzerVoltage); start('none', false) }}><option value={120}>120 V · L1–N</option><option value={208}>208 V · L1–L2</option></select></label>
      <label className="grid gap-1 text-xs">Lubrication safety<select className={input} value={oil} disabled={view === 'terminal-box'} onChange={e => { setOil(e.target.value as typeof oil); start('none', false) }}><option>Delta-PII</option><option>OLC-K1</option></select></label>
      <button aria-pressed={!mystery} className={`${button} ${!mystery ? '!bg-blue-600 text-white' : ''}`} onClick={() => start('none', false)}>Practice</button>
      <button aria-pressed={mystery} className={`${button} ${mystery ? '!bg-violet-600 text-white' : ''}`} onClick={() => start(BITZER_FAULTS[1 + Math.floor(Math.random() * (BITZER_FAULTS.length - 1))].id, true)}>Find the Fault</button>
      {!mystery && <label className="grid gap-1 text-xs flex-1 min-w-0">Practice condition<select className={`${input} w-full`} value={fault} onChange={e => start(e.target.value as BitzerFault, false)}>{BITZER_FAULTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
    </div>
    <details key={`${fault}-${mystery}`} className={`${box} text-sm`}>
      <summary className="cursor-pointer py-1 font-semibold">Inspect oil monitor LED</summary>
      <p className="mt-3" aria-live="polite">Observed LED: <strong>{bitzerOilLed(fault, power)}</strong>.</p>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Flashing red indicates a supply-voltage or installation fault. Measure brown–blue supply and check electronic-head seating. Steady red indicates insufficient lubrication presently. An unlit LED alone does not establish that the device has power. These are settled observations; trip timers are not animated.</p>
    </details>
    <div className={`grid gap-4 ${view === 'wiring' || view === 'components' || view === 'terminal-box' ? 'grid-cols-1' : 'lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'}`}>
      <section className={`${box} min-w-0`} aria-label="Wiring schematic">
        <div className="flex justify-between gap-2"><h2 className="font-bold">Bitzer safety circuit</h2><span className={`text-xs font-semibold ${running ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>{running ? 'Contactor pulled in' : 'Contactor released'}</span></div>
        <p className="text-xs text-slate-500 dark:text-slate-400 my-2">Tap a terminal to place the {probe} probe. {returnLabel} is also coil A2.</p>
        <div className="flex flex-wrap gap-1 mb-3" role="group" aria-label="Circuit view">
          {([['trainer', 'Circuit trainer'], ['ladder', 'Control ladder'], ['wiring', 'Wiring diagram'], ['components', 'Actual components'], ['terminal-box', 'Inside terminal box']] as const).map(([id, label]) => <button key={id} aria-pressed={view === id} onClick={() => { setView(id); if (id === 'terminal-box' && oil !== 'OLC-K1') { setOil('OLC-K1'); start('none', false) } }} className={`min-h-11 px-3 py-2 rounded-lg text-xs font-semibold ${view === id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300'}`}>{label}</button>)}
        </div>
        {(view === 'components' || view === 'terminal-box') && <div className="safe-top sticky top-0 z-20 mb-3 rounded-lg bg-slate-950 p-3 text-white shadow-lg">
          <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-emerald-300 text-lg" aria-live="polite">{reading}</span><span className="text-xs text-slate-300">{pointLabel(red)} → {pointLabel(black)}</span></div>
          <div className="flex gap-2 mt-2">{(['red', 'black'] as const).map(p => <button key={p} className={`min-h-11 rounded-lg border px-3 text-xs ${probe === p ? 'border-white bg-slate-700' : 'border-slate-600'}`} aria-pressed={probe === p} onClick={() => setProbe(p)}>Place {p} probe</button>)}</div>
        </div>}
        {view === 'terminal-box' && <BitzerTerminalBox voltage={voltage} red={red} black={black} selectPoint={selectPoint} />}
        {view === 'components' && <BitzerComponentView oil={oil} voltage={voltage} red={red} black={black} selectPoint={selectPoint} />}
        {(view === 'trainer' || view === 'wiring') && <BitzerCircuitDiagram oil={oil} voltage={voltage} state={state} power={power} reveal={reveal} red={red} black={black} selectPoint={selectPoint} wiring={view === 'wiring'} />}
        {view === 'ladder' && <svg viewBox="0 0 350 700" className="w-full max-w-sm mx-auto" role="img" aria-label="Series safety chain with selectable meter terminals">
          {CHAIN.map((point, i) => {
            const y = 28 + i * 62
            const hot = power && state.potentials[point] === voltage
            const color = reveal ? state.potentials[point] == null ? '#8b5cf6' : hot ? '#d97706' : '#94a3b8' : '#64748b'
            return <g key={point}>
              {i < DEVICES.length && <><line x1="58" y1={y + 10} x2="58" y2={y + 52} stroke={color} strokeWidth="3" />
                <rect x="43" y={y + 23} width="30" height="18" rx={i === DEVICES.length - 1 ? 9 : 2} fill="currentColor" className="text-white dark:text-slate-800" stroke={reveal && power && state.openLinks[i] ? '#dc2626' : '#64748b'} strokeWidth="2" />
                {reveal && power && state.openLinks[i] && <path d={`M48 ${y+37} l20 -12`} stroke="#dc2626" strokeWidth="2" />}
                <text x="91" y={y + 37} fontSize="12" fill="currentColor">{DEVICES[i].replace('Oil safety', oil)}</text></>}
              <g role="button" tabIndex={0} aria-label={`Probe terminal ${point}`} onClick={() => selectPoint(point)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPoint(point) } }} style={{ cursor: 'pointer' }}>
                <rect x="22" y={y-21} width="175" height="42" fill="transparent" />
                <circle cx="58" cy={y} r="9" fill={red === point ? '#dc2626' : black === point ? '#0f172a' : color} stroke={black === point ? '#94a3b8' : 'white'} strokeWidth="2" />
                <text x="78" y={y+4} fontSize="12" fill="currentColor">{pointLabel(point)}{red === point ? '  R' : ''}{black === point ? '  B' : ''}</text>
              </g>
            </g>
          })}
        </svg>}
      </section>
      <div className="space-y-4">
        <section className={box}><h2 className="font-bold mb-3">Two-probe meter</h2>
          <output aria-live="polite" className="block bg-slate-950 text-emerald-300 font-mono text-xl rounded-lg p-4 break-words">{reading}</output>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <label className="grid gap-1 text-xs">Red probe<select className={input} value={red} onChange={e => setRed(e.target.value as BitzerPoint)}>{POINTS.map(p => <option key={p} value={p}>{pointLabel(p)}</option>)}</select></label>
            <label className="grid gap-1 text-xs">Black probe<select className={input} value={black} onChange={e => setBlack(e.target.value as BitzerPoint)}>{POINTS.map(p => <option key={p} value={p}>{pointLabel(p)}</option>)}</select></label>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button className={button} onClick={() => setProbe(p => p === 'red' ? 'black' : 'red')}>Place {probe} probe</button>
            <button className={button} onClick={() => setMode(m => m === 'V' ? 'Ω' : 'V')}>{mode === 'V' ? 'AC volts' : 'Resistance Ω'}</button>
            <button className={button} onClick={() => { setPower(p => !p); setIsolated('none') }}>Control power {power ? 'ON' : 'OFF'}</button>
            <button className={button} onClick={() => setRegulatorPower(p => !p)}>INT280 supply {regulatorPower ? 'ON' : 'OFF'}</button>
          </div>
          {!power && <label className="grid gap-1 text-xs mt-3">Disconnect for resistance test<select className={input} value={isolated} onChange={e => setIsolated(e.target.value as typeof isolated)}><option value="none">Nothing isolated</option><option value="ptc">PTC harness removed from module · M1/M2 + leads</option><option value="coil">Contactor coil · A1–{returnLabel} (A2)</option></select></label>}
          <button className={`${button} mt-3 w-full`} onClick={() => setMeasurements(m => [`${pointLabel(red)} → ${pointLabel(black)}: ${reading}`, ...m].slice(0, 8))}>Record reading</button>
          {measurements.length > 0 && <ul className="text-xs font-mono mt-3 space-y-1">{measurements.map((m, i) => <li key={i}>{m}</li>)}</ul>}
        </section>
        <section className={`${box} text-sm space-y-3`}><h2 className="font-bold">Module connections</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Both modules have terminals numbered 11, 12 and 14, so every point is prefixed: <strong>SE-11</strong> is the motor protector&apos;s common, <strong>Oil-11</strong> is the oil monitor&apos;s. The grey wire between SE-14 and Oil-11 is what joins them.</p><p><strong>SE-B3:</strong> {voltage === 208 ? 'L1–L2' : 'L–N'} powers the selected voltage-rated module. M1–M2 is the separate PTC loop. Terminal 11 is common, 14 is the healthy-run contact, and 12 is the released/trip contact. Supply loss also releases this relay.</p><p><strong>{oil} terminals:</strong> L brown and N blue are its supply (blue connects to {returnLabel}); 11 grey is the relay common fed from SE-14; 14 orange is the healthy-run contact that carries the chain on; 12 pink makes when it has tripped; D1 violet is the start signal from the contactor auxiliary.</p>
          <p><strong>{oil}:</strong> {oil === 'Delta-PII' ? 'Measures oil-pump differential pressure.' : 'Optically detects oil at the bearing oil pocket.'} Its safety contact is separate from its power supply.</p>
          <p><strong>INT280-60 Diagnose:</strong> senses and replenishes crankcase oil. Its alarm contact joins the safety chain if replenishment fails.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">SE and oil-monitor supply: fused {voltage} V, using modules rated for the selected voltage. Reg-L/N: separate 230 V supply, matching your pictured INT280. INT280 contact labels IN/OUT are functional labels; use the exact model diagram for field wire colours and terminal identification.</p>
        </section>
      </div>
    </div>
    {mystery && !solved && <section className={box}><h2 className="font-bold mb-2">What explains your readings?</h2><div className="flex gap-2 flex-wrap"><select aria-label="Fault diagnosis" className={`${input} flex-1 min-w-0`} value={guess} onChange={e => setGuess(e.target.value as BitzerFault)}>{BITZER_FAULTS.filter(f => f.id !== 'none').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select><button className={button} onClick={diagnose}>Check diagnosis</button></div></section>}
    {feedback && <p role="status" className={`${box} text-sm`}>{feedback}</p>}
    {reveal && <section className={`${box} text-sm`}><h2 className="font-bold mb-2">{BITZER_FAULTS.find(f => f.id === fault)!.name}</h2><p>{BITZER_FAULTS.find(f => f.id === fault)!.detail}</p><button className={`${button} mt-3`} onClick={() => start('none', false)}>Repair exercise and verify normal readings</button></section>}
    <details className={`${box} text-sm`}><summary className="cursor-pointer font-semibold">Circuit assumptions and references</summary>
      <p className="mt-3">{voltage === 208 ? '208 V is measured between L1 and L2. Both legs are live to ground; 0 V to L2 does not mean safe to touch. This trainer does not model ground measurements. ' : ''}The coil and monitoring modules are assumed rated for the selected supply; verify each actual device nameplate. The separate INT280 supply remains 230 V. This is a diagnostic snapshot trainer: oil faults represent a completed trip, not a running timer. Power cycling does not repair an injected fault. The circuit uses a closed call, HP/LP safeties and separate, continuously powered monitoring modules. PTC (450 / 6000 Ω) and coil (180 Ω) readings are exercise values, not universal specifications. SE-B3 lockout link B1–B2 is assumed fitted. The service guide specifies a 3-second supply-on delay and at least 5 seconds off for manual reset; these delays are not animated. The control-power switch does not isolate the separate INT280 supply. Oil devices are selected for the compressor’s lubrication arrangement, not interchanged arbitrarily.</p>
      <p className="mt-3">OLC-K1: 90-second start delay, then 5 seconds without oil during operation. Delta-PII: 5-second start delay and 90-second operating fault delay in the referenced service guide. D1 violet is run proof through the contactor auxiliary. A released auxiliary leaves that input floating in this ideal model. Use the exact device data sheet for timing and voltage tolerances.</p>
      <ul className="list-disc pl-5 mt-3 space-y-2">
        <li><a className="underline" href="https://www.bitzer.de/shared_media/html/at-170/en-GB/820121611820108427.html" target="_blank" rel="noreferrer">BITZER Delta-PII documentation</a></li>
        <li><a className="underline" href="https://www.bitzer.de/shared_media/html/at-170/en-GB/820181899820112907.html" target="_blank" rel="noreferrer">BITZER OLC-K1 documentation</a></li>
        <li><a className="underline" href="https://www.kriwan.com/en/products/oil-level-regulator" target="_blank" rel="noreferrer">KRIWAN INT280 oil regulation</a></li>
        <li><a className="underline" href="https://bitzerus-training.storage.googleapis.com/media/documents/SG-0012-09_-_Ecoline_Service_Guide_06012021.pdf" target="_blank" rel="noreferrer">BITZER ECOLINE Service Guide SG-0012-09, pp. 63–66: SE-B3 terminals, reset, oil-monitor cable and delays</a></li>
      </ul>
    </details>
  </div>
}
