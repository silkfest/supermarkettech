import type { CallResult } from '@/lib/game/types'
import { defOf } from '@/lib/game/inspection/defs'
export default function ServiceDebrief({ result }: { result: CallResult }) {
  const s = result.inspection
  if (!s) return null
  const def = defOf(s)
  const fanCall = def.id === 'f2-evap-fan'
  return (
    <section className="space-y-3 text-xs">
      <h3 className="font-bold text-base">
        Service debrief · {result.points}/100
      </h3>
      <p>{s.diagnosis}</p>
      <p>{s.repairs.join('; ')}</p>
      <p>
        Verification:{' '}
        {!s.verified
          ? 'Incomplete'
          : fanCall
            ? 'Full fan-circuit current, even discharge air the length of the case, the heavy frost gone and product pull-down confirmed.'
            : 'Full current, clear coil, normal temperature termination and frozen product pull-down confirmed.'}
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
      <p>{def.efficientPath}</p>
      <p>
        {fanCall
          ? 'Uneven discharge air localises the loss of airflow. A circuit pulling two motors\u2019 worth against a three-motor nameplate says one is not running, and ohming each winding on a dead circuit says which. Changing the one open motor avoids billing for three, and the heavy frost proves to be the symptom rather than a defrost fault.'
          : 'The pattern localises the loss of heat. Two-thirds of expected current points to one missing load; individual isolated resistance tests identify which element. Verifying the whole cycle avoids replacing a healthy termination control because an iced coil reached the failsafe.'}
      </p>
    </section>
  )
}
