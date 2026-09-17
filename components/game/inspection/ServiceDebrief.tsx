import type { CallResult } from '@/lib/game/types'
import { EFFICIENT_PATH } from '@/lib/game/inspection/f1'
export default function ServiceDebrief({ result }: { result: CallResult }) {
  const s = result.inspection
  if (!s) return null
  return (
    <section className="space-y-3 text-xs">
      <h3 className="font-bold text-base">
        Service debrief · {result.points}/100
      </h3>
      <p>{s.diagnosis}</p>
      <p>{s.repairs.join('; ')}</p>
      <p>
        Verification:{' '}
        {s.verified
          ? 'Full current, clear coil, normal temperature termination and frozen product pull-down confirmed.'
          : 'Incomplete'}
      </p>
      <dl className="grid grid-cols-2 gap-2">
        <dt>Total elapsed time</dt>
        <dd>{s.elapsedMinutes.toFixed(0)} min</dd>
        <dt>Hands-on time</dt>
        <dd>{result.minutesSpent} min</dd>
        <dt>Product at close</dt>
        <dd>{s.productTemp.toFixed(1)} °F</dd>
        <dt>Product / shrink exposure</dt>
        <dd>${s.shrink.toFixed(0)} at risk</dd>
        <dt>Unnecessary checks</dt>
        <dd>{s.unnecessary.join('; ') || 'None'}</dd>
        <dt>Unnecessary parts</dt>
        <dd>${result.partsWasted}</dd>
        <dt>Safety mistakes</dt>
        <dd>{s.safetyMistakes.join('; ') || 'None'}</dd>
      </dl>
      <details>
        <summary className="cursor-pointer min-h-10">
          Observations and measurements ({s.evidence.length})
        </summary>
        <ul className="space-y-1">
          {s.evidence.map((e) => (
            <li key={`${e.phase}:${e.id}:${e.atMin}`}>
              {e.phase}: {e.label} — {e.value} (
              {e.recorded ? 'recorded' : 'not recorded'})
            </li>
          ))}
        </ul>
      </details>
      <p className="whitespace-pre-wrap">{result.note}</p>
      <h4 className="font-bold">Efficient professional path</h4>
      <p>{EFFICIENT_PATH}</p>
      <p>
        The pattern localises the loss of heat. Two-thirds of expected current
        points to one missing load; individual isolated resistance tests
        identify which element. Verifying the whole cycle avoids replacing a
        healthy termination control because an iced coil reached the failsafe.
      </p>
    </section>
  )
}
