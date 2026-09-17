import type { EvidenceItem } from '@/lib/game/inspection/types'

/** Read-back only. Findings go in the book as you make them — filing each one
 * by hand was a tap per reading and taught nothing the written report doesn't. */
export default function EvidenceNotebook({
  evidence
}: {
  evidence: EvidenceItem[]
}) {
  const phases = [
    { key: 'before' as const, label: 'Before repair' },
    { key: 'after' as const, label: 'After repair' }
  ]
  return (
    <section className="space-y-3" aria-label="Service notebook">
      <h3 className="font-bold">Service notebook</h3>
      {!evidence.length && (
        <p className="text-xs text-slate-400">
          Nothing written down yet. Everything you look at or measure lands here
          on its own.
        </p>
      )}
      {phases.map(({ key, label }) => {
        const items = evidence.filter((e) => e.phase === key)
        if (!items.length) return null
        return (
          <div key={key} className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-amber-300">
              {label} · {items.length}
            </p>
            {items.map((e) => (
              <div
                key={`${e.phase}:${e.id}:${e.atMin}`}
                className="border border-slate-600 rounded-lg p-2 text-xs"
              >
                <p className="text-slate-400">
                  {e.atMin.toFixed(0)} min · {e.kind}
                </p>
                <p className="font-semibold">{e.label}</p>
                <p>{e.value}</p>
              </div>
            ))}
          </div>
        )
      })}
    </section>
  )
}
