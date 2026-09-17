import type { EvidenceItem } from '@/lib/game/inspection/types'
export default function EvidenceNotebook({
  evidence,
  onRecord
}: {
  evidence: EvidenceItem[]
  onRecord: (id: string) => void
}) {
  return (
    <section className="space-y-2" aria-label="Service notebook">
      <h3 className="font-bold">Evidence / service notebook</h3>
      {!evidence.length && (
        <p className="text-xs text-slate-400">
          No readings yet. Select a tool and interact with the equipment.
        </p>
      )}
      {evidence.map((e) => (
        <div
          key={`${e.phase}:${e.id}:${e.atMin}`}
          className="border border-slate-600 rounded-lg p-2 text-xs"
        >
          <p className="text-slate-400">
            {e.phase === 'after' ? 'After repair' : 'Before repair'} ·{' '}
            {e.atMin.toFixed(0)} min · {e.kind}
          </p>
          <p className="font-semibold">{e.label}</p>
          <p>{e.value}</p>
          {e.recorded ? (
            <span className="text-emerald-300">Recorded ✓</span>
          ) : (
            <button
              className="mt-2 min-h-10 px-3 rounded bg-blue-700"
              onClick={() => onRecord(`${e.phase}:${e.id}:${e.atMin}`)}
            >
              Record evidence
            </button>
          )}
        </div>
      ))}
    </section>
  )
}
